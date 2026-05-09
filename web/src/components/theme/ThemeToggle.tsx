'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

type ThemeChoice = 'system' | 'light' | 'dark';

const NEXT_CHOICE: Record<ThemeChoice, ThemeChoice> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

const LABEL: Record<ThemeChoice, string> = {
  system: 'Match device',
  light: 'Bright',
  dark: 'Dark',
};

type Variant = 'icon' | 'menu';

export default function ThemeToggle({ variant = 'icon' }: { variant?: Variant }) {
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
          <span>Theme</span>
          <span className="opacity-60">…</span>
        </div>
      );
    }
    return (
      <button
        type="button"
        aria-label="Theme toggle"
        disabled
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ig-border bg-ig-elevated opacity-60"
      />
    );
  }

  const current = (theme === 'light' || theme === 'dark' ? theme : 'system') as ThemeChoice;
  const next = NEXT_CHOICE[current];
  const aria = `Theme: ${LABEL[current]}. Click to switch to ${LABEL[next]}.`;

  if (variant === 'menu') {
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        aria-label={aria}
        className="flex w-full items-center justify-between px-4 py-3 text-sm text-ig-text-primary transition-colors hover:bg-ig-hover"
      >
        <span>Theme</span>
        <span className="text-ig-text-secondary">{LABEL[current]}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={aria}
      title={aria}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ig-border bg-ig-elevated text-ig-text-secondary transition-colors hover:bg-ig-hover hover:text-ig-text-primary"
    >
      {current === 'system' ? <MonitorIcon /> : current === 'light' ? <SunIcon /> : <MoonIcon />}
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

function MonitorIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
