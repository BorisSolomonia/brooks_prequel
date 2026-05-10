'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useCurrency } from '@/hooks/useCurrency';
import Spinner from '@/components/ui/Spinner';
import type { GuideCheckoutSessionResponse } from '@/types';

interface BuyButtonProps {
  guideId: string;
  priceCents: number;
  currency: string;
  salePriceCents?: number | null;
  saleEndsAt?: string | null;
  token: string;
}

interface PaidCheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
}

export default function BuyButton({ guideId, priceCents, salePriceCents, saleEndsAt, token }: BuyButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { formatAmount } = useCurrency();

  const saleActive = salePriceCents && salePriceCents > 0 &&
    (!saleEndsAt || new Date(saleEndsAt) > new Date());

  const effectivePrice = saleActive ? salePriceCents : priceCents;
  const isFree = effectivePrice === 0;

  const handleBuy = async () => {
    if (!acceptedTerms) return;
    setLoading(true);
    try {
      if (isFree) {
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
      } else {
        const res = await api.post<PaidCheckoutResponse>(
          `/api/purchases/checkout`,
          { guideId, acceptedTerms: true },
          token
        );
        if (res.checkoutUrl) {
          window.location.href = res.checkoutUrl;
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Checkout failed';
      alert(message);
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto">
      <label className="flex items-start gap-2 text-xs text-ig-text-secondary">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="mt-0.5 h-4 w-4 cursor-pointer"
        />
        <span>
          I agree to the{' '}
          <Link href="/terms" target="_blank" rel="noreferrer" className="text-brand-500 underline hover:text-brand-400">Terms</Link>
          ,{' '}
          <Link href="/privacy" target="_blank" rel="noreferrer" className="text-brand-500 underline hover:text-brand-400">Privacy Policy</Link>
          , and{' '}
          <Link href="/refund" target="_blank" rel="noreferrer" className="text-brand-500 underline hover:text-brand-400">Refund Policy</Link>
          .
        </span>
      </label>
      <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
        <button
          onClick={handleBuy}
          disabled={loading || !acceptedTerms}
          className="mw-button-primary inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm disabled:opacity-50 sm:flex-none"
        >
          {loading && <Spinner />}
          {loading ? 'Processing...' : isFree ? 'Get Guide Free' : `Buy for ${formatAmount(effectivePrice)}`}
        </button>
        {saleActive && (
          <span className="text-sm text-ig-text-tertiary line-through">
            {formatAmount(priceCents)}
          </span>
        )}
      </div>
    </div>
  );
}
