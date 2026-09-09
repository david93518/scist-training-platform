"use client";

import { useEffect } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Button, LinkButton, TerminalFrame } from "@/components/ui/primitives";
import { HexField } from "@/components/ui/hex-field";

/**
 * Catches render errors below the root layout — most often the database being
 * unreachable, since every page reads from it. `digest` is the only handle on
 * the real cause, so it is shown for people reporting the problem.
 */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="relative grid min-h-[70vh] place-items-center overflow-hidden px-5 py-20">
      <HexField seed={17} lit={10} color="#ff5e5e" className="opacity-60" cx="50%" cy="40%" />
      <div className="relative w-full max-w-lg text-center">
        <div className="kicker">500</div>
        <h1 className="display mt-5 text-[38px] sm:text-[48px]">這裡爆了</h1>
        <p className="mt-4 text-[15.5px] leading-relaxed text-fg-2">
          伺服器在算這一頁的時候出錯了，通常是資料庫連不上。重試一次多半就好了。
        </p>

        <TerminalFrame title="bash" className="mt-9 text-left">
          <div className="text-fg-3">
            <span className="text-accent">$ </span>tail -n 1 /var/log/gate
          </div>
          <div className="mt-1 text-red">HTTP/1.1 500 Internal Server Error</div>
          <div className="break-all text-fg-3">digest: {error.digest ?? "（本機錯誤，看瀏覽器 console）"}</div>
        </TerminalFrame>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button onClick={() => retry()}>
            <RotateCcw size={15} />
            再試一次
          </Button>
          <LinkButton href="/" variant="outline">
            <ArrowLeft size={15} />
            回首頁
          </LinkButton>
        </div>

        <p className="mt-6 font-mono text-[11.5px] leading-relaxed text-fg-3">
          一直出現的話，把上面那串 digest 貼到 Discord 的 #平台問題，我們照這個去翻 log。
        </p>
      </div>
    </main>
  );
}
