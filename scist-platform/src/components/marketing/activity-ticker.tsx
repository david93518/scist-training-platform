import { Droplet, Flag, GraduationCap, TrendingUp, UserPlus, Sparkles } from "lucide-react";
import { ACTIVITY_VERB, type Activity, type ActivityKind } from "@/data/activity";

const ICONS: Record<ActivityKind, { Icon: typeof Flag; color: string }> = {
  solve: { Icon: Flag, color: "var(--color-accent)" },
  firstblood: { Icon: Droplet, color: "var(--color-red)" },
  lesson: { Icon: GraduationCap, color: "var(--color-blue)" },
  rankup: { Icon: TrendingUp, color: "var(--color-amber)" },
  release: { Icon: Sparkles, color: "var(--color-purple)" },
  join: { Icon: UserPlus, color: "var(--color-teal)" },
};

function Row({ item }: { item: Activity }) {
  const { Icon, color } = ICONS[item.kind];
  return (
    <span className="flex shrink-0 items-center gap-2.5 px-6">
      <span className="grid h-6 w-6 place-items-center rounded-md" style={{ background: color + "22" }}>
        <Icon size={12} style={{ color }} />
      </span>
      <span className="font-mono text-[12.5px] font-bold text-fg">{item.handle}</span>
      <span className="text-[12px] text-fg-3">{item.schoolShort}</span>
      <span className="text-[12.5px] text-fg-2">{ACTIVITY_VERB[item.kind]}</span>
      {item.target ? (
        <span className="text-[12.5px] font-bold" style={{ color }}>
          {item.target}
        </span>
      ) : null}
      <span className="font-mono text-[10.5px] text-fg-3">{item.ago}</span>
      <span className="ml-4 clip-hex h-1.5 w-1.5 bg-white/20" />
    </span>
  );
}

/** Server component; `ago` labels were stamped when the feed was built. */
export function ActivityTicker({ items }: { items: Activity[] }) {
  if (items.length === 0) return null;
  return (
    <div className="divider-glow relative border-b border-white/[0.06] bg-bg-1/70 backdrop-blur">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-bg-0 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-bg-0 to-transparent" />
      <div className="flex overflow-hidden py-3.5">
        <div className="flex animate-[ticker_50s_linear_infinite] items-center">
          {items.map((a) => (
            <Row key={a.id} item={a} />
          ))}
          {items.map((a) => (
            <Row key={a.id + "-dup"} item={a} />
          ))}
        </div>
      </div>
      <style>{"@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}"}</style>
    </div>
  );
}
