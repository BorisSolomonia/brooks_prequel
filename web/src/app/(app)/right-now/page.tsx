'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccessToken } from '@/hooks/useAccessToken';
import { redirectToLogin, isNative } from '@/lib/capacitor';
import { getCurrentCoords } from '@/lib/geolocation';
import { useMenuCoordinator } from '@/components/layout/MenuCoordinator';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api';
import {
  askRightNow,
  bboxAround,
  buildSubmitBody,
  DEFAULT_FLAG_CATEGORY,
  flagReport,
  getRightNow,
  grantConsent,
  listPlaces,
  searchPlaces,
  submitReport,
  voteHelpful,
  type CommunityPlace,
  type RightNowFeed,
  type RightNowStatus,
} from '@/lib/rightNow';
import { listPlaceMoments, type MomentView } from '@/lib/moments';
import MomentsRail from '@/components/moments/MomentsRail';
import AddMomentButton from '@/components/moments/AddMomentButton';
import PlaceQaSection from '@/components/community/PlaceQaSection';

const ANSWER_MENU_ID = 'right-now-answer';
const STATUSES: RightNowStatus[] = ['QUIET', 'NORMAL', 'BUSY', 'CLOSED'];

export default function RightNowPage() {
  const { t } = useTranslation();
  const { token, loading: tokenLoading } = useAccessToken();
  const { openMenuId, openMenu, closeMenu } = useMenuCoordinator();
  const toast = useToast();

  const [places, setPlaces] = useState<CommunityPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [noLocation, setNoLocation] = useState(false);
  const [selected, setSelected] = useState<CommunityPlace | null>(null);
  const [feed, setFeed] = useState<RightNowFeed | null>(null);
  const [moments, setMoments] = useState<MomentView[]>([]);
  const [query, setQuery] = useState('');
  const [consentGranted, setConsentGranted] = useState(false);
  const [busy, setBusy] = useState(false);

  const errText = useCallback(
    (err: unknown) => (err instanceof ApiError ? err.message : t('rightNow.somethingWrong')),
    [t],
  );

  useEffect(() => {
    if (tokenLoading) return;
    if (!token) {
      redirectToLogin();
      return;
    }
    getCurrentCoords()
      .then((coords) => {
        if (!coords) {
          setNoLocation(true);
          return null;
        }
        return listPlaces(bboxAround(coords.latitude, coords.longitude), token);
      })
      .then((result) => {
        if (result) setPlaces(result);
      })
      .catch((err) => console.error('[right-now] places:', err))
      .finally(() => setLoading(false));
  }, [token, tokenLoading]);

  const loadMoments = useCallback(
    (placeId: string) => {
      if (!token) return;
      listPlaceMoments(placeId, token)
        .then((f) => setMoments(f.moments))
        .catch((err) => console.error('[right-now] moments:', err));
    },
    [token],
  );

  const runSearch = useCallback(async () => {
    if (!token || query.trim().length < 2) return;
    try {
      const results = await searchPlaces(query.trim(), token, 'Tbilisi');
      setPlaces(results);
      setNoLocation(false);
    } catch (err) {
      console.error('[right-now] search:', err);
    }
  }, [token, query]);

  const openPlace = useCallback(
    (place: CommunityPlace) => {
      if (!token) return;
      setSelected(place);
      setFeed(null);
      setMoments([]);
      getRightNow(place.id, token)
        .then(setFeed)
        .catch((err) => console.error('[right-now] feed:', err));
      loadMoments(place.id);
    },
    [token, loadMoments],
  );

  const refreshFeed = useCallback(() => {
    if (!token || !selected) return;
    getRightNow(selected.id, token).then(setFeed).catch(() => {});
  }, [token, selected]);

  const doAsk = useCallback(async () => {
    if (!token || !selected) return;
    try {
      await askRightNow(selected.id, token);
      toast.info(t('rightNow.asked'));
      refreshFeed();
    } catch (err) {
      toast.error(errText(err));
    }
  }, [token, selected, toast, t, refreshFeed, errText]);

  const doGrantConsent = useCallback(async () => {
    if (!token) return;
    try {
      await grantConsent('LOCATION_ELIGIBILITY', token);
      setConsentGranted(true);
    } catch (err) {
      toast.error(errText(err));
    }
  }, [token, toast, errText]);

  const doSubmit = useCallback(
    async (status: RightNowStatus) => {
      if (!token || !selected) return;
      setBusy(true);
      try {
        const coords = await getCurrentCoords();
        if (!coords) {
          toast.error(t('rightNow.locationNeeded'));
          return;
        }
        await submitReport(selected.id, buildSubmitBody(status, coords, isNative()), token);
        toast.info(t('rightNow.submitted'));
        closeMenu(ANSWER_MENU_ID);
        refreshFeed();
      } catch (err) {
        toast.error(errText(err));
      } finally {
        setBusy(false);
      }
    },
    [token, selected, toast, t, closeMenu, refreshFeed, errText],
  );

  const doVote = useCallback(
    async (reportId: string) => {
      if (!token) return;
      try {
        await voteHelpful(reportId, token);
        toast.info(t('rightNow.voteThanks'));
      } catch (err) {
        toast.error(errText(err));
      }
    },
    [token, toast, t, errText],
  );

  const doFlag = useCallback(
    async (reportId: string) => {
      if (!token) return;
      try {
        await flagReport(reportId, DEFAULT_FLAG_CATEGORY, token);
        toast.info(t('rightNow.reported'));
      } catch (err) {
        toast.error(errText(err));
      }
    },
    [token, toast, t, errText],
  );

  if (tokenLoading || loading) {
    return <div className="mx-auto max-w-2xl px-4 py-12 text-center text-ig-text-tertiary">{t('rightNow.loading')}</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <h1 className="font-display text-xl font-black uppercase tracking-[0.06em] text-ig-text-primary">{t('rightNow.title')}</h1>
      <p className="mt-1 text-sm text-ig-text-tertiary">{t('rightNow.subtitle')}</p>

      {/* Search a place by name (Tbilisi) — remote discovery beyond the nearby list */}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch();
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('rightNow.searchPlaceholder')}
          className="min-w-0 flex-1 rounded-lg border-2 border-ig-border bg-transparent px-3 py-2 text-sm text-ig-text-primary"
        />
        <button type="submit" className="rounded-lg border-2 border-ig-border px-3 py-2 text-sm font-bold text-ig-text-primary">
          {t('rightNow.search')}
        </button>
      </form>

      {noLocation && (
        <div className="mw-card mt-4 py-6 text-center text-sm text-ig-text-secondary">{t('rightNow.locationNeeded')}</div>
      )}

      {!noLocation && places.length === 0 && (
        <div className="mw-card mt-4 py-6 text-center text-sm text-ig-text-tertiary">{t('rightNow.noPlaces')}</div>
      )}

      {/* Places list */}
      <div className="mt-4 space-y-2">
        {places.map((p) => (
          <button
            key={p.id}
            onClick={() => openPlace(p)}
            className={`w-full rounded-lg border-2 px-3 py-2 text-left transition ${
              selected?.id === p.id ? 'border-ig-text-primary bg-ig-secondary' : 'border-ig-border'
            }`}
          >
            <span className="font-display text-sm font-black text-ig-text-primary">{p.name}</span>
            <span className="ml-2 text-xs text-ig-text-tertiary">{p.category}</span>
          </button>
        ))}
      </div>

      {/* Selected place panel */}
      {selected && feed && (
        <div className="mw-card mt-4 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-black text-ig-text-primary">{feed.placeName}</h2>
            {feed.demand && (
              <span className="rounded-full bg-ig-secondary px-2 py-0.5 text-xs text-ig-text-secondary">
                {t(`rightNow.demand.${feed.demand}`)}
              </span>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <button onClick={doAsk} className="rounded-md border-2 border-ig-border px-3 py-1.5 text-sm font-bold text-ig-text-primary">
              {t('rightNow.ask')}
            </button>
            {isNative() ? (
              consentGranted ? (
                <button onClick={() => openMenu(ANSWER_MENU_ID)} className="rounded-md bg-ig-text-primary px-3 py-1.5 text-sm font-bold text-ig-primary">
                  {t('rightNow.answer')}
                </button>
              ) : (
                <button onClick={doGrantConsent} className="rounded-md border-2 border-ig-border px-3 py-1.5 text-sm font-bold text-ig-text-primary">
                  {t('rightNow.grantConsent')}
                </button>
              )
            ) : (
              <span className="self-center text-xs text-ig-text-tertiary">{t('rightNow.answerRequiresApp')}</span>
            )}
          </div>

          {/* Moments — follower-scoped 24h stories at this place */}
          <div className="mt-4 border-t border-ig-border pt-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-black uppercase tracking-wide text-ig-text-primary">
                {t('moments.sectionTitle')}
              </h3>
              <AddMomentButton placeId={selected.id} onPosted={() => loadMoments(selected.id)} />
            </div>
            <div className="mt-2">
              <MomentsRail moments={moments} emptyHint={t('moments.placeEmpty')} />
            </div>
          </div>

          {/* Q&A — ask this place a question, read anonymous answers */}
          <PlaceQaSection placeId={selected.id} />

          {/* Reports */}
          <div className="mt-4 space-y-2">
            {feed.suppressedForAnonymity ? (
              <p className="text-sm text-ig-text-tertiary">{t('rightNow.suppressed')}</p>
            ) : feed.reports.length === 0 ? (
              <p className="text-sm text-ig-text-tertiary">{t('rightNow.noReports')}</p>
            ) : (
              feed.reports.map((r) => (
                <div key={r.id} className="rounded-lg border-2 border-ig-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-black text-ig-text-primary">{t(`rightNow.status.${r.status}`)}</span>
                    <span className="text-xs text-ig-text-tertiary">{t(`rightNow.fresh.${r.freshness}`)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ig-text-tertiary">
                    {r.contributorTier === 'TRUSTED' && <span className="rounded bg-ig-secondary px-1.5 py-0.5">{t('rightNow.trusted')}</span>}
                    {r.corroborated && <span>{t('rightNow.corroborated')}</span>}
                    {r.waitBucket && <span>{r.waitBucket}</span>}
                  </div>
                  <div className="mt-2 flex gap-3 text-xs">
                    <button onClick={() => doVote(r.id)} className="font-bold text-ig-text-primary">{t('rightNow.helpful')}</button>
                    <button onClick={() => doFlag(r.id)} className="text-ig-text-tertiary">{t('rightNow.report')}</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Answer modal — mutually exclusive via MenuCoordinator (BOR-47 pattern) */}
      {openMenuId === ANSWER_MENU_ID && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 sm:items-center" onClick={() => closeMenu(ANSWER_MENU_ID)}>
          <div
            className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-ig-border bg-ig-elevated p-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display font-black text-ig-text-primary">{t('rightNow.answerTitle')}</p>
            <p className="mt-1 text-xs text-ig-text-tertiary">{t('rightNow.answerHint')}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  disabled={busy}
                  onClick={() => doSubmit(s)}
                  className="rounded-lg border-2 border-ig-border px-3 py-3 text-sm font-bold text-ig-text-primary disabled:opacity-50"
                >
                  {t(`rightNow.status.${s}`)}
                </button>
              ))}
            </div>
            <button onClick={() => closeMenu(ANSWER_MENU_ID)} className="mt-3 w-full py-2 text-sm text-ig-text-tertiary">
              {t('rightNow.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
