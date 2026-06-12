'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function CallbackPage() {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    // Auth0 callback is handled by the SDK
    // After auth, redirect to the maps landing experience.
    router.replace('/maps');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-dvh">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ig-blue mx-auto mb-4" />
        <p className="text-ig-text-secondary">{t('callback.signingIn')}</p>
      </div>
    </div>
  );
}
