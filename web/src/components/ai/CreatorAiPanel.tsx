'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccessToken } from '@/hooks/useAccessToken';
import { streamPost, api } from '@/lib/api';
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
}

interface UpdateDayAction { dayNumber: number; title?: string; description?: string; }
interface UpdateBlockAction { dayNumber: number; blockTitle: string; title?: string; description?: string; blockType?: string; }
interface UpdatePlaceAction { dayNumber: number; blockTitle: string; placeName: string; name?: string; description?: string; address?: string; category?: string; priceLevel?: string; }
interface DeleteDayAction { dayNumber: number; }
interface DeleteBlockAction { dayNumber: number; blockTitle: string; }
interface DeletePlaceAction { dayNumber: number; blockTitle: string; placeName: string; }

type ActionPayload = UpdateGuideAction | AddDayAction | AddBlockAction | AddPlaceAction
  | UpdateDayAction | UpdateBlockAction | UpdatePlaceAction
  | DeleteDayAction | DeleteBlockAction | DeletePlaceAction;

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

const ACTION_PATTERN = /<action\s+type="(update_guide|add_day|add_block|add_place|update_day|update_block|update_place|delete_day|delete_block|delete_place)">([\s\S]*?)<\/action>/;
const PROFILE_PATTERN = /<profile>([\s\S]*?)<\/profile>/g;

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
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [accepting, setAccepting] = useState(false);
  const accumulatedRef = useRef('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const metadataMissing = !guide.primaryCity || !guide.region;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, pendingAction]);

  async function send(messageOverride?: string) {
    const userMessage = (messageOverride ?? input).trim();
    if (!userMessage || streaming || !token) return;
    setInput('');
    setPendingAction(null);

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: '' },
    ];
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages(newMessages);
    setStreaming(true);

    accumulatedRef.current = '';

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
      undefined,
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

    // Extract action tag
    const match = ACTION_PATTERN.exec(rawText);
    let cleanText = rawText;
    if (match) {
      try {
        const type = match[1] as PendingAction['type'];
        const payload = JSON.parse(match[2].trim());
        setPendingAction({ type, payload });
        cleanText = rawText.replace(ACTION_PATTERN, '').trim();
      } catch {
        // Malformed JSON — leave message as-is
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

  async function acceptAction() {
    if (!pendingAction || !token) return;
    setAccepting(true);
    try {
      const { type, payload } = pendingAction;

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
        const place = await api.post<GuidePlace>(
          `/api/guides/${guide.id}/blocks/${targetBlock.id}/places`,
          {
            name: p.name,
            description: p.description,
            address: p.address,
            category: p.category,
            priceLevel: p.priceLevel,
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
        const updatedPlace = await api.patch<GuidePlace>(`/api/guides/${guide.id}/places/${targetPlace.id}`, { name: p.name, description: p.description, address: p.address, category: p.category, priceLevel: p.priceLevel }, token);
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

      setPendingAction(null);
    } finally {
      setAccepting(false);
    }
  }

  function skipAction() {
    setPendingAction(null);
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

        {/* Action confirmation card */}
        {pendingAction && !streaming && (
          <div className="border border-[var(--border)] rounded-xl p-3 bg-[var(--bg-primary)] space-y-2">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              Proposed action
            </p>
            <p className="text-sm text-[var(--text-primary)] font-medium">{actionLabel(pendingAction)}</p>
            <p className="text-xs text-[var(--text-tertiary)]">Approve to apply this to your guide.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={acceptAction}
                disabled={accepting}
                className="min-h-11 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {accepting ? 'Applying…' : 'Approve'}
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
