/**
 * Seeds a database from the demo content under src/data.
 *
 *   pnpm db:seed           — only if the database is empty
 *   pnpm db:seed --force   — re-import content (replaces seeded rows)
 *
 * In development getDb() seeds an empty database on its own, so this is
 * mainly for --force and for production databases.
 */
import { getDb } from "../src/server/db";
import { seedDatabase } from "../src/server/db/seed";

const force = process.argv.includes("--force");
const db = await getDb();
const result = await seedDatabase(db, { force });
console.log(result.skipped ? "database already has content; use --force to re-import" : "seeded: " + result.summary);
process.exit(0);
