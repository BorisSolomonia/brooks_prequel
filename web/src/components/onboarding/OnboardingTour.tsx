'use client';

import { useEffect, useState, CSSProperties } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { tourSteps, type TourStep } from './tourSteps';
import { useOnboarding } from './OnboardingProvider';

type Rect = { top: number; left: number; width: number; height: number };

const SPOTLIGHT_PADDING = 8;
const TOOLTIP_OFFSET = 16;
const TOOLTIP_WIDTH = 384;
const TOOLTIP_HEIGHT_ESTIMATE = 240;
const POLL_MAX_ATTEMPTS = 45;

export default function OnboardingTour({ stepIndex }: { stepIndex: number }) {
  const step = tourSteps[stepIndex];
  const { next, prev, skip, complete, totalSteps } = useOnboarding();
  const router = useRouter();
  const pathname = usePathname();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const isLast = stepIndex === totalSteps - 1;

  useEffect(() => {
    if ('route' in step && step.route && pathname !== step.route) {
      router.push(step.route);
    }
  }, [step, pathname, router]);

  useEffect(() => {
    if (step.kind !== 'spotlight') {
      setTargetRect(null);
      return;
    }

    let frame: number | null = null;
    let attempts = 0;

    const measure = () => {
      const candidates = document.querySelectorAll(step.selector);
      let rect: DOMRect | null = null;
      for (const candidate of Array.from(candidates) as HTMLElement[]) {
        const candidateRect = candidate.getBoundingClientRect();
        if (candidateRect.width > 0 || candidateRect.height > 0) {
          rect = candidateRect;
          break;
        }
      }
      if (!rect) return false;
      setTargetRect({
        top: rect.top - SPOTLIGHT_PADDING,
        left: rect.left - SPOTLIGHT_PADDING,
        width: rect.width + SPOTLIGHT_PADDING * 2,
        height: rect.height + SPOTLIGHT_PADDING * 2,
      });
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
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
  }, [step, stepIndex]);

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
        <div className="absolute inset-0 bg-black/65" />
      ) : (
        <div
          className="pointer-events-none absolute rounded-md transition-all duration-300 ease-out"
          style={{
            top: targetRect!.top,
            left: targetRect!.left,
            width: targetRect!.width,
            height: targetRect!.height,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
          }}
        />
      )}

      <div
        className="absolute w-[calc(100vw-32px)] max-w-sm rounded-2xl border-2 border-ig-border bg-ig-elevated p-5 shadow-2xl"
        style={tooltipPosition}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500">
              Step {stepIndex + 1} of {totalSteps}
            </p>
            <h2 className="mt-2 font-display text-lg font-black text-ig-text-primary">
              {step.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={skip}
            className="-mr-2 -mt-2 min-h-9 rounded-full px-3 text-xs font-semibold uppercase tracking-[0.12em] text-ig-text-tertiary transition-colors hover:bg-ig-hover hover:text-ig-text-primary"
            aria-label="Skip tour"
          >
            Skip
          </button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ig-text-secondary">{step.body}</p>
        <div className="mt-5 flex items-center justify-between gap-3">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={prev}
              className="min-h-11 rounded-md px-3 py-2 text-sm font-medium text-ig-text-secondary transition-colors hover:text-ig-text-primary"
            >
              Back
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
          <button
            type="button"
            onClick={handleNext}
            className="mw-button-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-2 text-sm"
          >
            {isLast ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
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
