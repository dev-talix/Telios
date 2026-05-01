import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { company } from "./company.ts";
import { goals } from "./goals.ts";
import { agents } from "./agents.ts";
import { tasks } from "./tasks.ts";
import { runs } from "./runs.ts";
import { budgets } from "./budgets.ts";
import { getDb } from "../db/client.ts";

export function buildApi(): Hono {
  const api = new Hono();

  api.use("*", cors());
  api.use("*", logger());

  api.route("/company", company);
  api.route("/goals", goals);
  api.route("/agents", agents);
  api.route("/tasks", tasks);
  api.route("/runs", runs);
  api.route("/budgets", budgets);

  api.get("/stats", (c) => {
    const db = getDb();
    const agents = (db.prepare("SELECT COUNT(*) as n FROM agents WHERE status = 'active'").get() as { n: number }).n;
    const tasks_todo = (db.prepare("SELECT COUNT(*) as n FROM tasks WHERE status = 'todo'").get() as { n: number }).n;
    const tasks_running = (db.prepare("SELECT COUNT(*) as n FROM tasks WHERE status = 'in_progress'").get() as { n: number }).n;
    const tasks_done = (db.prepare("SELECT COUNT(*) as n FROM tasks WHERE status = 'done'").get() as { n: number }).n;
    const runs_today = (db.prepare("SELECT COUNT(*) as n FROM runs WHERE date(created_at) = date('now')").get() as { n: number }).n;
    const cost_today = (db.prepare("SELECT COALESCE(SUM(cost_usd), 0) as n FROM runs WHERE date(created_at) = date('now')").get() as { n: number }).n;

    return c.json({ agents, tasks_todo, tasks_running, tasks_done, runs_today, cost_today });
  });

  // Seed Talix template
  api.post("/init/talix", async (c) => {
    const { seedTalix } = await import("../templates/talix.ts");
    const result = await seedTalix();
    return c.json(result);
  });

  api.get("/health", (c) => c.json({ ok: true, time: new Date().toISOString() }));

  return api;
}
