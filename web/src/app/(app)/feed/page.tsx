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
      api.get<CreatorStoryStrip[]>('/api/stories/feed', token).catch(() => [] as CreatorStoryStrip[]),
      api.get<FeedItem[]>('/api/feed', token).catch(() => [] as FeedItem[]),
    ])
      .then(([strips, items]) => {
        setStoryStrips(strips);
        setFeedItems(items);
      })
      .finally(() => setLoading(false));
  }, [token, tokenLoading, router]);

  if (tokenLoading || loading) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-ig-text-tertiary">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Story Strip */}
      <StoryStrip strips={storyStrips} />

      {/* Separator */}
      {storyStrips.length > 0 && <hr className="border-ig-border my-2" />}

      {/* Feed */}
      <div className="space-y-4 mt-4">
        {feedItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-ig-text-secondary mb-2">Your feed is empty</p>
            <p className="text-sm text-ig-text-tertiary">Follow some creators to see their guides and stories here.</p>
          </div>
        ) : (
          feedItems.map((item) => (
            <div key={item.id} className="bg-ig-elevated rounded-xl border border-ig-border overflow-hidden">
              <div className="flex items-center gap-3 p-3">
                <div className="w-8 h-8 rounded-full bg-ig-secondary overflow-hidden flex-shrink-0">
                  {item.creatorAvatarUrl && (
                    <img src={item.creatorAvatarUrl} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-ig-text-primary">{item.creatorDisplayName}</p>
                  <p className="text-xs text-ig-text-tertiary">@{item.creatorUsername}</p>
                </div>
              </div>

              {item.imageUrl && (
                <img src={item.imageUrl} alt={item.title || ''} className="w-full aspect-video object-cover" />
              )}

              {(item.title || item.caption) && (
                <div className="p-3">
                  {item.title && <p className="font-medium text-ig-text-primary">{item.title}</p>}
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
