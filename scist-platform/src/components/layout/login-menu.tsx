"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { X, LogOut, LayoutDashboard, ShieldCheck, Zap, ChevronDown, Loader2, Lock, Ban } from "lucide-react";
import { Button, HexAvatar, buttonClass } from "@/components/ui/primitives";
import { SCHOOLS } from "@/data/schools";
import { useProgress, useHydrated, refreshProfile } from "@/store/progress";
import { api } from "@/lib/api";
import { bannedNotice } from "@/lib/ban-notice";
import { safeNextPath } from "@/lib/safe-next";
import { can, ROLE_LABEL } from "@/lib/permissions";
import { rankFor } from "@/lib/xp";
import { useRanks, useRuntimeFlags, useSettings } from "@/components/settings-provider";
import { formatNumber } from "@/lib/utils";

/**
 * Where the dialog was asked to send the user afterwards. The admin gate
 * (src/proxy.ts) redirects to /?login=admin&next=/admin/... ; a plain
 * /?login=1 just opens the dialog.
 */
interface LoginIntent {
  open: boolean;
  /** "admin" when the admin gate sent the user here */
  reason: string | null;
  /** same-origin path to go to after a successful login */
  next: string | null;
}

const CLOSED: LoginIntent = { open: false, reason: null, next: null };

/** Reads the gate's `?login=…&next=…` out of the current query string. */
function readIntent(params: Pick<URLSearchParams, "has" | "get">): LoginIntent {
  if (!params.has("login")) return CLOSED;
  const next = safeNextPath(params.get("next"));
  const reason = params.get("login");
  return { open: true, reason: reason === "admin" || (next?.startsWith("/admin") ?? false) ? "admin" : reason, next };
}

/** Drops ?login and ?next from the address bar so a refresh does not reopen the dialog. */
function clearIntentFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("login") && !url.searchParams.has("next")) return;
  url.searchParams.delete("login");
  url.searchParams.delete("next");
  window.history.replaceState(window.history.state, "", url.pathname + (url.search || "") + url.hash);
}

const LOGIN_EVENT = "scist:login";

/**
 * Opens the login dialog from anywhere in the app (a gated button, the
 * LoginWall). `next` is the same-origin path to land on after signing in;
 * the header's LoginMenu listens and owns the dialog.
 */
export function requestLogin(next?: string | null, reason: string | null = null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LOGIN_EVENT, { detail: { next: safeNextPath(next), reason } }));
}

function IconDiscord({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.3 4.5A19 19 0 0 0 15.6 3l-.24.44a13 13 0 0 1 4.2 2.1 18.7 18.7 0 0 0-15.1 0 13 13 0 0 1 4.2-2.1L8.4 3a19 19 0 0 0-4.7 1.5C.9 8.6.1 12.6.5 16.5a19 19 0 0 0 5.7 2.9l.9-1.3a12 13 0 0 1-1.9-.9l.4-.3a13.5 13.5 0 0 0 12.8 0l.4.3a12 13 0 0 1-1.9.9l.9 1.3a19 19 0 0 0 5.7-2.9c.5-4.5-.8-8.5-3.2-12ZM8.4 14.3c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3 2 1 2 2.3-.9 2.3-2 2.3Zm7.2 0c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3 2 1 2 2.3-.9 2.3-2 2.3Z" />
    </svg>
  );
}

/**
 * Login dialog. Account + password is the real login. The Discord button
 * appears whenever the server has DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET.
 */
export function LoginDialog({ open, onClose, next, reason }: { open: boolean; onClose: () => void; next?: string | null; reason?: string | null }) {
  if (!open) return null;
  return createPortal(<LoginDialogBody onClose={onClose} next={next ?? null} reason={reason ?? null} />, document.body);
}

