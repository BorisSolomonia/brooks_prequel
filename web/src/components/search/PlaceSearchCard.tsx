import Link from 'next/link';
import type { PlaceSearchResult } from '@/types';

interface PlaceSearchCardProps {
  place: PlaceSearchResult;
}

export default function PlaceSearchCard({ place }: PlaceSearchCardProps) {
  return (
    <Link
      href={`/guides/${place.guideId}/view`}
      className="flex min-h-20 items-center gap-3 rounded-xl bg-ig-elevated p-3 transition-colors hover:bg-ig-border"
    >
      <div className="w-10 h-10 rounded-lg bg-ig-border flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-ig-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ig-text-primary truncate">{place.name}</span>
          {place.category && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-ig-border text-ig-text-secondary flex-shrink-0">
              {place.category}
            </span>
          )}
        </div>
        {place.address && (
          <p className="text-sm text-ig-text-secondary truncate">{place.address}</p>
        )}
        <p className="text-xs text-ig-text-tertiary truncate mt-0.5">
          in {place.guideTitle}{place.guideRegion ? ` \u00B7 ${place.guideRegion}` : ''}
        </p>
      </div>
    </Link>
  );
}
