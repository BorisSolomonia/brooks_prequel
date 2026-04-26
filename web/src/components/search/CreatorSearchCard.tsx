import Link from 'next/link';
import type { CreatorSearchResult } from '@/types';

interface CreatorSearchCardProps {
  creator: CreatorSearchResult;
}

export default function CreatorSearchCard({ creator }: CreatorSearchCardProps) {
  return (
    <Link
      href={`/creators/${creator.username}`}
      className="flex min-h-20 items-center gap-3 rounded-xl bg-ig-elevated p-3 transition-colors hover:bg-ig-border"
    >
      <div className="w-12 h-12 rounded-full bg-ig-border flex items-center justify-center overflow-hidden flex-shrink-0">
        {creator.avatarUrl ? (
          <img src={creator.avatarUrl} alt={creator.displayName || creator.username} className="w-full h-full object-cover" />
        ) : (
          <span className="text-ig-text-secondary text-lg font-semibold">
            {(creator.displayName || creator.username || '?').charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-ig-text-primary truncate">
            {creator.displayName || creator.username}
          </span>
          {creator.verified && (
            <svg className="h-4 w-4 flex-shrink-0 text-ig-blue" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          )}
        </div>
        <p className="text-sm text-ig-text-secondary truncate">@{creator.username}</p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ig-text-tertiary">
          {creator.region && <span>{creator.region}</span>}
          <span>{creator.followerCount} followers</span>
          <span>{creator.guideCount} guides</span>
        </div>
      </div>
    </Link>
  );
}
