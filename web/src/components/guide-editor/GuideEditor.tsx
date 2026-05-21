'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Guide, GuideUpdateRequest } from '@/types';
import GuideMetadataForm from './GuideMetadataForm';
import DayPanel from './DayPanel';
import PublishButton from './PublishButton';
import GiftGuideModal from './GiftGuideModal';
import { CreatorAiPanel } from '@/components/ai/CreatorAiPanel';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import type { AiKeyResponse } from '@/types';
import { GuideEditProvider, useGuideEdit } from './GuideEditContext';
import Spinner from '@/components/ui/Spinner';

interface Props {
  initialGuide?: Guide;
  token: string;
  aiKeys?: AiKeyResponse[];
}

export default function GuideEditor({ initialGuide, token, aiKeys = [] }: Props) {
  const router = useRouter();
  const { confirm } = useConfirm();
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
    salePriceCents: initialGuide?.salePriceCents ?? null,
    saleEndsAt: initialGuide?.saleEndsAt ?? null,
    // GEL — Brooks's payment processor (BOG iPay) is GEL-only; matches
    // backend Guide entity default. Was USD which made every freshly-created
    // guide non-purchasable via iPay.
    currency: initialGuide?.currency || 'GEL',
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
  const [showAiPanel, setShowAiPanel] = useState(
    () => aiKeys.length > 0 && (initialGuide?.days?.length ?? 0) === 0,
  );
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

  const handleSaveMetadata = async () => {
    setSaving(true);
    setError(null);
    try {
      if (guide) {
        await api.patch<Guide>(`/api/guides/${guide.id}`, metadata, token);
        const updated = await api.get<Guide>(`/api/guides/${guide.id}`, token);
        setGuide(updated);
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
      const updated = await api.get<Guide>(`/api/guides/${guide.id}`, token);
      setGuide(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    }
  };

  const handleDeleteGuide = async () => {
    if (!guide || deleting) return;
    const ok = await confirm({
      title: `Delete "${guide.title}"?`,
      body: 'This removes it from your guides and cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;

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
            {/* Editor-header AI button. Always rendered (even on /guides/new before the
             * guide object exists) so the onboarding tour spotlight can find it, and so
             * users immediately discover the AI workflow. Three states:
             *   no AI key       → link to /profile?tab=ai-keys ("Connect AI")
             *   key but !guide  → disabled with helper text
             *   key and guide   → toggle the AI panel
             */}
            {aiKeys.length === 0 ? (
              <a
                data-tour="ai-button-in-guide"
                href="/profile?tab=ai-keys"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-brand-600 hover:shadow-lg"
              >
                <span className="text-base leading-none">✨</span>
                <span>Connect AI</span>
              </a>
            ) : !guide ? (
              <button
                data-tour="ai-button-in-guide"
                type="button"
                disabled
                title="Save the guide first — then I can draft days, blocks, and places for you."
                className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white opacity-60 shadow-md"
              >
                <span className="text-base leading-none">✨</span>
                <span>Create with AI</span>
              </button>
            ) : (
              <button
                data-tour="ai-button-in-guide"
                type="button"
                onClick={() => setShowAiPanel((v) => !v)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-md transition-colors ${
                  showAiPanel
                    ? 'border-2 border-brand-500 bg-brand-500/10 text-brand-500 hover:bg-brand-500/20'
                    : 'bg-brand-500 text-white hover:bg-brand-600 hover:shadow-lg'
                }`}
              >
                <span className="text-base leading-none">✨</span>
                <span>{showAiPanel ? 'Hide AI' : 'Create with AI'}</span>
              </button>
            )}
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
                <PublishButton onPublish={handlePublish} label="Publish Changes" />
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
              token={token}
            />
          </div>
          <div className="sticky bottom-0 px-4 py-3 bg-ig-elevated border-t border-ig-border">
            <button
              onClick={handleSaveMetadata}
              disabled={saving || !metadata.title}
              className="mw-button-primary inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm disabled:opacity-50"
            >
              {saving && <Spinner />}
              {saving ? 'Saving…' : guide ? 'Save Changes' : 'Create Guide'}
            </button>
          </div>
        </div>

        {/* Completeness score */}
        {guide && (
          <div className="mb-6 p-4 bg-ig-elevated border border-ig-border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-ig-text-primary">Guide completeness</h2>
              <span className={`text-sm font-bold ${completedCount >= 9 ? 'text-ig-success' : completedCount >= 6 ? 'text-accent-500' : 'text-ig-text-tertiary'}`}>
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
          <GuideEditProvider
            guide={guide}
            token={token}
            onGuideChange={setGuide}
            onError={setError}
          >
            <DaysSection
              guide={guide}
              aiKeys={aiKeys}
              showAiPanel={showAiPanel}
              onToggleAiPanel={() => setShowAiPanel((v) => !v)}
              onGuideChange={setGuide}
              onMetadataChange={setMetadata}
            />
          </GuideEditProvider>
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

interface DaysSectionProps {
  guide: Guide;
  aiKeys: AiKeyResponse[];
  showAiPanel: boolean;
  onToggleAiPanel: () => void;
  onGuideChange: (updater: (g: Guide | null) => Guide | null) => void;
  onMetadataChange: (updater: (m: GuideUpdateRequest) => GuideUpdateRequest) => void;
}

/**
 * Inner section that's wrapped by GuideEditProvider, so it can `useGuideEdit()`
 * for the "+ Add Day" button without GuideEditor (the provider's parent) needing
 * to know about CRUD orchestration.
 */
function DaysSection({
  guide, aiKeys, showAiPanel, onToggleAiPanel, onGuideChange, onMetadataChange,
}: DaysSectionProps) {
  // useGuideEdit must be called inside the provider tree, which is why this lives
  // in a child component instead of GuideEditor itself.
  const { addDay } = useGuideEdit();
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-ig-text-primary">Itinerary</h2>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-ig-text-tertiary">{guide.dayCount} days, {guide.placeCount} places</span>
          {aiKeys.length === 0 ? (
            <a
              href="/profile?tab=ai-keys"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-brand-600 hover:shadow-lg lg:min-h-0 lg:py-2 lg:text-xs"
            >
              <span className="text-base leading-none">✨</span>
              <span>Connect AI</span>
            </a>
          ) : (
            <button
              onClick={onToggleAiPanel}
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-md transition-colors lg:min-h-0 lg:py-2 lg:text-xs ${
                showAiPanel
                  ? 'border-2 border-brand-500 bg-brand-500/10 text-brand-500 hover:bg-brand-500/20'
                  : 'bg-brand-500 text-white hover:bg-brand-600 hover:shadow-lg'
              }`}
            >
              <span className="text-base leading-none">✨</span>
              <span>{showAiPanel ? 'Hide AI' : 'Create with AI'}</span>
            </button>
          )}
        </div>
      </div>

      {showAiPanel && aiKeys.length > 0 && (
        <CreatorAiPanel
          guide={guide}
          availableProviders={aiKeys.map((k) => k.provider as 'OPENAI' | 'GEMINI' | 'ANTHROPIC')}
          onDayAdded={(day) => onGuideChange((g) => g ? { ...g, days: [...(g.days ?? []), day] } : g)}
          onBlockAdded={(dayId, block) =>
            onGuideChange((g) => g ? {
              ...g,
              days: (g.days ?? []).map((d) =>
                d.id === dayId ? { ...d, blocks: [...(d.blocks ?? []), block] } : d
              ),
            } : g)
          }
          onPlaceAdded={(blockId, place) =>
            onGuideChange((g) => g ? {
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
            onGuideChange((g) => g ? { ...g, ...fields } : g);
            const nonNull = Object.fromEntries(
              Object.entries(fields).map(([k, v]) => [k, v === null ? undefined : v])
            );
            onMetadataChange((m) => ({ ...m, ...nonNull }));
          }}
        />
      )}

      {guide.days.map((day) => (
        <DayPanel key={day.id} day={day} />
      ))}

      <button
        onClick={addDay}
        className="min-h-12 w-full rounded-lg border-2 border-dashed border-ig-border py-3 text-sm font-semibold text-ig-blue transition-colors hover:border-ig-blue hover:bg-ig-secondary/50"
      >
        + Add Day
      </button>
    </div>
  );
}
