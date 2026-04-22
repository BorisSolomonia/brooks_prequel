'use client';

import Link from 'next/link';

export default function PurchaseSuccessPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
        <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold text-ig-text-primary mb-2">Purchase Complete</h1>
      <p className="text-ig-text-secondary mb-8">
        Your guide has been added to your purchases. You can access it anytime.
      </p>
      <div className="flex flex-col gap-3">
        <Link
          href="/purchases"
          className="px-6 py-2.5 bg-ig-blue text-white rounded-lg text-sm font-semibold hover:bg-ig-blue-hover transition-colors inline-block"
        >
          View My Purchases
        </Link>
        <Link
          href="/"
          className="px-6 py-2.5 bg-ig-elevated text-ig-text-primary border border-ig-border rounded-lg text-sm font-semibold hover:bg-ig-hover transition-colors inline-block"
        >
          Go to Feed
        </Link>
      </div>
    </div>
  );
}
