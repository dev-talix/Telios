import { Hono } from "hono";
import { getDb, uuid, now } from "../db/client.ts";
import type { Company } from "../types.ts";

export const company = new Hono();

company.get("/", (c) => {
  const db = getDb();
  const row = db.prepare("SELECT * FROM companies LIMIT 1").get() as Company | undefined;
  return c.json(row ?? null);
});

company.post("/", async (c) => {
  const db = getDb();
  const body = await c.req.json();
  const id = uuid();
  const ts = now();

  db.prepare(`
    INSERT INTO companies (id, name, mission, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, body.name, body.mission ?? null, ts, ts);

  return c.json(db.prepare("SELECT * FROM companies WHERE id = ?").get(id));
});

company.put("/", async (c) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM companies LIMIT 1").get() as Company | undefined;
  if (!existing) return c.json({ error: "No company found" }, 404);

  const body = await c.req.json();
  db.prepare(`
    UPDATE companies SET name = ?, mission = ?, updated_at = ? WHERE id = ?
  `).run(
    body.name ?? existing.name,
    body.mission !== undefined ? body.mission : existing.mission,
    now(),
    existing.id,
  );

  return c.json(db.prepare("SELECT * FROM companies WHERE id = ?").get(existing.id));
});
