// Skeleton for the Purchases list (matches the trips card shape).
export default function PurchasesLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 h-7 w-40 animate-pulse rounded bg-ig-bg-secondary" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-ig-border bg-ig-bg-secondary p-4">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 shrink-0 animate-pulse rounded-lg bg-ig-border" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/5 animate-pulse rounded bg-ig-border" />
                <div className="h-3 w-1/4 animate-pulse rounded bg-ig-border" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
