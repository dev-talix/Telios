import { Hono } from "hono";
import { getDb, uuid, now } from "../db/client.ts";
import type { Agent } from "../types.ts";

export const agents = new Hono();

agents.get("/", (c) => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM agents ORDER BY created_at ASC").all() as Agent[];
  return c.json(rows);
});

agents.post("/", async (c) => {
  const db = getDb();
  const body = await c.req.json();
  const id = uuid();
  const ts = now();

  db.prepare(`
    INSERT INTO agents (
      id, company_id, manager_id, name, type, role, title,
      description, system_prompt, heartbeat_interval_mins,
      budget_monthly_usd, config, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(
    id,
    body.company_id,
    body.manager_id ?? null,
    body.name,
    body.type,
    body.role,
    body.title ?? null,
    body.description ?? null,
    body.system_prompt ?? null,
    body.heartbeat_interval_mins ?? null,
    body.budget_monthly_usd ?? 0,
    JSON.stringify(body.config ?? {}),
    ts,
    ts,
  );

  return c.json(db.prepare("SELECT * FROM agents WHERE id = ?").get(id), 201);
});

agents.get("/:id", (c) => {
  const db = getDb();
  const row = db.prepare("SELECT * FROM agents WHERE id = ?").get(c.req.param("id")) as Agent | undefined;
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

agents.put("/:id", async (c) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM agents WHERE id = ?").get(c.req.param("id")) as Agent | undefined;
  if (!existing) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json();
  db.prepare(`
    UPDATE agents SET
      name = ?, type = ?, role = ?, title = ?, description = ?,
      system_prompt = ?, heartbeat_interval_mins = ?,
      budget_monthly_usd = ?, config = ?, status = ?,
      manager_id = ?, updated_at = ?
    WHERE id = ?
  `).run(
    body.name ?? existing.name,
    body.type ?? existing.type,
    body.role ?? existing.role,
    body.title !== undefined ? body.title : existing.title,
    body.description !== undefined ? body.description : existing.description,
    body.system_prompt !== undefined ? body.system_prompt : existing.system_prompt,
    body.heartbeat_interval_mins !== undefined ? body.heartbeat_interval_mins : existing.heartbeat_interval_mins,
    body.budget_monthly_usd ?? existing.budget_monthly_usd,
    body.config !== undefined ? JSON.stringify(body.config) : existing.config,
    body.status ?? existing.status,
    body.manager_id !== undefined ? body.manager_id : existing.manager_id,
    now(),
    existing.id,
  );

  return c.json(db.prepare("SELECT * FROM agents WHERE id = ?").get(existing.id));
});

agents.delete("/:id", (c) => {
  const db = getDb();
  db.prepare("UPDATE agents SET status = 'terminated', updated_at = ? WHERE id = ?").run(now(), c.req.param("id"));
  return c.json({ ok: true });
});

// Manual trigger: run agent now against a task
agents.post("/:id/run", async (c) => {
  const db = getDb();
  const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(c.req.param("id")) as Agent | undefined;
  if (!agent) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json().catch(() => ({}));
  const prompt = body.prompt ?? `You are ${agent.name}. What is the status of your work?`;

  const runId = uuid();
  const ts = now();

  db.prepare(`
    INSERT INTO runs (id, agent_id, task_id, status, prompt, created_at)
    VALUES (?, ?, ?, 'pending', ?, ?)
  `).run(runId, agent.id, body.task_id ?? null, prompt, ts);

  // Fire and forget — run in background
  (async () => {
    const { HermesAdapter } = await import("../adapters/hermes.ts");
    const { ClaudeCodeAdapter } = await import("../adapters/claude-code.ts");
    const adapter = agent.type === "hermes" ? new HermesAdapter() : new ClaudeCodeAdapter();

    db.prepare("UPDATE runs SET status = 'running', started_at = ? WHERE id = ?").run(now(), runId);

    const result = await adapter.run({ agent, task: null, prompt });
    const fin = now();

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
      fin,
      fin,
      runId,
    );
  })();

  return c.json({ run_id: runId }, 202);
});
