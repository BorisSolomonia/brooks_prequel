'use client';

import { useState } from 'react';
import GuideCard from '@/components/ui/GuideCard';
import { useAccessToken } from '@/hooks/useAccessToken';
import { api } from '@/lib/api';
import { startAuthFlow } from '@/lib/capacitor';
import { useToast } from '@/components/ui/Toast';
import type { GuideSaveStatusResponse, GuideSearchResult } from '@/types';

interface GuideSearchCardProps {
  guide: GuideSearchResult;
  // Seed the save heart as already filled — used by the "Saved" section of the
  // signed-in Discover feed (BOR-28). Defaults false so all other usages are unchanged.
  initialSaved?: boolean;
}

export default function GuideSearchCard({ guide, initialSaved = false }: GuideSearchCardProps) {
  const { token } = useAccessToken();
  const toast = useToast();
  const [saved, setSaved] = useState(initialSaved);
  const [saving, setSaving] = useState(false);

  const handleSaveClick = async () => {
    if (!token) {
      void startAuthFlow();
      return;
    }

    setSaving(true);
    try {
      const response = saved
        ? await api.delete<GuideSaveStatusResponse>(`/api/guides/${guide.id}/save`, token)
        : await api.post<GuideSaveStatusResponse>(`/api/guides/${guide.id}/save`, undefined, token);
      setSaved(response.saved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update save state');
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
      creatorName={guide.creatorDisplayName || guide.creatorUsername}
      creatorAvatarUrl={guide.creatorAvatarUrl}
    />
  );
}
