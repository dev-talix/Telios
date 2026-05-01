import type { Adapter, AdapterContext } from "./types.ts";
import type { RunResult } from "../types.ts";

const HERMES_URL = Deno.env.get("HERMES_API_URL") ?? "http://127.0.0.1:8642";

export class HermesAdapter implements Adapter {
  async isAvailable(): Promise<boolean> {
    try {
      const r = await fetch(`${HERMES_URL}/health`, { signal: AbortSignal.timeout(3000) });
      return r.ok;
    } catch {
      return false;
    }
  }

  async run(ctx: AdapterContext): Promise<RunResult> {
    const config = JSON.parse(ctx.agent.config ?? "{}");

    const startRes = await fetch(`${HERMES_URL}/v1/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model ?? "anthropic/claude-sonnet-4-6",
        messages: [
          ...(ctx.agent.system_prompt
            ? [{ role: "system", content: ctx.agent.system_prompt }]
            : []),
          { role: "user", content: ctx.prompt },
        ],
        skills: config.skills ?? [],
        max_turns: config.max_turns ?? 60,
      }),
    });

    if (!startRes.ok) {
      const err = await startRes.text();
      return { success: false, output: "", error: `Hermes start failed: ${err}` };
    }

    const { run_id } = await startRes.json();
    return await this.pollRun(run_id);
  }

  private async pollRun(runId: string): Promise<RunResult> {
    const timeout = 10 * 60 * 1000; // 10 min
    const start = Date.now();

    while (Date.now() - start < timeout) {
      await new Promise((r) => setTimeout(r, 3000));

      const res = await fetch(`${HERMES_URL}/v1/runs/${runId}`);
      if (!res.ok) continue;

      const run = await res.json();
      if (run.status === "completed" || run.status === "done") {
        return {
          success: true,
          output: run.output ?? run.result ?? "",
          tokens_input: run.usage?.prompt_tokens ?? 0,
          tokens_output: run.usage?.completion_tokens ?? 0,
          cost_usd: run.cost ?? 0,
        };
      }
      if (run.status === "failed" || run.status === "error") {
        return { success: false, output: "", error: run.error ?? "Hermes run failed" };
      }
    }

    return { success: false, output: "", error: "Hermes run timed out" };
  }
}
