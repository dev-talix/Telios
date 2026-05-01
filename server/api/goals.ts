import { Hono } from "hono";
import { getDb, uuid, now } from "../db/client.ts";
import type { Goal } from "../types.ts";

export const goals = new Hono();

goals.get("/", (c) => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM goals ORDER BY created_at ASC").all() as Goal[];
  return c.json(rows);
});

goals.post("/", async (c) => {
  const db = getDb();
  const body = await c.req.json();
  const id = uuid();
  const ts = now();

  db.prepare(`
    INSERT INTO goals (id, company_id, parent_id, title, description, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(id, body.company_id, body.parent_id ?? null, body.title, body.description ?? null, ts, ts);

  return c.json(db.prepare("SELECT * FROM goals WHERE id = ?").get(id), 201);
});

goals.get("/:id", (c) => {
  const db = getDb();
  const row = db.prepare("SELECT * FROM goals WHERE id = ?").get(c.req.param("id")) as Goal | undefined;
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

goals.put("/:id", async (c) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM goals WHERE id = ?").get(c.req.param("id")) as Goal | undefined;
  if (!existing) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json();
  db.prepare(`
    UPDATE goals SET
      title = ?, description = ?, status = ?, parent_id = ?, updated_at = ?
    WHERE id = ?
  `).run(
    body.title ?? existing.title,
    body.description !== undefined ? body.description : existing.description,
    body.status ?? existing.status,
    body.parent_id !== undefined ? body.parent_id : existing.parent_id,
    now(),
    existing.id,
  );

  return c.json(db.prepare("SELECT * FROM goals WHERE id = ?").get(existing.id));
});

goals.delete("/:id", (c) => {
  const db = getDb();
  db.prepare("DELETE FROM goals WHERE id = ?").run(c.req.param("id"));
  return c.json({ ok: true });
});
