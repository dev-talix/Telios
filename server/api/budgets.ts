import { Hono } from "hono";
import { getDb, currentPeriod } from "../db/client.ts";
import type { BudgetPeriod, Agent } from "../types.ts";

export const budgets = new Hono();

budgets.get("/", (c) => {
  const db = getDb();
  const period = c.req.query("period") ?? currentPeriod();

  const rows = db.prepare(`
    SELECT
      a.id as agent_id, a.name, a.budget_monthly_usd,
      COALESCE(b.spent_usd, 0) as spent_usd,
      COALESCE(b.spent_tokens, 0) as spent_tokens,
      b.period
    FROM agents a
    LEFT JOIN budget_periods b ON b.agent_id = a.id AND b.period = ?
    WHERE a.status != 'terminated'
    ORDER BY a.name
  `).all(period) as Array<Agent & BudgetPeriod & { spent_usd: number }>;

  return c.json(rows.map((r) => ({
    ...r,
    period,
    remaining_usd: r.budget_monthly_usd > 0 ? Math.max(0, r.budget_monthly_usd - r.spent_usd) : null,
    over_budget: r.budget_monthly_usd > 0 && r.spent_usd >= r.budget_monthly_usd,
  })));
});

budgets.get("/:agentId", (c) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM budget_periods WHERE agent_id = ? ORDER BY period DESC LIMIT 12
  `).all(c.req.param("agentId")) as BudgetPeriod[];
  return c.json(rows);
});
