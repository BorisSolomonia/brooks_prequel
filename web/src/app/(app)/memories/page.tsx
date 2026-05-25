'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAccessToken } from '@/hooks/useAccessToken';
import { api } from '@/lib/api';

type Memory = {
  id: string;
  textContent: string | null;
  placeLabel: string | null;
  visibility: string;
  latitude: number;
  longitude: number;
  // False for a memory shared with me that I haven't unlocked at its location.
  revealed: boolean;
  createdAt: string;
};

type Tab = 'created' | 'shared';

export default function MyMemoriesPage() {
  const { token, loading: tokenLoading } = useAccessToken();
  const [tab, setTab] = useState<Tab>('created');
  const [created, setCreated] = useState<Memory[] | null>(null);
  const [shared, setShared] = useState<Memory[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lazy fetch per tab — only hit the API when the tab is selected.
  // created/shared deliberately excluded from deps: the in-effect null
  // check already prevents refetch, and including them caused redundant
  // re-runs (and a duplicate-request race on rapid tab switches).
  useEffect(() => {
    if (tokenLoading || !token) return;
    if (tab === 'created' && created === null) {
      api.get<Memory[]>('/api/me/memories/created', token)
        .then(setCreated)
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
    }
    if (tab === 'shared' && shared === null) {
      api.get<Memory[]>('/api/me/memories/shared', token)
        .then(setShared)
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, token, tokenLoading]);

  const items = tab === 'created' ? created : shared;
  const loading = tokenLoading || items === null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-black uppercase tracking-[0.04em] text-ig-text-primary">
          My memories
        </h1>
        <Link
          href="/maps"
          className="mw-button-secondary min-h-11 rounded-md px-4 py-2 text-sm"
        >
          Open map
        </Link>
      </div>

      <div className="mb-4 flex gap-2 border-b-2 border-ig-border">
        <button
          type="button"
          onClick={() => setTab('created')}
          className={`-mb-px min-h-touch border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
            tab === 'created'
              ? 'border-brand-500 text-ig-text-primary'
              : 'border-transparent text-ig-text-tertiary hover:text-ig-text-secondary'
          }`}
        >
          Created by me
        </button>
        <button
          type="button"
          onClick={() => setTab('shared')}
          className={`-mb-px min-h-touch border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
            tab === 'shared'
              ? 'border-brand-500 text-ig-text-primary'
              : 'border-transparent text-ig-text-tertiary hover:text-ig-text-secondary'
          }`}
        >
          Shared with me
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-ig-error">{error}</p>}

      {loading ? (
        <p className="text-center text-sm text-ig-text-tertiary">Loading…</p>
      ) : items && items.length === 0 ? (
        <p className="text-center text-sm text-ig-text-tertiary">
          {tab === 'created'
            ? "You haven't created any memories yet."
            : "Nobody has shared a memory with you yet."}
        </p>
      ) : (
        <ul className="space-y-2">
          {(items ?? []).map((m) => (
            <li key={m.id}>
              <Link
                href={`/maps?memory=${encodeURIComponent(m.id)}`}
                className="mw-card block p-4 transition-colors hover:bg-ig-hover"
              >
                <p className="line-clamp-3 text-sm text-ig-text-primary">
                  {m.revealed ? m.textContent : '🔒 Hidden — go to the location to unlock it'}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-ig-text-tertiary">
                  {m.placeLabel && <span>{m.placeLabel}</span>}
                  <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
