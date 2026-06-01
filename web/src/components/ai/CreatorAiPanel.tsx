'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccessToken } from '@/hooks/useAccessToken';
import { streamPost, api } from '@/lib/api';
import { searchWebImages } from '@/lib/unsplash';
import type { Guide, GuideDay, GuideBlock, GuidePlace, AiProvider } from '@/types';

type Provider = AiProvider;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface UpdateGuideAction {
  title?: string;
  description?: string;
  primaryCity?: string;
  region?: string;
  country?: string;
  coverImageUrl?: string;
  priceCents?: number;
  currency?: string;
  travelerStage?: string;
  personas?: string[];
  bestSeasonStartMonth?: number | null;
  bestSeasonEndMonth?: number | null;
  bestSeasonLabel?: string | null;
  tags?: string[];
}

interface AddDayAction {
  title: string;
  description: string;
}

interface AddBlockAction {
  dayNumber: number;
  title: string;
  description: string;
  blockType: string;
  suggestedStartMinute: number | null;
}

interface AddPlaceAction {
  dayNumber: number;
  blockTitle: string;
  name: string;
  description: string;
  address: string;
  category: string;
  priceLevel: string;
  suggestedStartMinute: number | null;
  suggestedDurationMinutes: number | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl?: string;
  photoQuery?: string;
}

interface UpdateDayAction { dayNumber: number; title?: string; description?: string; }
interface UpdateBlockAction { dayNumber: number; blockTitle: string; title?: string; description?: string; blockType?: string; }
interface UpdatePlaceAction { dayNumber: number; blockTitle: string; placeName: string; name?: string; description?: string; address?: string; category?: string; priceLevel?: string; imageUrl?: string; photoQuery?: string; }
interface DeleteDayAction { dayNumber: number; }
interface DeleteBlockAction { dayNumber: number; blockTitle: string; }
interface DeletePlaceAction { dayNumber: number; blockTitle: string; placeName: string; }

type ActionPayload = UpdateGuideAction | AddDayAction | AddBlockAction | AddPlaceAction
  | UpdateDayAction | UpdateBlockAction | UpdatePlaceAction
  | DeleteDayAction | DeleteBlockAction | DeletePlaceAction;

// The backend `priceLevel` is an Integer (1–4), but the AI returns a label like "MID_RANGE".
// Sending the raw label 400s ("Cannot deserialize Integer from String"). Map label/number → 1–4,
// returning undefined for unknown values so the field is simply omitted.
function toPriceLevelInt(value: unknown): number | undefined {
  if (value == null) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const s = String(value).trim().toUpperCase();
  if (!s) return undefined;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const map: Record<string, number> = {
    FREE: 1, BUDGET: 1, CHEAP: 1, INEXPENSIVE: 1, LOW: 1, '$': 1,
    MID_RANGE: 2, MIDRANGE: 2, MODERATE: 2, MEDIUM: 2, '$$': 2,
    UPSCALE: 3, PRICEY: 3, EXPENSIVE: 3, HIGH: 3, '$$$': 3,
    LUXURY: 4, VERY_EXPENSIVE: 4, HIGH_END: 4, PREMIUM: 4, '$$$$': 4,
  };
  return map[s];
}

// AI proposes a photo SEARCH TERM (photoQuery); we resolve a REAL photo via the image API.
// Falls back to a directly-provided imageUrl only for backward compatibility. Returns
// undefined (no photo) rather than a hallucinated URL when nothing resolves.
async function resolvePlacePhotos(p: { photoQuery?: string; imageUrl?: string }): Promise<string[] | undefined> {
  if (p.photoQuery && p.photoQuery.trim()) {
    try {
      const results = await searchWebImages(p.photoQuery.trim());
      if (results[0]?.fullUrl) return [results[0].fullUrl];
    } catch (e) {
      console.warn('photoQuery resolution failed', e);
    }
  }
  if (p.imageUrl && p.imageUrl.trim()) return [p.imageUrl.trim()];
  return undefined;
}

