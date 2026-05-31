'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

// Multi-currency display. A guide's price is stored in its BASE currency (creator-set, e.g. USD);
// buyers SEE it converted to their display currency, but are always CHARGED in GEL at checkout
// (handled server-side). This hook does DISPLAY-ONLY conversion using NBG mid rates from /api/fx/rates.

type Rates = Record<string, number>; // GEL per 1 unit of currency (GEL = 1)

const SYMBOLS: Record<string, string> = { GEL: '₾', USD: '$', EUR: '€', GBP: '£' };
const SUPPORTED = ['GEL', 'USD', 'EUR', 'GBP'];
const STORAGE_KEY = 'brooks.displayCurrency';

type FxResponse = { gelPerUnit: Rates; suggestedCurrency: string | null };

// Module-level cache so every component shares one fetch.
let fxCache: FxResponse | null = null;
let fxPromise: Promise<FxResponse> | null = null;

function loadFx(): Promise<FxResponse> {
  if (fxCache) return Promise.resolve(fxCache);
  if (!fxPromise) {
    fxPromise = api
      .get<{ gelPerUnit: Rates; suggestedCurrency?: string | null }>('/api/fx/rates')
      .then((r) => { fxCache = { gelPerUnit: r.gelPerUnit || { GEL: 1 }, suggestedCurrency: r.suggestedCurrency ?? null }; return fxCache; })
      .catch(() => { fxCache = { gelPerUnit: { GEL: 1 }, suggestedCurrency: null }; return fxCache; });
  }
  return fxPromise;
}

// LOCATION (not language) based default. Timezone is a strong proxy for physical location: a device
// in Georgia is Asia/Tbilisi regardless of its UI language — which is exactly why locale-based
// detection was wrong (a Georgian phone set to English reported US → USD). The server's IP-country
// suggestion (when present) takes priority over this.
function timezoneCurrency(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz === 'Asia/Tbilisi') return 'GEL';
    if (tz === 'Europe/London') return 'GBP';
    if (tz.startsWith('Europe/')) return 'EUR';
  } catch { /* ignore */ }
  return null;
}

function clientDefaultCurrency(): string {
  return timezoneCurrency() ?? 'USD';
}

export function useCurrency() {
  const [rates, setRates] = useState<Rates | null>(fxCache?.gelPerUnit ?? null);
  const [displayCurrency, setDisplayCurrencyState] = useState<string>('GEL');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    const hasSaved = !!(saved && SUPPORTED.includes(saved));
    // Set an immediate best-guess (timezone) so the UI isn't blank…
    setDisplayCurrencyState(hasSaved ? saved! : clientDefaultCurrency());
    // …then let the server's IP-country suggestion win (unless the user has manually chosen).
    loadFx().then((fx) => {
      setRates(fx.gelPerUnit);
      if (!hasSaved && fx.suggestedCurrency && SUPPORTED.includes(fx.suggestedCurrency)) {
        setDisplayCurrencyState(fx.suggestedCurrency);
      }
    });
  }, []);

  const setDisplayCurrency = useCallback((ccy: string) => {
    if (!SUPPORTED.includes(ccy)) return;
    setDisplayCurrencyState(ccy);
    try { window.localStorage.setItem(STORAGE_KEY, ccy); } catch { /* ignore */ }
  }, []);

  // Convert `minorUnits` of `from` into `to` (minor units) using GEL cross rates.
  const convert = useCallback((minorUnits: number, from: string, to: string): number => {
    if (from === to) return minorUnits;
    const r = rates || { GEL: 1 };
    const gp = (c: string) => r[c] ?? (c === 'GEL' ? 1 : NaN);
    const fromR = gp(from), toR = gp(to);
    if (!isFinite(fromR) || !isFinite(toR) || toR === 0) return minorUnits; // rates not ready → no convert
    return Math.round((minorUnits * fromR) / toR);
  }, [rates]);

  const fmt = (minorUnits: number, currency: string) => {
    const sym = SYMBOLS[currency] ?? `${currency} `;
    return `${sym}${(minorUnits / 100).toFixed(2)}`;
  };

  /**
   * Format a price for display.
   * - `formatAmount(minor)` → shows the amount in GEL as-is (use for already-charged GEL amounts,
   *   e.g. receipts/purchase history — do NOT convert facts).
   * - `formatAmount(minor, baseCurrency)` → converts the guide's BASE-currency price into the buyer's
   *   selected display currency (use for guide prices). Falls back to the base currency if rates
   *   aren't loaded yet.
   */
  const formatAmount = useCallback((minorUnits: number, baseCurrency?: string): string => {
    if (minorUnits <= 0) return 'Free';
    if (!baseCurrency) return fmt(minorUnits, 'GEL');
    const base = baseCurrency.toUpperCase();
    if (!rates) return fmt(minorUnits, base); // not loaded → show base currency
    return fmt(convert(minorUnits, base, displayCurrency), displayCurrency);
  }, [rates, displayCurrency, convert]);

  return {
    currency: displayCurrency,
    symbol: SYMBOLS[displayCurrency] ?? displayCurrency,
    supported: SUPPORTED,
    displayCurrency,
    setDisplayCurrency,
    formatAmount,
    // Format an amount in a specific currency without conversion (e.g. the exact GEL charged).
    formatInCurrency: (minor: number, ccy: string) => (minor <= 0 ? 'Free' : fmt(minor, ccy)),
  };
}
