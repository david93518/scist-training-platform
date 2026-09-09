"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Flag, Droplet, Zap, ListChecks, Play, Users, Radio } from "lucide-react";
import { LinkButton } from "@/components/ui/primitives";
import { HexField } from "@/components/ui/hex-field";
import { formatNumber } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* The Gate: concentric hexagons with a slit of light. The brand motif */
/* ------------------------------------------------------------------ */
function hexPoints(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 180) * (60 * k - 30);
    return (cx + r * Math.cos(a)).toFixed(2) + "," + (cy + r * Math.sin(a)).toFixed(2);
  }).join(" ");
}

function GateVisual() {
  const c = 260;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]">
      {/* ambient glow */}
      <div
        className="absolute inset-[-10%] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(164,241,59,0.28), rgba(62,232,213,0.10) 45%, transparent 70%)",
        }}
      />

      <svg viewBox="0 0 520 520" className="relative h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="gate-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d2ff7a" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#a4f13b" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3ee8d5" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="gate-slit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d2ff7a" stopOpacity="0" />
            <stop offset="25%" stopColor="#d2ff7a" />
            <stop offset="75%" stopColor="#a4f13b" />
            <stop offset="100%" stopColor="#a4f13b" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="gate-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0f1620" />
            <stop offset="100%" stopColor="#06090e" />
          </radialGradient>
          <filter id="gate-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="10" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="gate-soft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
        </defs>

        {/* outer rotating rings */}
        <g className="origin-center animate-spin-slow" style={{ transformOrigin: "260px 260px" }}>
          <polygon points={hexPoints(c, c, 246)} fill="none" stroke="url(#gate-ring)" strokeWidth="1.2" strokeDasharray="14 10" opacity="0.7" />
        </g>
        <g className="origin-center animate-spin-slower" style={{ transformOrigin: "260px 260px" }}>
          <polygon points={hexPoints(c, c, 206)} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" strokeDasharray="3 9" />
          {Array.from({ length: 6 }, (_, k) => {
            const a = (Math.PI / 180) * (60 * k - 30);
            return (
              <circle
                key={k}
                cx={c + 206 * Math.cos(a)}
                cy={c + 206 * Math.sin(a)}
                r="3"
                fill="#a4f13b"
                opacity="0.9"
              />
            );
          })}
        </g>

        {/* static plates */}
        <polygon points={hexPoints(c, c, 172)} fill="url(#gate-core)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        <polygon points={hexPoints(c, c, 172)} fill="none" stroke="url(#gate-ring)" strokeWidth="1.5" opacity="0.8" />
        <polygon points={hexPoints(c, c, 132)} fill="rgba(164,241,59,0.04)" stroke="rgba(164,241,59,0.35)" strokeWidth="1" />
        <polygon points={hexPoints(c, c, 96)} fill="rgba(6,9,14,0.9)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

        {/* light leaking from the slit */}
        <rect x={c - 34} y={c - 120} width="68" height="240" fill="#a4f13b" opacity="0.35" filter="url(#gate-soft)" />

        {/* the two doors */}
        <path d={"M " + (c - 12) + " " + (c - 78) + " L " + (c - 72) + " " + (c - 44) + " L " + (c - 72) + " " + (c + 44) + " L " + (c - 12) + " " + (c + 78) + " Z"} fill="#0c1118" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
        <path d={"M " + (c + 12) + " " + (c - 78) + " L " + (c + 72) + " " + (c - 44) + " L " + (c + 72) + " " + (c + 44) + " L " + (c + 12) + " " + (c + 78) + " Z"} fill="#0c1118" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />

        {/* the slit */}
        <rect x={c - 5} y={c - 92} width="10" height="184" rx="5" fill="url(#gate-slit)" filter="url(#gate-glow)" />
        <rect x={c - 1.5} y={c - 92} width="3" height="184" rx="1.5" fill="#f4ffdc" />

        {/* chevrons */}
        <path d={"M " + (c - 40) + " " + (c - 22) + " L " + (c - 56) + " " + c + " L " + (c - 40) + " " + (c + 22)} fill="none" stroke="#a4f13b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        <path d={"M " + (c + 40) + " " + (c - 22) + " L " + (c + 56) + " " + c + " L " + (c + 40) + " " + (c + 22)} fill="none" stroke="#a4f13b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      </svg>

      {/* floating glass chips */}
      <FloatingChip className="left-[-6%] top-[14%] animate-float" icon={<ListChecks size={14} className="text-accent" />} label="檢查站 2/3 通過" sub="+30 XP" />
      <FloatingChip className="right-[-4%] top-[30%] animate-float-2" icon={<Droplet size={14} className="text-red" />} label="First Blood" sub="ch3n · 南一中" />
      <FloatingChip className="bottom-[10%] left-[4%] animate-float-2" icon={<Zap size={14} className="text-amber" />} label="晉升 見習生" sub="300 XP" />
      <FloatingChip className="bottom-[18%] right-[-2%] animate-float" icon={<Flag size={14} className="text-accent" />} label="Login Bypass" sub="+250 · 已解出" />
    </div>
  );
}

