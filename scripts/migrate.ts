/*
 * Applies db/migrations/*.sql in name order, each one once and in its own
 * transaction, and records it in schema_migrations. Run by hand
 * (`npm run db:migrate`).
 *
 * Self-contained like ingest.ts: Node runs it without the app's aliases, so
 * it reads DATABASE_URL itself instead of going through src/shared/config/env.
 * Pool, not neon(): the HTTP driver sends one statement per call, and a
 * migration file holds several.
 */
import { readdir, readFile } from "node:fs/promises";
import { Pool } from "@neondatabase/serverless";

const MIGRATIONS = new URL("../db/migrations/", import.meta.url);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. See .env.example.");
}

const pool = new Pool({ connectionString });
const client = await pool.connect();
try {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const { rows } = await client.query<{ name: string }>(
    "SELECT name FROM schema_migrations",
  );
  const applied = new Set(rows.map((row) => row.name));
  const pending = (await readdir(MIGRATIONS))
    .filter((name) => name.endsWith(".sql") && !applied.has(name))
    .sort();

  for (const name of pending) {
    await client.query("BEGIN");
    try {
      await client.query(await readFile(new URL(name, MIGRATIONS), "utf8"));
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
        name,
      ]);
      await client.query("COMMIT");
    } catch (error) {
      // A dropped connection fails the ROLLBACK too; keep the error that matters.
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    }
    console.log(`Applied ${name}`);
  }
  console.log(pending.length ? "Done." : "Nothing to apply.");
} finally {
  client.release();
  await pool.end();
}
