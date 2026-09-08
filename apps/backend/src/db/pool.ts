import { Pool } from "pg";
import { env } from "../config/env";

let pool: Pool | null = null;

/** Returns a shared pg Pool, or null when running without Postgres (in-memory mode). */
export function getPool(): Pool | null {
  if (!env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({ connectionString: env.DATABASE_URL });
  }
  return pool;
}

export const isPersistentStorageEnabled = (): boolean => Boolean(env.DATABASE_URL);
