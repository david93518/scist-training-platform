import { Bar, CardSkeleton, HeroSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main aria-busy="true">
      <HeroSkeleton stats={4} />
      <div className="mx-auto max-w-7xl px-5 py-14">
        <Bar className="mb-6 h-11 w-full rounded-xl" />
        <div className="flex flex-col gap-5">
          {Array.from({ length: 4 }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </main>
  );
}
