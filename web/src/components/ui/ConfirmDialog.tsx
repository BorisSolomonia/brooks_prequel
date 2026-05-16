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

// Replaces window.confirm() — a blocking, jarring browser modal that ignores
// the app's design language. This renders as a bottom-sheet on mobile and a
// centered card on desktop, with parchment-brand styling and 44pt buttons.
// Returns a Promise<boolean> so callers can await the user's choice exactly
// like they did with the native confirm.

interface ConfirmRequest {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmContextValue {
  confirm: (req: ConfirmRequest) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

interface ActiveRequest extends ConfirmRequest {
  resolve: (v: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveRequest | null>(null);

  const confirm = useCallback((req: ConfirmRequest) => {
    return new Promise<boolean>((resolve) => {
      setActive({ ...req, resolve });
    });
  }, []);

  const handleChoice = useCallback(
    (choice: boolean) => {
      if (!active) return;
      active.resolve(choice);
      setActive(null);
    },
    [active],
  );

  const value = useMemo<ConfirmContextValue>(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {active ? <ConfirmSurface req={active} onChoice={handleChoice} /> : null}
    </ConfirmContext.Provider>
  );
}

function ConfirmSurface({
  req,
  onChoice,
}: {
  req: ActiveRequest;
  onChoice: (choice: boolean) => void;
}) {
  const titleId = `confirm-title-${useId()}`;
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus the cancel button by default — safest option for destructive actions.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  // ESC dismisses (treats as cancel). Captures at window so the dialog can
  // intercept even if focus is elsewhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onChoice(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onChoice]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[110] flex items-end justify-center md:items-center"
    >
      {/* Backdrop — tap to dismiss (cancel). */}
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => onChoice(false)}
      />
      {/* Sheet / card. Bottom-sheet on mobile, centered card on md+. */}
      <div
        className="relative w-full max-w-md rounded-t-3xl border-2 border-ig-border bg-ig-elevated p-5 shadow-[0_-12px_32px_rgba(15,23,42,0.18)] md:rounded-3xl"
        style={{
          paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
          animation: 'mw-sheet-in 220ms ease-out',
        }}
      >
        {/* Drag handle (visual only on mobile). */}
        <div className="mx-auto mb-3 block h-1.5 w-12 rounded-full bg-ig-border md:hidden" />
        <h2 id={titleId} className="text-base font-semibold text-ig-text-primary">
          {req.title}
        </h2>
        {req.body ? (
          <p className="mt-2 text-sm leading-5 text-ig-text-secondary">{req.body}</p>
        ) : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => onChoice(false)}
            className="mw-button-secondary inline-flex min-h-touch items-center justify-center rounded-2xl px-5 text-sm font-semibold text-ig-text-primary"
          >
            {req.cancelLabel ?? 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => onChoice(true)}
            className={`inline-flex min-h-touch items-center justify-center rounded-2xl px-5 text-sm font-semibold transition ${
              req.destructive
                ? 'bg-ig-error text-white hover:opacity-90'
                : 'bg-brand-500 text-white hover:bg-brand-600'
            }`}
          >
            {req.confirmLabel ?? (req.destructive ? 'Delete' : 'Confirm')}
          </button>
        </div>
      </div>
      <style jsx global>{`
        @keyframes mw-sheet-in {
          from {
            transform: translateY(40px);
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

// Tiny id hook for aria-labelledby. React 18 has useId() built in.
function useId(): string {
  return useMemo(() => Math.random().toString(36).slice(2, 9), []);
}

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Defensive fallback: if no provider, fall back to native window.confirm
    // synchronously so calling code still gets a boolean (sync wrapped in
    // resolved Promise).
    return {
      confirm: async (req) =>
        typeof window !== 'undefined' && window.confirm(`${req.title}${req.body ? `\n\n${req.body}` : ''}`),
    };
  }
  return ctx;
}
