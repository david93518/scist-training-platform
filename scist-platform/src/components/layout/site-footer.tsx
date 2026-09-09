import Link from "next/link";
import { LogoMark } from "@/components/ui/logo";
import { TARGET_SPONSORS } from "@/data/sponsors";

const COLUMNS = [
  {
    title: "學習",
    links: [
      { label: "五大學習路徑", href: "/learn" },
      { label: "實戰題庫", href: "/challenges" },
      { label: "我的進度", href: "/dashboard" },
      { label: "排行榜", href: "/leaderboard" },
    ],
  },
  {
    title: "社群",
    links: [
      { label: "Bug 診療室", href: "/community" },
      { label: "講師直播", href: "/community" },
      { label: "助教計畫", href: "/community" },
      { label: "SCIST 盃", href: "/community" },
    ],
  },
  {
    title: "關於",
    links: [
      { label: "我們是誰", href: "/about" },
      { label: "18 校聯防", href: "/about" },
      { label: "贊助我們", href: "/about" },
      { label: "講師陣容", href: "/about" },
    ],
  },
];

function IconDiscord({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.3 4.5A19 19 0 0 0 15.6 3l-.24.44a13 13 0 0 1 4.2 2.1 18.7 18.7 0 0 0-15.1 0 13 13 0 0 1 4.2-2.1L8.4 3a19 19 0 0 0-4.7 1.5C.9 8.6.1 12.6.5 16.5a19 19 0 0 0 5.7 2.9l.9-1.3a12 12 0 0 1-1.9-.9l.4-.3a13.5 13.5 0 0 0 12.8 0l.4.3a12 12 0 0 1-1.9.9l.9 1.3a19 19 0 0 0 5.7-2.9c.5-4.5-.8-8.5-3.2-12ZM8.4 14.3c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3 2 1 2 2.3-.9 2.3-2 2.3Zm7.2 0c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3 2 1 2 2.3-.9 2.3-2 2.3Z" />
    </svg>
  );
}

function IconInstagram({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="3.8" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconYouTube({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23 12s0-3.5-.45-5.17a2.9 2.9 0 0 0-2.04-2.05C18.83 4.3 12 4.3 12 4.3s-6.83 0-8.51.48a2.9 2.9 0 0 0-2.04 2.05C1 8.5 1 12 1 12s0 3.5.45 5.17a2.9 2.9 0 0 0 2.04 2.05c1.68.48 8.51.48 8.51.48s6.83 0 8.51-.48a2.9 2.9 0 0 0 2.04-2.05C23 15.5 23 12 23 12ZM9.8 15.3V8.7l5.7 3.3-5.7 3.3Z" />
    </svg>
  );
}

const SOCIAL = [
  { label: "Discord", href: "https://discord.gg/scist", Icon: IconDiscord },
  { label: "Instagram", href: "https://instagram.com/scist.tw", Icon: IconInstagram },
  { label: "YouTube", href: "https://youtube.com", Icon: IconYouTube },
];

export function SiteFooter() {
  return (
    <footer className="divider-glow relative border-t border-white/[0.06] bg-bg-1/80">
      <div className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-12 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-3">
              <LogoMark className="text-accent" size={34} />
              <div className="leading-tight">
                <div className="font-mono text-[15px] font-bold tracking-[0.18em]">SCIST GATE</div>
                <div className="text-[12px] text-fg-3">南臺灣學生資訊社群</div>
              </div>
            </div>
            <p className="mt-5 max-w-xs text-[14px] leading-[1.8] text-fg-2">
              讓每一個對資安有好奇心的高中生，都能找到屬於自己的第一道門。從南部出發，為全台灣而建。
            </p>
            <div className="mt-6 flex gap-2.5">
              {SOCIAL.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={label}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-fg-2 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:text-accent"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="kicker mb-5">{col.title}</div>
              <ul className="flex flex-col gap-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[14px] text-fg-2 transition-colors hover:text-accent">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 border-t border-white/[0.06] pt-7">
          <div className="mono-label mb-4">目標合作夥伴</div>
          <div className="flex flex-wrap gap-x-8 gap-y-2.5">
            {TARGET_SPONSORS.map((s) => (
              <span key={s} className="text-[13px] font-semibold text-fg-3">
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/[0.06] pt-7 text-[12px] text-fg-3 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 SCIST 南臺灣學生資訊社群 · 從南部出發，為全台灣而建</span>
          <span className="font-mono">本站為數位轉型企劃之互動原型 · 題目與帳號資料為示範用途</span>
        </div>
      </div>
    </footer>
  );
}
