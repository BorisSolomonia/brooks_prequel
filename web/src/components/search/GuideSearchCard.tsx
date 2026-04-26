'use client';

import { useState } from 'react';
import GuideCard from '@/components/ui/GuideCard';
import { useAccessToken } from '@/hooks/useAccessToken';
import { api } from '@/lib/api';
import type { GuideSaveStatusResponse, GuideSearchResult } from '@/types';

interface GuideSearchCardProps {
  guide: GuideSearchResult;
}

export default function GuideSearchCard({ guide }: GuideSearchCardProps) {
  const { token } = useAccessToken();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveClick = async () => {
    if (!token) {
      window.location.href = '/api/auth/login';
      return;
    }

    setSaving(true);
    try {
      const response = saved
        ? await api.delete<GuideSaveStatusResponse>(`/api/guides/${guide.id}/save`, token)
        : await api.post<GuideSaveStatusResponse>(`/api/guides/${guide.id}/save`, undefined, token);
      setSaved(response.saved);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update save state');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GuideCard
      href={`/guides/${guide.id}/view`}
      title={guide.title}
      coverImageUrl={guide.coverImageUrl}
      displayLocation={guide.displayLocation || guide.primaryCity || guide.region}
      region={guide.region}
      dayCount={guide.dayCount}
      spotCount={guide.spotCount ?? guide.placeCount}
      placeCount={guide.placeCount}
      priceCents={guide.priceCents}
      effectivePriceCents={guide.effectivePriceCents}
      currency={guide.currency}
      averageRating={guide.averageRating}
      reviewCount={guide.reviewCount}
      popularThisWeek={guide.popularThisWeek}
      savedByViewer={saved}
      onSaveClick={saving ? undefined : handleSaveClick}
      saveLabel={saving ? 'Saving guide' : saved ? 'Saved guide' : 'Save guide'}
    />
  );
}
