import { Hono } from "hono";
import { getDb, uuid, now } from "../db/client.ts";
import type { Task } from "../types.ts";

export const tasks = new Hono();

tasks.get("/", (c) => {
  const db = getDb();
  const { assignee_id, goal_id, status } = c.req.query();

  let sql = "SELECT * FROM tasks WHERE 1=1";
  const params: string[] = [];

  if (assignee_id) { sql += " AND assignee_id = ?"; params.push(assignee_id); }
  if (goal_id) { sql += " AND goal_id = ?"; params.push(goal_id); }
  if (status) { sql += " AND status = ?"; params.push(status); }

  sql += " ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, created_at ASC";

  const rows = db.prepare(sql).all(...params) as Task[];
  return c.json(rows);
});

tasks.post("/", async (c) => {
  const db = getDb();
  const body = await c.req.json();
  const id = uuid();
  const ts = now();

  db.prepare(`
    INSERT INTO tasks (
      id, company_id, goal_id, parent_id, assignee_id,
      title, description, status, priority, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'todo', ?, ?, ?)
  `).run(
    id,
    body.company_id,
    body.goal_id ?? null,
    body.parent_id ?? null,
    body.assignee_id ?? null,
    body.title,
    body.description ?? null,
    body.priority ?? "normal",
    ts,
    ts,
  );

  return c.json(db.prepare("SELECT * FROM tasks WHERE id = ?").get(id), 201);
});

tasks.get("/:id", (c) => {
  const db = getDb();
  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(c.req.param("id")) as Task | undefined;
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

tasks.put("/:id", async (c) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(c.req.param("id")) as Task | undefined;
  if (!existing) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json();
  db.prepare(`
    UPDATE tasks SET
      title = ?, description = ?, status = ?, priority = ?,
      assignee_id = ?, goal_id = ?, parent_id = ?, updated_at = ?
    WHERE id = ?
  `).run(
    body.title ?? existing.title,
    body.description !== undefined ? body.description : existing.description,
    body.status ?? existing.status,
    body.priority ?? existing.priority,
    body.assignee_id !== undefined ? body.assignee_id : existing.assignee_id,
    body.goal_id !== undefined ? body.goal_id : existing.goal_id,
    body.parent_id !== undefined ? body.parent_id : existing.parent_id,
    now(),
    existing.id,
  );

  return c.json(db.prepare("SELECT * FROM tasks WHERE id = ?").get(existing.id));
});

tasks.delete("/:id", (c) => {
  const db = getDb();
  db.prepare("DELETE FROM tasks WHERE id = ?").run(c.req.param("id"));
  return c.json({ ok: true });
});

// Force release checkout lock (admin recovery)
tasks.post("/:id/release", (c) => {
  const db = getDb();
  db.prepare(`
    UPDATE tasks SET checkout_run_id = NULL, status = 'todo', updated_at = ? WHERE id = ?
  `).run(now(), c.req.param("id"));
  return c.json({ ok: true });
});
