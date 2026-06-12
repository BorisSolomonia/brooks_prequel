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
//
// To add a language: add it to ./locales.ts AND import + register its dictionary
// below.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LOCALE, SUPPORTED_CODES, LOCALE_STORAGE_KEY } from './locales';

import en from './dictionaries/en.json';
import fr from './dictionaries/fr.json';
import de from './dictionaries/de.json';
import it from './dictionaries/it.json';
import es from './dictionaries/es.json';
import ka from './dictionaries/ka.json';
import uk from './dictionaries/uk.json';
import ru from './dictionaries/ru.json';
import hy from './dictionaries/hy.json';
import az from './dictionaries/az.json';

// One namespace ('translation') keyed by the nested dictionary structure
// (e.g. t('landing.guides.button')). Empty dictionaries fall back to `en`.
const resources = {
  en: { translation: en },
  fr: { translation: fr },
  de: { translation: de },
  it: { translation: it },
  es: { translation: es },
  ka: { translation: ka },
  uk: { translation: uk },
  ru: { translation: ru },
  hy: { translation: hy },
  az: { translation: az },
} as const;

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LOCALE, // always 'en' at init — see hydration note above
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_CODES,
    nonExplicitSupportedLngs: true, // es-419 → es, en-GB → en
    interpolation: { escapeValue: false }, // React already escapes
    returnEmptyString: false, // empty value → fall back to en, not ''
    react: { useSuspense: false },
  });
}

// Switch the app language and persist it as the manual override (wins over
// device detection on return visits). BOR-52: the global-header Globe selector
// was removed; the Settings language section is now the sole caller.
export function setAppLanguage(code: string): void {
  void i18n.changeLanguage(code);
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, code);
  } catch {
    // Persisting is best-effort; the live switch still applies this session.
  }
}

export default i18n;
