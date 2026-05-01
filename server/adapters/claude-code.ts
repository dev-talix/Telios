import type { Adapter, AdapterContext } from "./types.ts";
import type { RunResult } from "../types.ts";

const CLAUDE_CLI = Deno.env.get("CLAUDE_CLI_PATH") ?? "claude";

export class ClaudeCodeAdapter implements Adapter {
  async isAvailable(): Promise<boolean> {
    try {
      const cmd = new Deno.Command(CLAUDE_CLI, { args: ["--version"], stdout: "null", stderr: "null" });
      const { code } = await cmd.output();
      return code === 0;
    } catch {
      return false;
    }
  }

  async run(ctx: AdapterContext): Promise<RunResult> {
    const config = JSON.parse(ctx.agent.config ?? "{}");
    const workdir = ctx.workdir ?? config.workdir ?? Deno.cwd();

    const prompt = ctx.agent.system_prompt
      ? `${ctx.agent.system_prompt}\n\n---\n\n${ctx.prompt}`
      : ctx.prompt;

    const args = [
      "-p", prompt,
      "--output-format", "json",
    ];

    if (config.model) args.push("--model", config.model);
    if (config.max_turns) args.push("--max-turns", String(config.max_turns));

    const cmd = new Deno.Command(CLAUDE_CLI, {
      args,
      cwd: workdir,
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await cmd.output();
    const raw = new TextDecoder().decode(stdout).trim();
    const errText = new TextDecoder().decode(stderr).trim();

    if (code !== 0) {
      return { success: false, output: raw, error: errText || `claude exited ${code}` };
    }

    try {
      const parsed = JSON.parse(raw);
      const output = parsed.result ?? parsed.content ?? raw;
      const usage = parsed.usage ?? {};
      return {
        success: true,
        output: typeof output === "string" ? output : JSON.stringify(output),
        tokens_input: usage.input_tokens ?? 0,
        tokens_output: usage.output_tokens ?? 0,
        cost_usd: parsed.cost_usd ?? 0,
      };
    } catch {
      return { success: true, output: raw };
    }
  }
}
