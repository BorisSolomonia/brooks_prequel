'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslation, Trans } from 'react-i18next';
import { api } from '@/lib/api';
import { compliance } from '@/lib/compliance';
import { useAccessToken } from '@/hooks/useAccessToken';
import { useToast } from '@/components/ui/Toast';
import Spinner from '@/components/ui/Spinner';
import type { PurchaseResponse } from '@/types';

interface PaidCheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
}

export default function PurchaseFailedPage() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16 text-center text-ig-text-tertiary">{t('account.purchaseFailed.loading')}</div>}>
      <PurchaseFailedInner />
    </Suspense>
  );
}

function PurchaseFailedInner() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const shopOrderId = searchParams.get('shop_order_id');
  const { token } = useAccessToken();
  const toast = useToast();

  // BOR-46: resolve the guide the failed payment was for, so "Retry payment" can
  // re-initiate checkout for that exact guide without the user searching again.
  const [purchase, setPurchase] = useState<PurchaseResponse | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!token || !shopOrderId) return;
    let cancelled = false;
    api.get<PurchaseResponse>(`/api/me/purchases/by-shop-order/${encodeURIComponent(shopOrderId)}`, token)
      .then((p) => { if (!cancelled) setPurchase(p); })
      .catch(() => { /* no guide context → fall back to "Browse guides" only */ });
    return () => { cancelled = true; };
  }, [token, shopOrderId]);

  const handleRetry = async () => {
    if (!purchase?.guideId || !token) return;
    setRetrying(true);
    try {
      // Same initiation the Buy button uses — creates a fresh BOG order and
      // redirects to the iPay checkout for this exact guide.
      const res = await api.post<PaidCheckoutResponse>(
        '/api/purchases/checkout',
        { guideId: purchase.guideId, acceptedTerms: true },
        token,
      );
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        throw new Error(t('account.purchaseFailed.errorStartCheckout'));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('account.purchaseFailed.errorRestartCheckout'));
      setRetrying(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border border-ig-border bg-ig-elevated p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ig-error/15">
          <svg className="h-6 w-6 text-ig-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="mw-section-title text-2xl">{t('account.purchaseFailed.title')}</h1>
        <p className="mt-2 text-sm text-ig-text-secondary">
          {t('account.purchaseFailed.body')}
        </p>
        {purchase?.guideTitle && (
          <p className="mt-3 text-sm font-semibold text-ig-text-primary">{purchase.guideTitle}</p>
        )}
        {shopOrderId && (
          <p className="mt-4 text-xs text-ig-text-tertiary">{t('account.purchaseFailed.reference', { id: shopOrderId })}</p>
        )}
        <div className="mt-6 flex flex-col gap-3">
          {purchase?.guideId && (
            <>
              <button
                type="button"
                onClick={handleRetry}
                disabled={retrying}
                className="mw-button-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm disabled:opacity-50"
              >
                {retrying && <Spinner />}
                {retrying ? t('account.purchaseFailed.startingCheckout') : t('account.purchaseFailed.retryPayment')}
              </button>
              <p className="text-[11px] text-ig-text-tertiary">
                <Trans
                  i18nKey="account.purchaseFailed.retryDisclaimer"
                  components={{
                    terms: <Link href="/terms" target="_blank" rel="noreferrer" className="text-brand-500 underline hover:text-brand-400" />,
                    refund: <Link href="/refund" target="_blank" rel="noreferrer" className="text-brand-500 underline hover:text-brand-400" />,
                  }}
                />
              </p>
            </>
          )}
          <Link
            href={purchase?.guideId ? `/guides/${purchase.guideId}/view` : '/search'}
            className={`${purchase?.guideId ? 'mw-button-secondary' : 'mw-button-primary'} inline-block min-h-11 rounded-lg px-6 py-2.5 text-sm`}
          >
            {purchase?.guideId ? t('account.purchaseFailed.backToGuide') : t('account.purchaseFailed.browseGuides')}
          </Link>
          <a
            href={`mailto:${compliance.email}?subject=Payment%20issue%20${encodeURIComponent(shopOrderId || '')}`}
            className="text-xs text-brand-500 hover:text-brand-400"
          >
            {t('account.purchaseFailed.contactEmail', { email: compliance.email })}
          </a>
        </div>
      </div>
    </div>
  );
}
