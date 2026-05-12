'use client';

import { useEffect, useState } from 'react';

type Section = {
  id: string;
  label: string;
};

type Props = {
  sections: Section[];
};

export default function SectionNavRail({ sections }: Props) {
  const [activeId, setActiveId] = useState<string | null>(sections[0]?.id ?? null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sections.length === 0) return;
    const elements = sections
      .map((s) => ({ id: s.id, el: document.querySelector(`[data-section="${s.id}"]`) as HTMLElement | null }))
      .filter((e): e is { id: string; el: HTMLElement } => e.el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry whose intersection ratio is highest among intersecting ones
        let best: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (!best || entry.intersectionRatio > best.intersectionRatio) {
            best = entry;
          }
        }
        if (best) {
          const id = (best.target as HTMLElement).getAttribute('data-section');
          if (id) setActiveId(id);
        }
      },
      {
        rootMargin: '-40% 0px -40% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    elements.forEach((e) => observer.observe(e.el));
    return () => observer.disconnect();
  }, [sections]);

  const handleJump = (id: string) => {
    const el = document.querySelector(`[data-section="${id}"]`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (sections.length === 0) return null;

  return (
    <nav
      aria-label="Trip sections"
      className="pointer-events-none fixed right-2 top-1/2 z-30 -translate-y-1/2 sm:right-4"
    >
      <ul className="pointer-events-auto flex flex-col items-end gap-2 rounded-full border border-ig-border/60 bg-ig-elevated/80 px-1.5 py-2 shadow-lg backdrop-blur-md">
        {sections.map((s) => {
          const isActive = s.id === activeId;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => handleJump(s.id)}
                className="group flex items-center gap-2"
                aria-label={`Jump to ${s.label}`}
                aria-current={isActive ? 'true' : undefined}
              >
                <span
                  className={`whitespace-nowrap rounded-full bg-ig-elevated/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${
                    isActive ? 'text-brand-500' : 'text-ig-text-secondary'
                  }`}
                >
                  {s.label}
                </span>
                <span
                  className={`h-2.5 w-2.5 rounded-full border-2 transition-all ${
                    isActive
                      ? 'scale-125 border-brand-500 bg-brand-500 shadow-[0_0_0_3px_rgb(var(--brand-500)/0.2)]'
                      : 'border-brand-500/50 bg-transparent hover:border-brand-500'
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
