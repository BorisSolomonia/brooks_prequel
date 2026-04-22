export default function SearchSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {[1, 2, 3].map((section) => (
        <div key={section}>
          <div className="h-5 w-24 bg-ig-border rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center gap-3 p-3 rounded-xl bg-ig-elevated">
                <div className="w-12 h-12 rounded-full bg-ig-border flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-ig-border rounded" />
                  <div className="h-3 w-48 bg-ig-border rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
