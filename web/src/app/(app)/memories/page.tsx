'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAccessToken } from '@/hooks/useAccessToken';
import { api } from '@/lib/api';

type RecipientSummary = {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

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
  // Sender (the memory creator) — used by the "Received" tab filter.
  creatorId: string;
  creatorUsername: string | null;
  creatorDisplayName: string | null;
  // Recipients I shared this with — only present on the "My Memories" list.
  recipients?: RecipientSummary[] | null;
};

type Tab = 'created' | 'shared';
type SortOrder = 'newest' | 'oldest';

// A {value,label} pair for the relationship-filter <select>.
type PersonOption = { value: string; label: string };

function personLabel(name: string | null, username: string | null): string {
  return name || (username ? `@${username}` : 'Brooks user');
}

export default function MyMemoriesPage() {
  const { token, loading: tokenLoading } = useAccessToken();
  const [tab, setTab] = useState<Tab>('created');
  const [created, setCreated] = useState<Memory[] | null>(null);
  const [shared, setShared] = useState<Memory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  // Selected person id for the relationship filter ('' = everyone). The meaning
  // depends on the tab: a recipient on "My Memories", a sender on "Received".
  const [personFilter, setPersonFilter] = useState('');

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

  // Switching tabs swaps what the relationship filter means (recipient vs sender),
  // so reset it to avoid carrying a stale id that matches nothing on the other tab.
  useEffect(() => {
    setPersonFilter('');
  }, [tab]);

  const items = tab === 'created' ? created : shared;
  const loading = tokenLoading || items === null;

  // Distinct people for the relationship filter: recipients on "My Memories",
  // senders (creators) on "Received". Deduped by id, sorted by label.
  const personOptions = useMemo<PersonOption[]>(() => {
    const map = new Map<string, string>();
    if (tab === 'created') {
      (created ?? []).forEach((m) =>
        (m.recipients ?? []).forEach((r) =>
          map.set(r.userId, personLabel(r.displayName, r.username)),
        ),
      );
    } else {
      (shared ?? []).forEach((m) =>
        map.set(m.creatorId, personLabel(m.creatorDisplayName, m.creatorUsername)),
      );
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [tab, created, shared]);

  // Apply the relationship filter, then the chronological sort.
  const visibleItems = useMemo<Memory[]>(() => {
    let list = items ?? [];
    if (personFilter) {
      list = list.filter((m) =>
        tab === 'created'
          ? (m.recipients ?? []).some((r) => r.userId === personFilter)
          : m.creatorId === personFilter,
      );
    }
    return [...list].sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sortOrder === 'newest' ? diff : -diff;
    });
  }, [items, personFilter, sortOrder, tab]);

  const filterLabel = tab === 'created' ? 'Shared with' : 'From';

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-black uppercase tracking-[0.04em] text-ig-text-primary">
          Memories
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
          My Memories
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
          Received
        </button>
      </div>

      {/* Filters: chronological sort (both tabs) + relationship filter
          (recipient on My Memories, sender on Received) — BOR-30. */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-ig-text-secondary">
          Sort
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="min-h-10 rounded-lg border-2 border-ig-border bg-ig-elevated px-3 py-1.5 text-sm font-normal text-ig-text-primary outline-none focus:border-brand-500"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs font-semibold text-ig-text-secondary">
          {filterLabel}
          <select
            value={personFilter}
            onChange={(e) => setPersonFilter(e.target.value)}
            disabled={personOptions.length === 0}
            className="min-h-10 rounded-lg border-2 border-ig-border bg-ig-elevated px-3 py-1.5 text-sm font-normal text-ig-text-primary outline-none focus:border-brand-500 disabled:opacity-50"
          >
            <option value="">Everyone</option>
            {personOptions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="mb-4 text-sm text-ig-error">{error}</p>}

      {loading ? (
        <p className="text-center text-sm text-ig-text-tertiary">Loading…</p>
      ) : visibleItems.length === 0 ? (
        <p className="text-center text-sm text-ig-text-tertiary">
          {personFilter
            ? 'No memories match this filter.'
            : tab === 'created'
              ? "You haven't created any memories yet."
              : 'Nobody has shared a memory with you yet.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {visibleItems.map((m) => (
            <li key={m.id}>
              <Link
                href={`/maps?memory=${encodeURIComponent(m.id)}`}
                className="mw-card block p-4 transition-colors hover:bg-ig-hover"
              >
                <p className="line-clamp-3 text-sm text-ig-text-primary">
                  {m.revealed ? m.textContent : '🔒 Hidden — go to the location to unlock it'}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ig-text-tertiary">
                  {m.placeLabel && <span>{m.placeLabel}</span>}
                  <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                  {tab === 'created' && m.recipients && m.recipients.length > 0 && (
                    <span>
                      Shared with {personLabel(m.recipients[0].displayName, m.recipients[0].username)}
                      {m.recipients.length > 1 ? ` +${m.recipients.length - 1}` : ''}
                    </span>
                  )}
                  {tab === 'shared' && (
                    <span>From {personLabel(m.creatorDisplayName, m.creatorUsername)}</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