function FloatingChip({
  className,
  icon,
  label,
  sub,
}: {
  className?: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <div
      className={
        "absolute hidden items-center gap-2.5 rounded-xl border border-white/10 bg-bg-1/80 px-3.5 py-2.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md sm:flex " +
        className
      }
    >
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/[0.06]">{icon}</span>
      <span className="leading-tight">
        <span className="block text-[12.5px] font-bold text-fg">{label}</span>
        <span className="block font-mono text-[10.5px] text-fg-3">{sub}</span>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Typed terminal strip under the headline                             */
/* ------------------------------------------------------------------ */
const SCRIPT: { prompt?: string; out?: string; tone?: string; pause?: number }[] = [
  { prompt: "scist learn web-security --lesson sql-injection" },
  { out: "▸ 知識點檢查站 1/3 通過        +30 XP", tone: "var(--color-accent)" },
  { prompt: "scist submit sqli-login 'SCIST{...}'" },
  { out: "✔ Correct.  +250 XP  ·  你是第 535 位解出的人", tone: "var(--color-accent)" },
  { out: "→ 晉升：新手 → 見習生", tone: "var(--color-amber)", pause: 1600 },
];

function useTypedScript() {
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(0);
  useEffect(() => {
    const step = SCRIPT[line];
    if (!step) {
      const t = setTimeout(() => {
        setLine(0);
        setChars(0);
      }, 2400);
      return () => clearTimeout(t);
    }
    const text = step.prompt ?? step.out ?? "";
    if (chars < text.length) {
      const t = setTimeout(() => setChars((c) => c + 1), step.prompt ? 26 : 9);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setLine((l) => l + 1);
      setChars(0);
    }, step.pause ?? (step.prompt ? 340 : 520));
    return () => clearTimeout(t);
  }, [line, chars]);
  return { line, chars };
}

function Terminal() {
  const { line, chars } = useTypedScript();
  const shown = SCRIPT.slice(0, line);
  const active = SCRIPT[line];
  const activeText = (active?.prompt ?? active?.out ?? "").slice(0, chars);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-bg-0/70 shadow-[0_30px_80px_-40px_rgba(0,0,0,1),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
        </span>
        <span className="ml-1.5 font-mono text-[11px] text-fg-3">player@gate ~ scist-cli</span>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-accent">
          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent" />
          LIVE
        </span>
      </div>
      <div className="h-[150px] p-4 font-mono text-[13px] leading-[1.9]">
        {shown.map((s, i) => (
          <div key={i} className="truncate">
            {s.prompt ? (
              <>
                <span className="text-accent">$ </span>
                <span className="text-fg">{s.prompt}</span>
              </>
            ) : (
              <span style={{ color: s.tone }}>{s.out}</span>
            )}
          </div>
        ))}
        {active ? (
          <div className="truncate">
            {active.prompt ? (
              <>
                <span className="text-accent">$ </span>
                <span className="text-fg">{activeText}</span>
              </>
            ) : (
              <span style={{ color: active.tone }}>{activeText}</span>
            )}
            <span className="ml-0.5 inline-block h-[15px] w-[7px] translate-y-[2px] animate-caret bg-accent" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Hero({ stats }: { stats: { challenges: number; lessons: number; users: number } }) {
  const HERO_STATS = [
    { icon: Flag, value: stats.challenges + " 題", label: "可實戰題目" },
    { icon: Play, value: stats.lessons + " 課", label: "影音單元" },
    { icon: Users, value: formatNumber(stats.users), label: "註冊學員" },
    { icon: Radio, value: "每月", label: "Bug 診療室" },
  ];

  return (
    <section className="relative overflow-hidden">
      <HexField seed={11} lit={16} className="opacity-90" cx="68%" cy="30%" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1100px 560px at 12% -10%, rgba(164,241,59,0.20), transparent 60%), radial-gradient(800px 500px at 100% 10%, rgba(62,232,213,0.12), transparent 60%), radial-gradient(600px 400px at 60% 110%, rgba(185,131,255,0.10), transparent 60%)",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg-0" />

      <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-14 sm:pt-20 lg:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-8">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-accent/30 bg-accent/[0.08] py-1.5 pl-2 pr-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-bg-0">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-bg-0" />
              </span>
              <span className="font-mono text-[11.5px] tracking-[0.16em] text-accent-2">
                SCIST 數位轉型 · 2026.10 正式開放
              </span>
            </div>

            <h1 className="display mt-7 text-[46px] sm:text-[66px] lg:text-[74px]">
              資安的第一道門，
              <br />
              <span className="gradient-text text-glow">從這裡推開。</span>
            </h1>

            <p className="mt-7 max-w-xl text-pretty text-[17px] leading-[1.85] text-fg-2 sm:text-[18px]">
              影音課程看到哪，實戰題目就做到哪。講師錄好的課、能真的動手打的題庫、
              <span className="text-fg">還有 18 校聯防的學長姐在旁邊接你。</span>
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3.5">
              <LinkButton href="/learn/web-security/sql-injection" size="lg" className="shine">
                從第一課開始
                <ArrowRight size={18} />
              </LinkButton>
              <LinkButton href="/challenges" variant="outline" size="lg">
                <Flag size={16} />
                直接去戳題目
              </LinkButton>
            </div>

            <p className="mt-4 font-mono text-[12px] text-fg-3">
              不用註冊也能看課。用 Discord 登入後，進度跨裝置同步，解題才會上排行榜。
            </p>

            <div className="mt-11 grid max-w-xl grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
              {HERO_STATS.map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex flex-col gap-1.5">
                  <span className="clip-hex grid h-7 w-7 place-items-center bg-accent/15">
                    <Icon size={13} className="text-accent" />
                  </span>
                  <div className="font-mono text-[22px] font-bold tabular-nums leading-none">
                    {value}
                  </div>
                  <div className="text-[12px] text-fg-3">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <GateVisual />
            <div className="relative -mt-6 lg:-mt-10 lg:ml-8">
              <Terminal />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
