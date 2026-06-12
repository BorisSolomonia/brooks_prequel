'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAccessToken } from '@/hooks/useAccessToken';
import { redirectToLogin } from '@/lib/capacitor';
import type { Guide, AiKeyResponse } from '@/types';
import GuideEditor from '@/components/guide-editor/GuideEditor';
import { useTranslation } from 'react-i18next';

export default function EditGuidePage() {
  const { t } = useTranslation();
  const params = useParams();
  const guideId = params.id as string;
  const { token, loading: tokenLoading } = useAccessToken();
  const router = useRouter();

  const [guide, setGuide] = useState<Guide | null>(null);
  const [aiKeys, setAiKeys] = useState<AiKeyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tokenLoading) return;
    if (!token) {
      redirectToLogin();
      return;
    }
    Promise.all([
      api.get<Guide>(`/api/guides/${guideId}`, token),
      api.get<AiKeyResponse[]>('/api/me/ai-keys', token),
    ])
      .then(([g, keys]) => {
        setGuide(g);
        setAiKeys(keys);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('guidePages.editGuide.errorFailedToLoad')))
      .finally(() => setLoading(false));
  }, [guideId, token, tokenLoading, router]);

  if (tokenLoading || loading) {
    return <div className="max-w-3xl mx-auto px-4 py-12 text-center text-ig-text-tertiary">{t('guidePages.editGuide.loading')}</div>;
  }

  if (error || !guide) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-ig-error">{error || t('guidePages.editGuide.guideNotFound')}</p>
      </div>
    );
  }

  return <GuideEditor initialGuide={guide} token={token!} aiKeys={aiKeys} />;
}
