/**
 * RxFx Admin — Database connection (mirrors Trade Journal Pro's server/db.ts).
 *
 * Uses pg.Pool with DATABASE_URL for direct PostgreSQL access.
 * Falls back to Supabase REST API when DATABASE_URL is not configured.
 */
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";

const { Pool } = pg;

let _pool: pg.Pool | null = null;

export function getPool(): pg.Pool | null {
  if (_pool) return _pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("[db] DATABASE_URL not set — using Supabase REST API fallback");
    return null;
  }

  const sslDisabled = process.env.DATABASE_SSL === "disabled";
  _pool = new Pool({
    connectionString,
    ssl: sslDisabled ? false : { rejectUnauthorized: true },
  });

  console.log("[db] PostgreSQL pool initialized");
  return _pool;
}

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (_db) return _db;
  const pool = getPool();
  if (!pool) return null;
  _db = drizzle(pool, { schema });
  return _db;
}

/** Run a parameterized SQL query through the PG pool. Returns rows. */
export async function query(text: string, params?: unknown[]): Promise<unknown[]> {
  const pool = getPool();
  if (!pool) throw new Error("Database unavailable");
  const result = await pool.query(text, params);
  return result.rows;
}

/** Run a mutation (INSERT/UPDATE/DELETE) through the PG pool. Returns rowCount. */
export async function mutate(text: string, params?: unknown[]): Promise<number> {
  const pool = getPool();
  if (!pool) throw new Error("Database unavailable");
  const result = await pool.query(text, params);
  return result.rowCount ?? 0;
}

// ── SQL helpers (mirrors Trade Journal Pro's allowlisting) ──
const VALID_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function validateIdentifier(name: string, label = "identifier"): string {
  if (!VALID_IDENTIFIER.test(name)) {
    throw new Error(`Invalid SQL ${label}: ${name}`);
  }
  return name;
}

export { schema };
