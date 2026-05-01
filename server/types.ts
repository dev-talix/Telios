export type AgentType = "hermes" | "claude_code" | "http";
export type AgentStatus = "active" | "paused" | "terminated";
export type TaskStatus = "todo" | "in_progress" | "done" | "blocked" | "cancelled";
export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type RunStatus = "pending" | "running" | "done" | "failed";
export type GoalStatus = "active" | "completed" | "cancelled";

export interface Company {
  id: string;
  name: string;
  mission: string | null;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  company_id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}

export interface AgentConfig {
  model?: string;
  workdir?: string;
  apiUrl?: string;
  skills?: string[];
  [key: string]: unknown;
}

export interface Agent {
  id: string;
  company_id: string;
  manager_id: string | null;
  name: string;
  type: AgentType;
  role: string;
  title: string | null;
  description: string | null;
  system_prompt: string | null;
  heartbeat_interval_mins: number | null;
  last_heartbeat: string | null;
  budget_monthly_usd: number;
  config: string;
  status: AgentStatus;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  company_id: string;
  goal_id: string | null;
  parent_id: string | null;
  assignee_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  checkout_run_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Run {
  id: string;
  agent_id: string;
  task_id: string | null;
  status: RunStatus;
  prompt: string | null;
  output: string | null;
  error: string | null;
  cost_usd: number;
  tokens_input: number;
  tokens_output: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface BudgetPeriod {
  id: string;
  agent_id: string;
  period: string;
  spent_usd: number;
  spent_tokens: number;
}

export interface RunResult {
  success: boolean;
  output: string;
  error?: string;
  cost_usd?: number;
  tokens_input?: number;
  tokens_output?: number;
}
