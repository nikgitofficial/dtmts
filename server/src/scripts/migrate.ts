import { readdirSync, readFileSync } from "node:fs";
import { pool } from "../config/db.js";

const dir = new URL("../../migrations/", import.meta.url);

await pool.query(
  "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
);
const done = new Set((await pool.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name as string));
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

for (const f of files) {
  if (done.has(f)) continue;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(readFileSync(new URL(f, dir), "utf8"));
    await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [f]);
    await client.query("COMMIT");
    console.log("applied", f);
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
console.log("Database up to date");
await pool.end();