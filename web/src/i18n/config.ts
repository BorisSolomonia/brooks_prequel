// BOR-41: central i18next instance for the Brooks web client.
//
// Design choices (see PRD 20260610-132054):
//  - CLIENT-SIDE only. No locale-prefixed routing — all 48 routes, App Links and
//    deep-links stay byte-identical. i18next lives entirely in the React tree.
//  - HYDRATION-SAFE. We always initialise with `lng: 'en'` so the server render
//    and the first client paint match. The actual device/stored language is
//    applied AFTER mount by I18nProvider (changeLanguage in a useEffect), the
//    same strategy next-themes uses for theme.
//  - fallbackLng 'en'. The nine non-English dictionaries ship EMPTY until the
//    base English map is approved (BOR-41 approval gate); every key therefore
//    resolves to English until those files are populated.
//  - useSuspense:false so a missing/empty dictionary never suspends the tree.
//  - LAZY dictionaries. Only English (the default + fallback) is bundled into
//    the main chunk. Every other language is code-split into its own chunk and
//    fetched on demand the first time it's selected/detected — so an English
//    user never downloads ka.json (~108KB) and a Georgian user never pays for
//    the others. See loadLocale() below.
//
// To add a language: add it to ./locales.ts AND register its loader in LOADERS
// below.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LOCALE, SUPPORTED_CODES, LOCALE_STORAGE_KEY } from './locales';

// English is the only dictionary in the main bundle: it's the init language,
// the fallback for every other locale, and what the server renders.
import en from './dictionaries/en.json';

// Non-English dictionaries are loaded on demand. Each import() is a distinct
// webpack chunk; only the one the user actually uses is ever fetched. Keep this
// map in sync with ./locales.ts (en is intentionally absent — it's static).
const LOADERS: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  fr: () => import('./dictionaries/fr.json'),
  de: () => import('./dictionaries/de.json'),
  it: () => import('./dictionaries/it.json'),
  es: () => import('./dictionaries/es.json'),
  ka: () => import('./dictionaries/ka.json'),
  uk: () => import('./dictionaries/uk.json'),
  ru: () => import('./dictionaries/ru.json'),
  hy: () => import('./dictionaries/hy.json'),
  az: () => import('./dictionaries/az.json'),
};

const loadedLocales = new Set<string>([DEFAULT_LOCALE]);

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    // Only English is registered up front; the rest arrive via addResourceBundle.
    resources: { en: { translation: en } },
    lng: DEFAULT_LOCALE, // always 'en' at init — see hydration note above
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_CODES,
    nonExplicitSupportedLngs: true, // es-419 → es, en-GB → en
    interpolation: { escapeValue: false }, // React already escapes
    returnEmptyString: false, // empty value → fall back to en, not ''
    react: { useSuspense: false },
  });
}

// Fetch + register a locale's dictionary chunk if we haven't already. Idempotent
// and safe to call with any string (unknown codes are a no-op → English
// fallback). Awaiting this BEFORE changeLanguage avoids a flash of English while
// the chunk downloads. Failures degrade gracefully to the English fallback.
export async function loadLocale(code: string): Promise<void> {
  if (loadedLocales.has(code)) return;
  const loader = LOADERS[code];
  if (!loader) return;
  try {
    const mod = await loader();
    i18n.addResourceBundle(code, 'translation', mod.default ?? mod, true, true);
    loadedLocales.add(code);
  } catch (err) {
    console.warn('[i18n] failed to load locale chunk:', code, err);
  }
}

// Switch the app language and persist it as the manual override (wins over
// device detection on return visits). BOR-52: the global-header Globe selector
// was removed; the Settings language section is now the sole caller. Callers
// fire-and-forget; the load+switch completes asynchronously.
export async function setAppLanguage(code: string): Promise<void> {
  await loadLocale(code);
  void i18n.changeLanguage(code);
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, code);
  } catch {
    // Persisting is best-effort; the live switch still applies this session.
  }
}

export default i18n;
