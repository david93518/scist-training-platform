/* Applies ./drizzle migrations to whatever DATABASE_URL points at (or PGlite). */
import { getDb, dbKind } from "../src/server/db";

const db = await getDb();
void db;
console.log("migrations applied to " + dbKind());
process.exit(0);
