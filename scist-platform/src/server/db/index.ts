/**
 * Database connection.
 *
 * - No DATABASE_URL → embedded PGlite stored under PGLITE_DIR. Zero setup for
 *   local development and for the first pilot.
 * - DATABASE_URL=postgres://… → postgres-js against Neon / Supabase / a VPS.
 *
 * Migrations in ./drizzle run automatically on first connection so a fresh
 * checkout is usable immediately. Outside production an empty database is
 * also seeded with the demo content (AUTO_SEED=0 turns that off, AUTO_SEED=1
 * turns it on in production). The instance is cached on globalThis so Next's
 * hot reload does not open a second PGlite handle on the same folder.
 */
import path from "node:path";
import { mkdirSync } from "node:fs";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import * as schema from "./schema";
import { env } from "../env";
import { isDatabaseEmpty, seedDatabase } from "./seed";
import { ensureBootstrapAdmin } from "./bootstrap-admin";

export type Db = PgliteDatabase<typeof schema> | PostgresJsDatabase<typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

type Cache = { promise: Promise<Db> | null; kind: "pglite" | "postgres" | null };
const g = globalThis as unknown as { __scistDb?: Cache };
const cache: Cache = g.__scistDb ?? { promise: null, kind: null };
g.__scistDb = cache;

async function seedIfEmpty(db: Db) {
  const flag = process.env.AUTO_SEED;
  const wanted = flag === "1" || (flag !== "0" && env().NODE_ENV !== "production");
  if (!wanted) return;
  if (await isDatabaseEmpty(db)) {
    const r = await seedDatabase(db);
    if (!r.skipped) console.log("[db] empty database seeded with demo content: " + r.summary);
  }
}

async function connect(): Promise<Db> {
  const { DATABASE_URL, PGLITE_DIR } = env();

  if (DATABASE_URL) {
    const postgres = (await import("postgres")).default;
    const client = postgres(DATABASE_URL, { max: 5, prepare: false });
    const db = drizzlePostgres(client, { schema });
    await migratePostgres(db, { migrationsFolder: MIGRATIONS });
    cache.kind = "postgres";
    await seedIfEmpty(db);
    await ensureBootstrapAdmin(db);
    return db;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const dir = path.isAbsolute(PGLITE_DIR) ? PGLITE_DIR : path.join(process.cwd(), PGLITE_DIR);
  mkdirSync(dir, { recursive: true }); // PGlite does not create parent folders
  const client = new PGlite(dir);
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS });
  cache.kind = "pglite";
  await seedIfEmpty(db);
  await ensureBootstrapAdmin(db);
  return db;
}

export function getDb(): Promise<Db> {
  if (!cache.promise) {
    cache.promise = connect().catch((err) => {
      cache.promise = null;
      throw err;
    });
  }
  return cache.promise;
}

export function dbKind() {
  return cache.kind;
}

export { schema };
