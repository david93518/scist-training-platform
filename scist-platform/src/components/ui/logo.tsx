import { cn } from "@/lib/utils";

/** SCIST mark: a hexagon with a gate slit cut through it. */
export function LogoMark({ className, size = 30 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lg-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d2ff7a" />
          <stop offset="100%" stopColor="#8fdc2c" />
        </linearGradient>
      </defs>
      <path
        d="M16 1.8 L28.5 9 v14 L16 30.2 L3.5 23 V9 Z"
        stroke="url(#lg-mark)"
        strokeWidth="1.7"
        fill="rgba(164,241,59,0.08)"
      />
      <rect x="14.6" y="9" width="2.8" height="14" rx="1.4" fill="url(#lg-mark)" />
      <path d="M11 12.6 L8.2 16 l2.8 3.4" stroke="url(#lg-mark)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12.6 L23.8 16 l-2.8 3.4" stroke="url(#lg-mark)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("group flex items-center gap-2.5", className)}>
      <span className="relative">
        <span className="absolute inset-0 rounded-full bg-accent/40 blur-md opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <LogoMark className="relative" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-mono text-[15.5px] font-bold tracking-[0.18em] text-fg">
          SCIST
        </span>
        <span className="mt-1 font-mono text-[9px] tracking-[0.32em] text-accent">
          GATE
        </span>
      </span>
    </span>
  );
}
