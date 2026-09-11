"use client";

import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { requestLogin } from "@/components/layout/login-menu";
import { cn } from "@/lib/utils";

/**
 * Stands in for learner-only UI when the session turns out to be missing.
 * The pages themselves are gated in src/proxy.ts, so this mostly shows up
 * when a cookie expired or the account was suspended while the page was open.
 */
export function LoginWall({
  title = "這裡需要登入",
  desc = "看課、解題、累積 XP 都記在帳號上。登入或註冊後會直接回到這一頁。",
  className,
}: {
  title?: string;
  desc?: string;
  className?: string;
}) {
  const pathname = usePathname();
  return (
    <div className={cn("card flex flex-col items-center gap-3 p-8 text-center", className)}>
      <span className="clip-hex grid h-11 w-11 place-items-center bg-accent/15">
        <Lock size={18} className="text-accent" />
      </span>
      <p className="text-[16px] font-extrabold">{title}</p>
      <p className="max-w-sm text-[13px] leading-relaxed text-fg-2">{desc}</p>
      <Button size="sm" className="mt-1" onClick={() => requestLogin(pathname)}>
        登入 / 註冊
      </Button>
    </div>
  );
}
