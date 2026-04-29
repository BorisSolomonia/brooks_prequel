import { useState, useEffect } from 'react';

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(name + '='))
    ?.split('=')[1];
}

export function useCurrency() {
  const [currency, setCurrency] = useState('USD');
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const detected = getCookie('display-currency') ?? 'USD';
    setCurrency(detected);
    if (detected === 'USD') return;

    fetch(`/api/exchange-rates?currency=${detected}`)
      .then((r) => r.json())
      .then((d: { rate?: number }) => {
        if (typeof d.rate === 'number' && d.rate > 0) setRate(d.rate);
      })
      .catch(() => {});
  }, []);

  const symbol = currency === 'GEL' ? '₾' : currency === 'EUR' ? '€' : '$';

  function formatAmount(usdCents: number, decimals = 2): string {
    if (usdCents <= 0) return 'Free';
    const converted = (usdCents / 100) * rate;
    return `${symbol}${converted.toFixed(decimals)}`;
  }

  return { currency, symbol, rate, formatAmount };
}
