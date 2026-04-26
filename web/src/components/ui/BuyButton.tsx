'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { GuideCheckoutSessionResponse } from '@/types';

interface BuyButtonProps {
  guideId: string;
  priceCents: number;
  currency: string;
  salePriceCents?: number | null;
  saleEndsAt?: string | null;
  token: string;
}

export default function BuyButton({ guideId, priceCents, currency, salePriceCents, saleEndsAt, token }: BuyButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const saleActive = salePriceCents && salePriceCents > 0 &&
    (!saleEndsAt || new Date(saleEndsAt) > new Date());

  const effectivePrice = saleActive ? salePriceCents : priceCents;
  const symbol = currency === 'USD' ? '$' : currency;

  const handleBuy = async () => {
    setLoading(true);
    try {
      const res = await api.post<GuideCheckoutSessionResponse>(
        `/api/guides/${guideId}/checkout`,
        undefined,
        token
      );
      if (res.tripId) {
        router.push(`/trips/${res.tripId}`);
      } else if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Checkout failed';
      alert(message);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={handleBuy}
        disabled={loading}
        className="min-h-11 rounded-lg bg-ig-blue px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ig-blue-hover disabled:opacity-50"
      >
        {loading ? 'Processing...' : effectivePrice === 0 ? 'Get Guide Free' : `Buy for ${symbol}${(effectivePrice / 100).toFixed(2)}`}
      </button>
      {saleActive && (
        <span className="text-sm text-ig-text-tertiary line-through">
          {symbol}{(priceCents / 100).toFixed(2)}
        </span>
      )}
    </div>
  );
}
