'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TourRole } from './tourSteps';

// Shown once, immediately after first sign-in, to users who haven't picked an intent yet
// (primary_intent is null). Must-choose: there is no dismiss/close — one of the two options has
// to be selected, which guarantees the role is always set. Lightweight + no loops/timers, so it
// can't reintroduce the tour freeze.
const OPTIONS: { role: TourRole; emoji: string }[] = [
  { role: 'traveler', emoji: '🧭' },
  { role: 'creator', emoji: '✍️' },
];

export default function RoleSelectionModal({ onChoose }: { onChoose: (role: TourRole) => void }) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState<TourRole | null>(null);

  const pick = (role: TourRole) => {
    if (submitting) return;
    setSubmitting(role);
    onChoose(role);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('roleModal.aria')}
    >
      <div className="w-full max-w-md rounded-2xl border-2 border-ig-border bg-ig-elevated p-5 shadow-2xl">
        <h2 className="font-display text-lg font-black text-ig-text-primary">{t('roleModal.heading')}</h2>
        <p className="mt-1 text-sm text-ig-text-secondary">
          {t('roleModal.subhead')}
        </p>

        <div className="mt-4 grid gap-3">
          {OPTIONS.map((o) => (
            <button
              key={o.role}
              type="button"
              disabled={!!submitting}
              onClick={() => pick(o.role)}
              className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors disabled:opacity-60 ${
                submitting === o.role
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-ig-border hover:border-brand-500/60 hover:bg-ig-hover'
              }`}
            >
              <span className="text-2xl leading-none" aria-hidden>{o.emoji}</span>
              <span className="min-w-0">
                <span className="block font-display text-base font-black text-ig-text-primary">{t(`roleModal.${o.role}.title`)}</span>
                <span className="mt-0.5 block text-xs leading-snug text-ig-text-secondary">{t(`roleModal.${o.role}.body`)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
