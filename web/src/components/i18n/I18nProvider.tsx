'use client';

// BOR-41: wraps the app in the i18next context and performs hydration-safe
// language detection.
//
// Why detection runs in an effect (not at i18n init): the server renders with
// `lng: 'en'`, so the first client paint must ALSO be English or React throws a
// hydration mismatch on every translated string. After mount we resolve the
// real language — manual override (localStorage) first, then the device/browser
// language, falling back to English — and switch to it. This mirrors how
// next-themes applies the theme post-mount.

import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';

import i18n, { loadLocale } from '@/i18n/config';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  localeMeta,
  resolveSupportedLocale,
} from '@/i18n/locales';

function detectInitialLocale(): string {
  // 1) Manual override always wins (set via the Globe selector).
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const resolvedStored = resolveSupportedLocale(stored);
    if (resolvedStored) return resolvedStored;
  } catch {
    // localStorage can throw in privacy modes — fall through to detection.
  }

  // 2) Device / browser language(s), in the user's preference order.
  const candidates =
    typeof navigator !== 'undefined'
      ? [...(navigator.languages ?? []), navigator.language]
      : [];
  for (const candidate of candidates) {
    const resolved = resolveSupportedLocale(candidate);
    if (resolved) return resolved;
  }

  // 3) Graceful fallback.
  return DEFAULT_LOCALE;
}

function applyHtmlLang(code: string) {
  const meta = localeMeta(code);
  document.documentElement.lang = code;
  document.documentElement.dir = meta?.dir ?? 'ltr';
}

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const initial = detectInitialLocale();
    // <html lang/dir> can update immediately; the dictionary chunk (if any) is
    // fetched first so the switch doesn't flash English while it downloads.
    applyHtmlLang(initial);
    if (initial !== i18n.language) {
      void loadLocale(initial).then(() => i18n.changeLanguage(initial));
    }

    // Keep <html lang/dir> in sync with any later manual change.
    const onChanged = (lng: string) => applyHtmlLang(lng);
    i18n.on('languageChanged', onChanged);
    return () => {
      i18n.off('languageChanged', onChanged);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
