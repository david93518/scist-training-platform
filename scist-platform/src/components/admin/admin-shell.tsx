"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  GraduationCap,
  Flag,
  CalendarDays,
  Users,
  MessageSquare,
  Settings2,
  ArrowLeft,
  Lock,
  Database,
  Layers,
  Presentation,
  Server,
  ChartColumn,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { buttonClass, HexAvatar } from "@/components/ui/primitives";
import { LoginDialog } from "@/components/layout/login-menu";
import { useProgress, useHydrated } from "@/store/progress";
import { getAdminApi } from "@/admin/api";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
  exact?: boolean;
}

const NAV: { group: string | null; items: NavItem[] }[] = [
  { group: null, items: [{ href: "/admin", label: "總覽", Icon: LayoutDashboard, exact: true }] },
  {
    group: "內容",
    items: [
      { href: "/admin/tracks", label: "學習路徑", Icon: Layers },
      { href: "/admin/lessons", label: "課程與影片", Icon: GraduationCap },
      { href: "/admin/challenges", label: "題庫", Icon: Flag },
      { href: "/admin/events", label: "活動", Icon: CalendarDays },
      { href: "/admin/instructors", label: "講師", Icon: Presentation },
    ],
  },
  {
    group: "學員",
    items: [
      { href: "/admin/users", label: "學員與角色", Icon: Users },
      { href: "/admin/questions", label: "問答", Icon: MessageSquare },
      { href: "/admin/instances", label: "靶機環境", Icon: Server },
    ],
  },
  {
    group: "營運",
    items: [
      { href: "/admin/analytics", label: "數據", Icon: ChartColumn },
      { href: "/admin/audit", label: "操作紀錄", Icon: ScrollText },
      { href: "/admin/settings", label: "設定與整合", Icon: Settings2 },
    ],
  },
];

const FLAT = NAV.flatMap((g) => g.items);

const CRUMBS: Record<string, string> = {
  admin: "後台",
  tracks: "學習路徑",
  lessons: "課程與影片",
  challenges: "題庫",
  events: "活動",
  instructors: "講師",
  users: "學員與角色",
  questions: "問答",
  instances: "靶機環境",
  analytics: "數據",
  audit: "操作紀錄",
  settings: "設定與整合",
  new: "新增",
};

