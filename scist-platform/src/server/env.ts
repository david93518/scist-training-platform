import { z } from "zod";

/**
 * Every integration is optional so `pnpm dev` works with zero configuration:
 * PGlite for the database, a dev login instead of Discord, mock instances,
 * and uploads that fall back to pasting a video ID or file name.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  /** postgres://… for real Postgres; unset → embedded PGlite in PGLITE_DIR */
  DATABASE_URL: z.string().optional(),
  PGLITE_DIR: z.string().default(".data/pglite"),

  /** signs the session cookie; generated per process in dev when unset */
  AUTH_SECRET: z.string().min(16).optional(),
  APP_URL: z.string().optional(),

  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  /** comma-separated Discord user IDs that become admins on first login */
  ADMIN_DISCORD_IDS: z.string().default(""),
  DISCORD_WEBHOOK_URL: z.string().optional(),

  CF_ACCOUNT_ID: z.string().optional(),
  CF_STREAM_API_TOKEN: z.string().optional(),
  /** public playback subdomain code, e.g. "abc123" in customer-abc123.cloudflarestream.com */
  CF_STREAM_CUSTOMER_CODE: z.string().optional(),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),

  INSTANCER_URL: z.string().optional(),
  INSTANCER_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error("Invalid environment: " + JSON.stringify(parsed.error.issues));
  }
  cached = parsed.data;
  return cached;
}

/** Absolute origin of this deployment, for metadata, sitemap and robots. */
export function siteUrl(): string {
  const configured = env().APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return "https://" + vercel;
  return "https://gate.scist.org";
}

export const features = {
  discordLogin: () => Boolean(env().DISCORD_CLIENT_ID && env().DISCORD_CLIENT_SECRET),
  stream: () => Boolean(env().CF_ACCOUNT_ID && env().CF_STREAM_API_TOKEN),
  r2: () =>
    Boolean(env().R2_ACCOUNT_ID && env().R2_ACCESS_KEY_ID && env().R2_SECRET_ACCESS_KEY && env().R2_BUCKET),
  instancer: () => Boolean(env().INSTANCER_URL && env().INSTANCER_SECRET),
  discordWebhook: () => Boolean(env().DISCORD_WEBHOOK_URL),
  devLogin: () => env().NODE_ENV !== "production",
};
