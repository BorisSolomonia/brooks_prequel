'use client';

// BOR-41/BOR-52: Settings language control. Collapsed to a SINGLE row that shows
// the current language in its native autonym (e.g. "ქართული"); tapping it opens a
// bottom-sheet (mobile) / dropdown (desktop) with the full list — the same live
// `setAppLanguage` code path the navbar Globe used. Returns a single <li> so it
// still drops into the Settings <Group>'s <ul>.

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LOCALES, localeMeta } from '@/i18n/locales';
import { setAppLanguage } from '@/i18n/config';

function CheckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default function SettingsLanguageSection() {
  const { t, i18n } = useTranslation();
  const active = i18n.language;
  const current = localeMeta(active) ?? localeMeta('en');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLLIElement | null>(null);

  // Close on outside click + Escape (matches the app's menu conventions).
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function choose(code: string) {
    setAppLanguage(code);
    setOpen(false);
  }

  return (
    <li ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="mw-ripple flex min-h-touch w-full items-center justify-between gap-3 rounded-2xl border-2 border-ig-border p-4 text-left transition hover:bg-ig-hover"
      >
        <span className="text-base font-semibold text-ig-text-primary" lang={current?.code}>
          {current?.autonym ?? active}
        </span>
        <span className="shrink-0 self-center text-ig-text-tertiary" aria-hidden>
          <ChevronIcon />
        </span>
      </button>

      {open && (
        <>
          {/* Mobile scrim — taps fall through to the outside-click handler too. */}
          <div className="fixed inset-0 z-40 bg-black/30 md:hidden" aria-hidden="true" />

          <div
            role="dialog"
            aria-label={t('languageSelector.title')}
            className="
              fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-3xl border-t-2 border-ig-border bg-ig-elevated p-2 pb-[max(env(safe-area-inset-bottom),1rem)]
              md:absolute md:inset-x-auto md:left-0 md:right-0 md:bottom-auto md:top-[calc(100%+8px)] md:max-h-[60vh] md:rounded-2xl md:border-2 md:p-2 md:shadow-xl
            "
          >
            <p className="px-3 pb-2 pt-3 font-display text-[11px] font-black uppercase tracking-[0.08em] text-ig-text-tertiary md:pt-2">
              {t('languageSelector.title')}
            </p>
            <ul className="space-y-0.5">
              {LOCALES.map((locale) => {
                const isActive = locale.code === active;
                return (
                  <li key={locale.code}>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      lang={locale.code}
                      onClick={() => choose(locale.code)}
                      className={`flex min-h-touch w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-ig-hover ${
                        isActive ? 'font-semibold text-brand-500' : 'text-ig-text-primary'
                      }`}
                    >
                      <span>{locale.autonym}</span>
                      {isActive && <CheckIcon />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </li>
  );
}
