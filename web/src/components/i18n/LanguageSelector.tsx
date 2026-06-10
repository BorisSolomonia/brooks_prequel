'use client';

// BOR-41: the professional language selector.
//  - Trigger: a universal Globe icon (NO country flags anywhere).
//  - Menu: a bottom-sheet on mobile, a dropdown on desktop (one markup block,
//    switched purely by responsive classes — mirrors GlobalSearchBar).
//  - Each language is listed in its NATIVE autonym (Español, Deutsch, ქართული…).
//  - Choosing a language switches the app live (i18next.changeLanguage) and
//    persists the manual override to localStorage so it wins on return visits.

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LOCALES } from '@/i18n/locales';
import { setAppLanguage } from '@/i18n/config';

function GlobeIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const active = i18n.language;

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
    <div ref={containerRef} className="relative flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('languageSelector.trigger')}
        className="flex h-10 w-10 items-center justify-center rounded-full text-ig-text-secondary transition-colors hover:bg-ig-hover hover:text-ig-text-primary"
      >
        <GlobeIcon />
      </button>

      {open && (
        <>
          {/* Mobile scrim — taps fall through to the outside-click handler too. */}
          <div className="fixed inset-0 z-40 bg-black/30 md:hidden" aria-hidden="true" />

          <div
            role="menu"
            aria-label={t('languageSelector.title')}
            className="
              fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-3xl border-t-2 border-ig-border bg-ig-elevated p-2 pb-[max(env(safe-area-inset-bottom),1rem)]
              md:absolute md:inset-x-auto md:right-0 md:bottom-auto md:top-[calc(100%+8px)] md:max-h-[70vh] md:w-64 md:rounded-2xl md:border-2 md:p-2 md:shadow-xl
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
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-ig-hover ${
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
    </div>
  );
}