function isActive(item: NavItem, pathname: string) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const role = useProgress((s) => s.role);
  const handle = useProgress((s) => s.handle);
  const authenticated = useProgress((s) => s.authenticated);
  const sessionChecked = useProgress((s) => s.sessionChecked);
  const setProfile = useProgress((s) => s.setProfile);
  const schoolId = useProgress((s) => s.schoolId);
  const [login, setLogin] = useState(false);
  const api = getAdminApi();

  // HTTP mode: the role comes from the session (GET /api/me) and the request
  // proxy already turned away anyone without one. Local mode: the role lives
  // in this browser.
  const allowed = hydrated && (role === "instructor" || role === "admin") && (api.mode === "local" || authenticated);
  const parts = pathname.split("/").filter(Boolean);

  useEffect(() => {
    document.documentElement.classList.add("admin");
    return () => document.documentElement.classList.remove("admin");
  }, []);

  // local mode only: /admin?as=admin sets the browser-side role. In HTTP mode
  // the proxy handles ?as= by signing a real development session.
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !hydrated || api.mode !== "local") return;
    const as = new URLSearchParams(window.location.search).get("as");
    if (as === "student" || as === "ta" || as === "instructor" || as === "admin") {
      setProfile(handle === "guest" ? "dev-" + as : handle, schoolId, as);
    }
  }, [hydrated, handle, schoolId, setProfile, api.mode]);

  if (!hydrated || (api.mode === "http" && !sessionChecked)) return null;

  if (!allowed) {
    return (
      <div className="relative grid min-h-[80vh] place-items-center px-5">
        <div className="card w-full max-w-md p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber/15">
            <Lock size={22} className="text-amber" />
          </span>
          <h1 className="display mt-5 text-[26px]">後台需要講師或管理員權限</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-fg-2">
            你目前是 <span className="font-mono text-fg">{authenticated || api.mode === "local" ? handle : "未登入"}</span>
            {authenticated || api.mode === "local" ? <>，角色「{ROLE_LABEL[role]}」</> : null}。
            正式站以 Discord 登入後由管理員指派角色；開發時可以用下面的登入切換，或直接開 /admin?as=admin。
          </p>
          <button onClick={() => setLogin(true)} className={buttonClass("primary", "md", "mt-6 w-full")}>
            登入 / 切換角色
          </button>
          <Link href="/" className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-fg-3 hover:text-fg">
            <ArrowLeft size={13} />
            回前台
          </Link>
        </div>
        <LoginDialog open={login} onClose={() => setLogin(false)} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-white/[0.06] bg-bg-1/80 backdrop-blur lg:flex">
        <div className="flex h-[68px] items-center border-b border-white/[0.06] px-5">
          <Link href="/admin">
            <Logo />
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {NAV.map((group, gi) => (
            <div key={gi} className={cn("flex flex-col gap-1", gi > 0 && "mt-3")}>
              {group.group ? <div className="mono-label px-3.5 pb-1 pt-1 text-[10px] text-fg-3/80">{group.group}</div> : null}
              {group.items.map((item) => {
                const active = isActive(item, pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-bold transition-colors",
                      active ? "bg-accent/10 text-accent" : "text-fg-2 hover:bg-white/[0.04] hover:text-fg",
                    )}
                  >
                    <item.Icon size={16} />
                    {item.label}
                    {active ? <span className="ml-auto clip-hex h-2 w-2 bg-accent shadow-[0_0_10px_rgba(164,241,59,0.9)]" /> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/[0.06] p-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
            <Database size={14} className={api.mode === "http" ? "text-accent" : "text-amber"} />
            <div className="min-w-0 leading-tight">
              <div className="text-[12px] font-bold">{api.mode === "http" ? "已接上 API" : "本機模式"}</div>
              <div className="truncate text-[10.5px] text-fg-3">
                {api.mode === "http" ? "變更會寫入資料庫" : "變更只存在這台瀏覽器"}
              </div>
            </div>
          </div>
          <Link href="/" className="mt-3 flex items-center gap-2 px-1 text-[12.5px] text-fg-3 hover:text-fg">
            <ArrowLeft size={13} />
            回到前台
          </Link>
        </div>
      </aside>

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-[68px] items-center gap-4 border-b border-white/[0.06] bg-bg-0/80 px-5 backdrop-blur-xl lg:px-8">
          <Link href="/admin" className="lg:hidden">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1.5 font-mono text-[12px] text-fg-3 lg:flex">
            {parts.map((p, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 ? <span className="text-fg-3/50">/</span> : null}
                <span className={i === parts.length - 1 ? "text-fg" : ""}>{CRUMBS[p] ?? p}</span>
              </span>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span
              className="rounded-md border px-2 py-0.5 font-mono text-[10.5px] tracking-wider"
              style={{ color: ROLE_COLOR[role], borderColor: ROLE_COLOR[role] + "55", background: ROLE_COLOR[role] + "14" }}
            >
              {ROLE_LABEL[role].toUpperCase()}
            </span>
            <button onClick={() => setLogin(true)} className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-1.5 pl-1.5 pr-3 hover:border-white/20">
              <HexAvatar seed={handle} size={26} />
              <span className="font-mono text-[12.5px] font-bold">{handle}</span>
            </button>
          </div>
        </header>

        {/* mobile nav */}
        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] px-3 py-2 no-scrollbar lg:hidden">
          {FLAT.map((item) => {
            const active = isActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-bold",
                  active ? "bg-accent/10 text-accent" : "text-fg-2",
                )}
              >
                <item.Icon size={13} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <main className="flex-1 px-5 py-8 lg:px-8">{children}</main>
      </div>

      <LoginDialog open={login} onClose={() => setLogin(false)} />
    </div>
  );
}

export const ROLE_LABEL: Record<string, string> = {
  student: "學員",
  ta: "助教",
  instructor: "講師",
  admin: "管理員",
};
export const ROLE_COLOR: Record<string, string> = {
  student: "#a9b6c6",
  ta: "#4da3ff",
  instructor: "#a4f13b",
  admin: "#ffb84d",
};
