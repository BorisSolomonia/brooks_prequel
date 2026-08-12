'use client';

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccessToken } from '@/hooks/useAccessToken';
import { useToast } from '@/components/ui/Toast';
import { isNative } from '@/lib/capacitor';
import { capturePhoto } from '@/lib/camera';
import { getCurrentCoords } from '@/lib/geolocation';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api';
import { buildMomentBody, postMoment } from '@/lib/moments';
import { grantConsent } from '@/lib/rightNow';

interface AddMomentButtonProps {
  placeId: string;
  onPosted?: () => void;
}

/**
 * Capture → (optional caption) → share a Location Moment. Posting is present-only and native-only
 * (the server rejects without an attestation token), so on the web we show a hint instead — same
 * contract as answering in Right Now v1.
 */
export default function AddMomentButton({ placeId, onPosted }: AddMomentButtonProps) {
  const { t } = useTranslation();
  const { token } = useAccessToken();
  const toast = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    setFile(null);
    setCaption('');
    setBusy(false);
    setPreview((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
  }, []);

  const startCapture = useCallback(async () => {
    const photo = await capturePhoto();
    if (!photo) return;
    setFile(photo);
    setPreview(URL.createObjectURL(photo));
  }, []);

  const share = useCallback(async () => {
    if (!token || !file) return;
    setBusy(true);
    try {
      const coords = await getCurrentCoords();
      if (!coords) {
        toast.error(t('moments.locationNeeded'));
        return;
      }
      // Posting a Moment requires location-eligibility consent. Tapping Share IS the explicit
      // opt-in (the sheet states it's location-based + followers-only), so grant it here — the
      // call is idempotent server-side. Without this, a user who never used the answer flow
      // would hit "Location consent is required" and be unable to post.
      await grantConsent('LOCATION_ELIGIBILITY', token);
      const uploaded = await api.uploadMedia(file, 'PLACE_IMAGE', token);
      await postMoment(placeId, buildMomentBody(uploaded.url, coords, { caption }), token);
      toast.info(t('moments.shared'));
      reset();
      onPosted?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('moments.somethingWrong'));
    } finally {
      setBusy(false);
    }
  }, [token, file, placeId, caption, toast, t, reset, onPosted]);

  if (!isNative()) {
    return <span className="self-center text-xs text-ig-text-tertiary">{t('moments.requiresApp')}</span>;
  }

  return (
    <>
      <button
        onClick={startCapture}
        className="rounded-md bg-ig-text-primary px-3 py-1.5 text-sm font-bold text-ig-primary"
      >
        {t('moments.add')}
      </button>

      {file && preview && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 sm:items-center" onClick={reset}>
          <div
            className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-ig-border bg-ig-elevated p-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display font-black text-ig-text-primary">{t('moments.composeTitle')}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="mt-3 max-h-72 w-full rounded-lg object-cover" />
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={280}
              placeholder={t('moments.captionPlaceholder')}
              className="mt-3 w-full rounded-lg border-2 border-ig-border bg-transparent px-3 py-2 text-sm text-ig-text-primary"
            />
            <p className="mt-1 text-xs text-ig-text-tertiary">{t('moments.locationConsentHint')}</p>
            <div className="mt-3 flex gap-2">
              <button
                disabled={busy}
                onClick={share}
                className="flex-1 rounded-lg bg-ig-text-primary py-2.5 text-sm font-bold text-ig-primary disabled:opacity-50"
              >
                {busy ? t('moments.sharing') : t('moments.share')}
              </button>
              <button onClick={reset} className="rounded-lg border-2 border-ig-border px-4 py-2.5 text-sm text-ig-text-primary">
                {t('moments.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
