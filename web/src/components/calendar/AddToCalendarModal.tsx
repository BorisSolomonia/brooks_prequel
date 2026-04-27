'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type {
  CalendarConnectionStatusResponse,
  CalendarLateEvent,
  CalendarLateEventsResponse,
  GoogleCalendarSyncResponse,
  MyTripDetail,
  MyTripItem,
  MyTripItemUpdateRequest,
  MyTripSetupRequest,
} from '@/types';

interface AddToCalendarModalProps {
  tripId: string;
  token: string;
  onClose: () => void;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function toLocalInputValue(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInputValue(value: string): string | undefined {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

function addMinutes(value: string, minutes: number): string {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

async function fetchJson<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ''}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.detail || body?.message || `HTTP ${response.status}`) as Error & {
      status?: number;
      body?: unknown;
    };
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body as T;
}

export default function AddToCalendarModal({ tripId, token, onClose }: AddToCalendarModalProps) {
  const [trip, setTrip] = useState<MyTripDetail | null>(null);
  const [connection, setConnection] = useState<CalendarConnectionStatusResponse | null>(null);
  const [tripStartDate, setTripStartDate] = useState(today());
  const [tripStartTime, setTripStartTime] = useState('09:00');
  const [tripTimezone, setTripTimezone] = useState('UTC');
  const [lateEvents, setLateEvents] = useState<CalendarLateEvent[]>([]);
  const [acknowledgedLateIds, setAcknowledgedLateIds] = useState<Set<string>>(new Set());
  const [lateEdits, setLateEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [returnTo, setReturnTo] = useState('/trips');

  useEffect(() => {
    setReturnTo(window.location.pathname + window.location.search);
    Promise.all([
      api.get<MyTripDetail>(`/api/me/trips/${tripId}`, token),
      api.get<CalendarConnectionStatusResponse>('/api/me/calendar/status', token),
    ])
      .then(([tripResponse, connectionResponse]) => {
        setTrip(tripResponse);
        setConnection(connectionResponse);
        setTripStartDate(tripResponse.tripStartDate || today());
        setTripStartTime((tripResponse.tripStartTime || '09:00').slice(0, 5));
        setTripTimezone(tripResponse.tripTimezone || tripResponse.guide.timezone || 'UTC');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load calendar options'));
  }, [token, tripId]);

  const itemById = useMemo(() => {
    const map = new Map<string, MyTripItem>();
    trip?.items.forEach((item) => map.set(item.id, item));
    return map;
  }, [trip]);

  const buildItemUpdates = (overrides: Record<string, string> = {}): MyTripItemUpdateRequest[] => {
    if (!trip) return [];
    return trip.items.map((item) => {
      const overrideStart = overrides[item.id];
      const currentStart = toLocalInputValue(item.scheduledStart);
      const currentEnd = toLocalInputValue(item.scheduledEnd);
      const duration = item.scheduledStart && item.scheduledEnd
        ? Math.max(15, Math.round((new Date(item.scheduledEnd).getTime() - new Date(item.scheduledStart).getTime()) / 60000))
        : item.suggestedDurationMinutes || 90;
      return {
        placeId: item.placeId,
        scheduledStart: overrideStart ? fromLocalInputValue(overrideStart) : fromLocalInputValue(currentStart),
        scheduledEnd: overrideStart ? addMinutes(overrideStart, duration) : fromLocalInputValue(currentEnd),
        skipped: item.skipped,
      };
    });
  };

  const saveSetup = async (overrides: Record<string, string> = {}) => {
    const updated = await api.patch<MyTripDetail>(`/api/me/trips/${tripId}/setup`, {
      tripStartDate,
      tripStartTime,
      tripTimezone,
      items: buildItemUpdates(overrides),
    } as MyTripSetupRequest, token);
    setTrip(updated);
    return updated;
  };

  const handleLateConflict = (body: unknown) => {
    const lateBody = body as CalendarLateEventsResponse;
    if (lateBody?.code === 'LATE_EVENTS_REQUIRE_CONFIRMATION') {
      setLateEvents(lateBody.lateEvents || []);
      setMessage(null);
      return true;
    }
    return false;
  };

  const syncGoogle = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveSetup();
      const response = await fetchJson<GoogleCalendarSyncResponse>(`/api/me/trips/${tripId}/calendar/google/sync`, token, {
        method: 'POST',
        body: JSON.stringify({ acknowledgedLateItemIds: Array.from(acknowledgedLateIds) }),
      });
      setLateEvents([]);
      setMessage(`Synced to Google Calendar. Created ${response.created}, updated ${response.updated}, deleted ${response.deleted}.`);
      if (response.calendarUrl) {
        window.open(response.calendarUrl, '_blank', 'noreferrer');
      }
    } catch (err) {
      const typed = err as Error & { status?: number; body?: unknown };
      if (typed.status === 409 && handleLateConflict(typed.body)) return;
      setError(typed.message || 'Failed to sync Google Calendar');
    } finally {
      setSaving(false);
    }
  };

  const downloadIcs = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveSetup();
      const query = new URLSearchParams();
      Array.from(acknowledgedLateIds).forEach((id) => query.append('acknowledgedLateItemIds', id));
      const response = await fetch(`/api/trips/${tripId}/calendar${query.toString() ? `?${query}` : ''}`);
      if (response.status === 409) {
        handleLateConflict(await response.json());
        return;
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({ detail: 'Failed to download calendar file' }));
        throw new Error(body.detail || 'Failed to download calendar file');
      }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `brooks-trip-${tripId}.ics`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
      setLateEvents([]);
      setMessage('Calendar file is ready for Apple Calendar, Google Calendar, and Outlook.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download calendar file');
    } finally {
      setSaving(false);
    }
  };

  const saveLateEdits = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveSetup(lateEdits);
      setLateEvents([]);
      setAcknowledgedLateIds(new Set());
      setLateEdits({});
      setMessage('Updated event times. Try adding to calendar again.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event times');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-3 sm:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-ig-border bg-ig-elevated p-5 shadow-xl sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ig-text-primary">Add to calendar</h2>
            <p className="mt-1 text-sm text-ig-text-secondary">{trip?.guide.title || 'Loading trip...'}</p>
          </div>
          <button type="button" onClick={onClose} className="min-h-11 rounded-md px-3 text-sm text-ig-text-tertiary hover:text-ig-text-primary">
            Close
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block text-ig-text-secondary">Start date</span>
            <input type="date" value={tripStartDate} onChange={(event) => setTripStartDate(event.target.value)} className="min-h-11 w-full rounded-md border border-ig-border bg-ig-primary px-3 py-2 text-base text-ig-text-primary" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ig-text-secondary">Start time</span>
            <input type="time" value={tripStartTime} onChange={(event) => setTripStartTime(event.target.value)} className="min-h-11 w-full rounded-md border border-ig-border bg-ig-primary px-3 py-2 text-base text-ig-text-primary" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ig-text-secondary">Timezone</span>
            <input type="text" value={tripTimezone} onChange={(event) => setTripTimezone(event.target.value)} className="min-h-11 w-full rounded-md border border-ig-border bg-ig-primary px-3 py-2 text-base text-ig-text-primary" />
          </label>
        </div>

        {lateEvents.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <h3 className="text-sm font-semibold text-ig-text-primary">Review events after 20:00</h3>
            <div className="mt-3 space-y-3">
              {lateEvents.map((event) => {
                const item = itemById.get(event.itemId);
                return (
                  <div key={event.itemId} className="rounded-lg border border-ig-border bg-ig-primary p-3">
                    <div className="text-sm font-medium text-ig-text-primary">{event.placeName}</div>
                    <div className="mt-1 text-xs text-ig-text-tertiary">Starts at {event.localStartTime}</div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input
                        type="datetime-local"
                        value={lateEdits[event.itemId] ?? toLocalInputValue(item?.scheduledStart ?? event.scheduledStart)}
                        onChange={(input) => setLateEdits((current) => ({ ...current, [event.itemId]: input.target.value }))}
                        className="min-h-11 rounded-md border border-ig-border bg-ig-secondary px-3 py-2 text-sm text-ig-text-primary"
                      />
                      <label className="inline-flex min-h-11 items-center gap-2 text-sm text-ig-text-secondary">
                        <input
                          type="checkbox"
                          checked={acknowledgedLateIds.has(event.itemId)}
                          onChange={(input) => setAcknowledgedLateIds((current) => {
                            const next = new Set(current);
                            if (input.target.checked) next.add(event.itemId);
                            else next.delete(event.itemId);
                            return next;
                          })}
                        />
                        Keep
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={saveLateEdits} disabled={saving} className="mt-3 min-h-11 w-full rounded-md border border-ig-border px-4 py-2 text-sm font-semibold text-ig-text-primary hover:bg-ig-hover disabled:opacity-50">
              Save edited times
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-ig-error">{error}</p>}
        {message && <p className="mt-3 text-sm text-green-400">{message}</p>}

        <div className="mt-5 space-y-3">
          {connection?.googleConnected ? (
            <button type="button" onClick={syncGoogle} disabled={saving || !trip} className="min-h-12 w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
              {saving ? 'Working...' : 'Sync to Google Calendar'}
            </button>
          ) : (
            <a href={`/api/calendar/google/connect?returnTo=${encodeURIComponent(returnTo)}`} className="block min-h-12 w-full rounded-xl bg-brand-500 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-brand-600">
              Connect Google Calendar
            </a>
          )}
          <button type="button" onClick={downloadIcs} disabled={saving || !trip} className="min-h-12 w-full rounded-xl border border-ig-border bg-ig-primary px-4 py-3 text-sm font-semibold text-ig-text-primary hover:border-brand-500/50 disabled:opacity-50">
            Add to Apple Calendar (.ics)
          </button>
        </div>
      </div>
    </div>
  );
}
