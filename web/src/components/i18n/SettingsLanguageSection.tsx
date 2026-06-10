'use client';

// BOR-41 (Settings): inline language picker for the Settings page. Renders the
// 10 supported languages in their native autonyms (no flags) as selectable
// rows; selecting one switches the app live and persists the choice — the same
// `setAppLanguage` code path the navbar Globe uses. Returns <li> rows so it
// drops straight into the Settings <Group>'s <ul>.

import { useTranslation } from 'react-i18next';

import { LOCALES } from '@/i18n/locales';
import { setAppLanguage } from '@/i18n/config';

function CheckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function SettingsLanguageSection() {
  const { i18n } = useTranslation();
  const active = i18n.language;

  return (
    <>
      {LOCALES.map((locale) => {
        const isActive = locale.code === active;
        return (
          <li key={locale.code}>
            <button
              type="button"
              role="radio"
              aria-checked={isActive}
              lang={locale.code}
              onClick={() => setAppLanguage(locale.code)}
              className={
                'mw-ripple flex min-h-touch w-full items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left transition hover:bg-ig-hover ' +
                (isActive ? 'border-brand-500' : 'border-ig-border')
              }
            >
              <span className={'text-base font-semibold ' + (isActive ? 'text-brand-500' : 'text-ig-text-primary')}>
                {locale.autonym}
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
