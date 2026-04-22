'use client';

import { useEffect, useState } from 'react';
import { useAccessToken } from '@/hooks/useAccessToken';
import { api } from '@/lib/api';
import { bpsToPercent } from '@/lib/formatting';

interface CommissionRule {
  id: string;
  ruleType: 'GLOBAL' | 'REGION' | 'CREATOR';
  region: string | null;
  creatorId: string | null;
  rateBps: number;
  notes: string | null;
  createdAt: string;
}

interface Creator {
  userId: string;
  username: string;
  displayName: string | null;
  region: string | null;
  verified: boolean;
  followerCount: number;
  effectiveRateBps: number;
  rateSource: string;
}

function RateInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [display, setDisplay] = useState(bpsToPercent(value));

  function handleBlur() {
    const percent = parseFloat(display);
    if (!isNaN(percent) && percent >= 0 && percent <= 100) {
      onChange(Math.round(percent * 100));
    } else {
      setDisplay(bpsToPercent(value));
    }
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min="0"
        max="100"
        step="0.01"
        value={display}
        onChange={(e) => setDisplay(e.target.value)}
        onBlur={handleBlur}
        className="w-20 px-2 py-1 text-sm border border-[var(--border)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)]"
      />
      <span className="text-sm text-[var(--text-secondary)]">%</span>
    </div>
  );
}

