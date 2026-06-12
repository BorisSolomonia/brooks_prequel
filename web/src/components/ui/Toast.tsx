'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

// Material-3-style Snackbar pattern adapted to Brooks's parchment palette.
// One toast at a time (queued if multiple fire); slides up from the bottom
// edge of the viewport, respects safe-area-inset-bottom, auto-dismisses, tap
// to dismiss early. Used everywhere we previously called window.alert() —
// alert() blocks the JS thread and is visually jarring on mobile.

type ToastKind = 'info' | 'error' | 'success';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
  ttlMs: number;
}

interface ToastContextValue {
  show: (message: string, kind?: ToastKind, ttlMs?: number) => void;
  info: (message: string, ttlMs?: number) => void;
  error: (message: string, ttlMs?: number) => void;
  success: (message: string, ttlMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_TTL_MS = 4000;
const ERROR_TTL_MS = 6000;

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback((id: number) => {
    setQueue((q) => q.filter((t) => t.id !== id));
  }, []);

  // Auto-dismiss the head of queue. Re-arms whenever the head changes.
  useEffect(() => {
    if (queue.length === 0) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      return;
    }
    const head = queue[0];
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => dismiss(head.id), head.ttlMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [queue, dismiss]);

  const show = useCallback((message: string, kind: ToastKind = 'info', ttlMs?: number) => {
    const item: ToastItem = {
      id: nextId++,
      message,
      kind,
      ttlMs: ttlMs ?? (kind === 'error' ? ERROR_TTL_MS : DEFAULT_TTL_MS),
    };
    setQueue((q) => [...q, item]);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      info: (m, ttl) => show(m, 'info', ttl),
      error: (m, ttl) => show(m, 'error', ttl),
      success: (m, ttl) => show(m, 'success', ttl),
    }),
    [show],
  );

  const head = queue[0];

  return (
    <ToastContext.Provider value={value}>
      {children}
      {head ? <ToastSurface item={head} onDismiss={() => dismiss(head.id)} /> : null}
    </ToastContext.Provider>
  );
}

function ToastSurface({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const { t } = useTranslation();
  const palette = paletteFor(item.kind);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[100] flex justify-center px-3"
      style={{
        // Above the bottom-tab mobile nav (~64px) + safe-area inset.
        bottom: 'calc(5rem + env(safe-area-inset-bottom))',
      }}
    >
      <button
        type="button"
        onClick={onDismiss}
        className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border-2 px-4 py-3 text-sm font-medium shadow-[0_12px_32px_rgba(15,23,42,0.18)] transition-transform ${palette.surface} ${palette.text} ${palette.border}`}
        style={{
          // Slide-up animation. Pure CSS — no extra dep.
          animation: 'mw-toast-in 200ms ease-out',
        }}
      >
        <span className="flex-1 text-left leading-5">{item.message}</span>
        <span className={`text-xs uppercase tracking-wide ${palette.dismiss}`}>{t('common.actions.dismiss')}</span>
      </button>
      <style jsx global>{`
        @keyframes mw-toast-in {
          from {
            transform: translateY(24px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

function paletteFor(kind: ToastKind) {
  switch (kind) {
    case 'error':
      return {
        surface: 'bg-ig-elevated',
        text: 'text-ig-error',
        border: 'border-ig-error/60',
        dismiss: 'text-ig-error/70',
      };
    case 'success':
      return {
        surface: 'bg-ig-elevated',
        text: 'text-ig-text-primary',
        border: 'border-ig-success/60',
        dismiss: 'text-ig-text-tertiary',
      };
    default:
      return {
        surface: 'bg-ig-elevated',
        text: 'text-ig-text-primary',
        border: 'border-ig-border',
        dismiss: 'text-ig-text-tertiary',
      };
  }
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Defensive: returning no-ops here means a component that calls toast
    // outside the provider (unusual) won't crash; messages are silently
    // dropped instead.
    return {
      show: () => {},
      info: () => {},
      error: () => {},
      success: () => {},
    };
  }
  return ctx;
}
