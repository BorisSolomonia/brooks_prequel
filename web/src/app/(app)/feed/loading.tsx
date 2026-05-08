// Streamed by Next.js as soon as the route segment matches, while the page server-fetches.
// Shape mirrors the feed (story strip + scrollable card list).
export default function FeedLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-ig-bg-secondary" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-ig-border bg-ig-bg-secondary">
            <div className="aspect-square w-full animate-pulse bg-ig-border" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-2/3 animate-pulse rounded bg-ig-border" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-ig-border" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
