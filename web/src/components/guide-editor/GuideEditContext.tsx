'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type {
  Guide, GuideDay, GuideDayRequest,
  GuideBlock, GuideBlockRequest,
  GuidePlace, GuidePlaceRequest,
} from '@/types';

/**
 * Centralised editor context. Owns the guide CRUD orchestration so that
 * DayPanel / BlockPanel / PlaceCard can call handlers directly via {@link useGuideEdit}
 * instead of accepting 8–12 callback props through three component layers.
 *
 * Error reporting is funneled through {@link Value.reportError}; the GuideEditor
 * provides a setter that surfaces the error in its top banner.
 */
export interface GuideEditValue {
  guide: Guide;
  token: string;
  refresh: () => Promise<void>;
  reportError: (message: string) => void;

  addDay: () => Promise<void>;
  updateDay: (dayId: string, data: GuideDayRequest) => Promise<void>;
  deleteDay: (dayId: string) => Promise<void>;

  addBlock: (dayId: string, data: GuideBlockRequest) => Promise<void>;
  updateBlock: (blockId: string, data: GuideBlockRequest) => Promise<void>;
  deleteBlock: (dayId: string, blockId: string) => Promise<void>;

  addPlace: (blockId: string, data: GuidePlaceRequest) => Promise<void>;
  updatePlace: (placeId: string, data: GuidePlaceRequest) => Promise<void>;
  deletePlace: (blockId: string, placeId: string) => Promise<void>;
}

const GuideEditContext = createContext<GuideEditValue | null>(null);

export interface GuideEditProviderProps {
  guide: Guide;
  token: string;
  onGuideChange: (guide: Guide) => void;
  onError: (message: string) => void;
  children: ReactNode;
}

export function GuideEditProvider({
  guide, token, onGuideChange, onError, children,
}: GuideEditProviderProps) {
  const refresh = useCallback(async () => {
    const updated = await api.get<Guide>(`/api/guides/${guide.id}`, token);
    onGuideChange(updated);
  }, [guide.id, token, onGuideChange]);

  const reportError = useCallback(
    (message: string) => onError(message),
    [onError],
  );

  // Each handler funnels through the same shape: do the API call, refresh, surface
  // any failure as a string. Lots of small functions but each is one-liner-ish.
  const wrap = useCallback(
    async (label: string, action: () => Promise<unknown>) => {
      try {
        await action();
        await refresh();
      } catch (err) {
        reportError(err instanceof Error ? err.message : `Failed to ${label}`);
      }
    },
    [refresh, reportError],
  );

  const value: GuideEditValue = useMemo(() => ({
    guide,
    token,
    refresh,
    reportError,

    addDay: () =>
      wrap('add day', () => api.post<GuideDay>(`/api/guides/${guide.id}/days`, { title: '' }, token)),
    updateDay: (dayId, data) =>
      wrap('update day', () => api.patch<GuideDay>(`/api/guides/${guide.id}/days/${dayId}`, data, token)),
    deleteDay: (dayId) =>
      wrap('delete day', () => api.delete(`/api/guides/${guide.id}/days/${dayId}`, token)),

    addBlock: (dayId, data) =>
      wrap('add block', () => api.post<GuideBlock>(`/api/guides/${guide.id}/days/${dayId}/blocks`, data, token)),
    updateBlock: (blockId, data) =>
      wrap('update block', () => api.patch<GuideBlock>(`/api/guides/${guide.id}/blocks/${blockId}`, data, token)),
    deleteBlock: (dayId, blockId) =>
      wrap('delete block', () => api.delete(`/api/guides/${guide.id}/days/${dayId}/blocks/${blockId}`, token)),

    addPlace: (blockId, data) =>
      wrap('add place', () => api.post<GuidePlace>(`/api/guides/${guide.id}/blocks/${blockId}/places`, data, token)),
    updatePlace: (placeId, data) =>
      wrap('update place', () => api.patch<GuidePlace>(`/api/guides/${guide.id}/places/${placeId}`, data, token)),
    deletePlace: (blockId, placeId) =>
      wrap('delete place', () => api.delete(`/api/guides/${guide.id}/blocks/${blockId}/places/${placeId}`, token)),
  }), [guide, token, refresh, reportError, wrap]);

  return (
    <GuideEditContext.Provider value={value}>{children}</GuideEditContext.Provider>
  );
}

export function useGuideEdit(): GuideEditValue {
  const ctx = useContext(GuideEditContext);
  if (!ctx) {
    throw new Error('useGuideEdit must be called inside <GuideEditProvider>');
  }
  return ctx;
}
