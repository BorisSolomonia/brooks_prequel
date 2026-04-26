'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type {
  Guide, GuideUpdateRequest,
  GuideDay, GuideDayRequest,
  GuideBlock, GuideBlockRequest,
  GuidePlace, GuidePlaceRequest,
} from '@/types';
import GuideMetadataForm from './GuideMetadataForm';
import DayPanel from './DayPanel';
import PublishButton from './PublishButton';
import GiftGuideModal from './GiftGuideModal';
import { CreatorAiPanel } from '@/components/ai/CreatorAiPanel';
import type { AiKeyResponse } from '@/types';

interface Props {
  initialGuide?: Guide;
  token: string;
  aiKeys?: AiKeyResponse[];
}

export default function GuideEditor({ initialGuide, token, aiKeys = [] }: Props) {
  const router = useRouter();
  const [guide, setGuide] = useState<Guide | null>(initialGuide || null);
  const [metadata, setMetadata] = useState<GuideUpdateRequest>({
    title: initialGuide?.title || '',
    description: initialGuide?.description || '',
    coverImageUrl: initialGuide?.coverImageUrl || '',
    region: initialGuide?.region || '',
    primaryCity: initialGuide?.primaryCity || '',
    country: initialGuide?.country || '',
    timezone: initialGuide?.timezone || 'UTC',
    priceCents: initialGuide?.priceCents || 0,
    currency: initialGuide?.currency || 'USD',
    tags: initialGuide?.tags || [],
    travelerStage: initialGuide?.travelerStage ?? undefined,
    personas: initialGuide?.personas ?? [],
    bestSeasonStartMonth: initialGuide?.bestSeasonStartMonth ?? undefined,
    bestSeasonEndMonth: initialGuide?.bestSeasonEndMonth ?? undefined,
    bestSeasonLabel: initialGuide?.bestSeasonLabel ?? undefined,
  });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !(metadata.tags || []).includes(tag)) {
      setMetadata({ ...metadata, tags: [...(metadata.tags || []), tag] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setMetadata({ ...metadata, tags: (metadata.tags || []).filter((t) => t !== tag) });
  };

  const refreshGuide = useCallback(async (guideId: string) => {
    const updated = await api.get<Guide>(`/api/guides/${guideId}`, token);
    setGuide(updated);
  }, [token]);

  // ── Create or update guide metadata ────────────────────────

  const handleSaveMetadata = async () => {
    setSaving(true);
    setError(null);
    try {
      if (guide) {
        await api.patch<Guide>(`/api/guides/${guide.id}`, metadata, token);
        await refreshGuide(guide.id);
      } else {
        const created = await api.post<Guide>('/api/guides', metadata, token);
        setGuide(created);
        router.replace(`/guides/${created.id}/edit`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ── Day CRUD ───────────────────────────────────────────────

  const handleAddDay = async () => {
    if (!guide) return;
    try {
      await api.post<GuideDay>(`/api/guides/${guide.id}/days`, { title: '' }, token);
      await refreshGuide(guide.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add day');
    }
  };

  const handleUpdateDay = async (dayId: string, data: GuideDayRequest) => {
    if (!guide) return;
    try {
      await api.patch<GuideDay>(`/api/guides/${guide.id}/days/${dayId}`, data, token);
      await refreshGuide(guide.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update day');
    }
  };

  const handleDeleteDay = async (dayId: string) => {
    if (!guide) return;
    try {
      await api.delete(`/api/guides/${guide.id}/days/${dayId}`, token);
      await refreshGuide(guide.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete day');
    }
  };

  // ── Block CRUD ─────────────────────────────────────────────

  const handleAddBlock = async (dayId: string, data: GuideBlockRequest) => {
    if (!guide) return;
    try {
      await api.post<GuideBlock>(`/api/guides/${guide.id}/days/${dayId}/blocks`, data, token);
      await refreshGuide(guide.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add block');
    }
  };

  const handleUpdateBlock = async (blockId: string, data: GuideBlockRequest) => {
    if (!guide) return;
    try {
      await api.patch<GuideBlock>(`/api/guides/${guide.id}/blocks/${blockId}`, data, token);
      await refreshGuide(guide.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update block');
    }
  };

  const handleDeleteBlock = async (dayId: string, blockId: string) => {
    if (!guide) return;
    try {
      await api.delete(`/api/guides/${guide.id}/days/${dayId}/blocks/${blockId}`, token);
      await refreshGuide(guide.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete block');
    }
  };

  // ── Place CRUD ─────────────────────────────────────────────

  const handleAddPlace = async (blockId: string, data: GuidePlaceRequest) => {
    if (!guide) return;
    try {
      await api.post<GuidePlace>(`/api/guides/${guide.id}/blocks/${blockId}/places`, data, token);
      await refreshGuide(guide.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add place');
    }
  };

  const handleUpdatePlace = async (placeId: string, data: GuidePlaceRequest) => {
    if (!guide) return;
    try {
      await api.patch<GuidePlace>(`/api/guides/${guide.id}/places/${placeId}`, data, token);
      await refreshGuide(guide.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update place');
    }
  };

  const handleDeletePlace = async (blockId: string, placeId: string) => {
    if (!guide) return;
    try {
      await api.delete(`/api/guides/${guide.id}/blocks/${blockId}/places/${placeId}`, token);
      await refreshGuide(guide.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete place');
    }
  };

  // ── Publish ────────────────────────────────────────────────

  const completenessItems = useMemo(() => {
    const allBlocks = (guide?.days ?? []).flatMap((d) => d.blocks);
    const hasBlockCategory = (cat: string) => allBlocks.some((b) => b.blockCategory === cat);
    const words = (s: string | null | undefined) => (s ?? '').trim().split(/\s+/).filter(Boolean).length;
    return [
      { label: 'Title is set with a hook (10+ words)', done: words(metadata.title) >= 10 },
      { label: 'Description is compelling (30+ words)', done: words(metadata.description) >= 30 },
      { label: 'Cover image uploaded', done: !!(metadata.coverImageUrl) },
      { label: 'Region and city set', done: !!(metadata.region && metadata.primaryCity) },
      { label: 'Traveler stage selected', done: !!(metadata as GuideUpdateRequest).travelerStage },
      { label: 'Audience persona(s) selected', done: ((metadata as GuideUpdateRequest).personas ?? []).length > 0 },
      { label: 'Safety or Emergency block added', done: hasBlockCategory('SAFETY') || hasBlockCategory('EMERGENCY') },
      { label: 'Transport block added', done: hasBlockCategory('TRANSPORT') },
      { label: 'Accommodation block added', done: hasBlockCategory('ACCOMMODATION') },
      { label: 'Seasonal info set', done: !!(metadata as GuideUpdateRequest).bestSeasonLabel || hasBlockCategory('SEASONAL') },
      { label: 'Secret insider tip block added', done: hasBlockCategory('SECRET') },
    ];
  }, [guide, metadata]);

  const completedCount = completenessItems.filter((i) => i.done).length;

  const handlePublish = async () => {
    if (!guide) return;
    try {
      await api.post<Guide>(`/api/guides/${guide.id}/publish`, undefined, token);
      await refreshGuide(guide.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    }
  };

  const handleDeleteGuide = async () => {
    if (!guide || deleting) return;
    const confirmed = window.confirm(
      `Delete "${guide.title}"? This removes it from your guides and cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      await api.delete<void>(`/api/guides/${guide.id}`, token);
      router.push('/guides');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete guide');
      setDeleting(false);
    }
  };

  return (
    <>
    <div className="max-w-3xl mx-auto px-4 py-6">
      {error && (
        <div className="mb-4 p-3 bg-ig-error/10 border border-ig-error/30 rounded-md text-ig-error text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-ig-error/70 hover:text-ig-error">&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-ig-text-primary">
          {guide ? 'Edit Guide' : 'New Guide'}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          {guide && (
            <button
              type="button"
              onClick={handleDeleteGuide}
              disabled={deleting}
              className="min-h-11 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Delete Guide'}
            </button>
          )}
          {guide && guide.status === 'DRAFT' && guide.dayCount > 0 && (
            <PublishButton onPublish={handlePublish} />
          )}
          {guide && guide.status === 'PUBLISHED' && (
            <>
              <button
                type="button"
                onClick={() => setShowGiftModal(true)}
                className="min-h-11 rounded-lg border border-ig-border bg-ig-elevated px-3 py-2 text-sm font-semibold text-ig-text-primary transition-colors hover:bg-ig-hover"
              >
                🎁 Gift to Follower
              </button>
              <span className="inline-flex min-h-9 items-center rounded-pill bg-ig-success/20 px-3 py-1 text-sm font-semibold text-ig-success">Published v{guide.versionNumber}</span>
            </>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="mb-6 bg-ig-elevated border border-ig-border rounded-lg overflow-hidden">
        <div className="p-4">
          <GuideMetadataForm
            data={metadata}
            onChange={(d) => setMetadata(d as GuideUpdateRequest)}
            tagInput={tagInput}
            onTagInputChange={setTagInput}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
          />
        </div>
        <div className="sticky bottom-0 px-4 py-3 bg-ig-elevated border-t border-ig-border">
          <button
            onClick={handleSaveMetadata}
            disabled={saving || !metadata.title}
            className="min-h-11 w-full rounded-lg bg-ig-blue py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ig-blue-hover disabled:opacity-50"
          >
            {saving ? 'Saving…' : guide ? 'Save Changes' : 'Create Guide'}
          </button>
        </div>
      </div>

      {/* Completeness score */}
      {guide && (
        <div className="mb-6 p-4 bg-ig-elevated border border-ig-border rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ig-text-primary">Guide completeness</h2>
            <span className={`text-sm font-bold ${completedCount >= 9 ? 'text-green-400' : completedCount >= 6 ? 'text-yellow-400' : 'text-ig-text-tertiary'}`}>
              {completedCount}/11
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-ig-border overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-300 ${completedCount >= 9 ? 'bg-green-400' : completedCount >= 6 ? 'bg-yellow-400' : 'bg-brand-500'}`}
              style={{ width: `${(completedCount / 11) * 100}%` }}
            />
          </div>
          <ul className="space-y-1">
            {completenessItems.filter((i) => !i.done).map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-xs text-ig-text-tertiary">
                <span className="w-3 h-3 rounded-full border border-ig-border flex-shrink-0" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Days */}
      {guide && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-ig-text-primary">Itinerary</h2>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-ig-text-tertiary">{guide.dayCount} days, {guide.placeCount} places</span>
              {aiKeys.length > 0 && (
                <button
                  onClick={() => setShowAiPanel((v) => !v)}
                  className="flex min-h-11 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] md:min-h-0 md:py-1 md:text-xs"
                >
                  <span>✨</span>
                  <span>{showAiPanel ? 'Hide AI' : 'Create with AI'}</span>
                </button>
              )}
            </div>
          </div>

          {showAiPanel && aiKeys.length > 0 && (
            <CreatorAiPanel
              guide={guide}
              availableProviders={aiKeys.map((k) => k.provider as 'OPENAI' | 'GEMINI' | 'ANTHROPIC')}
              onDayAdded={(day) => setGuide((g) => g ? { ...g, days: [...(g.days ?? []), day] } : g)}
              onBlockAdded={(dayId, block) =>
                setGuide((g) => g ? {
                  ...g,
                  days: (g.days ?? []).map((d) =>
                    d.id === dayId ? { ...d, blocks: [...(d.blocks ?? []), block] } : d
                  ),
                } : g)
              }
              onPlaceAdded={(blockId, place) =>
                setGuide((g) => g ? {
                  ...g,
                  days: (g.days ?? []).map((d) => ({
                    ...d,
                    blocks: (d.blocks ?? []).map((b) =>
                      b.id === blockId ? { ...b, places: [...(b.places ?? []), place] } : b
                    ),
                  })),
                } : g)
              }
              onGuideUpdated={(fields) => {
                setGuide((g) => g ? { ...g, ...fields } : g);
                const nonNull = Object.fromEntries(
                  Object.entries(fields).map(([k, v]) => [k, v === null ? undefined : v])
                );
                setMetadata((m) => ({ ...m, ...nonNull }));
              }}
            />
          )}

          {guide.days.map((day) => (
            <DayPanel
              key={day.id}
              guideId={guide.id}
              day={day}
              onUpdateDay={handleUpdateDay}
              onDeleteDay={handleDeleteDay}
              onAddBlock={handleAddBlock}
              onUpdateBlock={handleUpdateBlock}
              onDeleteBlock={handleDeleteBlock}
              onAddPlace={handleAddPlace}
              onUpdatePlace={handleUpdatePlace}
              onDeletePlace={handleDeletePlace}
            />
          ))}

          <button
            onClick={handleAddDay}
            className="min-h-12 w-full rounded-lg border-2 border-dashed border-ig-border py-3 text-sm font-semibold text-ig-blue transition-colors hover:border-ig-blue hover:bg-ig-secondary/50"
          >
            + Add Day
          </button>
        </div>
      )}
    </div>

      {showGiftModal && guide && (
        <GiftGuideModal
          guideId={guide.id}
          token={token}
          onClose={() => setShowGiftModal(false)}
        />
      )}
    </>
  );
}
