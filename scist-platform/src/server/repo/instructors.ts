import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import type { AdminInstructor } from "@/admin/types";

export async function listInstructorsAdmin(): Promise<AdminInstructor[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.instructors).orderBy(asc(schema.instructors.sortOrder), asc(schema.instructors.name));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    handle: r.handle,
    role: r.role,
    domains: r.domains,
    bio: r.bio,
    creds: r.creds,
    accent: r.accent,
    userId: r.userId,
    sortOrder: r.sortOrder,
  }));
}

export async function findInstructorAdmin(id: string): Promise<AdminInstructor | null> {
  return (await listInstructorsAdmin()).find((i) => i.id === id) ?? null;
}

export async function saveInstructor(input: AdminInstructor): Promise<AdminInstructor> {
  const db = await getDb();
  const row = {
    id: input.id,
    name: input.name,
    handle: input.handle,
    role: input.role,
    domains: input.domains,
    bio: input.bio,
    creds: input.creds,
    accent: input.accent,
    userId: input.userId,
    sortOrder: input.sortOrder,
  };
  await db.insert(schema.instructors).values(row).onConflictDoUpdate({ target: schema.instructors.id, set: row });
  return input;
}

/** Removes the instructor and detaches them from tracks, challenges and events. */
export async function deleteInstructor(id: string) {
  const db = await getDb();
  await db.update(schema.tracks).set({ instructorId: null }).where(eq(schema.tracks.instructorId, id));
  await db.update(schema.challenges).set({ authorId: null }).where(eq(schema.challenges.authorId, id));
  await db.update(schema.events).set({ hostId: null }).where(eq(schema.events.hostId, id));
  await db.delete(schema.instructors).where(eq(schema.instructors.id, id));
}
