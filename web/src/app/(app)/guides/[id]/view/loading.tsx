// Skeleton for an individual guide view (cover + meta + day list).
export default function GuideViewLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 aspect-video w-full animate-pulse rounded-xl bg-ig-bg-secondary" />
      <div className="space-y-3">
        <div className="h-7 w-2/3 animate-pulse rounded bg-ig-bg-secondary" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-ig-bg-secondary" />
      </div>
      <div className="mt-8 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-ig-border bg-ig-bg-secondary p-4">
            <div className="h-5 w-1/4 animate-pulse rounded bg-ig-border" />
            <div className="mt-3 h-3 w-full animate-pulse rounded bg-ig-border" />
            <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-ig-border" />
          </div>
        ))}
      </div>
    </div>
  );
}
