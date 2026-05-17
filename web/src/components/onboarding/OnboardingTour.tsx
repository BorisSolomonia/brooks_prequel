'use client';

import { useEffect, useRef, useState, CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { tourSteps, type TourStep } from './tourSteps';
import { useOnboarding } from './OnboardingProvider';

type Rect = { top: number; left: number; width: number; height: number };

const SPOTLIGHT_PADDING = 10;
const TOOLTIP_OFFSET = 14;
const TOOLTIP_WIDTH = 280;
const TOOLTIP_HEIGHT_ESTIMATE = 180;
// 5 s ceiling (was 2 s) — paired with MutationObserver fast-path + visible "Locating…"
// hint, so a longer ceiling no longer translates to longer perceived freeze.
const POLL_MAX_ATTEMPTS = 300;
// How long the spotlight effect waits before showing the "Locating…" hint.
const LOCATING_HINT_DELAY_MS = 350;
// Safety net for `isAdvancing` — if the next step never mounts, release the button.
const ADVANCE_SAFETY_TIMEOUT_MS = 4000;

export default function OnboardingTour({ stepIndex }: { stepIndex: number }) {
  const step = tourSteps[stepIndex];
  const { next, prev, skip, complete, totalSteps, sampleCreatorUsername } = useOnboarding();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [showLocating, setShowLocating] = useState(false);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLast = stepIndex === totalSteps - 1;

  // Release the Next button spinner as soon as the new step renders. Cleanup also
  // runs on unmount (tour close), so this single effect covers both reset paths.
  useEffect(() => {
    setIsAdvancing(false);
    return () => {
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
    };
  }, [stepIndex]);

  // Also release the spinner the moment the spotlight finds its anchor — covers the
  // case where stepIndex doesn't change but the new step's element finally mounts.
  useEffect(() => {
    if (targetRect) setIsAdvancing(false);
  }, [targetRect]);

  useEffect(() => {
    if (!('route' in step) || !step.route) return;
    const [targetPath, targetQuery = ''] = step.route.split('?');
    const currentQuery = searchParams.toString();
    // Push if pathname differs OR if the target has a specific query that doesn't match
    // (e.g. /profile?tab=ai-keys needs to switch tabs even when already on /profile).
    if (pathname !== targetPath || (targetQuery && currentQuery !== targetQuery)) {
      router.push(step.route);
    }
  }, [step, pathname, router, searchParams]);

  useEffect(() => {
    if (step.kind === 'welcome') return;
    const sideEffect = (step as { sideEffect?: { kind: string; selector?: string; ms?: number } }).sideEffect;
    if (!sideEffect) return;
    if (sideEffect.kind === 'discoverCreator') {
      let cancelled = false;
      const template = (sideEffect as { route?: string }).route ?? '/creators/{username}';

      const navigateTo = (username: string) => {
        if (cancelled) return;
        const destination = template.replace('{username}', encodeURIComponent(username));
        const destinationPath = destination.split('?')[0];
        if (pathname !== destinationPath) {
          router.push(destination);
        }
      };

      // Cache hit: navigate immediately, eliminating the per-step network wait that was
      // the dominant cause of the "freeze" on the sample-creator steps.
      if (sampleCreatorUsername) {
        navigateTo(sampleCreatorUsername);
        return () => {
          cancelled = true;
        };
      }

      (async () => {
        try {
          const res = await fetch('/api/tour/sample-creator');
          if (!res.ok) return;
          const data = (await res.json()) as { username?: string };
          if (cancelled || !data?.username) return;
          navigateTo(data.username);
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
    // sampleCreatorUsername is intentionally in deps so a prefetch that resolves
    // after this step entered will re-fire the effect and use the cache.
    // pathname/router are intentionally NOT in deps — re-firing on every navigation
    // would cause repeat clicks / fetches; the closure capture at step-entry is correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, sampleCreatorUsername]);

  useEffect(() => {
    // Clear any prior rect synchronously so the spotlight never briefly highlights an element
    // on the previous page during navigation.
    setTargetRect(null);
    setShowLocating(false);
    if (step.kind !== 'spotlight') return;

    let frame: number | null = null;
    let attempts = 0;
    let scrolled = false;
    let observedEl: HTMLElement | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let mutationPending = false;
    let found = false;

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
      // Found it — stop the rAF poll and the mutation observer to spare CPU.
      // Mapbox mutates the DOM dozens of times per second on /maps; an idle
      // MutationObserver here would be a perf catastrophe.
      found = true;
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
      }
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
      }
    };

    // Event-driven fast path: the moment the DOM gains the selector's element
    // (a route just mounted, a panel just opened), measure() succeeds instantly
    // instead of waiting for the next rAF tick. Throttled to one call per frame
    // because /maps mutates constantly — we coalesce a burst into one measure.
    if (typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(() => {
        if (found || mutationPending) return;
        mutationPending = true;
        requestAnimationFrame(() => {
          mutationPending = false;
          if (!found) measure();
        });
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    poll();

    // Show a subtle "Locating…" hint if we still don't have a rect after the delay.
    const locatingTimer = setTimeout(() => {
      if (!found) setShowLocating(true);
    }, LOCATING_HINT_DELAY_MS);

    const onChange = () => measure();
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      if (resizeObserver) resizeObserver.disconnect();
      if (mutationObserver) mutationObserver.disconnect();
      clearTimeout(locatingTimer);
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
    if (isAdvancing) return; // multi-click guard
    // flushSync forces React to paint the spinner in the SAME frame as the click
    // instead of batching it with the navigation work. Without this the user can
    // see ~100 ms of dead time between click and spinner on slow Android devices.
    flushSync(() => {
      setIsAdvancing(true);
    });
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    safetyTimerRef.current = setTimeout(() => {
      setIsAdvancing(false);
      safetyTimerRef.current = null;
    }, ADVANCE_SAFETY_TIMEOUT_MS);
    if (isLast) {
      complete();
    } else {
      next();
    }
  };

  const tooltipPosition = computeTooltipPosition(step, targetRect);
  // Targets that take up half the viewport or more make edge-anchored
  // tooltips unreadable — the tooltip ends up overlapping the highlighted
  // area, or clipped at a screen edge. Fall back to centered overlay AND
  // suppress the spotlight cutout. Threshold lowered from 80% → 50% to
  // catch composers, drawers, and other large surfaces.
  const isLargeTarget = !!targetRect && typeof window !== 'undefined' &&
    (targetRect.width * targetRect.height) >= 0.5 * (window.innerWidth * window.innerHeight);
  const isCenteredOverlay = step.kind !== 'spotlight' || !targetRect || isLargeTarget;

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
        style={{
          ...tooltipPosition,
          // Always clamp so the tooltip is fully visible regardless of which
          // mode (centered or anchored) was chosen. Without these caps a
          // long body or narrow viewport can push the tooltip off-screen.
          // safe-area-inset handles Pixel 3-button nav + iPhone notch.
          maxWidth: 'min(280px, calc(100vw - 32px))',
          maxHeight: 'calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 32px)',
          overflowY: 'auto',
        }}
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
        {showLocating && !targetRect && step.kind === 'spotlight' && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ig-text-tertiary" aria-live="polite">
            <span className="tour-spinner h-2.5 w-2.5" aria-hidden="true" />
            Locating…
          </p>
        )}
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
            aria-disabled={isAdvancing}
            aria-busy={isAdvancing}
            className="mw-button-primary inline-flex min-h-9 min-w-[96px] items-center justify-center gap-2 rounded-md px-4 py-1.5 text-xs"
          >
            {isAdvancing ? (
              <>
                <span className="tour-spinner h-4 w-4" aria-hidden="true" />
                <span>Loading…</span>
              </>
            ) : (
              <>{isLast ? 'Got it' : 'Next'}</>
            )}
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
        @keyframes tourSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .tour-spinner {
          display: inline-block;
          border-radius: 9999px;
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-top-color: currentColor;
          animation: tourSpin 600ms linear infinite;
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

