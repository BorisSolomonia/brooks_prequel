'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useAccessToken } from '@/hooks/useAccessToken';
import { useToast } from '@/components/ui/Toast';
import Spinner from '@/components/ui/Spinner';
import type { GiftOffer, GuideCheckoutSessionResponse } from '@/types';

export default function GiftsPage() {
  const { t } = useTranslation();
  const { token, loading: tokenLoading } = useAccessToken();
  const router = useRouter();
  const toast = useToast();
  const [offers, setOffers] = useState<GiftOffer[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setOffers(await api.get<GiftOffer[]>('/api/me/gifts', token));
    } catch {
      setOffers([]);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const accept = async (offer: GiftOffer) => {
    if (!token) return;
    setBusyId(offer.purchaseId);
    try {
      const res = await api.post<GuideCheckoutSessionResponse>(
        `/api/me/gifts/${offer.purchaseId}/accept`, undefined, token,
      );
      toast.success(t('account.gifts.acceptedToast'));
      if (res.tripId) router.push(`/trips/${res.tripId}`);
      else setOffers((prev) => (prev ?? []).filter((o) => o.purchaseId !== offer.purchaseId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('account.gifts.errorAccept'));
    } finally {
      setBusyId(null);
    }
  };

  const decline = async (offer: GiftOffer) => {
    if (!token) return;
    setBusyId(offer.purchaseId);
    try {
      await api.post(`/api/me/gifts/${offer.purchaseId}/decline`, undefined, token);
      setOffers((prev) => (prev ?? []).filter((o) => o.purchaseId !== offer.purchaseId));
      toast.info(t('account.gifts.declinedToast'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('account.gifts.errorDecline'));
    } finally {
      setBusyId(null);
    }
  };

  const loading = tokenLoading || offers === null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-xl font-semibold text-ig-text-primary">{t('account.gifts.title')}</h1>
      <p className="mb-5 text-sm text-ig-text-tertiary">{t('account.gifts.subtitle')}</p>

      {loading ? (
        <p className="text-center text-sm text-ig-text-tertiary">{t('account.gifts.loading')}</p>
      ) : offers!.length === 0 ? (
        <p className="rounded-xl border border-ig-border bg-ig-elevated px-4 py-10 text-center text-sm text-ig-text-tertiary">
          {t('account.gifts.empty')}
        </p>
      ) : (
        <ul className="space-y-3">
          {offers!.map((offer) => (
            <li key={offer.purchaseId} className="flex gap-3 rounded-xl border border-ig-border bg-ig-elevated p-3">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-ig-border bg-ig-secondary">
                {offer.coverImageUrl && <img src={offer.coverImageUrl} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ig-text-primary">{offer.guideTitle}</p>
                <p className="mt-0.5 text-xs text-ig-text-tertiary">
                  {offer.gifterName ? t('account.gifts.fromGifter', { name: offer.gifterName }) : t('account.gifts.freeGift')}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === offer.purchaseId}
                    onClick={() => accept(offer)}
                    className="mw-button-primary inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-sm disabled:opacity-60"
                  >
                    {busyId === offer.purchaseId && <Spinner />}
                    {t('account.gifts.accept')}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === offer.purchaseId}
                    onClick={() => decline(offer)}
                    className="min-h-10 rounded-md border border-ig-border px-4 text-sm text-ig-text-secondary transition-colors hover:text-ig-error disabled:opacity-60"
                  >
                    {t('account.gifts.decline')}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
