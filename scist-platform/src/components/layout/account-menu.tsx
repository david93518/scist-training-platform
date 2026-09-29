"use client";

/**
 * 已登入時右上角的頭像選單。前台與後台共用同一份，所以兩邊看到的帳號資訊、
 * 進度入口與登出都一樣。後台以前把登入視窗整個打開，已經登入的人還會看到
 * 一次「登入／註冊」表單。
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, LayoutDashboard, LogOut, ShieldCheck, Zap } from "lucide-react";
import { HexAvatar } from "@/components/ui/primitives";
import { useRanks } from "@/components/settings-provider";
import { useProgress } from "@/store/progress";
import { can, ROLE_LABEL, type Role } from "@/lib/permissions";
import { rankFor } from "@/lib/xp";
import { cn, formatNumber } from "@/lib/utils";

export function AccountMenu({ showXp = true }: { showXp?: boolean }) {
  const pathname = usePathname();
  const handle = useProgress((s) => s.handle);
  const displayName = useProgress((s) => s.displayName);
  const role = useProgress((s) => s.role) as Role;
  const xp = useProgress((s) => s.xp);
  const logout = useProgress((s) => s.logout);
  const [menu, setMenu] = useState(false);
  const ranks = useRanks();
  const rank = rankFor(xp, ranks);
  const inAdmin = pathname.startsWith("/admin");
  const canAdmin = can(role, "admin.enter");

  return (
    <div className="relative">
      <button
        onClick={() => setMenu((v) => !v)}
        className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pl-1.5 pr-3 transition-colors hover:border-accent/50"
        aria-haspopup="menu"
        aria-expanded={menu}
      >
        <HexAvatar seed={handle} size={26} />
        <span className={cn("text-[13px] font-bold", !inAdmin && "hidden sm:inline")}>{displayName || handle}</span>
        {showXp ? (
          <span className="hidden items-center gap-1 font-mono text-[12px] tabular-nums text-accent sm:flex">
            <Zap size={11} />
            {formatNumber(xp)}
          </span>
        ) : null}
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
            {/* 後台側邊欄自己有「回到前台」，而且那個連結會先問未存檔的編輯器，
                所以這裡在後台就只留帳號資訊與登出，不再開第二條捷徑。 */}
            {!inAdmin ? (
              <>
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
              </>
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
    </div>
  );
}
