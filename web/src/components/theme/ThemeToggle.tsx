'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';

type ThemeChoice = 'light' | 'dark' | 'dim';

// BOR-57: the quick toggle now cycles all THREE themes — one tap each:
// light → dark → dim → light. (System stays a Settings-only choice.)
const NEXT_CHOICE: Record<ThemeChoice, ThemeChoice> = {
  light: 'dark',
  dark: 'dim',
  dim: 'light',
};

type Variant = 'icon' | 'menu';

export default function ThemeToggle({ variant = 'icon' }: { variant?: Variant }) {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    if (variant === 'menu') {
      return (
        <div
          aria-hidden="true"
          className="flex w-full items-center justify-between px-4 py-3 text-sm text-ig-text-secondary"
        >
          <span>{t('widgets.themeToggle.theme')}</span>
          <span className="opacity-60">…</span>
        </div>
      );
    }
    return (
      <button
        type="button"
        aria-label={t('widgets.themeToggle.themeToggle')}
        disabled
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ig-border bg-ig-elevated opacity-60"
      />
    );
  }

  const current: ThemeChoice = theme === 'dark' ? 'dark' : theme === 'dim' ? 'dim' : 'light';
  const next = NEXT_CHOICE[current];
  const currentLabel = t(`widgets.themeToggle.${current}`);
  const nextLabel = t(`widgets.themeToggle.${next}`);
  const aria = t('widgets.themeToggle.ariaLabel', { current: currentLabel, next: nextLabel });

  if (variant === 'menu') {
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        aria-label={aria}
        className="flex w-full items-center justify-between px-4 py-3 text-sm text-ig-text-primary transition-colors hover:bg-ig-hover"
      >
        <span>{t('widgets.themeToggle.theme')}</span>
        <span className="text-ig-text-secondary">{currentLabel}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={aria}
      title={aria}
      data-tour="theme-toggle"
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ig-border bg-ig-elevated text-ig-text-secondary transition-colors hover:bg-ig-hover hover:text-ig-text-primary"
    >
      {current === 'light' ? <SunIcon /> : current === 'dark' ? <MoonIcon /> : <DimIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

// BOR-57: "dim" — a half-filled contrast circle, distinct from sun/moon.
function DimIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none" />
    </svg>
  );
}

