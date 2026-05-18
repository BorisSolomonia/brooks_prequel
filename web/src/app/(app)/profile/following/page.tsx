'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAccessToken } from '@/hooks/useAccessToken';
import { api } from '@/lib/api';

type Person = {
  userId: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
};

export default function FollowingPage() {
  const { token, loading: tokenLoading } = useAccessToken();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tokenLoading || !token) return;
    api.get<Person[]>('/api/me/following', token)
      .then(setPeople)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load following'))
      .finally(() => setLoading(false));
  }, [token, tokenLoading]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-black uppercase tracking-[0.04em] text-ig-text-primary">
          Following
        </h1>
        <Link href="/profile" className="text-sm text-ig-text-tertiary hover:text-ig-text-primary">
          ← Back to profile
        </Link>
      </div>

      {tokenLoading || loading ? (
        <p className="text-center text-sm text-ig-text-tertiary">Loading…</p>
      ) : error ? (
        <p className="text-center text-sm text-ig-error">{error}</p>
      ) : people.length === 0 ? (
        <p className="text-center text-sm text-ig-text-tertiary">
          Not following anyone yet. Search for creators to follow.
        </p>
      ) : (
        <ul className="space-y-2">
          {people.map((p) => (
            <li key={p.userId}>
              <Link
                href={p.username ? `/creators/${p.username}` : '#'}
                className="mw-card flex items-center gap-3 p-3 transition-colors hover:bg-ig-hover"
              >
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-ig-secondary">
                  {p.avatarUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ig-text-primary">{p.displayName}</p>
                  {p.username && <p className="text-xs text-ig-text-tertiary">@{p.username}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
