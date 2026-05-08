// Skeleton for the My Guides library route (3-tab layout with a card grid).
export default function GuidesLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-24 animate-pulse rounded-lg bg-ig-bg-secondary" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
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
