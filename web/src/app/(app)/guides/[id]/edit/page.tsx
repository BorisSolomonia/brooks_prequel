'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAccessToken } from '@/hooks/useAccessToken';
import { redirectToLogin } from '@/lib/capacitor';
import type { Guide, AiKeyResponse } from '@/types';
import GuideEditor from '@/components/guide-editor/GuideEditor';

export default function EditGuidePage() {
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
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load guide'))
      .finally(() => setLoading(false));
  }, [guideId, token, tokenLoading, router]);

  if (tokenLoading || loading) {
    return <div className="max-w-3xl mx-auto px-4 py-12 text-center text-ig-text-tertiary">Loading...</div>;
  }

  if (error || !guide) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-ig-error">{error || 'Guide not found'}</p>
      </div>
    );
  }

  // key forces a remount when navigating between two guides' edit pages: GuideEditor
  // seeds its form state from initialGuide in useState initializers, so without the key
  // guide B's editor would keep showing (and save!) guide A's stale form data.
  return <GuideEditor key={guide.id} initialGuide={guide} token={token!} aiKeys={aiKeys} />;
}
