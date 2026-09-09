import { z } from "zod";

/**
 * Every integration is optional so `pnpm dev` works with zero configuration:
 * PGlite for the database, account/password login, mock instances,
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
  /** bearer token that lets the weekly backup job read /api/admin/export */
  BACKUP_TOKEN: z.string().min(24).optional(),

  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  /** comma-separated Discord user IDs that become admins on first login */
  ADMIN_DISCORD_IDS: z.string().default(""),
  /** comma-separated handles that become admin when they register */
  ADMIN_HANDLES: z.string().default(""),
  /** 啟動時若該帳號不存在就建立管理員。兩個都要填才會動 */
  BOOTSTRAP_ADMIN_HANDLE: z.string().optional(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(8).optional(),
  /** 打開才允許 /api/auth/dev 與 /admin?as=…，預設關閉 */
  ENABLE_DEV_LOGIN: z.enum(["0", "1"]).optional(),
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

  /** 錯誤監控。沒填就不上報，本機與 CI 都不必申請帳號 */
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
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
  sentry: () => Boolean(env().SENTRY_DSN || env().NEXT_PUBLIC_SENTRY_DSN),
  /** 選角色那種開發登入。正式站永遠關；本機也要 ENABLE_DEV_LOGIN=1 才開 */
  devLogin: () => env().NODE_ENV !== "production" && env().ENABLE_DEV_LOGIN === "1",
};
