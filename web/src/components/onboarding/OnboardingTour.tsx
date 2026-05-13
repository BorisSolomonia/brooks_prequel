'use client';

import { useEffect, useState, CSSProperties } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { tourSteps, type TourStep } from './tourSteps';
import { useOnboarding } from './OnboardingProvider';

type Rect = { top: number; left: number; width: number; height: number };

const SPOTLIGHT_PADDING = 10;
const TOOLTIP_OFFSET = 14;
const TOOLTIP_WIDTH = 280;
const TOOLTIP_HEIGHT_ESTIMATE = 180;
const POLL_MAX_ATTEMPTS = 120;

export default function OnboardingTour({ stepIndex }: { stepIndex: number }) {
  const step = tourSteps[stepIndex];
  const { next, prev, skip, complete, totalSteps } = useOnboarding();
  const router = useRouter();
  const pathname = usePathname();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const isLast = stepIndex === totalSteps - 1;

  useEffect(() => {
    if (!('route' in step) || !step.route) return;
    const targetPath = step.route.split('?')[0];
    if (pathname !== targetPath) {
      router.push(step.route);
    }
  }, [step, pathname, router]);

  useEffect(() => {
    if (step.kind === 'welcome') return;
    const sideEffect = (step as { sideEffect?: { kind: string; selector?: string; ms?: number } }).sideEffect;
    if (!sideEffect) return;
    if (sideEffect.kind === 'discoverCreator') {
      let cancelled = false;
      (async () => {
        try {
          const res = await fetch('/api/tour/sample-creator');
          if (!res.ok) return;
          const data = (await res.json()) as { username?: string };
          if (cancelled || !data?.username) return;
          if (pathname !== `/creators/${data.username}`) {
            router.push(`/creators/${data.username}`);
          }
        } catch {
          // Network or parse error — fall back to centered overlay; user can still continue.
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    if (sideEffect.kind === 'click' && sideEffect.selector) {
      const t = setTimeout(() => {
        const candidates = document.querySelectorAll(sideEffect.selector!);
        for (const cand of Array.from(candidates) as HTMLElement[]) {
          const r = cand.getBoundingClientRect();
          if (r.width > 0 || r.height > 0) {
            cand.click();
            break;
          }
        }
      }, 200);
      return () => clearTimeout(t);
    }
    if (sideEffect.kind === 'sequentialHighlight' && sideEffect.selector) {
      const timers: ReturnType<typeof setTimeout>[] = [];
      const launch = setTimeout(() => {
        const container = document.querySelector(sideEffect.selector!);
        if (!container) return;
        const children = Array.from(container.children) as HTMLElement[];
        children.forEach((child, i) => {
          const startTimer = setTimeout(() => {
            child.setAttribute('data-onboard-highlight', '1');
            const clearTimer = setTimeout(() => child.removeAttribute('data-onboard-highlight'), 700);
            timers.push(clearTimer);
          }, i * 380);
          timers.push(startTimer);
        });
      }, 300);
      timers.push(launch);
      return () => {
        timers.forEach((t) => clearTimeout(t));
        const container = document.querySelector(sideEffect.selector!);
        if (container) {
          Array.from(container.children).forEach((child) =>
            (child as HTMLElement).removeAttribute('data-onboard-highlight'),
          );
        }
      };
    }
  }, [step]);

  useEffect(() => {
    // Clear any prior rect synchronously so the spotlight never briefly highlights an element
    // on the previous page during navigation.
    setTargetRect(null);
    if (step.kind !== 'spotlight') return;

    let frame: number | null = null;
    let attempts = 0;
    let scrolled = false;
    let observedEl: HTMLElement | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const measure = () => {
      const candidates = document.querySelectorAll(step.selector);
      let el: HTMLElement | null = null;
      let rect: DOMRect | null = null;
      for (const candidate of Array.from(candidates) as HTMLElement[]) {
        const candidateRect = candidate.getBoundingClientRect();
        if (candidateRect.width > 0 || candidateRect.height > 0) {
          el = candidate;
          rect = candidateRect;
          break;
        }
      }
      if (!el || !rect) return false;
      const vh = window.innerHeight;
      const offscreen = rect.top < 64 || rect.bottom > vh - 64;
      if (offscreen && !scrolled) {
        scrolled = true;
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        return false;
      }
      setTargetRect({
        top: rect.top - SPOTLIGHT_PADDING,
        left: rect.left - SPOTLIGHT_PADDING,
        width: rect.width + SPOTLIGHT_PADDING * 2,
        height: rect.height + SPOTLIGHT_PADDING * 2,
      });
      // Keep the rect fresh when the target itself resizes (e.g. a panel that slides open
      // after the first measure already succeeded on its collapsed state).
      if (el !== observedEl && typeof ResizeObserver !== 'undefined') {
        if (resizeObserver) resizeObserver.disconnect();
        observedEl = el;
        const target = el;
        resizeObserver = new ResizeObserver(() => {
          const fresh = target.getBoundingClientRect();
          if (fresh.width === 0 && fresh.height === 0) return;
          setTargetRect({
            top: fresh.top - SPOTLIGHT_PADDING,
            left: fresh.left - SPOTLIGHT_PADDING,
            width: fresh.width + SPOTLIGHT_PADDING * 2,
            height: fresh.height + SPOTLIGHT_PADDING * 2,
          });
        });
        resizeObserver.observe(target);
      }
      return true;
    };

    const poll = () => {
      if (measure()) return;
      attempts += 1;
      if (attempts < POLL_MAX_ATTEMPTS) {
        frame = requestAnimationFrame(poll);
      } else {
        setTargetRect(null);
      }
    };

    poll();

    const onChange = () => measure();
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
  }, [step, stepIndex, pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [skip]);

  const handleNext = () => {
    if (isLast) {
      complete();
    } else {
      next();
    }
  };

  const tooltipPosition = computeTooltipPosition(step, targetRect);
  const isCenteredOverlay = step.kind !== 'spotlight' || !targetRect;

  return (
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true" aria-label="Onboarding tour">
      {isCenteredOverlay ? (
        <div className="absolute inset-0 bg-black/55" />
      ) : (
        <>
          <div
            className="pointer-events-none absolute rounded-xl transition-all duration-300 ease-out"
            style={{
              top: targetRect!.top,
              left: targetRect!.left,
              width: targetRect!.width,
              height: targetRect!.height,
              boxShadow:
                '0 0 0 3px rgb(var(--brand-500)), 0 0 0 9999px rgba(0,0,0,0.5)',
            }}
          />
          <div
            className="pointer-events-none absolute rounded-xl transition-all duration-300 ease-out tour-pulse"
            style={{
              top: targetRect!.top,
              left: targetRect!.left,
              width: targetRect!.width,
              height: targetRect!.height,
            }}
          />
        </>
      )}

      <div
        className="absolute rounded-2xl border-2 border-ig-border bg-ig-elevated p-3.5 shadow-2xl ring-1 ring-black/10"
        style={tooltipPosition}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-500">
              {stepIndex + 1} / {totalSteps}
            </p>
            <h2 className="mt-1 font-display text-sm font-black leading-tight text-ig-text-primary">
              {step.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={skip}
            className="-mr-1 -mt-1 min-h-8 rounded-full px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ig-text-tertiary transition-colors hover:bg-ig-hover hover:text-ig-text-primary"
            aria-label="Skip tour"
          >
            Skip
          </button>
        </div>
        {step.kind === 'centered' && (step as { illustration?: string }).illustration && (
          <div
            className="mt-2 overflow-hidden rounded-lg border border-ig-border"
            dangerouslySetInnerHTML={{ __html: (step as { illustration: string }).illustration }}
          />
        )}
        <p className="mt-2 text-xs leading-snug text-ig-text-secondary">{step.body}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={prev}
              className="min-h-9 rounded-md px-2 py-1.5 text-xs font-medium text-ig-text-secondary transition-colors hover:text-ig-text-primary"
            >
              Back
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
          <button
            type="button"
            onClick={handleNext}
            className="mw-button-primary inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-4 py-1.5 text-xs"
          >
            {isLast ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
      <style jsx global>{`
        @keyframes tourPulse {
          0% {
            box-shadow:
              0 0 0 0 rgb(var(--brand-500) / 0.55),
              inset 0 0 0 2px rgb(var(--brand-500) / 0.6);
          }
          70% {
            box-shadow:
              0 0 0 14px rgb(var(--brand-500) / 0),
              inset 0 0 0 2px rgb(var(--brand-500) / 0.4);
          }
          100% {
            box-shadow:
              0 0 0 0 rgb(var(--brand-500) / 0),
              inset 0 0 0 2px rgb(var(--brand-500) / 0.6);
          }
        }
        .tour-pulse {
          animation: tourPulse 1.6s ease-out infinite;
        }
        @keyframes onboardHighlight {
          0% { box-shadow: 0 0 0 0 rgb(var(--brand-500) / 0.6); }
          100% { box-shadow: 0 0 0 12px rgb(var(--brand-500) / 0); }
        }
        [data-onboard-highlight] {
          outline: 2px solid rgb(var(--brand-500));
          outline-offset: 4px;
          border-radius: 12px;
          animation: onboardHighlight 700ms ease-out;
          transition: outline-color 200ms;
        }
        @keyframes tourPanelLit {
          0% { box-shadow: 0 0 0 0 rgb(var(--brand-500) / 0.55); outline-color: rgb(var(--brand-500) / 0); }
          30% { box-shadow: 0 0 0 6px rgb(var(--brand-500) / 0.35); outline-color: rgb(var(--brand-500)); }
          100% { box-shadow: 0 0 0 18px rgb(var(--brand-500) / 0); outline-color: rgb(var(--brand-500) / 0); }
        }
        [data-tour-panel-lit] {
          outline: 3px solid rgb(var(--brand-500));
          outline-offset: -1px;
          animation: tourPanelLit 1.5s ease-out;
        }
      `}</style>
    </div>
  );
}

function computeTooltipPosition(step: TourStep, targetRect: Rect | null): CSSProperties {
  if (step.kind === 'welcome' || step.kind === 'centered' || !targetRect) {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  if (typeof window === 'undefined') {
    return { top: 0, left: 0 };
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = 16;
  const tooltipWidth = Math.min(TOOLTIP_WIDTH, viewportWidth - margin * 2);
  const tooltipHeight = TOOLTIP_HEIGHT_ESTIMATE;
  const requested = (step as { placement: string }).placement || 'auto';

  const targetTop = targetRect.top;
  const targetBottom = targetRect.top + targetRect.height;
  const targetLeft = targetRect.left;
  const targetRight = targetRect.left + targetRect.width;
  const spaceTop = targetTop - margin;
  const spaceBottom = viewportHeight - targetBottom - margin;
  const spaceLeft = targetLeft - margin;
  const spaceRight = viewportWidth - targetRight - margin;

  let actual = requested;
  if (requested === 'auto') {
    actual = spaceBottom >= tooltipHeight + TOOLTIP_OFFSET
      ? 'bottom'
      : spaceTop >= tooltipHeight + TOOLTIP_OFFSET
      ? 'top'
      : spaceBottom >= spaceTop
      ? 'bottom'
      : 'top';
  } else if (requested === 'top' && spaceTop < tooltipHeight + TOOLTIP_OFFSET) {
    actual = spaceBottom >= tooltipHeight + TOOLTIP_OFFSET || spaceBottom > spaceTop ? 'bottom' : 'top';
  } else if (requested === 'bottom' && spaceBottom < tooltipHeight + TOOLTIP_OFFSET) {
    actual = spaceTop >= tooltipHeight + TOOLTIP_OFFSET || spaceTop > spaceBottom ? 'top' : 'bottom';
  } else if (requested === 'left' && spaceLeft < tooltipWidth + TOOLTIP_OFFSET) {
    actual = spaceRight >= tooltipWidth + TOOLTIP_OFFSET || spaceRight > spaceLeft ? 'right' : 'left';
  } else if (requested === 'right' && spaceRight < tooltipWidth + TOOLTIP_OFFSET) {
    actual = spaceLeft >= tooltipWidth + TOOLTIP_OFFSET || spaceLeft > spaceRight ? 'left' : 'right';
  }

  let top: number;
  let left: number;
  switch (actual) {
    case 'top':
      top = targetTop - tooltipHeight - TOOLTIP_OFFSET;
      left = targetLeft + targetRect.width / 2 - tooltipWidth / 2;
      break;
    case 'bottom':
      top = targetBottom + TOOLTIP_OFFSET;
      left = targetLeft + targetRect.width / 2 - tooltipWidth / 2;
      break;
    case 'left':
      top = targetTop + targetRect.height / 2 - tooltipHeight / 2;
      left = targetLeft - tooltipWidth - TOOLTIP_OFFSET;
      break;
    case 'right':
      top = targetTop + targetRect.height / 2 - tooltipHeight / 2;
      left = targetRight + TOOLTIP_OFFSET;
      break;
    default:
      top = targetBottom + TOOLTIP_OFFSET;
      left = targetLeft;
  }

  left = Math.max(margin, Math.min(viewportWidth - tooltipWidth - margin, left));

  if (actual === 'top') {
    const maxTop = targetTop - TOOLTIP_OFFSET - tooltipHeight;
    top = Math.max(margin, Math.min(maxTop, top));
  } else if (actual === 'bottom') {
    const minTop = targetBottom + TOOLTIP_OFFSET;
    top = Math.max(minTop, Math.min(viewportHeight - tooltipHeight - margin, top));
  } else if (actual === 'left') {
    left = Math.max(margin, Math.min(targetLeft - tooltipWidth - TOOLTIP_OFFSET, left));
    top = Math.max(margin, Math.min(viewportHeight - tooltipHeight - margin, top));
  } else if (actual === 'right') {
    left = Math.max(targetRight + TOOLTIP_OFFSET, Math.min(viewportWidth - tooltipWidth - margin, left));
    top = Math.max(margin, Math.min(viewportHeight - tooltipHeight - margin, top));
  } else {
    top = Math.max(margin, Math.min(viewportHeight - tooltipHeight - margin, top));
  }

  return { top, left, width: tooltipWidth };
}
