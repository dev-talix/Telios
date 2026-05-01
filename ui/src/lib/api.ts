const BASE = "/api";

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return res.json();
}

export const api = {
  company: {
    get: () => req<Company | null>("GET", "/company"),
    update: (data: Partial<Company>) => req<Company>("PUT", "/company", data),
    create: (data: { name: string; mission?: string }) => req<Company>("POST", "/company", data),
  },
  goals: {
    list: () => req<Goal[]>("GET", "/goals"),
    create: (data: Partial<Goal>) => req<Goal>("POST", "/goals", data),
    update: (id: string, data: Partial<Goal>) => req<Goal>("PUT", `/goals/${id}`, data),
    delete: (id: string) => req<{ ok: boolean }>("DELETE", `/goals/${id}`),
  },
  agents: {
    list: () => req<Agent[]>("GET", "/agents"),
    get: (id: string) => req<Agent>("GET", `/agents/${id}`),
    create: (data: Partial<Agent>) => req<Agent>("POST", "/agents", data),
    update: (id: string, data: Partial<Agent>) => req<Agent>("PUT", `/agents/${id}`, data),
    delete: (id: string) => req<{ ok: boolean }>("DELETE", `/agents/${id}`),
    run: (id: string, prompt?: string) => req<{ run_id: string }>("POST", `/agents/${id}/run`, { prompt }),
  },
  tasks: {
    list: (params?: { assignee_id?: string; goal_id?: string; status?: string }) => {
      const qs = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString() : "";
      return req<Task[]>("GET", `/tasks${qs}`);
    },
    create: (data: Partial<Task>) => req<Task>("POST", "/tasks", data),
    update: (id: string, data: Partial<Task>) => req<Task>("PUT", `/tasks/${id}`, data),
    delete: (id: string) => req<{ ok: boolean }>("DELETE", `/tasks/${id}`),
    release: (id: string) => req<{ ok: boolean }>("POST", `/tasks/${id}/release`),
  },
  runs: {
    list: (params?: { agent_id?: string; task_id?: string; status?: string; limit?: string }) => {
      const qs = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString() : "";
      return req<Run[]>("GET", `/runs${qs}`);
    },
    get: (id: string) => req<Run>("GET", `/runs/${id}`),
  },
  budgets: {
    list: (period?: string) => req<BudgetRow[]>("GET", `/budgets${period ? `?period=${period}` : ""}`),
    history: (agentId: string) => req<BudgetPeriod[]>("GET", `/budgets/${agentId}`),
  },
  stats: () => req<Stats>("GET", "/stats"),
  initTalix: () => req<{ company: Company; goals: number; agents: number }>("POST", "/init/talix"),
};

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
  status: "active" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  company_id: string;
  manager_id: string | null;
  name: string;
  type: "hermes" | "claude_code" | "http";
  role: string;
  title: string | null;
  description: string | null;
  system_prompt: string | null;
  heartbeat_interval_mins: number | null;
  last_heartbeat: string | null;
  budget_monthly_usd: number;
  config: string;
  status: "active" | "paused" | "terminated";
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
  status: "todo" | "in_progress" | "done" | "blocked" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  checkout_run_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Run {
  id: string;
  agent_id: string;
  task_id: string | null;
  status: "pending" | "running" | "done" | "failed";
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

export interface BudgetRow {
  agent_id: string;
  name: string;
  budget_monthly_usd: number;
  spent_usd: number;
  spent_tokens: number;
  period: string;
  remaining_usd: number | null;
  over_budget: boolean;
}

export interface BudgetPeriod {
  id: string;
  agent_id: string;
  period: string;
  spent_usd: number;
  spent_tokens: number;
}

export interface Stats {
  agents: number;
  tasks_todo: number;
  tasks_running: number;
  tasks_done: number;
  runs_today: number;
  cost_today: number;
}
