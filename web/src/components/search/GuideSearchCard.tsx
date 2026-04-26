import Link from 'next/link';
import type { GuideSearchResult } from '@/types';

interface GuideSearchCardProps {
  guide: GuideSearchResult;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function seasonIsNow(start: number | null | undefined, end: number | null | undefined): boolean {
  if (!start || !end) return false;
  const m = new Date().getMonth() + 1;
  if (start <= end) return m >= start && m <= end;
  return m >= start || m <= end;
}

export default function GuideSearchCard({ guide }: GuideSearchCardProps) {
  const price = guide.priceCents === 0
    ? 'Free'
    : `${(guide.priceCents / 100).toFixed(2)} ${guide.currency}`;

  const inSeason = seasonIsNow(guide.bestSeasonStartMonth, guide.bestSeasonEndMonth);

  return (
    <Link
      href={`/guides/${guide.id}/view`}
      className="flex min-h-28 gap-3 rounded-xl bg-ig-elevated p-3 transition-colors hover:bg-ig-border"
    >
      <div className="w-20 h-20 rounded-lg bg-ig-border flex-shrink-0 overflow-hidden relative">
        {guide.coverImageUrl ? (
          <img src={guide.coverImageUrl} alt={guide.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ig-text-tertiary text-xs">
            No cover
          </div>
        )}
        {guide.bestSeasonLabel && (
          <span className={`absolute bottom-1 left-1 right-1 text-center text-[9px] font-semibold rounded px-1 py-0.5 leading-tight ${
            inSeason ? 'bg-green-500/90 text-white' : 'bg-black/60 text-white/70'
          }`}>
            {inSeason ? 'In season' : `Best ${MONTH_NAMES[(guide.bestSeasonStartMonth ?? 1) - 1]}`}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-ig-text-primary truncate">{guide.title}</h3>
        <p className="text-sm text-ig-text-secondary truncate">
          by {guide.creatorDisplayName || guide.creatorUsername}
        </p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ig-text-tertiary">
          {guide.region && <span>{guide.primaryCity || guide.region}</span>}
          <span>{guide.dayCount} days</span>
          <span>{guide.placeCount} places</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-sm font-semibold text-accent-500">{price}</p>
          {(guide.purchaseCount ?? 0) > 0 && (
            <span className="text-xs text-ig-text-tertiary">{guide.purchaseCount} travelers</span>
          )}
          {(guide.averageRating ?? 0) > 0 && (
            <span className="text-xs text-yellow-400">★ {(guide.averageRating ?? 0).toFixed(1)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
