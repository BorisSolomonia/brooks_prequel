'use client';

import { useTranslation } from 'react-i18next';

export default function PurchasesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-ig-text-primary">{t('errors.loadPurchases')}</p>
      <button
        onClick={reset}
        className="mt-4 rounded-lg bg-ig-bg-secondary px-4 py-2 text-sm hover:bg-ig-border"
      >
        {t('common.actions.retry')}
      </button>
    </div>
  );
}
