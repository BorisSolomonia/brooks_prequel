'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useCurrency } from '@/hooks/useCurrency';
import type { GuideCheckoutSessionResponse } from '@/types';

interface BuyButtonProps {
  guideId: string;
  priceCents: number;
  currency: string;
  salePriceCents?: number | null;
  saleEndsAt?: string | null;
  token: string;
}

export default function BuyButton({ guideId, priceCents, salePriceCents, saleEndsAt, token }: BuyButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { formatAmount } = useCurrency();

  const saleActive = salePriceCents && salePriceCents > 0 &&
    (!saleEndsAt || new Date(saleEndsAt) > new Date());

  const effectivePrice = saleActive ? salePriceCents : priceCents;

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
    <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
      <button
        onClick={handleBuy}
        disabled={loading}
        className="min-h-11 flex-1 rounded-lg bg-ig-blue px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ig-blue-hover disabled:opacity-50 sm:flex-none"
      >
        {loading ? 'Processing...' : effectivePrice === 0 ? 'Get Guide Free' : `Buy for ${formatAmount(effectivePrice)}`}
      </button>
      {saleActive && (
        <span className="text-sm text-ig-text-tertiary line-through">
          {formatAmount(priceCents)}
        </span>
      )}
    </div>
  );
}