interface PendingAction {
  type: 'update_guide' | 'add_day' | 'add_block' | 'add_place'
    | 'update_day' | 'update_block' | 'update_place'
    | 'delete_day' | 'delete_block' | 'delete_place';
  payload: ActionPayload;
}

interface Props {
  guide: Guide;
  availableProviders: Provider[];
  onDayAdded: (day: GuideDay) => void;
  onBlockAdded: (dayId: string, block: GuideBlock) => void;
  onPlaceAdded: (blockId: string, place: GuidePlace) => void;
  onGuideUpdated: (fields: Partial<Guide>) => void;
}

const ACTION_PATTERN = /<action\s+type="(update_guide|add_day|add_block|add_place|update_day|update_block|update_place|delete_day|delete_block|delete_place)">([\s\S]*?)<\/action>/g;
const PROFILE_PATTERN = /<profile>([\s\S]*?)<\/profile>/g;

// Phrases that signal the AI thinks it's making a change but forgot to emit the <action> tag.
const INTENT_SIGNAL_PATTERN = /\b(adding|will be added|i'?ll add|let me add|got it,?\s*adding|i (have|'ve) added|added\s+to|done!?\s*i'?ve|sure,?\s*adding|i'?m adding|creating|i'?ll create|i (have|'ve) created|updating|i'?ll update|deleting|i'?ll delete)\b/i;
const ACTION_KEYWORDS_PATTERN = /\b(day\s*\d|block|place|museum|stop|guide)\b/i;

function looksLikeIntentWithoutAction(text: string): boolean {
  return INTENT_SIGNAL_PATTERN.test(text) && ACTION_KEYWORDS_PATTERN.test(text);
}

