import Link from "next/link";
import { cn } from "@/lib/utils";
import { DIFFICULTY, type Difficulty } from "@/lib/xp";

/* ---------------------------------- Button --------------------------------- */
type ButtonVariant = "primary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap select-none";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "text-bg-0 bg-[linear-gradient(135deg,#d2ff7a_0%,#a4f13b_55%,#8fdc2c_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_30px_-10px_rgba(164,241,59,0.8)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_14px_40px_-10px_rgba(164,241,59,0.95)] hover:-translate-y-px active:translate-y-0",
  outline:
    "border border-white/12 bg-white/[0.04] text-fg backdrop-blur hover:border-accent/60 hover:bg-accent/[0.08] hover:text-accent-2",
  ghost: "text-fg-2 hover:text-fg hover:bg-white/[0.05]",
  danger: "bg-red/12 text-red border border-red/40 hover:bg-red/22",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-5 text-[14px]",
  lg: "h-13 px-7 text-[15.5px]",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

/* ---------------------------------- Badges --------------------------------- */
export function Chip({
  children,
  color,
  className,
}: {
  children: React.ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10.5px] tracking-wider uppercase",
        className,
      )}
      style={
        color
          ? { color, borderColor: color + "44", background: color + "14" }
          : undefined
      }
    >
      {children}
    </span>
  );
}

const DIFF_ORDER: Difficulty[] = ["easy", "medium", "hard", "insane"];

export function DifficultyBadge({
  level,
  className,
}: {
  level: Difficulty;
  className?: string;
}) {
  const d = DIFFICULTY[level];
  const idx = DIFF_ORDER.indexOf(level);
  return (
    <span
      className={cn("inline-flex items-center gap-2 font-mono text-[11.5px] font-semibold", className)}
      style={{ color: d.color }}
    >
      <span className="flex items-end gap-[3px]" aria-hidden="true">
        {DIFF_ORDER.map((l, i) => (
          <span
            key={l}
            className="block w-[4px] rounded-sm"
            style={{
              height: 6 + i * 3,
              background: i <= idx ? d.color : "rgba(255,255,255,0.12)",
              boxShadow: i <= idx ? "0 0 8px " + d.color + "88" : "none",
            }}
          />
        ))}
      </span>
      {d.label}
    </span>
  );
}

/* --------------------------------- Progress -------------------------------- */
export function ProgressBar({
  value,
  color = "var(--color-accent)",
  className,
  height = 6,
}: {
  value: number;
  color?: string;
  className?: string;
  height?: number;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-white/[0.07]", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{
          width: pct + "%",
          background: "linear-gradient(90deg, " + color + "aa, " + color + ")",
          boxShadow: "0 0 14px -2px " + color,
        }}
      />
    </div>
  );
}

/* -------------------------------- Hex avatar ------------------------------- */
export function HexAvatar({
  seed,
  hue,
  size = 40,
  className,
  ring,
}: {
  seed: string;
  hue?: number;
  size?: number;
  className?: string;
  ring?: string;
}) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const tone = hue ?? h % 360;
  const cells = Array.from({ length: 9 }, (_, i) => ((h >> i) & 1) === 1);

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {ring ? (
        <span
          className="clip-hex absolute inset-0"
          style={{ background: ring, transform: "scale(1.12)" }}
        />
      ) : null}
      <span
        className="clip-hex relative flex items-center justify-center"
        style={{
          width: size,
          height: size,
          background:
            "linear-gradient(145deg, hsl(" +
            tone +
            " 70% 28%), hsl(" +
            ((tone + 40) % 360) +
            " 60% 12%))",
        }}
      >
        <span
          className="grid grid-cols-3 gap-[2px]"
          style={{ width: size * 0.42 }}
          aria-hidden="true"
        >
          {cells.map((on, i) => (
            <span
              key={i}
              className="aspect-square rounded-[1px]"
              style={{
                background: on ? "hsl(" + tone + " 95% 66%)" : "transparent",
                boxShadow: on ? "0 0 6px hsl(" + tone + " 95% 66% / 0.8)" : "none",
              }}
            />
          ))}
        </span>
      </span>
    </span>
  );
}

/* --------------------------------- Section --------------------------------- */
export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("kicker flex items-center gap-2.5", className)}>
      <span className="clip-hex h-2.5 w-2.5 bg-accent shadow-[0_0_12px_rgba(164,241,59,0.9)]" />
      {children}
    </div>
  );
}

export function SectionHeading({
  label,
  title,
  desc,
  align = "left",
  className,
}: {
  label?: string;
  title: React.ReactNode;
  desc?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {label ? <SectionLabel>{label}</SectionLabel> : null}
      <h2 className="display text-balance text-[34px] sm:text-[44px]">{title}</h2>
      {desc ? (
        <p className="max-w-2xl text-pretty text-[16px] leading-[1.8] text-fg-2">{desc}</p>
      ) : null}
    </div>
  );
}

/* ---------------------------------- Stat ----------------------------------- */
export function Stat({
  value,
  label,
  sub,
  color,
}: {
  value: React.ReactNode;
  label: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="font-mono text-3xl font-bold tabular-nums sm:text-4xl"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
      <div className="text-[13.5px] font-semibold text-fg-2">{label}</div>
      {sub ? <div className="text-[12px] text-fg-3">{sub}</div> : null}
    </div>
  );
}

/* -------------------------------- Terminal --------------------------------- */
export function TerminalFrame({
  title = "bash",
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-white/[0.08] bg-bg-0/90", className)}>
      <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
        </span>
        <span className="ml-1 font-mono text-[11px] text-fg-3">{title}</span>
      </div>
      <div className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
        {children}
      </div>
    </div>
  );
}
