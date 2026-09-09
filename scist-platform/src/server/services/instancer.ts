/**
 * Instancer — the small service on the VPS that starts one Docker container
 * per learner per challenge. Contract (see instancer/README.md):
 *
 *   POST   {INSTANCER_URL}/instances
 *          { image, port, ttlMinutes, labels: { userId, challengeId } }
 *          → 201 { id, host, port, expiresAt }
 *   DELETE {INSTANCER_URL}/instances/{id}        → 204
 *   GET    {INSTANCER_URL}/instances/{id}        → { id, status, host, port, expiresAt }
 *
 * Every call carries `Authorization: Bearer {INSTANCER_SECRET}`.
 * Without configuration the platform returns a mock instance so the UI flow
 * can be exercised end to end.
 */
import { env, features } from "../env";

export interface SpawnRequest {
  image: string;
  port: number;
  ttlMinutes: number;
  userId: string;
  challengeId: string;
}

export interface SpawnedInstance {
  externalId: string;
  host: string;
  port: number;
  expiresAt: Date;
  mode: "real" | "mock";
}

function headers() {
  return { authorization: "Bearer " + env().INSTANCER_SECRET, "content-type": "application/json" };
}

export async function spawn(req: SpawnRequest): Promise<SpawnedInstance> {
  const expiresAt = new Date(Date.now() + req.ttlMinutes * 60_000);
  if (!features.instancer()) {
    const octet = 20 + (parseInt(req.challengeId.replace(/\D/g, "").slice(-2) || "7", 10) % 200);
    return { externalId: "mock-" + Date.now().toString(36), host: "10.31.4." + octet, port: 30000 + (Math.abs(hash(req.userId + req.challengeId)) % 2000), expiresAt, mode: "mock" };
  }
  const res = await fetch(env().INSTANCER_URL + "/instances", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ image: req.image, port: req.port, ttlMinutes: req.ttlMinutes, labels: { userId: req.userId, challengeId: req.challengeId } }),
  });
  if (!res.ok) throw new Error("instancer spawn failed: " + res.status + " " + (await res.text()));
  const data = (await res.json()) as { id: string; host: string; port: number; expiresAt: string };
  return { externalId: data.id, host: data.host, port: data.port, expiresAt: new Date(data.expiresAt), mode: "real" };
}

export async function kill(externalId: string) {
  if (!features.instancer() || externalId.startsWith("mock-")) return;
  await fetch(env().INSTANCER_URL + "/instances/" + externalId, { method: "DELETE", headers: headers() });
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
