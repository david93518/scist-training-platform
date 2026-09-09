/**
 * Removes the demo roster and the fake numbers it leaves behind, so the first
 * real sign-up lands on an empty leaderboard.
 *
 *   pnpm db:clean-demo         — dry run, prints what would go
 *   pnpm db:clean-demo --yes   — actually delete
 *
 * Demo users are matched by their exact seeded ids rather than `id like 'p%'`:
 * real ids come from nanoid, whose alphabet contains "p", so the pattern would
 * take roughly one real account in sixty with it.
 *
 * Deleting a user cascades to solves, attempts, hint unlocks, lesson progress,
 * xp_ledger, instances, event registrations and votes. Questions and answers
 * survive with author_id set to null, so the seeded ones are removed by id.
 */
import { inArray, sql } from "drizzle-orm";
import { getDb, schema } from "../src/server/db";
import { PLAYERS } from "../src/data/players";
import { QUESTIONS } from "../src/data/questions";

const apply = process.argv.includes("--yes");
const demoUserIds = [...PLAYERS.map((p) => p.id), "tester", "helper", "dev-admin", "e2e-user"];
const demoQuestionIds = QUESTIONS.map((q) => q.id);

const db = await getDb();

const count = async (table: string, where: string) => {
  const rows = await db.execute<{ n: number }>(sql.raw(`select count(*)::int as n from ${table} where ${where}`));
  const list = (Array.isArray(rows) ? rows : rows.rows) as { n: number }[];
  return Number(list[0]?.n ?? 0);
};

const quoted = (ids: string[]) => ids.map((id) => `'${id}'`).join(",");

const plan = [
  { label: "示範帳號 users", n: await count("users", `id in (${quoted(demoUserIds)})`) },
  { label: "示範 XP xp_ledger", n: await count("xp_ledger", `reason = 'admin' and label like '示範資料%'`) },
  { label: "假解題 solves", n: await count("solves", `user_id in (${quoted(demoUserIds)})`) },
  { label: "示範問答 questions", n: await count("questions", `id in (${quoted(demoQuestionIds)})`) },
  { label: "灌水解題數 challenges.base_solves", n: await count("challenges", "base_solves <> 0 or rating <> 0") },
  { label: "灌水報名數 events.base_registered", n: await count("events", "base_registered <> 0") },
];

for (const p of plan) console.log(`  ${String(p.n).padStart(5)}  ${p.label}`);

if (!apply) {
  console.log("\ndry run — 加上 --yes 才會真的刪除");
  process.exit(0);
}

await db.delete(schema.xpLedger).where(sql`${schema.xpLedger.reason} = 'admin' and ${schema.xpLedger.label} like '示範資料%'`);
await db.delete(schema.questions).where(inArray(schema.questions.id, demoQuestionIds));
await db.delete(schema.users).where(inArray(schema.users.id, demoUserIds));
await db.update(schema.challenges).set({ baseSolves: 0, rating: 0 });
await db.update(schema.events).set({ baseRegistered: 0 });

console.log("\n示範資料已清除。排行榜現在是空的。");
process.exit(0);
