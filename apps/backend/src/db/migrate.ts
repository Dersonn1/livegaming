import fs from "node:fs";
import path from "node:path";
import { getPool } from "./pool";
import { logger } from "../logging/logger";

async function main() {
  const pool = getPool();
  if (!pool) {
    logger.warn("DATABASE_URL not set — skipping migrations (in-memory mode).");
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const dir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const { rows } = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE filename = $1",
      [file]
    );
    if (rows.length > 0) {
      logger.info(`Skipping already-applied migration ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, file), "utf-8");
    logger.info(`Applying migration ${file}`);
    await pool.query("BEGIN");
    try {
      await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
      await pool.query(sql);
      await pool.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await pool.query("COMMIT");
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  }

  logger.info("Migrations complete.");
  await pool.end();
}

main().catch((err) => {
  logger.error(err, "Migration failed");
  process.exit(1);
});
