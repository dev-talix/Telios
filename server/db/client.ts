import { Database } from "@db/sqlite";
import { MIGRATIONS } from "./schema.ts";
import { join } from "jsr:@std/path@^1";
import { ensureDir } from "jsr:@std/fs@^1";

let _db: Database | null = null;

export function getDb(): Database {
  if (!_db) throw new Error("DB not initialized — call initDb() first");
  return _db;
}

export async function initDb(dataDir: string): Promise<Database> {
  await ensureDir(dataDir);
  const dbPath = join(dataDir, "telos.db");
  const db = new Database(dbPath);

  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(MIGRATIONS);

  _db = db;
  return db;
}

export function uuid(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}

export function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
