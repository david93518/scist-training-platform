import { cn } from "@/lib/utils";

/** A single greyed-out placeholder block. */
export function Bar({ className }: { className?: string }) {
  return <span className={cn("block animate-pulse-soft rounded bg-white/[0.06]", className)} />;
}

/** Stand-in for the PageHero every top-level page opens with. */
export function HeroSkeleton({ stats = 3 }: { stats?: number }) {
  return (
    <div className="border-b border-line bg-bg-1/40">
      <div className="mx-auto max-w-7xl px-5 py-16">
        <Bar className="h-3 w-24" />
        <Bar className="mt-5 h-10 w-2/3 max-w-lg" />
        <Bar className="mt-4 h-4 w-full max-w-2xl" />
        <Bar className="mt-2 h-4 w-4/5 max-w-xl" />
        <div className="mt-9 flex flex-wrap gap-10">
          {Array.from({ length: stats }, (_, i) => (
            <div key={i}>
              <Bar className="h-6 w-16" />
              <Bar className="mt-2 h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Stand-in for one `.card` row, sized by the tallest thing it replaces. */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("card flex items-center gap-6 p-7", className)}>
      <span className="clip-hex h-[76px] w-[76px] shrink-0 animate-pulse-soft bg-white/[0.06]" />
      <div className="min-w-0 flex-1">
        <Bar className="h-6 w-48" />
        <Bar className="mt-3 h-4 w-full max-w-md" />
        <div className="mt-5 flex flex-wrap gap-3">
          <Bar className="h-5 w-16" />
          <Bar className="h-5 w-20" />
          <Bar className="h-5 w-24" />
        </div>
      </div>
      <Bar className="hidden h-9 w-[150px] shrink-0 lg:block" />
    </div>
  );
}