function loadMessages(guideId: string): Message[] {
  try {
    const raw = localStorage.getItem(`brooks_ai_msgs_${guideId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveMessages(guideId: string, msgs: Message[]) {
  try { localStorage.setItem(`brooks_ai_msgs_${guideId}`, JSON.stringify(msgs.slice(-60))); } catch { /* ignore */ }
}

function loadProfile(guideId: string): string {
  try {
    const raw = localStorage.getItem(`brooks_ai_profile_${guideId}`);
    const notes: string[] = raw ? JSON.parse(raw) : [];
    return notes.join('\n');
  } catch { return ''; }
}

function appendProfileNote(guideId: string, note: string) {
  try {
    const raw = localStorage.getItem(`brooks_ai_profile_${guideId}`);
    const notes: string[] = raw ? JSON.parse(raw) : [];
    const trimmed = note.trim();
    if (trimmed && !notes.includes(trimmed)) {
      notes.push(trimmed);
      localStorage.setItem(`brooks_ai_profile_${guideId}`, JSON.stringify(notes.slice(-15)));
    }
  } catch { /* ignore */ }
}

const PROVIDER_LABELS: Record<Provider, string> = {
  OPENAI: 'GPT',
  GEMINI: 'Gemini',
  ANTHROPIC: 'Claude',
};

function actionLabel(action: PendingAction): string {
  switch (action.type) {
    case 'update_guide': {
      const p = action.payload as UpdateGuideAction;
      const parts = [p.title, p.primaryCity, p.region].filter(Boolean);
      return parts.length ? `Update guide: ${parts.join(', ')}` : 'Update guide metadata';
    }
    case 'add_day': return `Add day: "${(action.payload as AddDayAction).title}"`;
    case 'add_block': return `Add block: "${(action.payload as AddBlockAction).title}"`;
    case 'add_place': return `Add place: "${(action.payload as AddPlaceAction).name}"`;
    case 'update_day': return `Update Day ${(action.payload as UpdateDayAction).dayNumber}: "${(action.payload as UpdateDayAction).title}"`;
    case 'update_block': return `Update block: "${(action.payload as UpdateBlockAction).title ?? (action.payload as UpdateBlockAction).blockTitle}"`;
    case 'update_place': return `Update place: "${(action.payload as UpdatePlaceAction).name ?? (action.payload as UpdatePlaceAction).placeName}"`;
    case 'delete_day': return `Delete Day ${(action.payload as DeleteDayAction).dayNumber}`;
    case 'delete_block': return `Delete block: "${(action.payload as DeleteBlockAction).blockTitle}"`;
    case 'delete_place': return `Delete place: "${(action.payload as DeletePlaceAction).placeName}"`;
  }
}

export function CreatorAiPanel({ guide, availableProviders, onDayAdded, onBlockAdded, onPlaceAdded, onGuideUpdated }: Props) {
  const { token } = useAccessToken();
  const [provider, setProvider] = useState<Provider>(availableProviders[0]);
  const [messages, setMessages] = useState<Message[]>(() => loadMessages(guide.id));
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  // Queue of proposed actions awaiting approval. The AI can emit several in one reply
  // ("add places to both days" → multiple add_place tags), applied in order on approve.
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [accepting, setAccepting] = useState(false);
  // When the AI describes an action ("adding...", "will add...") but emits no action tag,
  // we flag the last user message as retryable. One-click retry resends with stronger
  // instruction so the AI is forced to emit the tag.
  const [missingActionForMessage, setMissingActionForMessage] = useState<string | null>(null);
  const accumulatedRef = useRef('');
  // Structured actions delivered via native tool calls (SSE `action` events). When present they
  // take precedence over the legacy text-tag regex (used only by providers not yet on tool calling).
  const actionsRef = useRef<PendingAction[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const metadataMissing = !guide.primaryCity || !guide.region;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, pendingActions.length]);

  async function send(messageOverride?: string) {
    const userMessage = (messageOverride ?? input).trim();
    if (!userMessage || streaming || !token) return;
    setInput('');
    setPendingActions([]);

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: '' },
    ];
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages(newMessages);
    setStreaming(true);

    accumulatedRef.current = '';
    actionsRef.current = [];

    await streamPost(
      '/api/ai/creator-suggest',
      {
        guideId: guide.id,
        provider,
        userMessage,
        history,
        context: {
          guideTitle: guide.title,
          description: guide.description ?? '',
          region: guide.region ?? '',
          primaryCity: guide.primaryCity ?? '',
          existingDayCount: guide.days?.length ?? 0,
          existingDayTitles: guide.days?.map((d) => d.title) ?? [],
          existingDays: guide.days?.map((d, i) => ({
            dayNumber: i + 1,
            title: d.title,
            blocks: d.blocks?.map((b) => ({
              title: b.title,
              placeNames: b.places?.map((p) => p.name) ?? [],
            })) ?? [],
          })) ?? [],
          creatorProfile: loadProfile(guide.id),
        },
      },
      token,
      (chunk) => {
        accumulatedRef.current += chunk;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], content: accumulatedRef.current };
          return next;
        });
      },
      (eventName, data) => {
        // Native tool call surfaced as a structured action event.
        if (eventName === 'action') {
          try {
            const a = JSON.parse(data);
            if (a && a.type && a.payload) actionsRef.current.push({ type: a.type, payload: a.payload });
          } catch { /* ignore a malformed action event */ }
        }
      },
      (status) => {
        const errorText = status === 401
          ? 'Your session expired. Please sign in again.'
          : status === 400
            ? 'No AI key configured. Add one in Settings → AI Keys.'
            : 'Sorry — the AI is unavailable right now. Please try again.';
        accumulatedRef.current = errorText;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], content: errorText };
          return next;
        });
      }
    );

    // Extract and persist profile notes
    let rawText = accumulatedRef.current;
    let profileMatch;
    PROFILE_PATTERN.lastIndex = 0;
    while ((profileMatch = PROFILE_PATTERN.exec(rawText)) !== null) {
      appendProfileNote(guide.id, profileMatch[1]);
    }
    rawText = rawText.replace(PROFILE_PATTERN, '').trim();

    // Prefer structured tool-call actions (native tool calling, e.g. OpenAI). Only if none arrived
    // do we fall back to parsing legacy <action> text tags (providers not yet on tool calling).
    let cleanText = rawText;
    if (actionsRef.current.length > 0) {
      setPendingActions(actionsRef.current);
      cleanText = rawText.replace(ACTION_PATTERN, '').trim(); // strip any stray tags too
      setMissingActionForMessage(null);
    } else {
    const parsed: PendingAction[] = [];
    for (const m of Array.from(rawText.matchAll(ACTION_PATTERN))) {
      try {
        parsed.push({ type: m[1] as PendingAction['type'], payload: JSON.parse(m[2].trim()) });
      } catch {
        // Skip a malformed action; keep the others.
      }
    }
    if (parsed.length > 0) {
      setPendingActions(parsed);
      cleanText = rawText.replace(ACTION_PATTERN, '').trim();
      setMissingActionForMessage(null);
    } else if (looksLikeIntentWithoutAction(cleanText)) {
      // AI described an action but emitted no tag — offer one-click retry
      setMissingActionForMessage(userMessage);
    } else {
      setMissingActionForMessage(null);
    }
    }

    const finalMessages = (prev: Message[]) => {
      const next = [...prev];
      next[next.length - 1] = { ...next[next.length - 1], content: cleanText };
      return next;
    };
    setMessages((prev) => {
      const updated = finalMessages(prev);
      saveMessages(guide.id, updated);
      return updated;
    });

    setStreaming(false);
  }

  // Apply a single proposed action. Early-returns (target not found) just skip that one action.
  async function applyOne(action: PendingAction) {
      if (!token) return;
      const { type, payload } = action;

      if (type === 'update_guide') {
        const p = payload as UpdateGuideAction;
        const updated = await api.patch<Guide>(`/api/guides/${guide.id}`, p, token);
        onGuideUpdated(updated);

      } else if (type === 'add_day') {
        const p = payload as AddDayAction;
        const day = await api.post<GuideDay>(`/api/guides/${guide.id}/days`, {
          title: p.title,
          description: p.description,
        }, token);
        onDayAdded(day);

      } else if (type === 'add_block') {
        const p = payload as AddBlockAction;
        const targetDay = guide.days?.[p.dayNumber - 1];
        if (!targetDay) { console.warn('Day not found for dayNumber', p.dayNumber); return; }
        const block = await api.post<GuideBlock>(
          `/api/guides/${guide.id}/days/${targetDay.id}/blocks`,
          {
            title: p.title,
            description: p.description,
            blockType: p.blockType ?? 'ACTIVITY',
            suggestedStartMinute: p.suggestedStartMinute,
          },
          token
        );
        onBlockAdded(targetDay.id, block);

      } else if (type === 'add_place') {
        const p = payload as AddPlaceAction;
        const targetDay = guide.days?.[p.dayNumber - 1];
        if (!targetDay) { console.warn('Day not found for dayNumber', p.dayNumber); return; }
        const targetBlock = targetDay.blocks?.find(
          (b) => b.title?.toLowerCase() === p.blockTitle?.toLowerCase()
        ) ?? targetDay.blocks?.[targetDay.blocks.length - 1];
        if (!targetBlock) { console.warn('Block not found for blockTitle', p.blockTitle); return; }
        const addImageUrls = await resolvePlacePhotos(p);
        const place = await api.post<GuidePlace>(
          `/api/guides/${guide.id}/blocks/${targetBlock.id}/places`,
          {
            name: p.name,
            description: p.description,
            address: p.address,
            category: p.category,
            priceLevel: toPriceLevelInt(p.priceLevel),
            imageUrls: addImageUrls,
            suggestedStartMinute: p.suggestedStartMinute,
            suggestedDurationMinutes: p.suggestedDurationMinutes,
            latitude: p.latitude,
            longitude: p.longitude,
          },
          token
        );
        onPlaceAdded(targetBlock.id, place);

      } else if (type === 'update_day') {
        const p = payload as UpdateDayAction;
        const targetDay = guide.days?.[p.dayNumber - 1];
        if (!targetDay) { console.warn('Day not found for dayNumber', p.dayNumber); return; }
        const updatedDay = await api.patch<GuideDay>(`/api/guides/${guide.id}/days/${targetDay.id}`, { title: p.title, description: p.description }, token);
        onGuideUpdated({ days: guide.days?.map((d) => d.id === targetDay.id ? { ...d, ...updatedDay } : d) });

      } else if (type === 'update_block') {
        const p = payload as UpdateBlockAction;
        const targetDay = guide.days?.[p.dayNumber - 1];
        const targetBlock = targetDay?.blocks?.find((b) => b.title?.toLowerCase() === p.blockTitle?.toLowerCase());
        if (!targetBlock || !targetDay) { console.warn('Block not found', p.blockTitle); return; }
        const updatedBlock = await api.patch<GuideBlock>(`/api/guides/${guide.id}/blocks/${targetBlock.id}`, { title: p.title, description: p.description, blockType: p.blockType }, token);
        onGuideUpdated({ days: guide.days?.map((d) => d.id === targetDay.id ? { ...d, blocks: d.blocks?.map((b) => b.id === targetBlock.id ? { ...b, ...updatedBlock } : b) } : d) });

      } else if (type === 'update_place') {
        const p = payload as UpdatePlaceAction;
        const targetDay = guide.days?.[p.dayNumber - 1];
        const targetBlock = targetDay?.blocks?.find((b) => b.title?.toLowerCase() === p.blockTitle?.toLowerCase());
        const targetPlace = targetBlock?.places?.find((pl) => pl.name?.toLowerCase() === p.placeName?.toLowerCase());
        if (!targetPlace || !targetBlock || !targetDay) { console.warn('Place not found', p.placeName); return; }
        const updImageUrls = (p.photoQuery || p.imageUrl) ? await resolvePlacePhotos(p) : undefined;
        const updatedPlace = await api.patch<GuidePlace>(`/api/guides/${guide.id}/places/${targetPlace.id}`, { name: p.name, description: p.description, address: p.address, category: p.category, priceLevel: toPriceLevelInt(p.priceLevel), imageUrls: updImageUrls }, token);
        onGuideUpdated({ days: guide.days?.map((d) => d.id === targetDay.id ? { ...d, blocks: d.blocks?.map((b) => b.id === targetBlock.id ? { ...b, places: b.places?.map((pl) => pl.id === targetPlace.id ? { ...pl, ...updatedPlace } : pl) } : b) } : d) });

      } else if (type === 'delete_day') {
        const p = payload as DeleteDayAction;
        const targetDay = guide.days?.[p.dayNumber - 1];
        if (!targetDay) { console.warn('Day not found for dayNumber', p.dayNumber); return; }
        await api.delete<void>(`/api/guides/${guide.id}/days/${targetDay.id}`, token);
        onGuideUpdated({ days: guide.days?.filter((d) => d.id !== targetDay.id) });

      } else if (type === 'delete_block') {
        const p = payload as DeleteBlockAction;
        const targetDay = guide.days?.[p.dayNumber - 1];
        const targetBlock = targetDay?.blocks?.find((b) => b.title?.toLowerCase() === p.blockTitle?.toLowerCase());
        if (!targetBlock || !targetDay) { console.warn('Block not found', p.blockTitle); return; }
        await api.delete<void>(`/api/guides/${guide.id}/days/${targetDay.id}/blocks/${targetBlock.id}`, token);
        onGuideUpdated({ days: guide.days?.map((d) => d.id === targetDay.id ? { ...d, blocks: d.blocks?.filter((b) => b.id !== targetBlock.id) } : d) });

      } else if (type === 'delete_place') {
        const p = payload as DeletePlaceAction;
        const targetDay = guide.days?.[p.dayNumber - 1];
        const targetBlock = targetDay?.blocks?.find((b) => b.title?.toLowerCase() === p.blockTitle?.toLowerCase());
        const targetPlace = targetBlock?.places?.find((pl) => pl.name?.toLowerCase() === p.placeName?.toLowerCase());
        if (!targetPlace || !targetBlock || !targetDay) { console.warn('Place not found', p.placeName); return; }
        await api.delete<void>(`/api/guides/${guide.id}/blocks/${targetBlock.id}/places/${targetPlace.id}`, token);
        onGuideUpdated({ days: guide.days?.map((d) => d.id === targetDay.id ? { ...d, blocks: d.blocks?.map((b) => b.id === targetBlock.id ? { ...b, places: b.places?.filter((pl) => pl.id !== targetPlace.id) } : b) } : d) });
      }
  }

  async function acceptAction() {
    if (pendingActions.length === 0 || !token) return;
    setAccepting(true);
    try {
      // Apply in emit order (the AI is told to order day → block → place).
      for (const action of pendingActions) {
        try {
          await applyOne(action);
        } catch (e) {
          console.error('AI action failed to apply:', action.type, e);
        }
      }
      setPendingActions([]);
    } finally {
      setAccepting(false);
    }
  }

  function skipAction() {
    setPendingActions([]);
    send('Skip that, suggest something else.');
  }

  return (
    <div className="flex h-[min(72dvh,480px)] min-h-[380px] flex-col rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">✨ Build with AI</span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as Provider)}
            className="min-h-11 rounded border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-base text-[var(--text-secondary)] lg:min-h-0 lg:px-2 lg:py-0.5 lg:text-xs"
          >
            {availableProviders.map((p) => (
              <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Metadata warning */}
      {metadataMissing && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
          {!guide.primaryCity && !guide.region
            ? 'Set the guide city and region before using AI — the AI needs to know where this guide is set.'
            : !guide.primaryCity
            ? 'Set the guide city before using AI — the AI needs to know which city this guide is for.'
            : 'Set the guide region before using AI — the AI needs to know the region for this guide.'}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-[var(--text-tertiary)] text-center mt-8">
            Describe what you want to add and the AI will propose one change at a time for your approval.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <span
              className={`inline-block text-sm px-3 py-2 rounded-xl max-w-[85%] whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
              }`}
            >
              {m.content || (streaming && i === messages.length - 1 ? '…' : '')}
            </span>
          </div>
        ))}

        {/* Missing-action warning */}
        {missingActionForMessage && pendingActions.length === 0 && !streaming && (
          <div className="rounded-xl border-2 border-yellow-500/40 bg-yellow-500/10 p-3 space-y-2">
            <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
              ⚠ The AI confirmed but didn’t actually make the change
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              The model described the action without emitting the structured tag the editor needs. Click Retry to ask it again with a stronger instruction.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  const msg = missingActionForMessage;
                  setMissingActionForMessage(null);
                  void send(`${msg}\n\nIMPORTANT: emit the <action type="..."> tag at the end of your reply. Without the tag the change is not applied.`);
                }}
                className="min-h-9 rounded-lg bg-yellow-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-yellow-600"
              >
                Retry as action
              </button>
              <button
                onClick={() => setMissingActionForMessage(null)}
                className="min-h-9 rounded-lg px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Action confirmation card — one or many proposed changes, applied in order on approve */}
        {pendingActions.length > 0 && !streaming && (
          <div className="border border-[var(--border)] rounded-xl p-3 bg-[var(--bg-primary)] space-y-2">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              {pendingActions.length === 1 ? 'Proposed action' : `Proposed changes (${pendingActions.length})`}
            </p>
            <ul className="space-y-1">
              {pendingActions.map((a, i) => (
                <li key={i} className="text-sm text-[var(--text-primary)] font-medium">• {actionLabel(a)}</li>
              ))}
            </ul>
            <p className="text-xs text-[var(--text-tertiary)]">
              {pendingActions.length === 1 ? 'Approve to apply this to your guide.' : 'Approve to apply all of these to your guide.'}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={acceptAction}
                disabled={accepting}
                className="min-h-11 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {accepting ? 'Applying…' : pendingActions.length === 1 ? 'Approve' : `Approve all (${pendingActions.length})`}
              </button>
              <button
                onClick={skipAction}
                className="min-h-11 rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex flex-col gap-2 border-t border-[var(--border)] px-4 py-3 sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={metadataMissing ? 'Set guide city & region first…' : 'Describe what you want to add…'}
          disabled={streaming || metadataMissing}
          className="min-h-11 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-base text-[var(--text-primary)] disabled:opacity-50 md:text-sm"
        />
        <button
          onClick={() => send()}
          disabled={streaming || !input.trim() || metadataMissing}
          className="min-h-11 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {streaming ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
