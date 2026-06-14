'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { Guide, GuideUpdateRequest } from '@/types';
import GuideMetadataForm from './GuideMetadataForm';
import DayPanel from './DayPanel';
import { PlusIcon } from './TimelineIcons';
import { SPINE_LEFT, SPINE_WIDTH, DAY_NODE, DAY_NODE_LEFT, NODE_TOP, NODE_CENTER, PAD, maskRing } from '@/lib/guideTimeline';
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
  const { t } = useTranslation();
  const router = useRouter();
  const { confirm } = useConfirm();
  const toast = useToast();
  // BOR-43: after a successful save we scroll/focus the inline Publish action
  // (the header) to flow the creator toward publishing, rather than routing to
  // a separate screen.
  const publishActionsRef = useRef<HTMLDivElement>(null);
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
    // Re-hydrate the destination pin so Stage 2 (edit page) shows the exact location
    // chosen in Stage 1. Without these the map fell back to the world view on every
    // entry to the editor, looking like the location was "reset".
    latitude: initialGuide?.latitude ?? undefined,
    longitude: initialGuide?.longitude ?? undefined,
  });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(
    () => aiKeys.length > 0 && (initialGuide?.days?.length ?? 0) === 0,
  );
  const [showGiftModal, setShowGiftModal] = useState(false);

  // Merge a partial change into the LATEST metadata. Using the functional
  // updater (prev => …) is what fixes the "fields disappear on image upload"
  // bug: ImageUploadField awaits the async upload, then fires onChange with the
  // `data` snapshot captured when the upload STARTED — any field set meanwhile
  // (location prefill, typing) was clobbered. Merging into `prev` instead of a
  // stale snapshot makes every update safe regardless of async ordering.
  const patchMetadata = useCallback((patch: Partial<GuideUpdateRequest>) => {
    setMetadata((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag) {
      setMetadata((prev) =>
        (prev.tags || []).includes(tag) ? prev : { ...prev, tags: [...(prev.tags || []), tag] },
      );
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setMetadata((prev) => ({ ...prev, tags: (prev.tags || []).filter((t) => t !== tag) }));
  };

  // BOR-43: save → flow toward publish. Validation gate runs BEFORE the API
  // call; on a successful (2xx) save we toast and scroll to the inline Publish
  // action; on error we block that, surface the message, and restore the button.
  const handleSaveMetadata = async () => {
    if (saving) return; // guard against double-submission
    // Validation gate — block the API call if required fields are missing.
    if (!metadata.title || !metadata.title.trim()) {
      const msg = t('guideEditor.editor.errorNoTitle');
      setError(msg);
      toast.error(msg);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (guide) {
        await api.patch<Guide>(`/api/guides/${guide.id}`, metadata, token);
        const updated = await api.get<Guide>(`/api/guides/${guide.id}`, token);
        setGuide(updated);
      } else {
        // router.replace (not push) so Back from the editor never re-triggers
        // the save or loops (BOR-43 AC).
        const created = await api.post<Guide>('/api/guides', metadata, token);
        setGuide(created);
        router.replace(`/guides/${created.id}/edit`);
      }
      // Success: transient toast + flow toward the inline Publish action.
      toast.success(t('guideEditor.editor.draftSaved'));
      requestAnimationFrame(() => {
        publishActionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    } catch (err) {
      // Error: block the scroll above, restore the button (finally), show message.
      const msg = err instanceof Error ? err.message : t('guideEditor.editor.errorSave');
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const completenessItems = useMemo(() => {
    const allBlocks = (guide?.days ?? []).flatMap((d) => d.blocks);
    const hasBlockCategory = (cat: string) => allBlocks.some((b) => b.blockCategory === cat);
    const words = (s: string | null | undefined) => (s ?? '').trim().split(/\s+/).filter(Boolean).length;
    return [
      { label: t('guideEditor.completeness.titleHook'), done: words(metadata.title) >= 10 },
      { label: t('guideEditor.completeness.description'), done: words(metadata.description) >= 30 },
      { label: t('guideEditor.completeness.coverImage'), done: !!(metadata.coverImageUrl) },
      { label: t('guideEditor.completeness.regionCity'), done: !!(metadata.region && metadata.primaryCity) },
      { label: t('guideEditor.completeness.travelerStage'), done: !!(metadata as GuideUpdateRequest).travelerStage },
      { label: t('guideEditor.completeness.personas'), done: ((metadata as GuideUpdateRequest).personas ?? []).length > 0 },
      { label: t('guideEditor.completeness.safetyBlock'), done: hasBlockCategory('SAFETY') || hasBlockCategory('EMERGENCY') },
      { label: t('guideEditor.completeness.transportBlock'), done: hasBlockCategory('TRANSPORT') },
      { label: t('guideEditor.completeness.accommodationBlock'), done: hasBlockCategory('ACCOMMODATION') },
      { label: t('guideEditor.completeness.seasonalInfo'), done: !!(metadata as GuideUpdateRequest).bestSeasonLabel || hasBlockCategory('SEASONAL') },
      { label: t('guideEditor.completeness.secretBlock'), done: hasBlockCategory('SECRET') },
    ];
  }, [guide, metadata, t]);

  const completedCount = completenessItems.filter((i) => i.done).length;

  const handlePublish = async () => {
    if (!guide) return;
    try {
      await api.post<Guide>(`/api/guides/${guide.id}/publish`, undefined, token);
      // BOR-48: on a successful publish, take the creator straight to the live
      // guide page so they can review their published work immediately.
      toast.success(t('guideEditor.editor.guidePublished'));
      router.push(`/guides/${guide.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('guideEditor.editor.errorPublish'));
    }
  };

  const handleDeleteGuide = async () => {
    if (!guide || deleting) return;
    const ok = await confirm({
      title: t('guideEditor.editor.deleteConfirmTitle', { title: guide.title }),
      body: t('guideEditor.editor.deleteConfirmBody'),
      confirmLabel: t('guideEditor.editor.deleteConfirmBtn'),
      destructive: true,
    });
    if (!ok) return;

    setDeleting(true);
    setError(null);
    try {
      await api.delete<void>(`/api/guides/${guide.id}`, token);
      router.push('/guides');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('guideEditor.editor.errorDelete'));
      setDeleting(false);
    }
  };

  return (
    <>
      {/* pb-24 clears the fixed Save bar below so the last field (Tags) is never hidden. */}
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-24">
        {error && (
          <div className="mb-4 p-3 bg-ig-error/10 border border-ig-error/30 rounded-md text-ig-error text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-ig-error/70 hover:text-ig-error">&times;</button>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold text-ig-text-primary">
            {guide ? t('guideEditor.editor.editGuideTitle') : t('guideEditor.editor.newGuideTitle')}
          </h1>
          <div ref={publishActionsRef} className="flex flex-wrap items-center gap-3">
            {/* The header "Create with AI" button was removed: on /guides/new it was a
             * non-functional disabled stub, and once a guide exists the SAME toggle is
             * already offered in the itinerary section (DaysSection). AI discovery now
             * happens there + via the "Add a hook" generator under the description, which
             * is also where the onboarding tour now points (see tourSteps Stage 12). */}
            {guide && (
              <button
                type="button"
                onClick={handleDeleteGuide}
                disabled={deleting}
                className="min-h-11 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? t('guideEditor.editor.deleting') : t('guideEditor.editor.deleteGuideBtn')}
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
                  🎁 {t('guideEditor.editor.giftBtn')}
                </button>
                <PublishButton onPublish={handlePublish} label={t('guideEditor.editor.publishChangesBtn')} />
                <span className="inline-flex min-h-9 items-center rounded-pill bg-ig-success/20 px-3 py-1 text-sm font-semibold text-ig-success">{t('guideEditor.editor.publishedVersion', { version: guide.versionNumber })}</span>
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
              onPatch={patchMetadata}
              tagInput={tagInput}
              onTagInputChange={setTagInput}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              token={token}
              aiKeys={aiKeys}
            />
          </div>
        </div>

        {/* Completeness score */}
        {guide && (
          <div className="mb-6 p-4 bg-ig-elevated border border-ig-border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-ig-text-primary">{t('guideEditor.editor.completenessTitle')}</h2>
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

      {/* Persistent Save action bar. Fixed to the viewport so it stays visible in BOTH
       * stages no matter how far the user scrolls — replacing the old sticky footer that
       * was trapped inside the overflow-hidden metadata card and scrolled away in Stage 2.
       * On mobile it sits flush above the app's bottom nav (mirroring AppShell's
       * 5rem+safe-area offset); on md+ the nav is hidden so it pins to bottom-0. */}
      <div className="fixed inset-x-0 bottom-[calc(5rem_+_env(safe-area-inset-bottom))] z-40 border-t border-ig-border bg-ig-elevated/95 backdrop-blur-md md:bottom-0">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          <button
            onClick={handleSaveMetadata}
            disabled={saving || !metadata.title}
            className="mw-button-primary inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm disabled:opacity-50"
          >
            {saving && <Spinner />}
            {saving ? t('guideEditor.editor.saving') : guide ? t('guideEditor.editor.saveChangesBtn') : t('guideEditor.editor.createGuideBtn')}
          </button>
        </div>
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
  const { t } = useTranslation();
  // useGuideEdit must be called inside the provider tree, which is why this lives
  // in a child component instead of GuideEditor itself.
  const { addDay } = useGuideEdit();
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-ig-text-primary">{t('guideEditor.days.itineraryTitle')}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-ig-text-tertiary">{t('guideEditor.days.dayPlaceCount', { days: guide.dayCount, places: guide.placeCount })}</span>
          {aiKeys.length === 0 ? (
            <a
              href="/profile?tab=ai-keys"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-brand-600 hover:shadow-lg lg:min-h-0 lg:py-2 lg:text-xs"
            >
              <span className="text-base leading-none">✨</span>
              <span>{t('guideEditor.days.connectAiBtn')}</span>
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
              <span>{showAiPanel ? t('guideEditor.days.hideAiBtn') : t('guideEditor.days.createWithAiBtn')}</span>
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

      {/* Continuous vertical timeline: one shared spine runs the full height of
          the days region; day nodes + block dots sit on top and mask it. */}
      <div className="relative">
        {/* The single spine line. Nodes/dots punch clean gaps via box-shadow,
            so this is never segmented and can't over/under-extend on collapse. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: SPINE_LEFT,
            // Run the line from the first day node's centre to the Add-Day ghost
            // node's centre, so it never overextends past the end caps.
            top: NODE_CENTER,
            bottom: NODE_CENTER,
            width: SPINE_WIDTH,
            background: 'var(--border)',
          }}
        />

        <div className="space-y-3">
          {guide.days.map((day) => (
            <DayPanel key={day.id} day={day} />
          ))}

          {/* Global "Add Day" ghost node — a hollow dashed node on the spine. */}
          <div className="relative">
            <button
              type="button"
              onClick={addDay}
              aria-label={t('guideEditor.days.addDayBtn')}
              className="group flex min-h-11 w-full items-center gap-2 text-left"
            >
              <span
                aria-hidden
                className="flex items-center justify-center text-ig-text-tertiary transition-colors group-hover:text-ig-blue"
                style={{
                  position: 'absolute',
                  left: DAY_NODE_LEFT,
                  top: NODE_TOP,
                  width: DAY_NODE,
                  height: DAY_NODE,
                  borderRadius: '9999px',
                  border: '2px dashed var(--border)',
                  background: 'var(--bg-primary)',
                  boxShadow: maskRing(),
                }}
              >
                <PlusIcon className="h-4 w-4" />
              </span>
              <span
                className="text-sm font-semibold text-ig-blue"
                style={{ paddingLeft: PAD }}
              >
                {t('guideEditor.days.addDayBtn')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
