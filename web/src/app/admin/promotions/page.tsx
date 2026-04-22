'use client';

import { useEffect, useState } from 'react';
import { useAccessToken } from '@/hooks/useAccessToken';
import { api } from '@/lib/api';
import { bpsToPercent } from '@/lib/formatting';

interface Promotion {
  id: string;
  name: string;
  description: string | null;
  rateBps: number;
  targetType: 'ALL' | 'REGION' | 'CREATOR_LIST';
  region: string | null;
  creatorIds: string[];
  startsAt: string;
  endsAt: string;
  active: boolean;
  createdAt: string;
}

function daysRemaining(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return null;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function PromotionsPage() {
  const { token } = useAccessToken();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rateBps, setRateBps] = useState(1000);
  const [targetType, setTargetType] = useState<'ALL' | 'REGION' | 'CREATOR_LIST'>('ALL');
  const [region, setRegion] = useState('');
  const [creatorList, setCreatorList] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get<Promotion[]>('/api/admin/commission/promotions', token).then((p) => {
      setPromotions(p);
      setLoading(false);
    });
  }, [token]);

  async function createPromotion() {
    if (!token || !name || !startsAt || !endsAt) return;
    setCreating(true);
    const body = {
      name,
      description: description || null,
      rateBps,
      targetType,
      region: targetType === 'REGION' ? region : null,
      creatorIds:
        targetType === 'CREATOR_LIST'
          ? creatorList.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
    };
    const created = await api.post<Promotion>('/api/admin/commission/promotions', body, token);
    setPromotions((prev) => [created, ...prev]);
    setName('');
    setDescription('');
    setRateBps(1000);
    setTargetType('ALL');
    setRegion('');
    setCreatorList('');
    setStartsAt('');
    setEndsAt('');
    setCreating(false);
  }

  async function deactivate(id: string) {
    if (!token) return;
    await api.put('/api/admin/commission/promotions/' + id + '/deactivate', {}, token);
    setPromotions((prev) => prev.map((p) => (p.id === id ? { ...p, active: false } : p)));
  }

  const active = promotions.filter((p) => p.active && new Date(p.endsAt) > new Date());
  const past = promotions.filter((p) => !p.active || new Date(p.endsAt) <= new Date());

  if (loading) return <div className="text-[var(--text-secondary)]">Loading…</div>;

  return (
    <div className="max-w-3xl space-y-10">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">Promotions</h1>

      {/* Active */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Active</h2>
        {active.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No active promotions.</p>
        ) : (
          <div className="space-y-3">
            {active.map((p) => {
              const days = daysRemaining(p.endsAt);
              return (
                <div key={p.id} className="border border-[var(--border)] rounded-xl p-4 bg-[var(--bg-elevated)] flex justify-between items-start gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--text-primary)]">{p.name}</span>
                      {days !== null && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--brand-primary)] text-white">
                          {days}d left
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {bpsToPercent(p.rateBps)}% · {p.targetType}{p.region ? ` · ${p.region}` : ''}
                    </p>
                    {p.description && <p className="text-xs text-[var(--text-tertiary)]">{p.description}</p>}
                  </div>
                  <button onClick={() => deactivate(p.id)} className="text-xs text-red-500 hover:underline shrink-0">
                    End early
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Create */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Create Promotion</h2>
        <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--bg-elevated)] space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-1">Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-[var(--border)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-1">Rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={(rateBps / 100).toFixed(2)}
                onChange={(e) => setRateBps(Math.round(parseFloat(e.target.value) * 100))}
                className="w-full px-3 py-1.5 text-sm border border-[var(--border)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-1">Target</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as typeof targetType)}
                className="w-full px-3 py-1.5 text-sm border border-[var(--border)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)]"
              >
                <option value="ALL">All creators</option>
                <option value="REGION">Region</option>
                <option value="CREATOR_LIST">Creator list</option>
              </select>
            </div>
            {targetType === 'REGION' && (
              <div>
                <label className="block text-xs text-[var(--text-tertiary)] mb-1">Region</label>
                <input
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-[var(--border)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)]"
                />
              </div>
            )}
            {targetType === 'CREATOR_LIST' && (
              <div>
                <label className="block text-xs text-[var(--text-tertiary)] mb-1">Creator UUIDs (comma-separated)</label>
                <textarea
                  value={creatorList}
                  onChange={(e) => setCreatorList(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 text-sm border border-[var(--border)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)]"
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-1">Starts at *</label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-[var(--border)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-1">Ends at *</label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-[var(--border)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)]"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-[var(--text-tertiary)] mb-1">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-[var(--border)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)]"
              />
            </div>
          </div>
          <button
            onClick={createPromotion}
            disabled={creating || !name || !startsAt || !endsAt}
            className="px-5 py-2 text-sm rounded-lg bg-[var(--brand-primary)] text-white font-medium disabled:opacity-40"
          >
            {creating ? 'Creating…' : 'Create Promotion'}
          </button>
        </div>
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Past / Ended</h2>
          <div className="space-y-2">
            {past.map((p) => (
              <div key={p.id} className="border border-[var(--border-light)] rounded-xl p-3 bg-[var(--bg-secondary)] flex justify-between">
                <span className="text-sm text-[var(--text-secondary)]">{p.name} — {bpsToPercent(p.rateBps)}%</span>
                <span className="text-xs text-[var(--text-tertiary)]">{new Date(p.endsAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
