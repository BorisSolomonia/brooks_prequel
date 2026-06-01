'use client';

// Reusable filter + sort bar shared by the Guides and Creators search pages.
// Renders a star-rating selector + a sort/date dropdown, and OPTIONALLY a
// "verified only" toggle (creators) and a price range (guides). Each control is
// purely controlled — the parent owns state and re-fetches on change.

export interface SortOption {
  value: string;
  label: string;
}

interface Props {
  // Star rating: null = any. Values are minimums (3, 4, 4.5).
  minRating: number | null;
  onMinRating: (value: number | null) => void;

  // Sort / chronological control.
  sort: string;
  onSort: (value: string) => void;
  sortOptions: SortOption[];

  // Optional: verified-only toggle (creators).
  verified?: boolean;
  onVerified?: (value: boolean) => void;

  // Optional: price range in major currency units (guides). Strings so the
  // inputs can be cleared; the parent converts to minor units for the query.
  showPrice?: boolean;
  priceMin?: string;
  priceMax?: string;
  onPriceMin?: (value: string) => void;
  onPriceMax?: (value: string) => void;
}

const RATING_CHOICES: { label: string; value: number | null }[] = [
  { label: 'Any rating', value: null },
  { label: '★ 3+', value: 3 },
  { label: '★ 4+', value: 4 },
  { label: '★ 4.5+', value: 4.5 },
];

export default function SearchFilterBar({
  minRating, onMinRating,
  sort, onSort, sortOptions,
  verified, onVerified,
  showPrice, priceMin, priceMax, onPriceMin, onPriceMax,
}: Props) {
  return (
    <div className="mb-6 space-y-3 rounded-xl border border-ig-border bg-ig-elevated/60 p-3">
      {/* Star rating */}
      <div>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ig-text-tertiary">Rating</span>
        <div className="flex flex-wrap gap-2">
          {RATING_CHOICES.map((c) => {
            const active = minRating === c.value;
            return (
              <button
                key={c.label}
                type="button"
                aria-pressed={active}
                onClick={() => onMinRating(c.value)}
                className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors lg:min-h-0 lg:px-3 lg:py-1 lg:text-xs ${
                  active
                    ? 'border-brand-500 bg-brand-500/15 text-brand-400'
                    : 'border-ig-border text-ig-text-secondary hover:border-brand-500/40'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort / date + optional verified */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-ig-text-tertiary">Sort by</span>
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value)}
            className="min-h-11 rounded-md border border-ig-border bg-ig-secondary px-3 py-2 text-sm text-ig-text-primary focus:border-ig-blue focus:outline-none"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        {onVerified && (
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ig-text-secondary">
            <input
              type="checkbox"
              checked={!!verified}
              onChange={(e) => onVerified(e.target.checked)}
              className="h-4 w-4 accent-brand-500"
            />
            Verified only
          </label>
        )}
      </div>

      {/* Optional price range (guides) */}
      {showPrice && onPriceMin && onPriceMax && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-ig-text-tertiary">Min price</span>
            <input
              type="number" min={0} step="0.01" inputMode="decimal" placeholder="0"
              value={priceMin ?? ''}
              onChange={(e) => onPriceMin(e.target.value)}
              className="min-h-11 w-28 rounded-md border border-ig-border bg-ig-secondary px-3 py-2 text-sm text-ig-text-primary focus:border-ig-blue focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-ig-text-tertiary">Max price</span>
            <input
              type="number" min={0} step="0.01" inputMode="decimal" placeholder="Any"
              value={priceMax ?? ''}
              onChange={(e) => onPriceMax(e.target.value)}
              className="min-h-11 w-28 rounded-md border border-ig-border bg-ig-secondary px-3 py-2 text-sm text-ig-text-primary focus:border-ig-blue focus:outline-none"
            />
          </label>
        </div>
      )}
    </div>
  );
}
