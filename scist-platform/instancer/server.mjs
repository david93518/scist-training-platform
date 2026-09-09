/**
 * SCIST Gate instancer — one container per learner per challenge.
 *
 * Tiny HTTP service meant to run on the VPS next to Docker. The platform talks
 * to it with a shared secret; learners never reach it directly.
 *
 *   POST   /instances            { image, port, ttlMinutes, labels }  → 201 { id, host, port, expiresAt }
 *   GET    /instances/:id        → { id, status, host, port, expiresAt }
 *   DELETE /instances/:id        → 204
 *   GET    /healthz              → { ok, mode, running }
 *
 * Env:
 *   INSTANCER_SECRET   shared bearer token (required)
 *   PUBLIC_HOST        hostname/IP learners connect to (required for real mode)
 *   PORT               listen port, default 8080
 *   PORT_RANGE         host ports to hand out, default 30000-32000
 *   MAX_INSTANCES      default 100
 *   MOCK               set to 1 to run without Docker (local testing)
 */
import http from "node:http";
import { randomBytes } from "node:crypto";

const SECRET = process.env.INSTANCER_SECRET;
const PUBLIC_HOST = process.env.PUBLIC_HOST ?? "127.0.0.1";
const PORT = Number(process.env.PORT ?? 8080);
const [RANGE_START, RANGE_END] = (process.env.PORT_RANGE ?? "30000-32000").split("-").map(Number);
const MAX = Number(process.env.MAX_INSTANCES ?? 100);
const MOCK = process.env.MOCK === "1";

if (!SECRET) {
  console.error("INSTANCER_SECRET is required");
  process.exit(1);
}

/* ------------------------------ backend ------------------------------ */
let docker = null;
if (!MOCK) {
  const { default: Docker } = await import("dockerode");
  docker = new Docker();
}

/** id → { id, host, port, expiresAt, containerId } */
const registry = new Map();
const usedPorts = new Set();

function pickPort() {
  for (let i = 0; i < 500; i++) {
    const p = RANGE_START + Math.floor(Math.random() * (RANGE_END - RANGE_START));
    if (!usedPorts.has(p)) {
      usedPorts.add(p);
      return p;
    }
  }
  throw new Error("no free port");
}

async function ensureImage(image) {
  try {
    await docker.getImage(image).inspect();
  } catch {
    await new Promise((resolve, reject) =>
      docker.pull(image, (err, stream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (e) => (e ? reject(e) : resolve()));
      }),
    );
  }
}

async function spawn({ image, port, ttlMinutes, labels }) {
  if (registry.size >= MAX) throw Object.assign(new Error("instance limit reached"), { status: 503 });
  const hostPort = pickPort();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  const id = randomBytes(6).toString("hex");

  if (MOCK) {
    registry.set(id, { id, host: PUBLIC_HOST, port: hostPort, expiresAt, containerId: null });
    return registry.get(id);
  }

  await ensureImage(image);
  const container = await docker.createContainer({
    Image: image,
    name: "scist-" + id,
    Labels: {
      "scist.instancer": "1",
      "scist.userId": String(labels?.userId ?? ""),
      "scist.challengeId": String(labels?.challengeId ?? ""),
      "scist.expiresAt": expiresAt.toISOString(),
    },
    ExposedPorts: { [port + "/tcp"]: {} },
    HostConfig: {
      PortBindings: { [port + "/tcp"]: [{ HostPort: String(hostPort) }] },
      Memory: 256 * 1024 * 1024,
      NanoCpus: 500_000_000, // half a core
      PidsLimit: 256,
      RestartPolicy: { Name: "no" },
      ReadonlyRootfs: false,
      CapDrop: ["ALL"],
      CapAdd: ["CHOWN", "SETUID", "SETGID", "NET_BIND_SERVICE"],
      SecurityOpt: ["no-new-privileges"],
    },
  });
  await container.start();
  registry.set(id, { id, host: PUBLIC_HOST, port: hostPort, expiresAt, containerId: container.id });
  return registry.get(id);
}

async function kill(id) {
  const inst = registry.get(id);
  if (!inst) return false;
  registry.delete(id);
  usedPorts.delete(inst.port);
  if (inst.containerId && docker) {
    const c = docker.getContainer(inst.containerId);
    await c.stop({ t: 3 }).catch(() => {});
    await c.remove({ force: true }).catch(() => {});
  }
  return true;
}

// reaper: expired instances and orphaned containers from a previous run
setInterval(async () => {
  const now = Date.now();
  for (const inst of registry.values()) if (inst.expiresAt.getTime() < now) await kill(inst.id);
  if (docker) {
    const list = await docker.listContainers({ all: true, filters: { label: ["scist.instancer=1"] } }).catch(() => []);
    for (const c of list) {
      const exp = Date.parse(c.Labels["scist.expiresAt"] ?? "");
      const known = [...registry.values()].some((i) => i.containerId === c.Id);
      if (!known || (exp && exp < now)) {
        const h = docker.getContainer(c.Id);
        await h.stop({ t: 3 }).catch(() => {});
        await h.remove({ force: true }).catch(() => {});
      }
    }
  }
}, 60_000).unref();

/* ------------------------------ http ------------------------------ */
function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(body === undefined ? "" : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/healthz") return send(res, 200, { ok: true, mode: MOCK ? "mock" : "docker", running: registry.size });

  if (req.headers.authorization !== "Bearer " + SECRET) return send(res, 401, { error: "unauthorized" });

  try {
    if (req.method === "POST" && url.pathname === "/instances") {
      const body = await readBody(req);
      if (!body.image || !body.port) return send(res, 400, { error: "image and port are required" });
      const inst = await spawn({ image: String(body.image), port: Number(body.port), ttlMinutes: Number(body.ttlMinutes ?? 120), labels: body.labels });
      return send(res, 201, { id: inst.id, host: inst.host, port: inst.port, expiresAt: inst.expiresAt.toISOString() });
    }
    const m = url.pathname.match(/^\/instances\/([a-f0-9]+)$/);
    if (m && req.method === "GET") {
      const inst = registry.get(m[1]);
      if (!inst) return send(res, 404, { error: "not found" });
      return send(res, 200, { id: inst.id, status: "running", host: inst.host, port: inst.port, expiresAt: inst.expiresAt.toISOString() });
    }
    if (m && req.method === "DELETE") {
      await kill(m[1]);
      return send(res, 204);
    }
    return send(res, 404, { error: "not found" });
  } catch (e) {
    console.error(e);
    return send(res, e.status ?? 500, { error: e.message ?? "internal error" });
  }
});

server.listen(PORT, () => console.log("instancer listening on " + PORT + " (" + (MOCK ? "mock" : "docker") + ")"));
