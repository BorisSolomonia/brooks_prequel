'use client';

import { Component, type ReactNode } from 'react';

// Catches any unhandled render-time error from the React tree and shows a
// fallback UI with a Reload button. Without this, an unhandled error in
// initial render kills the WebView page on Android Capacitor — which
// surfaces to the user as "app turned off on first launch". The second
// launch tends to work because the JS bundle is cached and re-init paths
// run from a warmer state.

const RELOAD_KEY = 'brooks.errorReloads';
const RELOAD_LIMIT = 2;

type Props = { children: ReactNode };
type State = { error: Error | null; reloadCount: number };

export default class RootErrorBoundary extends Component<Props, State> {
  state: State = {
    error: null,
    reloadCount:
      typeof window !== 'undefined'
        ? Number(window.sessionStorage.getItem(RELOAD_KEY) ?? '0')
        : 0,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // Logged so adb logcat / Chrome DevTools can capture the trace. Also
    // pushed to a global array so anyone with adb access can grep it from
    // production builds without DevTools attached.
    console.error('[Brooks] root render error:', error, info.componentStack);
    if (typeof window !== 'undefined') {
      const w = window as unknown as { __brooksErrors?: unknown[] };
      w.__brooksErrors = w.__brooksErrors ?? [];
      w.__brooksErrors.push({
        ts: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
      });
    }
  }

  handleReload = () => {
    if (typeof window === 'undefined') return;
    const next = this.state.reloadCount + 1;
    window.sessionStorage.setItem(RELOAD_KEY, String(next));
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    // Reload-loop guard: if the same render keeps crashing, stop offering
    // Reload (an infinite reload loop is worse than a clear "broken" state).
    const stuck = this.state.reloadCount >= RELOAD_LIMIT;
    return (
      <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-4 bg-ig-primary p-6 text-center">
        <h1 className="font-display text-lg font-black text-ig-text-primary">
          {stuck ? 'The app keeps crashing' : 'Something went wrong'}
        </h1>
        <p className="max-w-xs text-sm text-ig-text-secondary">
          {stuck
            ? 'Please uninstall and reinstall, or contact support if this persists.'
            : 'The app hit an unexpected error. Reloading usually fixes it.'}
        </p>
        {!stuck && (
          <button
            type="button"
            onClick={this.handleReload}
            className="mw-button-primary min-h-11 rounded-lg px-6 py-2.5 text-sm"
          >
            Reload
          </button>
        )}
        <details className="mt-2 max-w-xs text-left text-[10px] text-ig-text-tertiary">
          <summary className="cursor-pointer">Technical details</summary>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap break-all">
            {this.state.error.message}
          </pre>
        </details>
      </div>
    );
  }
}
