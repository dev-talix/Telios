import type { Agent, Task, RunResult } from "../types.ts";

export interface AdapterContext {
  agent: Agent;
  task: Task | null;
  prompt: string;
  workdir?: string;
}

export interface Adapter {
  run(ctx: AdapterContext): Promise<RunResult>;
  isAvailable(): Promise<boolean>;
}
