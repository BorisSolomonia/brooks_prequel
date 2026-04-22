'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccessToken } from '@/hooks/useAccessToken';
import { api } from '@/lib/api';
import type { AiKeyResponse } from '@/types';
import GuideEditor from '@/components/guide-editor/GuideEditor';

export default function NewGuidePage() {
  const { token, loading } = useAccessToken();
  const router = useRouter();
  const [aiKeys, setAiKeys] = useState<AiKeyResponse[]>([]);

  useEffect(() => {
    if (!loading && !token) {
      router.push('/api/auth/login');
      return;
    }
    if (!loading && token) {
      api.get<AiKeyResponse[]>('/api/me/ai-keys', token)
        .then(setAiKeys)
        .catch(() => {});
    }
  }, [loading, token, router]);

  if (loading) {
    return <div className="max-w-3xl mx-auto px-4 py-12 text-center text-ig-text-tertiary">Loading...</div>;
  }

  if (!token) {
    return <div className="max-w-3xl mx-auto px-4 py-12 text-center text-ig-text-tertiary">Redirecting to login...</div>;
  }

  return <GuideEditor token={token!} aiKeys={aiKeys} />;
}
