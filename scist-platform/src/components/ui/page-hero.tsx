import { HexField } from "@/components/ui/hex-field";
import { SectionLabel } from "@/components/ui/primitives";

/**
 * Shared page header for inner pages: lit hex field, kicker, big display
 * title, description, optional stat chips on the right.
 */
export function PageHero({
  kicker,
  title,
  desc,
  color = "#a4f13b",
  seed = 3,
  stats,
  children,
}: {
  kicker: string;
  title: React.ReactNode;
  desc?: React.ReactNode;
  color?: string;
  seed?: number;
  stats?: { value: React.ReactNode; label: string }[];
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.06]">
      <HexField seed={seed} lit={9} color={color} className="opacity-80" cx="70%" cy="0%" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 380px at 18% -10%, " +
            color +
            "24, transparent 60%), radial-gradient(600px 300px at 90% 10%, rgba(62,232,213,0.08), transparent 60%), linear-gradient(180deg, transparent 40%, var(--color-bg-0))",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-5 pb-12 pt-14 sm:pb-16 sm:pt-20">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <SectionLabel>{kicker}</SectionLabel>
            <h1 className="display mt-5 text-[42px] sm:text-[60px]">{title}</h1>
            {desc ? (
              <p className="mt-5 max-w-2xl text-pretty text-[16.5px] leading-[1.85] text-fg-2">
                {desc}
              </p>
            ) : null}
            {children}
          </div>

          {stats?.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="card min-w-[120px] px-5 py-4"
                >
                  <div className="font-mono text-[24px] font-bold tabular-nums leading-none">
                    {s.value}
                  </div>
                  <div className="mt-1.5 text-[12px] text-fg-3">{s.label}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
