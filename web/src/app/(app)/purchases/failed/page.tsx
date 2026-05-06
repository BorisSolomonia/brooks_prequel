'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { compliance } from '@/lib/compliance';

export default function PurchaseFailedPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16 text-center text-ig-text-tertiary">Loading...</div>}>
      <PurchaseFailedInner />
    </Suspense>
  );
}

function PurchaseFailedInner() {
  const searchParams = useSearchParams();
  const shopOrderId = searchParams.get('shop_order_id');

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border border-ig-border bg-ig-elevated p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ig-error/15">
          <svg className="h-6 w-6 text-ig-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="mw-section-title text-2xl">Payment was not completed</h1>
        <p className="mt-2 text-sm text-ig-text-secondary">
          The payment did not go through. No charge was made. You can try again, pick a different card, or contact support.
        </p>
        {shopOrderId && (
          <p className="mt-4 text-xs text-ig-text-tertiary">Reference: {shopOrderId}</p>
        )}
        <div className="mt-6 flex flex-col gap-3">
          <Link href="/search" className="mw-button-primary inline-block min-h-11 rounded-lg px-6 py-2.5 text-sm">
            Browse guides
          </Link>
          <a
            href={`mailto:${compliance.email}?subject=Payment%20issue%20${encodeURIComponent(shopOrderId || '')}`}
            className="text-xs text-brand-500 hover:text-brand-400"
          >
            Contact {compliance.email}
          </a>
        </div>
      </div>
    </div>
  );
}
