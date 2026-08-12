'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccessToken } from '@/hooks/useAccessToken';
import { redirectToLogin } from '@/lib/capacitor';
import { getMomentTray, type MomentView } from '@/lib/moments';
import MomentsRail from '@/components/moments/MomentsRail';

/**
 * The follower story tray: Moments from everyone you follow, newest first (RIGHT_NOW_V2_DESIGN §5).
 * Follower-scoped by construction on the server — this page only renders what it is handed.
 */
export default function MomentsPage() {
  const { t } = useTranslation();
  const { token, loading: tokenLoading } = useAccessToken();
  const [moments, setMoments] = useState<MomentView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tokenLoading) return;
    if (!token) {
      redirectToLogin();
      return;
    }
    getMomentTray(token)
      .then(setMoments)
      .catch((err) => console.error('[moments] tray:', err))
      .finally(() => setLoading(false));
  }, [token, tokenLoading]);

  if (tokenLoading || loading) {
    return <div className="mx-auto max-w-2xl px-4 py-12 text-center text-ig-text-tertiary">{t('moments.loading')}</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <h1 className="font-display text-xl font-black uppercase tracking-[0.06em] text-ig-text-primary">
        {t('moments.title')}
      </h1>
      <p className="mt-1 text-sm text-ig-text-tertiary">{t('moments.subtitle')}</p>

      <div className="mt-4">
        <MomentsRail moments={moments} emptyHint={t('moments.trayEmpty')} />
      </div>
    </div>
  );
}
