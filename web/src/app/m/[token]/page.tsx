'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAccessToken } from '@/hooks/useAccessToken';
import type { MemoryRevealResponse, MemoryShareTeaser } from '@/types';

const formatCoordinate = (value: number) => value.toFixed(6);

type MobilePlatform = 'android' | 'ios' | 'other';

const isMetaInAppBrowser = (userAgent: string) =>
  /FBAN|FBAV|FB_IAB|FB4A|FBIOS|Messenger|Instagram/i.test(userAgent);

const getMobilePlatform = (userAgent: string): MobilePlatform => {
  if (/Android/i.test(userAgent)) {
    return 'android';
  }
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return 'ios';
  }
  return 'other';
};

const buildChromeIntentUrl = (currentUrl: string) => {
  try {
    const url = new URL(currentUrl);
    return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(currentUrl)};end`;
  } catch {
    return currentUrl;
  }
};

const locationErrorMessage = (error: GeolocationPositionError) => {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Location access was denied. Enable location for Brooks in your browser settings, then try again.';
  }
  if (error.code === error.TIMEOUT) {
    return 'Could not detect your location. Move outside or check GPS, then try again.';
  }
  return 'Your browser could not detect your location. Check location services, then try again.';
};

export default function SharedMemoryPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { token: accessToken, loading: tokenLoading } = useAccessToken();
  const [teaser, setTeaser] = useState<MemoryShareTeaser | null>(null);
  const [reveal, setReveal] = useState<MemoryRevealResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [isMetaBrowser, setIsMetaBrowser] = useState(false);
  const [mobilePlatform, setMobilePlatform] = useState<MobilePlatform>('other');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'manual'>('idle');

  useEffect(() => {
    api.get<MemoryShareTeaser>(`/api/memory-shares/${token}`)
      .then(setTeaser)
      .catch((err) => setError(err instanceof Error ? err.message : 'Memory is unavailable'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    const userAgent = navigator.userAgent || '';
    setCurrentUrl(window.location.href);
    setIsMetaBrowser(isMetaInAppBrowser(userAgent));
    setMobilePlatform(getMobilePlatform(userAgent));
  }, []);

  const copyCurrentLink = async () => {
    const linkToCopy = currentUrl || window.location.href;
    try {
      await navigator.clipboard.writeText(linkToCopy);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('manual');
    }
  };

  const revealMemory = () => {
    if (!accessToken) {
      return;
    }
    if (isMetaBrowser) {
      setError('Open this link in Chrome or Safari so Brooks can verify your location.');
      return;
    }
    if (!window.isSecureContext) {
      setError('Location detection requires a secure connection. Open this link on brooksweb.uk, then try again.');
      return;
    }
    if (!navigator.geolocation) {
      setError('This browser does not support location detection. Open the link in a browser with location services enabled.');
      return;
    }
    setRevealing(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        api.post<MemoryRevealResponse>(`/api/memory-shares/${token}/reveal`, {
          latitude: coords.latitude,
          longitude: coords.longitude,
        }, accessToken)
          .then(setReveal)
          .catch((err) => setError(err instanceof Error ? err.message : 'Could not reveal memory'))
          .finally(() => setRevealing(false));
      },
      (geoError) => {
        setError(locationErrorMessage(geoError));
        setRevealing(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 },
    );
  };

  const googleMapsUrl = teaser
    ? `https://www.google.com/maps/search/?api=1&query=${teaser.approximateLatitude},${teaser.approximateLongitude}`
    : '#';
  const appleMapsUrl = teaser
    ? `https://maps.apple.com/?ll=${teaser.approximateLatitude},${teaser.approximateLongitude}`
    : '#';

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-ig-primary text-ig-text-secondary">Loading hidden memory...</div>;
  }

  if (!teaser || !teaser.available) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ig-primary px-4">
        <section className="max-w-md rounded-3xl border border-ig-border bg-ig-elevated p-6 text-center">
          <h1 className="text-2xl font-semibold text-ig-text-primary">Memory unavailable</h1>
          <p className="mt-3 text-sm text-ig-text-secondary">{teaser?.unavailableReason || error || 'This hidden memory cannot be opened.'}</p>
          <Link href="/" className="mt-5 inline-flex min-h-11 items-center rounded-2xl bg-brand-500 px-5 text-sm font-semibold text-white">Go to Brooks</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ig-primary px-4 py-10">
      <section className="mx-auto max-w-xl rounded-[32px] border border-ig-border bg-ig-elevated p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-full bg-ig-hover">
            {teaser.senderAvatarUrl ? (
              <img src={teaser.senderAvatarUrl} alt={teaser.senderName || 'Memory sender'} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-ig-text-secondary">
                {(teaser.senderName || 'B').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-500">Hidden memory</p>
            <h1 className="text-xl font-semibold text-ig-text-primary">
              {teaser.senderName || 'Someone'} left you a memory
            </h1>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-ig-border bg-ig-primary p-4">
          <p className="text-sm text-ig-text-secondary">
            Register or sign in to reveal this memory at the location. After sign-in, Brooks will ask for location access and unlock it when you are within 100m.
          </p>
          <p className="mt-2 text-sm font-semibold text-ig-text-primary">
            Memory location: {teaser.placeLabel || `${formatCoordinate(teaser.approximateLatitude)}, ${formatCoordinate(teaser.approximateLongitude)}`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="min-h-11 rounded-2xl border border-ig-border px-4 py-2 text-sm font-semibold text-ig-text-secondary hover:text-ig-text-primary">
              Open Google Maps
            </a>
            <a href={appleMapsUrl} target="_blank" rel="noreferrer" className="min-h-11 rounded-2xl border border-ig-border px-4 py-2 text-sm font-semibold text-ig-text-secondary hover:text-ig-text-primary">
              Open Apple Maps
            </a>
          </div>
        </div>

        {isMetaBrowser && (
          <div className="mt-5 rounded-3xl border border-brand-500/30 bg-brand-500/10 p-4">
            <p className="text-sm font-semibold text-ig-text-primary">Open this memory in your browser</p>
            <p className="mt-1 text-sm text-ig-text-secondary">
              Facebook and Messenger cannot reliably share location with Brooks. Open this same link in Chrome or Safari, then sign in and allow location access there.
            </p>

            {mobilePlatform === 'android' && currentUrl && (
              <a
                href={buildChromeIntentUrl(currentUrl)}
                className="mt-4 flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand-500 px-5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Open in Chrome
              </a>
            )}

            {mobilePlatform === 'ios' && (
              <div className="mt-4 rounded-2xl border border-ig-border bg-ig-primary px-4 py-3 text-sm text-ig-text-secondary">
                On iPhone, tap the Messenger menu and choose Open in browser, or copy this link and paste it into Safari.
              </div>
            )}

            <button
              type="button"
              onClick={copyCurrentLink}
              className="mt-3 min-h-12 w-full rounded-2xl border border-ig-border px-5 text-sm font-semibold text-ig-text-primary transition hover:bg-ig-hover"
            >
              {copyStatus === 'copied' ? 'Link copied' : 'Copy link'}
            </button>

            {copyStatus === 'manual' && currentUrl && (
              <p className="mt-3 break-all rounded-2xl border border-ig-border bg-ig-primary px-4 py-3 text-xs text-ig-text-secondary">
                {currentUrl}
              </p>
            )}
          </div>
        )}

        {!isMetaBrowser && !tokenLoading && !accessToken && (
          <Link
            href={`/api/auth/login?returnTo=/m/${encodeURIComponent(token)}`}
            className="mt-5 flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand-500 px-5 text-sm font-semibold text-white"
          >
            Register or sign in to reveal
          </Link>
        )}

        {!isMetaBrowser && accessToken && (
          <div className="mt-5 rounded-3xl border border-brand-500/30 bg-brand-500/10 p-4">
            <p className="text-sm font-semibold text-ig-text-primary">Location permission is needed to unlock this memory.</p>
            <p className="mt-1 text-sm text-ig-text-secondary">
              Tap the button below, then choose Allow when your browser asks for location access.
            </p>
            <button
              type="button"
              onClick={revealMemory}
              disabled={revealing}
              className="mt-4 min-h-12 w-full rounded-2xl bg-brand-500 px-5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
            >
              {revealing ? 'Checking location...' : 'Allow location to reveal memory'}
            </button>
          </div>
        )}

        {error && <p className="mt-4 rounded-2xl border border-ig-error/40 px-4 py-3 text-sm text-ig-error">{error}</p>}

        {reveal && !reveal.revealed && (
          <p className="mt-4 rounded-2xl border border-ig-border px-4 py-3 text-sm text-ig-text-secondary">
            You are about {Math.round(reveal.distanceMeters)}m away. Come within {Math.round(reveal.unlockRadiusMeters)}m to unlock it.
          </p>
        )}

        {reveal?.revealed && reveal.memory && (
          <div className="mt-5 rounded-3xl border border-brand-500/30 bg-brand-500/10 p-4">
            <p className="whitespace-pre-line text-lg font-semibold text-ig-text-primary">{reveal.memory.textContent}</p>
            {reveal.memory.media.map((media) => (
              media.mediaType === 'IMAGE' ? (
                <img key={media.id} src={media.url} alt="Memory" className="mt-4 max-h-80 w-full rounded-2xl object-cover" />
              ) : (
                <audio key={media.id} src={media.url} controls className="mt-4 w-full" />
              )
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
