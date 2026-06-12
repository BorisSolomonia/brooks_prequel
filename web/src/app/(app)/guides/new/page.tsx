'use client';

import { useState, useEffect } from 'react';
import { useAccessToken } from '@/hooks/useAccessToken';
import { useRouter } from 'next/navigation';
import { redirectToLogin } from '@/lib/capacitor';
import { api } from '@/lib/api';
import type { AiKeyResponse } from '@/types';
import GuideEditor from '@/components/guide-editor/GuideEditor';
import { useTranslation } from 'react-i18next';

export default function NewGuidePage() {
  const { t } = useTranslation();
  const { token, loading } = useAccessToken();
  const router = useRouter();
  const [aiKeys, setAiKeys] = useState<AiKeyResponse[]>([]);

  useEffect(() => {
    if (!loading && !token) {
      redirectToLogin();
      return;
    }
    if (!loading && token) {
      api.get<AiKeyResponse[]>('/api/me/ai-keys', token)
        .then(setAiKeys)
        .catch(() => {});
    }
  }, [loading, token, router]);

  if (loading) {
    return <div className="max-w-3xl mx-auto px-4 py-12 text-center text-ig-text-tertiary">{t('guidePages.newGuide.loading')}</div>;
  }

  if (!token) {
    return <div className="max-w-3xl mx-auto px-4 py-12 text-center text-ig-text-tertiary">{t('guidePages.newGuide.redirecting')}</div>;
  }

  return <GuideEditor token={token!} aiKeys={aiKeys} />;
}
