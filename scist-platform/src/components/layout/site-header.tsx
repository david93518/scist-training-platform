"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Menu, X, Zap, ChevronRight } from "lucide-react";
import { LoginMenu } from "@/components/layout/login-menu";
import { Logo } from "@/components/ui/logo";
import { buttonClass } from "@/components/ui/primitives";
import { cn, formatNumber } from "@/lib/utils";
import { rankFor } from "@/lib/xp";
import { useRanks } from "@/components/settings-provider";
import { useProgress, useHydrated } from "@/store/progress";

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

const NAV = [
  { href: "/learn", label: "課程" },
  { href: "/challenges", label: "題庫" },
  { href: "/leaderboard", label: "排行榜" },
  { href: "/community", label: "社群" },
  { href: "/about", label: "關於" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > 8,
    () => false,
  );
  const xp = useProgress((s) => s.xp);
  const hydrated = useHydrated();
  const ranks = useRanks();
  const rank = rankFor(xp, ranks);

  if (pathname.startsWith("/admin")) return null;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-white/[0.06] bg-bg-0/75 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-[68px] max-w-7xl items-center gap-8 px-5">
        <Link href="/" aria-label="SCIST Gate 首頁" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative rounded-lg px-3.5 py-2 text-[14px] font-bold transition-colors",
                  active ? "text-fg" : "text-fg-2 hover:text-fg",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "absolute inset-x-3.5 -bottom-[1px] h-[2px] origin-left rounded-full bg-accent shadow-[0_0_10px_rgba(164,241,59,0.8)] transition-transform duration-300",
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <Link
            href="/dashboard"
            className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pl-2 pr-3 transition-colors hover:border-accent/50 hover:bg-accent/[0.06] lg:flex"
          >
            <span className="clip-hex grid h-6 w-6 place-items-center bg-accent/20">
              <Zap size={12} className="text-accent" />
            </span>
            <span className="font-mono text-[13px] font-bold tabular-nums text-fg">
              {hydrated ? formatNumber(xp) : "0"}
            </span>
            <span className="text-[11.5px] font-bold" style={{ color: rank.color }}>
              {hydrated ? rank.name : ranks[0]?.name}
            </span>
          </Link>

          <LoginMenu />

          <Link href="/learn" className={buttonClass("primary", "sm", "hidden md:inline-flex")}>
            開始學習
            <ChevronRight size={14} />
          </Link>

          <button
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-fg-2 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "關閉選單" : "開啟選單"}
            aria-expanded={open}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-white/[0.06] bg-bg-0/95 backdrop-blur-xl md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-5 py-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-lg px-2 py-3.5 text-[16px] font-bold text-fg-2 hover:bg-white/[0.04] hover:text-fg"
              >
                {item.label}
                <ChevronRight size={16} className="text-fg-3" />
              </Link>
            ))}
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className={buttonClass("outline", "md", "mt-2")}
            >
              我的進度
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
