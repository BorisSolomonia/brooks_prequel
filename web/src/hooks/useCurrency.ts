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

// Module-level cache so every component shares one fetch.
let ratesCache: Rates | null = null;
let ratesPromise: Promise<Rates> | null = null;

function loadRates(): Promise<Rates> {
  if (ratesCache) return Promise.resolve(ratesCache);
  if (!ratesPromise) {
    ratesPromise = api
      .get<{ gelPerUnit: Rates }>('/api/fx/rates')
      .then((r) => { ratesCache = r.gelPerUnit || { GEL: 1 }; return ratesCache; })
      .catch(() => { ratesCache = { GEL: 1 }; return ratesCache; });
  }
  return ratesPromise;
}

// Default display currency from the browser locale region: Georgia → GEL, EU → EUR, UK → GBP, else USD.
// (A future enhancement is server-side IP geo; the user can always override via the selector.)
function defaultDisplayCurrency(): string {
  if (typeof navigator === 'undefined') return 'USD';
  try {
    const region = new Intl.Locale(navigator.language).maximize().region || '';
    if (region === 'GE') return 'GEL';
    const EU = ['AT','BE','CY','EE','FI','FR','DE','GR','IE','IT','LV','LT','LU','MT','NL','PT','SK','SI','ES','HR'];
    if (EU.includes(region)) return 'EUR';
    if (region === 'GB') return 'GBP';
  } catch { /* ignore */ }
  return 'USD';
}

export function useCurrency() {
  const [rates, setRates] = useState<Rates | null>(ratesCache);
  const [displayCurrency, setDisplayCurrencyState] = useState<string>('GEL');

  useEffect(() => {
    loadRates().then(setRates);
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    setDisplayCurrencyState(saved && SUPPORTED.includes(saved) ? saved : defaultDisplayCurrency());
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
