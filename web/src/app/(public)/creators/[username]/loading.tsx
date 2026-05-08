// Skeleton for a creator profile (avatar + meta + tab strip + content grid).
export default function CreatorLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 animate-pulse rounded-full bg-ig-bg-secondary" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-1/3 animate-pulse rounded bg-ig-bg-secondary" />
          <div className="h-3 w-1/4 animate-pulse rounded bg-ig-bg-secondary" />
        </div>
      </div>
      <div className="mb-4 flex gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 w-20 animate-pulse rounded bg-ig-bg-secondary" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-ig-border bg-ig-bg-secondary">
            <div className="aspect-[4/3] w-full animate-pulse bg-ig-border" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-ig-border" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-ig-border" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
