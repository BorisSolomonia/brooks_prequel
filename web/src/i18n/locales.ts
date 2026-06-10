// BOR-41: the canonical list of languages Brooks ships. Order here is the order
// shown in the language selector. Each entry carries its NATIVE autonym (the
// language's name for itself) — never a flag, never an English exonym — so a
// speaker recognises their own tongue instantly (Apple/Google i18n guidance).
//
// `dir` supports a future RTL language without a structural change; all ten
// current languages are LTR. To add a language: add it here AND add a matching
// dictionary file under ./dictionaries (see config.ts).

export interface LocaleMeta {
  /** BCP-47 code used by i18next and persisted to localStorage. */
  code: string;
  /** The language's name for itself, shown verbatim in the selector. */
  autonym: string;
  /** English name — for aria-labels / tooltips / dev tooling only, never the primary label. */
  englishName: string;
  /** Text direction. All current locales are 'ltr'. */
  dir: 'ltr' | 'rtl';
}

export const LOCALES: LocaleMeta[] = [
  { code: 'en', autonym: 'English', englishName: 'English', dir: 'ltr' },
  { code: 'fr', autonym: 'Français', englishName: 'French', dir: 'ltr' },
  { code: 'de', autonym: 'Deutsch', englishName: 'German', dir: 'ltr' },
  { code: 'it', autonym: 'Italiano', englishName: 'Italian', dir: 'ltr' },
  { code: 'es', autonym: 'Español', englishName: 'Spanish', dir: 'ltr' },
  { code: 'ka', autonym: 'ქართული', englishName: 'Georgian', dir: 'ltr' },
  { code: 'uk', autonym: 'Українська', englishName: 'Ukrainian', dir: 'ltr' },
  { code: 'ru', autonym: 'Русский', englishName: 'Russian', dir: 'ltr' },
  { code: 'hy', autonym: 'Հայերեն', englishName: 'Armenian', dir: 'ltr' },
  { code: 'az', autonym: 'Azərbaycan', englishName: 'Azerbaijani', dir: 'ltr' },
];

export const DEFAULT_LOCALE = 'en';

/** localStorage key holding the user's manual language override (BOR-41). */
export const LOCALE_STORAGE_KEY = 'brooks.lang';

export const SUPPORTED_CODES = LOCALES.map((l) => l.code);

export function isSupportedLocale(code: string | null | undefined): boolean {
  return !!code && SUPPORTED_CODES.includes(code);
}

/**
 * Resolve any raw language tag (e.g. "es-419", "EN-GB", "ru") to one of our
 * supported codes, or null if unsupported. Matches the base subtag so regional
 * variants (es-MX → es) still map correctly.
 */
export function resolveSupportedLocale(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (isSupportedLocale(lower)) return lower;
  const base = lower.split('-')[0];
  return isSupportedLocale(base) ? base : null;
}

export function localeMeta(code: string): LocaleMeta | undefined {
  return LOCALES.find((l) => l.code === code);
}
