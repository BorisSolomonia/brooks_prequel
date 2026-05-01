// All prices are pinned to GEL because Bank of Georgia iPay only supports GEL.
// `priceMinorUnits` is GEL tetri (1 GEL = 100 tetri).
export function useCurrency() {
  const currency = 'GEL';
  const symbol = '₾';

  function formatAmount(priceMinorUnits: number, decimals = 2): string {
    if (priceMinorUnits <= 0) return 'Free';
    const value = priceMinorUnits / 100;
    return `${symbol}${value.toFixed(decimals)}`;
  }

  return { currency, symbol, rate: 1, formatAmount };
}
