'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  // BOR-56: notify the parent list when the save state changes (after the
  // backend confirms). Lets the Discover "Saved" section drop a guide the
  // moment it's un-saved instead of leaving a stale card behind.
  onSaveChange?: (guideId: string, saved: boolean) => void;
}

export default function GuideSearchCard({ guide, initialSaved = false, onSaveChange }: GuideSearchCardProps) {
  const { t } = useTranslation();
  const { token } = useAccessToken();
  const toast = useToast();
  const [saved, setSaved] = useState(initialSaved);
  const [saving, setSaving] = useState(false);

  const handleSaveClick = async () => {
    if (!token) {
      void startAuthFlow();
      return;
    }
    if (saving) return;

    // BOR-56: OPTIMISTIC — flip the heart immediately so it feels instant. The
    // parent isn't told to remove the card until the backend confirms (200 OK),
    // so a failed request can revert this still-mounted card.
    const next = !saved;
    setSaved(next);
    setSaving(true);
    try {
      const response = next
        ? await api.post<GuideSaveStatusResponse>(`/api/guides/${guide.id}/save`, undefined, token)
        : await api.delete<GuideSaveStatusResponse>(`/api/guides/${guide.id}/save`, token);
      setSaved(response.saved);
      // Confirmed by the server → let the parent splice it out of the feed.
      onSaveChange?.(guide.id, response.saved);
    } catch (error) {
      // Revert the optimistic toggle and keep the guide in the feed.
      setSaved(!next);
      toast.error(error instanceof Error ? error.message : t('discovery.search.saveError'));
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
      saveLabel={saving ? t('discovery.search.saveLabelSaving') : saved ? t('discovery.search.saveLabelSaved') : t('discovery.search.saveLabelSave')}
      creatorName={guide.creatorDisplayName || guide.creatorUsername}
      creatorAvatarUrl={guide.creatorAvatarUrl}
      creatorHref={guide.creatorUsername ? `/creators/${guide.creatorUsername}` : undefined}
    />
  );
}
