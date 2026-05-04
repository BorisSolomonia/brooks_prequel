'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StoryStrip from '@/components/ui/StoryStrip';
import { useAccessToken } from '@/hooks/useAccessToken';
import { api } from '@/lib/api';
import type { CreatorStoryStrip, FeedItem } from '@/types';

export default function FeedPage() {
  const { token, loading: tokenLoading } = useAccessToken();
  const router = useRouter();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [storyStrips, setStoryStrips] = useState<CreatorStoryStrip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tokenLoading) return;
    if (!token) {
      router.push('/api/auth/login');
      return;
    }

    Promise.all([
      api.get<CreatorStoryStrip[]>('/api/stories/feed', token).catch((err) => { console.error('[feed] stories:', err); return [] as CreatorStoryStrip[]; }),
      api.get<FeedItem[]>('/api/feed', token).catch((err) => { console.error('[feed] items:', err); return [] as FeedItem[]; }),
    ])
      .then(([strips, items]) => {
        setStoryStrips(strips);
        setFeedItems(items);
      })
      .finally(() => setLoading(false));
  }, [token, tokenLoading, router]);

  if (tokenLoading || loading) {
    return <div className="mx-auto max-w-2xl px-4 py-12 text-center text-ig-text-tertiary">Loading...</div>;
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
            <p className="mb-2 font-display text-lg font-black uppercase tracking-[0.08em] text-ig-text-primary">Your feed is empty</p>
            <p className="text-sm text-ig-text-tertiary">Follow some creators to see their guides and stories here.</p>
          </div>
        ) : (
          feedItems.map((item) => (
            <div key={item.id} className="mw-card overflow-hidden p-0">
              <div className="flex items-center gap-3 p-3">
                <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border-2 border-ig-border bg-ig-secondary">
                  {item.creatorAvatarUrl && (
                    <img src={item.creatorAvatarUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div>
                  <p className="font-display text-sm font-black text-ig-text-primary">{item.creatorDisplayName}</p>
                  <p className="text-xs text-ig-text-tertiary">@{item.creatorUsername}</p>
                </div>
              </div>

              {item.imageUrl && (
                <img src={item.imageUrl} alt={item.title || ''} className="aspect-video w-full border-y-2 border-ig-border object-cover saturate-[0.92] contrast-[1.04]" />
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
