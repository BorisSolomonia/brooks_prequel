'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { FollowerSummary, GuideCheckoutSessionResponse } from '@/types';

interface Props {
  guideId: string;
  token: string;
  onClose: () => void;
}

export default function GiftGuideModal({ guideId, token, onClose }: Props) {
  const [followers, setFollowers] = useState<FollowerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<FollowerSummary | null>(null);
  const [gifting, setGifting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'already_owned' | 'error'; message: string } | null>(null);

  useEffect(() => {
    api.get<FollowerSummary[]>('/api/me/followers', token)
      .then(setFollowers)
      .catch((err) => console.error('[gift] followers load:', err))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = followers.filter((f) => {
    const q = search.toLowerCase();
    return (
      (f.username ?? '').toLowerCase().includes(q) ||
      (f.displayName ?? '').toLowerCase().includes(q)
    );
  });

  const handleGift = async () => {
    if (!selected || gifting) return;
    setGifting(true);
    try {
      const res = await api.post<GuideCheckoutSessionResponse>(
        `/api/guides/${guideId}/gift`,
        { recipientUserId: selected.userId },
        token
      );
      if (res.alreadyOwned) {
        setResult({ type: 'already_owned', message: `${selected.displayName ?? selected.username ?? 'They'} already have this guide.` });
      } else {
        setResult({ type: 'success', message: `Guide gifted to ${selected.displayName ?? selected.username ?? 'follower'} successfully!` });
      }
    } catch (err) {
      setResult({ type: 'error', message: err instanceof Error ? err.message : 'Failed to gift guide' });
    } finally {
      setGifting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={(e) => e.target === e.currentTarget && !result && onClose()}>
      <div className="w-full max-w-md rounded-xl border border-ig-border bg-ig-primary shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ig-border px-5 py-4">
          <h2 className="text-base font-semibold text-ig-text-primary">Gift to a Follower</h2>
          <button type="button" onClick={onClose} className="text-ig-text-tertiary hover:text-ig-text-primary">✕</button>
        </div>

        {result ? (
          <div className="px-5 py-8 text-center">
            <p className={`text-sm font-medium ${result.type === 'error' ? 'text-ig-error' : 'text-ig-success'}`}>
              {result.message}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 rounded-lg bg-ig-blue px-5 py-2 text-sm font-semibold text-white hover:bg-ig-blue-hover"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="px-5 pt-4 pb-2">
              <input
                type="text"
                placeholder="Search followers…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-ig-border bg-ig-secondary px-3 py-2 text-sm text-ig-text-primary placeholder:text-ig-text-tertiary focus:border-ig-blue focus:outline-none"
              />
            </div>

            {/* Follower list */}
            <div className="max-h-64 overflow-y-auto px-2 py-2">
              {loading ? (
                <p className="py-8 text-center text-sm text-ig-text-tertiary">Loading followers…</p>
              ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-ig-text-tertiary">
                  {followers.length === 0 ? 'You have no followers yet.' : 'No followers match your search.'}
                </p>
              ) : (
                filtered.map((f) => (
                  <button
                    key={f.userId}
                    type="button"
                    onClick={() => setSelected(f)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      selected?.userId === f.userId
                        ? 'bg-ig-blue/15 ring-1 ring-ig-blue/40'
                        : 'hover:bg-ig-hover'
                    }`}
                  >
                    <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-ig-secondary">
                      {f.avatarUrl ? (
                        <img src={f.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-ig-text-tertiary">
                          {(f.displayName ?? f.username ?? '?')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ig-text-primary">
                        {f.displayName ?? f.username ?? 'Unknown'}
                      </p>
                      {f.username && (
                        <p className="truncate text-xs text-ig-text-tertiary">@{f.username}</p>
                      )}
                    </div>
                    {selected?.userId === f.userId && (
                      <span className="ml-auto text-ig-blue">✓</span>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-ig-border px-5 py-4">
              {selected && (
                <p className="mb-3 text-xs text-ig-text-tertiary text-center">
                  Gift this guide to <span className="font-medium text-ig-text-secondary">{selected.displayName ?? selected.username}</span> for free
                </p>
              )}
              <button
                type="button"
                onClick={handleGift}
                disabled={!selected || gifting}
                className="w-full rounded-lg bg-ig-blue py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ig-blue-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {gifting ? 'Gifting…' : 'Confirm Gift'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
