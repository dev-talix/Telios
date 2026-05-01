import { Hono } from "hono";
import { getDb } from "../db/client.ts";
import type { Run } from "../types.ts";

export const runs = new Hono();

runs.get("/", (c) => {
  const db = getDb();
  const { agent_id, task_id, status, limit } = c.req.query();

  let sql = "SELECT * FROM runs WHERE 1=1";
  const params: (string | number)[] = [];

  if (agent_id) { sql += " AND agent_id = ?"; params.push(agent_id); }
  if (task_id) { sql += " AND task_id = ?"; params.push(task_id); }
  if (status) { sql += " AND status = ?"; params.push(status); }

  sql += " ORDER BY created_at DESC LIMIT ?";
  params.push(Number(limit ?? 50));

  const rows = db.prepare(sql).all(...params) as Run[];
  return c.json(rows);
});

runs.get("/:id", (c) => {
  const db = getDb();
  const row = db.prepare("SELECT * FROM runs WHERE id = ?").get(c.req.param("id")) as Run | undefined;
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});
