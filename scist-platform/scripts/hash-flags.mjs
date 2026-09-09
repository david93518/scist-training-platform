// Reads src/data/flags.local.json (gitignored plaintext) and writes
// src/data/flag-hashes.json (SHA-256 per flag). Run: node scripts/hash-flags.mjs
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const src = JSON.parse(readFileSync(new URL("../src/data/flags.local.json", import.meta.url), "utf8"));
const out = {};
for (const [slug, flags] of Object.entries(src)) {
  out[slug] = flags.map((f) => createHash("sha256").update(f).digest("hex"));
}
writeFileSync(new URL("../src/data/flag-hashes.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log("hashed", Object.keys(out).length, "challenges");
