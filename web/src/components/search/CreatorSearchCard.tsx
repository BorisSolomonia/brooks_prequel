'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import type { CreatorSearchResult } from '@/types';

interface CreatorSearchCardProps {
  creator: CreatorSearchResult;
}

export default function CreatorSearchCard({ creator }: CreatorSearchCardProps) {
  const { t } = useTranslation();
  return (
    <Link
      href={`/creators/${creator.username}`}
      className="pc-surface flex min-h-20 items-center gap-3 p-4 transition-colors hover:border-brand-500"
    >
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-ig-border bg-ig-hover">
        {creator.avatarUrl ? (
          <Image
            src={creator.avatarUrl}
            alt={creator.displayName || creator.username}
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-ig-text-secondary text-lg font-semibold">
            {(creator.displayName || creator.username || '?').charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-display truncate font-black text-ig-text-primary">
            {creator.displayName || creator.username}
          </span>
          {creator.verified && (
            <svg className="h-4 w-4 flex-shrink-0 text-accent-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          )}
        </div>
        <p className="text-sm text-ig-text-secondary truncate">@{creator.username}</p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ig-text-tertiary">
          {creator.creatorRatingAverage > 0 && (
            <span className="inline-flex items-center gap-0.5 font-semibold text-accent-500">
              <span aria-hidden>★</span>{creator.creatorRatingAverage.toFixed(1)}
            </span>
          )}
          {creator.region && <span>{creator.region}</span>}
          <span>{t('discovery.search.creatorFollowers', { count: creator.followerCount })}</span>
          <span>{t('discovery.search.creatorGuides', { count: creator.guideCount })}</span>
        </div>
      </div>
    </Link>
  );
}
