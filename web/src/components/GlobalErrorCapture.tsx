'use client';

import { useEffect } from 'react';

type CapturedError = {
  ts: string;
  source: 'error' | 'unhandledrejection';
  message: string;
  stack?: string;
};

declare global {
  interface Window {
    __brooksErrors?: CapturedError[];
  }
}

function normalizeReason(reason: unknown): { message: string; stack?: string } {
  if (reason instanceof Error) {
    return { message: reason.message, stack: reason.stack };
  }
  if (typeof reason === 'string') {
    return { message: reason };
  }
  try {
    return { message: JSON.stringify(reason) };
  } catch {
    return { message: String(reason) };
  }
}

function record(source: CapturedError['source'], reason: unknown) {
  const normalized = normalizeReason(reason);
  const entry: CapturedError = {
    ts: new Date().toISOString(),
    source,
    message: normalized.message,
    stack: normalized.stack,
  };
  window.__brooksErrors = window.__brooksErrors ?? [];
  window.__brooksErrors.push(entry);
  if (window.__brooksErrors.length > 20) {
    window.__brooksErrors.splice(0, window.__brooksErrors.length - 20);
  }
  console.error(`[Brooks] global ${source}:`, normalized.message, normalized.stack ?? '');
}

export default function GlobalErrorCapture() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      record('error', event.error ?? event.message);
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      record('unhandledrejection', event.reason);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
