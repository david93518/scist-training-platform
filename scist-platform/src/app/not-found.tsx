import { LinkButton, TerminalFrame } from "@/components/ui/primitives";
import { HexField } from "@/components/ui/hex-field";
import { ArrowLeft, Flag } from "lucide-react";

export default function NotFound() {
  return (
    <main className="relative grid min-h-[70vh] place-items-center overflow-hidden px-5 py-20">
      <HexField seed={44} lit={10} className="opacity-60" cx="50%" cy="40%" />
      <div className="relative w-full max-w-lg text-center">
        <div className="kicker">404</div>
        <h1 className="display mt-5 text-[38px] sm:text-[48px]">這道門後面沒有東西</h1>
        <p className="mt-4 text-[15.5px] leading-relaxed text-fg-2">
          網址打錯了，或這個頁面還沒建好。回去挑一條路走吧。
        </p>

        <TerminalFrame title="bash" className="mt-9 text-left">
          <div className="text-fg-3">
            <span className="text-accent">$ </span>curl -I /this/page
          </div>
          <div className="mt-1 text-red">HTTP/1.1 404 Not Found</div>
          <div className="text-fg-3">x-hint: 試試 /challenges 或 /learn</div>
        </TerminalFrame>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <LinkButton href="/">
            <ArrowLeft size={15} />
            回首頁
          </LinkButton>
          <LinkButton href="/challenges" variant="outline">
            <Flag size={15} />
            去題庫
          </LinkButton>
        </div>
      </div>
    </main>
  );
}
