'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { compliance } from '@/lib/compliance';
import { useAccessToken } from '@/hooks/useAccessToken';
import { useCurrency } from '@/hooks/useCurrency';
import type { PurchaseResponse } from '@/types';

const POLL_INTERVAL_MS = 4000;
const POLL_MAX_ATTEMPTS = 8;

export default function PurchaseSuccessPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16 text-center text-ig-text-tertiary">Loading...</div>}>
      <PurchaseSuccessInner />
    </Suspense>
  );
}

function PurchaseSuccessInner() {
  const searchParams = useSearchParams();
  const shopOrderId = searchParams.get('shop_order_id');
  const { token, loading: tokenLoading } = useAccessToken();
  const { formatAmount } = useCurrency();

  const [purchase, setPurchase] = useState<PurchaseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (tokenLoading || !token || !shopOrderId) return;
    let cancelled = false;

    const fetchOnce = async () => {
      try {
        const result = await api.get<PurchaseResponse>(
          `/api/me/purchases/by-shop-order/${encodeURIComponent(shopOrderId)}`,
          token,
        );
        if (cancelled) return;
        setPurchase(result);
        if (result.status !== 'COMPLETED' && attempts < POLL_MAX_ATTEMPTS) {
          setTimeout(() => setAttempts((a) => a + 1), POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load purchase');
      }
    };

    fetchOnce();
    return () => {
      cancelled = true;
    };
  }, [token, tokenLoading, shopOrderId, attempts]);

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  if (!shopOrderId) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mw-card p-6">
          <h1 className="mw-section-title text-xl">Purchase complete</h1>
          <p className="mt-2 text-sm text-ig-text-secondary">Your guide has been added to your purchases.</p>
          <Link href="/purchases" className="mw-button-primary mt-6 inline-block min-h-11 rounded-lg px-6 py-2.5 text-sm">
            View my purchases
          </Link>
        </div>
      </div>
    );
  }

  if (tokenLoading || (!purchase && !error)) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-ig-text-tertiary">Loading receipt...</div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-ig-error">{error}</p>
        <Link href="/purchases" className="mw-button-primary mt-6 inline-block min-h-11 rounded-lg px-6 py-2.5 text-sm">
          View my purchases
        </Link>
      </div>
    );
  }

  if (!purchase) return null;

  const isPending = purchase.status !== 'COMPLETED';

  return (
    <>
      <style jsx global>{`
        @media print {
          nav, footer, .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>
      <div className="mx-auto max-w-2xl px-4 py-8 print:py-2">
        <div className="rounded-2xl border border-ig-border bg-ig-elevated p-6 print:border-0 print:bg-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mw-eyebrow">Receipt</p>
              <h1 className="mw-section-title mt-1 text-2xl">
                {isPending ? 'Payment received — finalizing' : 'Purchase complete'}
              </h1>
              <p className="mt-1 text-sm text-ig-text-secondary">
                {isPending
                  ? 'We received your payment. Your access will appear shortly.'
                  : 'Your guide has been added to your purchases.'}
              </p>
            </div>
            {!isPending && (
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20">
                <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <ReceiptRow label="Order ID" value={purchase.bogOrderId || '—'} />
            <ReceiptRow label="Status" value={purchase.status} />
            <ReceiptRow label="Order date" value={formatDate(purchase.createdAt)} />
            <ReceiptRow label="Completed at" value={formatDate(purchase.completedAt)} />
            <ReceiptRow label="Item" value={purchase.guideTitle || `Guide v${purchase.guideVersionNumber}`} />
            <ReceiptRow label="Amount paid" value={`${formatAmount(purchase.priceCentsPaid)} ${purchase.currency}`} />
            <ReceiptRow label="Payment method" value="Bank of Georgia iPay" />
          </dl>

          <div className="mt-6 border-t border-ig-border pt-4 text-xs text-ig-text-secondary">
            <p className="font-semibold text-ig-text-primary">Merchant</p>
            <p className="mt-1">{compliance.legalEntity}</p>
            <p>Legal identifier: {compliance.legalIdentifier}</p>
            <p>Email: {compliance.email}</p>
            <p>Phone: {compliance.phone}</p>
            <p>Domain: {compliance.domain}</p>
          </div>

          <div className="no-print mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="mw-button-secondary min-h-11 rounded-lg px-6 py-2.5 text-sm"
            >
              Print / Save PDF
            </button>
            <Link href="/purchases" className="mw-button-primary inline-block min-h-11 rounded-lg px-6 py-2.5 text-sm">
              View my purchases
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ig-border bg-ig-primary p-3">
      <dt className="text-xs uppercase tracking-wide text-ig-text-tertiary">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-ig-text-primary">{value}</dd>
    </div>
  );
}
