import { getDb, uuid, now, currentPeriod } from "../db/client.ts";
import { HermesAdapter } from "../adapters/hermes.ts";
import { ClaudeCodeAdapter } from "../adapters/claude-code.ts";
import type { Agent, Task, AgentConfig } from "../types.ts";

const hermes = new HermesAdapter();
const claudeCode = new ClaudeCodeAdapter();

export function startHeartbeatScheduler(): void {
  setInterval(tick, 60_000);
  console.log("[heartbeat] scheduler started (1m interval)");
}

async function tick(): Promise<void> {
  const db = getDb();
  const now_ = now();

  const agents = db.prepare(`
    SELECT * FROM agents
    WHERE status = 'active'
      AND heartbeat_interval_mins IS NOT NULL
      AND (
        last_heartbeat IS NULL
        OR (CAST((julianday(?) - julianday(last_heartbeat)) * 1440 AS INTEGER) >= heartbeat_interval_mins)
      )
  `).all(now_) as Agent[];

  for (const agent of agents) {
    try {
      await processAgent(agent);
    } catch (e) {
      console.error(`[heartbeat] agent ${agent.id} error:`, e);
    }
  }
}

async function processAgent(agent: Agent): Promise<void> {
  const db = getDb();

  if (!checkBudget(agent)) {
    console.log(`[heartbeat] agent ${agent.name} over budget, skipping`);
    return;
  }

  const task = checkoutNextTask(agent.id);
  if (!task) {
    // Update heartbeat timestamp even if no task
    db.prepare(`UPDATE agents SET last_heartbeat = ? WHERE id = ?`).run(now(), agent.id);
    return;
  }

  const runId = uuid();
  db.prepare(`
    INSERT INTO runs (id, agent_id, task_id, status, prompt, created_at)
    VALUES (?, ?, ?, 'running', ?, ?)
  `).run(runId, agent.id, task.id, buildPrompt(agent, task), now());

  db.prepare(`UPDATE agents SET last_heartbeat = ? WHERE id = ?`).run(now(), agent.id);

  console.log(`[heartbeat] running ${agent.name} on task: ${task.title}`);

  const adapter = agent.type === "hermes" ? hermes : claudeCode;
  const result = await adapter.run({
    agent,
    task,
    prompt: buildPrompt(agent, task),
  });

  const finishedAt = now();

  db.prepare(`
    UPDATE runs SET
      status = ?, output = ?, error = ?,
      cost_usd = ?, tokens_input = ?, tokens_output = ?,
      started_at = ?, finished_at = ?
    WHERE id = ?
  `).run(
    result.success ? "done" : "failed",
    result.output,
    result.error ?? null,
    result.cost_usd ?? 0,
    result.tokens_input ?? 0,
    result.tokens_output ?? 0,
    finishedAt,
    finishedAt,
    runId,
  );

  db.prepare(`
    UPDATE tasks SET
      status = ?, checkout_run_id = NULL, updated_at = ?
    WHERE id = ?
  `).run(result.success ? "done" : "todo", now(), task.id);

  trackBudget(agent.id, result.cost_usd ?? 0, (result.tokens_input ?? 0) + (result.tokens_output ?? 0));
}

function checkoutNextTask(agentId: string): Task | null {
  const db = getDb();

  const runId = uuid();

  // Atomic: update only if checkout_run_id is still NULL
  const updated = db.prepare(`
    UPDATE tasks SET
      checkout_run_id = ?,
      status = 'in_progress',
      updated_at = ?
    WHERE id = (
      SELECT id FROM tasks
      WHERE assignee_id = ?
        AND status = 'todo'
        AND checkout_run_id IS NULL
      ORDER BY
        CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
        created_at ASC
      LIMIT 1
    )
  `).run(runId, now(), agentId);

  if (updated.changes === 0) return null;

  return db.prepare(`
    SELECT * FROM tasks WHERE checkout_run_id = ? AND assignee_id = ?
  `).get(runId, agentId) as Task | null;
}

function checkBudget(agent: Agent): boolean {
  if (agent.budget_monthly_usd <= 0) return true;

  const db = getDb();
  const period = currentPeriod();
  const row = db.prepare(`
    SELECT spent_usd FROM budget_periods WHERE agent_id = ? AND period = ?
  `).get(agent.id, period) as { spent_usd: number } | undefined;

  return !row || row.spent_usd < agent.budget_monthly_usd;
}

function trackBudget(agentId: string, costUsd: number, tokens: number): void {
  const db = getDb();
  const period = currentPeriod();
  db.prepare(`
    INSERT INTO budget_periods (id, agent_id, period, spent_usd, spent_tokens)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(agent_id, period) DO UPDATE SET
      spent_usd = spent_usd + excluded.spent_usd,
      spent_tokens = spent_tokens + excluded.spent_tokens
  `).run(uuid(), agentId, period, costUsd, tokens);
}

function buildPrompt(agent: Agent, task: Task): string {
  const config: AgentConfig = JSON.parse(agent.config ?? "{}");
  const lines: string[] = [
    `You are ${agent.name}, ${agent.title ?? agent.role} at the company.`,
    "",
    `## Current Task`,
    `**${task.title}**`,
  ];

  if (task.description) {
    lines.push("", task.description);
  }

  if (config.workdir) {
    lines.push("", `Working directory: ${config.workdir}`);
  }

  lines.push("", "Complete the task. Report what you did and any blockers.");
  return lines.join("\n");
}
