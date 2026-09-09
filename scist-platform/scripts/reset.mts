/* Deletes the local PGlite folder. Refuses to touch a real Postgres. */
import { rmSync, existsSync } from "node:fs";
import path from "node:path";

if (process.env.DATABASE_URL) {
  console.error("DATABASE_URL is set; refusing to reset a real database. Unset it to reset PGlite.");
  process.exit(1);
}
const dir = path.join(process.cwd(), process.env.PGLITE_DIR ?? ".data/pglite");
if (existsSync(dir)) {
  rmSync(dir, { recursive: true, force: true });
  console.log("removed " + dir);
} else {
  console.log("nothing to remove at " + dir);
}
