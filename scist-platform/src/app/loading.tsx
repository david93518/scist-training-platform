import { Bar, HeroSkeleton } from "@/components/ui/skeleton";

/** Every page is force-dynamic, so this fills the gap while the query runs. */
export default function Loading() {
  return (
    <main aria-busy="true">
      <HeroSkeleton />
      <div className="mx-auto max-w-7xl px-5 py-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="card p-5">
              <Bar className="h-5 w-32" />
              <Bar className="mt-3 h-4 w-full" />
              <Bar className="mt-2 h-4 w-3/4" />
              <Bar className="mt-5 h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