function LoginDialogBody({ onClose, next, reason }: { onClose: () => void; next: string | null; reason: string | null }) {
  const site = useSettings().site;
  const siteName = site.name;
  const handle = useProgress((s) => s.handle);
  const role = useProgress((s) => s.role);
  const authenticated = useProgress((s) => s.authenticated);
  const logout = useProgress((s) => s.logout);

  // 有沒有接 Discord 由伺服器決定，不用再記一個 NEXT_PUBLIC_ 變數
  const discordReady = useRuntimeFlags().discordLogin;
  const forAdmin = reason === "admin";
  const forBanned = reason === "banned";
  const canAdmin = can(role, "admin.enter");
  const roleTooLow = forAdmin && authenticated && !canAdmin;

  const [mode, setMode] = useState<"login" | "register">("login");
  const [draft, setDraft] = useState(() => ({
    handle: handle === "guest" ? "" : handle,
    password: "",
    confirm: "",
    schoolId: "",
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const discordHref = next ? "/api/auth/discord?next=" + encodeURIComponent(next) : "/api/auth/discord";

  const finish = async () => {
    await refreshProfile(true);
    if (next) {
      window.location.assign(next);
      return;
    }
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = draft.handle.trim();
    if (!name || !draft.password) return;
    if (mode === "register") {
      if (draft.password.length < 8) {
        setError("密碼至少 8 個字");
        return;
      }
      if (draft.password !== draft.confirm) {
        setError("兩次輸入的密碼不一樣");
        return;
      }
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === "register") {
        await api("/api/auth/register", { body: { handle: name, password: draft.password, schoolId: draft.schoolId || undefined } });
      } else {
        await api("/api/auth/login", { body: { handle: name, password: draft.password } });
      }
      await finish();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登入失敗");
      setBusy(false);
    }
  };

  const inputClass = "h-10 rounded-lg border border-white/[0.08] bg-bg-0 px-3 font-mono text-[14px] outline-none focus:border-accent/50";

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-bg-0/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="text-[16px] font-extrabold">{authenticated ? "帳號" : "登入 " + siteName}</div>
          <button onClick={onClose} className="text-fg-3 hover:text-fg" aria-label="關閉">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {forBanned ? (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red/40 bg-red/[0.08] px-4 py-3">
              <Ban size={15} className="mt-0.5 shrink-0 text-red" />
              <p className="text-[13px] leading-relaxed text-fg-2">
                {bannedNotice(site.discordInvite)}
                {site.discordInvite?.trim() ? (
                  <>
                    {" "}
                    <a href={site.discordInvite} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
                      前往 Discord
                    </a>
                  </>
                ) : null}
              </p>
            </div>
          ) : null}

          {!forAdmin && !forBanned && next && !authenticated ? (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
              <Lock size={15} className="mt-0.5 shrink-0 text-accent" />
              <p className="text-[13px] leading-relaxed text-fg-2">
                看課、解題、累積 XP 都要先登入。登入後會直接帶你回 <span className="font-mono text-fg">{next}</span>。
              </p>
            </div>
          ) : null}

          {forAdmin ? (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber/40 bg-amber/[0.07] px-4 py-3">
              <Lock size={15} className="mt-0.5 shrink-0 text-amber" />
              <p className="text-[13px] leading-relaxed text-fg-2">
                {roleTooLow ? (
                  <>
                    你目前是 <span className="font-mono text-fg">{handle}</span>（{ROLE_LABEL[role]}），後台需要助教以上。角色由管理員在「學員與角色」指派，不能自己選。
                  </>
                ) : (
                  <>
                    後台需要助教以上的權限。登入後會直接帶你回 <span className="font-mono text-fg">{next ?? "/admin"}</span>。
                  </>
                )}
              </p>
            </div>
          ) : null}

          {roleTooLow ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                await logout();
                onClose();
              }}
            >
              <LogOut size={14} />
              登出後換帳號
            </Button>
          ) : (
            <>
              <div className="mb-4 flex rounded-lg border border-white/[0.08] bg-bg-0 p-0.5">
                {(
                  [
                    ["login", "登入"],
                    ["register", "註冊"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setMode(id);
                      setError(null);
                    }}
                    className={
                      "flex-1 rounded-md py-2 text-[13px] font-bold " + (mode === id ? "bg-white/[0.1] text-fg" : "text-fg-3")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              <form className="flex flex-col gap-3" onSubmit={submit}>
                <label className="flex flex-col gap-1.5">
                  <span className="mono-label">帳號</span>
                  <input
                    value={draft.handle}
                    onChange={(e) => setDraft({ ...draft, handle: e.target.value })}
                    placeholder="例如 n0ir"
                    autoComplete="username"
                    maxLength={20}
                    autoFocus
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="mono-label">密碼</span>
                  <input
                    type="password"
                    value={draft.password}
                    onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    className={inputClass}
                  />
                </label>
                {mode === "register" ? (
                  <>
                    <label className="flex flex-col gap-1.5">
                      <span className="mono-label">再輸入一次密碼</span>
                      <input
                        type="password"
                        value={draft.confirm}
                        onChange={(e) => setDraft({ ...draft, confirm: e.target.value })}
                        autoComplete="new-password"
                        className={inputClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="mono-label">學校（可先不填）</span>
                      <select
                        value={draft.schoolId}
                        onChange={(e) => setDraft({ ...draft, schoolId: e.target.value })}
                        className="h-10 rounded-lg border border-white/[0.08] bg-bg-0 px-3 text-[14px] outline-none"
                      >
                        <option value="">先不填</option>
                        {SCHOOLS.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="font-mono text-[11px] leading-relaxed text-fg-3">
                      帳號 3–20 個英數、底線、點或連字號。註冊後預設是學員；還沒有能登入的管理員時，第一個註冊的人會成為管理員。之後角色只能由管理員指派。
                    </p>
                  </>
                ) : null}
                <Button className="mt-1 w-full" disabled={!draft.handle.trim() || !draft.password || busy} type="submit">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                  {mode === "register" ? "建立帳號" : next ? "登入並前往" + (next.startsWith("/admin") ? "後台" : "") : "登入"}
                </Button>
              </form>
            </>
          )}

          {discordReady && !roleTooLow ? (
            <>
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-white/[0.08]" />
                <span className="mono-label">或</span>
                <span className="h-px flex-1 bg-white/[0.08]" />
              </div>
              <a href={discordHref} className={buttonClass("outline", "md", "w-full")}>
                <IconDiscord size={16} />
                用 Discord 登入
              </a>
            </>
          ) : null}

          {authenticated && !roleTooLow ? (
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={async () => {
                await logout();
                onClose();
              }}
            >
              <LogOut size={14} />
              登出
            </Button>
          ) : null}

          {error ? <p className="mt-4 rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-[12.5px] leading-relaxed text-fg-2">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

/** Header control: XP pill + avatar menu, or a login button for guests. */
export function LoginMenu() {
  const hydrated = useHydrated();
  const handle = useProgress((s) => s.handle);
  const displayName = useProgress((s) => s.displayName);
  const role = useProgress((s) => s.role);
  const xp = useProgress((s) => s.xp);
  const authenticated = useProgress((s) => s.authenticated);
  const logout = useProgress((s) => s.logout);
  // 用到一半被停權時 /api/me 會回這個旗標，直接把說明彈出來
  const banned = useProgress((s) => s.banned);
  const dismissBanned = useProgress((s) => s.dismissBanned);
  const searchParams = useSearchParams();
  /**
   * The gate in src/proxy.ts answers a gated page with a redirect to
   * /?login=1&next=… . Clicking a link is a client-side navigation, so this
   * component never unmounts — reading the query once at mount meant the
   * dialog only appeared on a full page load. Derive it from the live search
   * params instead, and remember which query string the reader dismissed so
   * closing it sticks without re-opening on the next render.
   */
  const urlKey = searchParams.toString();
  const urlIntent = useMemo(() => readIntent(searchParams), [searchParams]);
  const [manual, setManual] = useState<LoginIntent | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const intent: LoginIntent = manual ?? (urlIntent.open && dismissedKey !== urlKey ? urlIntent : CLOSED);
  const [menu, setMenu] = useState(false);
  const ranks = useRanks();
  const rank = rankFor(xp, ranks);
  const canAdmin = can(role, "admin.enter");

  // requestLogin() from any component opens the dialog with a destination
  useEffect(() => {
    const onRequest = (e: Event) => {
      const d = (e as CustomEvent<{ next: string | null; reason: string | null }>).detail;
      setManual({ open: true, reason: d.reason ?? (d.next?.startsWith("/admin") ? "admin" : null), next: d.next });
    };
    window.addEventListener(LOGIN_EVENT, onRequest);
    return () => window.removeEventListener(LOGIN_EVENT, onRequest);
  }, []);

  const close = () => {
    setManual(null);
    setDismissedKey(urlKey);
    dismissBanned();
    clearIntentFromUrl();
  };
  const openPlain = () => setManual({ open: true, reason: null, next: null });

  if (!hydrated) return <span className="h-10 w-24" />;

  const dialog = (
    <LoginDialog
      open={intent.open || banned}
      onClose={close}
      next={intent.next}
      reason={banned ? "banned" : intent.reason}
    />
  );

  if (!authenticated) {
    return (
      <>
        <button onClick={openPlain} className={buttonClass("outline", "sm")}>
          登入
        </button>
        {dialog}
      </>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setMenu((v) => !v)}
        className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pl-1.5 pr-3 transition-colors hover:border-accent/50"
        aria-haspopup="menu"
        aria-expanded={menu}
      >
        <HexAvatar seed={handle} size={26} />
        <span className="hidden text-[13px] font-bold sm:inline">{displayName || handle}</span>
        <span className="hidden items-center gap-1 font-mono text-[12px] tabular-nums text-accent sm:flex">
          <Zap size={11} />
          {formatNumber(xp)}
        </span>
        <ChevronDown size={13} className="text-fg-3" />
      </button>

      {menu ? (
        <>
          {createPortal(<div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />, document.body)}
          <div className="card absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden p-1.5" role="menu">
            <div className="px-3 py-2.5">
              <div className="text-[13px] font-bold">{displayName || handle}</div>
              {displayName && displayName !== handle ? <div className="font-mono text-[11px] text-fg-3">@{handle}</div> : null}
              <div className="text-[11.5px]" style={{ color: rank.color }}>
                {rank.name} · {formatNumber(xp)} XP · {ROLE_LABEL[role]}
              </div>
            </div>
            <div className="my-1 h-px bg-white/[0.06]" />
            <Link href="/dashboard" onClick={() => setMenu(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] hover:bg-white/[0.05]">
              <LayoutDashboard size={14} className="text-fg-3" />
              我的進度
            </Link>
            {canAdmin ? (
              <Link href="/admin" onClick={() => setMenu(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] hover:bg-white/[0.05]">
                <ShieldCheck size={14} className="text-accent" />
                後台管理
              </Link>
            ) : null}
            <div className="my-1 h-px bg-white/[0.06]" />
            <button
              onClick={() => {
                setMenu(false);
                void logout();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-fg-2 hover:bg-white/[0.05]"
            >
              <LogOut size={14} />
              登出
            </button>
          </div>
        </>
      ) : null}
      {dialog}
    </div>
  );
}
