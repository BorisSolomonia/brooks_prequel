'use client';

// BOR-57: theme picker for the Settings page. Lists Light / Dark / Dim / System
// as selectable rows driven by next-themes `setTheme` (the same string-based
// state the whole app reads — no isDarkMode boolean). Returns <li> rows so it
// drops straight into the Settings <Group>'s <ul>, mirroring SettingsLanguageSection.
// next-themes persists the choice to localStorage and re-applies it before paint
// (no flash). The mounted guard avoids a hydration mismatch since `theme` is
// only known on the client.

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';

const OPTIONS = ['light', 'dark', 'dim', 'system'] as const;

function CheckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function SettingsThemeSection() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const active = mounted ? theme ?? 'system' : undefined;

  return (
    <>
      {OPTIONS.map((opt) => {
        const isActive = active === opt;
        return (
          <li key={opt}>
            <button
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setTheme(opt)}
              className={
                'mw-ripple flex min-h-touch w-full items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left transition hover:bg-ig-hover ' +
                (isActive ? 'border-brand-500' : 'border-ig-border')
              }
            >
              <span className={'text-base font-semibold ' + (isActive ? 'text-brand-500' : 'text-ig-text-primary')}>
                {t(`account.settings.theme.${opt}`)}
              </span>
              {isActive && (
                <span className="shrink-0 self-center text-brand-500" aria-hidden>
                  <CheckIcon />
                </span>
              )}
            </button>
          </li>
        );
      })}
    </>
  );
}
