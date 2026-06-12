'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import StoryStrip from '@/components/ui/StoryStrip';
import { useAccessToken } from '@/hooks/useAccessToken';
import { useRouter } from 'next/navigation';
import { redirectToLogin } from '@/lib/capacitor';
import { api } from '@/lib/api';
import type { CreatorStoryStrip, FeedItem, PageResponse } from '@/types';

export default function FeedPage() {
  const { t } = useTranslation();
  const { token, loading: tokenLoading } = useAccessToken();
  const router = useRouter();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [storyStrips, setStoryStrips] = useState<CreatorStoryStrip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tokenLoading) return;
    if (!token) {
      redirectToLogin();
      return;
    }

    Promise.all([
      api.get<CreatorStoryStrip[]>('/api/stories/feed', token).catch((err) => { console.error('[feed] stories:', err); return [] as CreatorStoryStrip[]; }),
      api.get<PageResponse<FeedItem>>('/api/feed', token).catch((err) => { console.error('[feed] items:', err); return null; }),
    ])
      .then(([strips, page]) => {
        setStoryStrips(strips);
        setFeedItems(page?.content ?? []);
      })
      .finally(() => setLoading(false));
  }, [token, tokenLoading, router]);

  if (tokenLoading || loading) {
    return <div className="mx-auto max-w-2xl px-4 py-12 text-center text-ig-text-tertiary">{t('account.feed.loading')}</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      {/* Story Strip */}
      <StoryStrip strips={storyStrips} />

      {/* Separator */}
      {storyStrips.length > 0 && <hr className="my-2 border-t-2 border-ig-border" />}

      {/* Feed */}
      <div className="space-y-4 mt-4">
        {feedItems.length === 0 ? (
          <div className="mw-card py-12 text-center">
            <p className="mb-2 font-display text-lg font-black uppercase tracking-[0.08em] text-ig-text-primary">{t('account.feed.emptyTitle')}</p>
            <p className="text-sm text-ig-text-tertiary">{t('account.feed.emptyBody')}</p>
          </div>
        ) : (
          feedItems.map((item) => (
            <div key={item.id} className="mw-card overflow-hidden p-0">
              <div className="flex items-center gap-3 p-3">
                <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border-2 border-ig-border bg-ig-secondary">
                  {item.creatorAvatarUrl && (
                    <Image
                      src={item.creatorAvatarUrl}
                      alt=""
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <p className="font-display text-sm font-black text-ig-text-primary">{item.creatorDisplayName}</p>
                  <p className="text-xs text-ig-text-tertiary">@{item.creatorUsername}</p>
                </div>
              </div>

              {item.imageUrl && (
                <Image
                  src={item.imageUrl}
                  alt={item.title || ''}
                  width={1280}
                  height={720}
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="aspect-video w-full border-y-2 border-ig-border object-cover saturate-[0.92] contrast-[1.04]"
                />
              )}

              {(item.title || item.caption) && (
                <div className="p-3">
                  {item.title && <p className="font-display font-black text-ig-text-primary">{item.title}</p>}
                  {item.caption && <p className="text-sm text-ig-text-secondary mt-1">{item.caption}</p>}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
