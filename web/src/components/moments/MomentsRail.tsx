'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccessToken } from '@/hooks/useAccessToken';
import { reactToMoment, recordMomentView, type MomentView } from '@/lib/moments';
import MomentsViewer from './MomentsViewer';

interface MomentsRailProps {
  moments: MomentView[];
  emptyHint?: string;
}

/**
 * Horizontal thumbnail strip of Moments that opens the full-screen tap-through viewer. Recording a
 * view and reacting are best-effort (failures are swallowed — engagement must never block the UI).
 */
export default function MomentsRail({ moments, emptyHint }: MomentsRailProps) {
  const { t } = useTranslation();
  const { token } = useAccessToken();
  const [openAt, setOpenAt] = useState<number | null>(null);

  if (moments.length === 0) {
    return emptyHint ? <p className="text-sm text-ig-text-tertiary">{emptyHint}</p> : null;
  }

  const onView = (id: string) => {
    if (token) recordMomentView(id, token).catch(() => {});
  };
  const onReact = (id: string) => {
    if (token) reactToMoment(id, token).catch(() => {});
  };

  return (
    <>
      <div className="flex gap-2 overflow-x-auto py-1">
        {moments.map((m, i) => (
          <button
            key={m.id}
            onClick={() => setOpenAt(i)}
            className="h-20 w-16 shrink-0 overflow-hidden rounded-lg border-2 border-ig-border"
            aria-label={t('moments.open')}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.mediaRef} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      {openAt !== null && (
        <MomentsViewer
          moments={moments}
          startIndex={openAt}
          onClose={() => setOpenAt(null)}
          onView={onView}
          onReact={onReact}
        />
      )}
    </>
  );
}
