import { Bar, HeroSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main aria-busy="true">
      <HeroSkeleton stats={4} />
      <div className="mx-auto max-w-7xl px-5 py-12">
        {/* the four counters above the filter bar */}
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="card flex items-center gap-3 p-4">
              <Bar className="h-9 w-9 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <Bar className="h-5 w-14" />
                <Bar className="mt-2 h-3 w-16" />
              </div>
            </div>
          ))}
        </div>

        <Bar className="mt-5 h-11 w-full rounded-xl" />

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center gap-2">
                <Bar className="h-5 w-16" />
                <Bar className="ml-auto h-5 w-12" />
              </div>
              <Bar className="mt-4 h-6 w-40" />
              <Bar className="mt-3 h-4 w-full" />
              <Bar className="mt-2 h-4 w-2/3" />
              <div className="mt-5 flex gap-2">
                <Bar className="h-5 w-14" />
                <Bar className="h-5 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