export default function CommissionPage() {
  const { token } = useAccessToken();
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);

  // New rule form state
  const [newRuleType, setNewRuleType] = useState<'GLOBAL' | 'REGION' | 'CREATOR'>('GLOBAL');
  const [newRegion, setNewRegion] = useState('');
  const [newCreatorId, setNewCreatorId] = useState('');
  const [newRateBps, setNewRateBps] = useState(2000);
  const [newNotes, setNewNotes] = useState('');

  // Bulk state
  const [selectedCreators, setSelectedCreators] = useState<Set<string>>(new Set());
  const [bulkRateBps, setBulkRateBps] = useState(2000);
  const [regionFilter, setRegionFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.get<CommissionRule[]>('/api/admin/commission/rules', token),
      api.get<Creator[]>('/api/admin/commission/creators', token),
    ]).then(([r, c]) => {
      setRules(r);
      setCreators(c);
      setLoading(false);
    });
  }, [token]);

  function globalRule() {
    return rules.find((r) => r.ruleType === 'GLOBAL');
  }

  async function createRule() {
    if (!token) return;
    const body = {
      ruleType: newRuleType,
      region: newRuleType === 'REGION' ? newRegion : null,
      creatorId: newRuleType === 'CREATOR' ? newCreatorId : null,
      rateBps: newRateBps,
      notes: newNotes || null,
    };
    const created = await api.post<CommissionRule>('/api/admin/commission/rules', body, token);
    setRules((prev) => [
      ...prev.filter((r) => {
        if (newRuleType === 'GLOBAL') return r.ruleType !== 'GLOBAL';
        if (newRuleType === 'REGION') return !(r.ruleType === 'REGION' && r.region?.toLowerCase() === newRegion.toLowerCase());
        if (newRuleType === 'CREATOR') return !(r.ruleType === 'CREATOR' && r.creatorId === newCreatorId);
        return true;
      }),
      created,
    ]);
    setNewRegion('');
    setNewCreatorId('');
    setNewNotes('');
  }

  async function deleteRule(id: string) {
    if (!token) return;
    await api.delete('/api/admin/commission/rules/' + id, token);
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  async function applyBulkCommission() {
    if (!token || selectedCreators.size === 0) return;
    await api.post('/api/admin/commission/creators/bulk-commission', {
      creatorIds: Array.from(selectedCreators),
      rateBps: bulkRateBps,
      notes: 'Bulk assignment',
    }, token);
    setSelectedCreators(new Set());
    const updated = await api.get<Creator[]>('/api/admin/commission/creators', token);
    setCreators(updated);
  }

  const filteredCreators = creators.filter((c) => {
    if (regionFilter && c.region?.toLowerCase() !== regionFilter.toLowerCase()) return false;
    if (verifiedFilter !== null && c.verified !== verifiedFilter) return false;
    return true;
  });

  if (loading) {
    return <div className="text-[var(--text-secondary)]">Loading…</div>;
  }

  const global = globalRule();
  const regionRules = rules.filter((r) => r.ruleType === 'REGION');
  const creatorRules = rules.filter((r) => r.ruleType === 'CREATOR');

  return (
    <div className="max-w-4xl space-y-10">
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">Commission Rules</h1>

      {/* Global default */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Global Default</h2>
        <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--bg-elevated)] flex items-center gap-6">
          <div>
            <p className="text-3xl font-bold text-[var(--text-primary)]">
              {global ? bpsToPercent(global.rateBps) : '20'}%
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              {global ? 'Set globally' : 'Hardcoded fallback'}
            </p>
          </div>
          {global && (
            <button
              onClick={() => deleteRule(global.id)}
              className="text-xs text-red-500 hover:underline ml-auto"
            >
              Remove override
            </button>
          )}
        </div>
      </section>

      {/* Add new rule */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Add Rule</h2>
        <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--bg-elevated)] space-y-4">
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-1">Type</label>
              <select
                value={newRuleType}
                onChange={(e) => setNewRuleType(e.target.value as typeof newRuleType)}
                className="px-3 py-1.5 text-sm border border-[var(--border)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)]"
              >
                <option value="GLOBAL">Global</option>
                <option value="REGION">Region</option>
                <option value="CREATOR">Creator</option>
              </select>
            </div>
            {newRuleType === 'REGION' && (
              <div>
                <label className="block text-xs text-[var(--text-tertiary)] mb-1">Region</label>
                <input
                  value={newRegion}
                  onChange={(e) => setNewRegion(e.target.value)}
                  placeholder="e.g. Europe"
                  className="px-3 py-1.5 text-sm border border-[var(--border)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)]"
                />
              </div>
            )}
            {newRuleType === 'CREATOR' && (
              <div>
                <label className="block text-xs text-[var(--text-tertiary)] mb-1">Creator UUID</label>
                <input
                  value={newCreatorId}
                  onChange={(e) => setNewCreatorId(e.target.value)}
                  placeholder="UUID"
                  className="px-3 py-1.5 text-sm border border-[var(--border)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)] w-72"
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-1">Rate</label>
              <RateInput value={newRateBps} onChange={setNewRateBps} />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-1">Notes</label>
              <input
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Optional"
                className="px-3 py-1.5 text-sm border border-[var(--border)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)]"
              />
            </div>
            <button
              onClick={createRule}
              className="px-4 py-1.5 text-sm rounded-lg bg-[var(--brand-primary)] text-white font-medium"
            >
              Add
            </button>
          </div>
        </div>
      </section>

      {/* Region rules */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Region Rules</h2>
        {regionRules.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No region rules configured.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-tertiary)]">
                <th className="py-2 pr-4">Region</th>
                <th className="py-2 pr-4">Rate</th>
                <th className="py-2 pr-4">Notes</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {regionRules.map((r) => (
                <tr key={r.id} className="border-b border-[var(--border-light)]">
                  <td className="py-2 pr-4 text-[var(--text-primary)]">{r.region}</td>
                  <td className="py-2 pr-4 font-medium text-[var(--text-primary)]">{bpsToPercent(r.rateBps)}%</td>
                  <td className="py-2 pr-4 text-[var(--text-secondary)]">{r.notes ?? '—'}</td>
                  <td className="py-2 text-right">
                    <button onClick={() => deleteRule(r.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Creator-specific rules */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Creator-Specific Rules</h2>
        {creatorRules.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No creator-specific rules configured.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-tertiary)]">
                <th className="py-2 pr-4">Creator ID</th>
                <th className="py-2 pr-4">Rate</th>
                <th className="py-2 pr-4">Notes</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {creatorRules.map((r) => {
                const creator = creators.find((c) => c.userId === r.creatorId);
                return (
                  <tr key={r.id} className="border-b border-[var(--border-light)]">
                    <td className="py-2 pr-4 text-[var(--text-primary)]">
                      {creator ? `@${creator.username}` : r.creatorId}
                    </td>
                    <td className="py-2 pr-4 font-medium text-[var(--text-primary)]">{bpsToPercent(r.rateBps)}%</td>
                    <td className="py-2 pr-4 text-[var(--text-secondary)]">{r.notes ?? '—'}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => deleteRule(r.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Bulk commission */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
          Bulk Assign ({selectedCreators.size} selected)
        </h2>
        <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--bg-elevated)] space-y-4">
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-1">Filter by region</label>
              <input
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                placeholder="Any"
                className="px-3 py-1.5 text-sm border border-[var(--border)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-1">Verified</label>
              <select
                value={verifiedFilter === null ? '' : String(verifiedFilter)}
                onChange={(e) => setVerifiedFilter(e.target.value === '' ? null : e.target.value === 'true')}
                className="px-3 py-1.5 text-sm border border-[var(--border)] rounded bg-[var(--bg-primary)] text-[var(--text-primary)]"
              >
                <option value="">Any</option>
                <option value="true">Verified only</option>
                <option value="false">Unverified only</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-1">Rate to apply</label>
              <RateInput value={bulkRateBps} onChange={setBulkRateBps} />
            </div>
            <button
              onClick={applyBulkCommission}
              disabled={selectedCreators.size === 0}
              className="px-4 py-1.5 text-sm rounded-lg bg-[var(--brand-primary)] text-white font-medium disabled:opacity-40"
            >
              Apply to {selectedCreators.size} creator{selectedCreators.size !== 1 ? 's' : ''}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-tertiary)]">
                  <th className="py-2 pr-3">
                    <input
                      type="checkbox"
                      checked={filteredCreators.length > 0 && filteredCreators.every((c) => selectedCreators.has(c.userId))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCreators((prev) => new Set(Array.from(prev).concat(filteredCreators.map((c) => c.userId))));
                        } else {
                          setSelectedCreators((prev) => {
                            const next = new Set(prev);
                            filteredCreators.forEach((c) => next.delete(c.userId));
                            return next;
                          });
                        }
                      }}
                    />
                  </th>
                  <th className="py-2 pr-4">Creator</th>
                  <th className="py-2 pr-4">Region</th>
                  <th className="py-2 pr-4">Current Rate</th>
                  <th className="py-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {filteredCreators.map((c) => (
                  <tr key={c.userId} className="border-b border-[var(--border-light)]">
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={selectedCreators.has(c.userId)}
                        onChange={(e) => {
                          setSelectedCreators((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(c.userId);
                            else next.delete(c.userId);
                            return next;
                          });
                        }}
                      />
                    </td>
                    <td className="py-2 pr-4 text-[var(--text-primary)]">
                      @{c.username}
                      {c.verified && <span className="ml-1 text-xs text-[var(--brand-primary)]">✓</span>}
                    </td>
                    <td className="py-2 pr-4 text-[var(--text-secondary)]">{c.region ?? '—'}</td>
                    <td className="py-2 pr-4 font-medium text-[var(--text-primary)]">{bpsToPercent(c.effectiveRateBps)}%</td>
                    <td className="py-2 text-xs text-[var(--text-tertiary)]">{c.rateSource}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
