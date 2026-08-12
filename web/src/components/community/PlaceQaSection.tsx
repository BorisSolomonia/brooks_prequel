'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccessToken } from '@/hooks/useAccessToken';
import { useToast } from '@/components/ui/Toast';
import { isNative } from '@/lib/capacitor';
import { getCurrentCoords } from '@/lib/geolocation';
import { ApiError } from '@/lib/api';
import {
  answerQuestion,
  askQuestion,
  buildAnswerBody,
  flagAnswer,
  listQuestions,
  QUESTION_PRESETS,
  voteAnswerHelpful,
  type PlaceQuestionView,
} from '@/lib/placeQa';
import { DEFAULT_FLAG_CATEGORY, grantConsent, type RightNowStatus } from '@/lib/rightNow';

const ANSWER_CHIPS: RightNowStatus[] = ['QUIET', 'NORMAL', 'BUSY', 'CLOSED'];

/**
 * Right Now v2 · Phase A2 — ask a place a preset/free-text question and read anonymous answers.
 * Asking works remotely (no location); answering is present-only (native app), mirroring v1.
 */
export default function PlaceQaSection({ placeId }: { placeId: string }) {
  const { t } = useTranslation();
  const { token } = useAccessToken();
  const toast = useToast();

  const [questions, setQuestions] = useState<PlaceQuestionView[]>([]);
  const [askText, setAskText] = useState('');
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [busy, setBusy] = useState(false);

  const errText = useCallback(
    (err: unknown) => (err instanceof ApiError ? err.message : t('placeQa.somethingWrong')),
    [t],
  );

  const refresh = useCallback(() => {
    if (!token) return;
    listQuestions(placeId, token)
      .then(setQuestions)
      .catch((err) => console.error('[place-qa] list:', err));
  }, [token, placeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const doAsk = useCallback(
    async (preset?: string) => {
      if (!token) return;
      const body = preset ? { presetKey: preset } : { bodyText: askText.trim() };
      if (!preset && !askText.trim()) return;
      try {
        await askQuestion(placeId, body, token);
        setAskText('');
        toast.info(t('placeQa.asked'));
        refresh();
      } catch (err) {
        toast.error(errText(err));
      }
    },
    [token, placeId, askText, toast, t, refresh, errText],
  );

  const doAnswer = useCallback(
    async (statusChip?: string) => {
      if (!token || !answeringId) return;
      setBusy(true);
      try {
        const coords = await getCurrentCoords();
        if (!coords) {
          toast.error(t('placeQa.locationNeeded'));
          return;
        }
        // Answering is present-only and needs location-eligibility consent — tapping send is the
        // explicit opt-in (idempotent server-side), so a user without the answer-flow consent
        // button doesn't hit a "consent required" wall.
        await grantConsent('LOCATION_ELIGIBILITY', token);
        await answerQuestion(answeringId, buildAnswerBody(coords, { bodyText: answerText, statusChip }), token);
        toast.info(t('placeQa.submitted'));
        setAnsweringId(null);
        setAnswerText('');
        refresh();
      } catch (err) {
        toast.error(errText(err));
      } finally {
        setBusy(false);
      }
    },
    [token, answeringId, answerText, toast, t, refresh, errText],
  );

  const doVote = useCallback(
    async (answerId: string) => {
      if (!token) return;
      try {
        await voteAnswerHelpful(answerId, token);
        toast.info(t('placeQa.voteThanks'));
      } catch (err) {
        toast.error(errText(err));
      }
    },
    [token, toast, t, errText],
  );

  const doFlag = useCallback(
    async (answerId: string) => {
      if (!token) return;
      try {
        await flagAnswer(answerId, DEFAULT_FLAG_CATEGORY, token);
        toast.info(t('placeQa.reported'));
      } catch (err) {
        toast.error(errText(err));
      }
    },
    [token, toast, t, errText],
  );

  const questionLabel = (q: PlaceQuestionView) =>
    q.bodyText ? q.bodyText : q.presetKey ? t(`placeQa.presets.${q.presetKey}`) : '';

  return (
    <div className="mt-4 border-t border-ig-border pt-3">
      <h3 className="font-display text-sm font-black uppercase tracking-wide text-ig-text-primary">
        {t('placeQa.sectionTitle')}
      </h3>

      {/* Compose — free text + presets (asking works remotely, no location needed) */}
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          doAsk();
        }}
      >
        <input
          value={askText}
          onChange={(e) => setAskText(e.target.value)}
          maxLength={140}
          placeholder={t('placeQa.askPlaceholder')}
          className="min-w-0 flex-1 rounded-lg border-2 border-ig-border bg-transparent px-3 py-2 text-sm text-ig-text-primary"
        />
        <button type="submit" className="rounded-lg border-2 border-ig-border px-3 py-2 text-sm font-bold text-ig-text-primary">
          {t('placeQa.ask')}
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-2">
        {QUESTION_PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => doAsk(p)}
            className="rounded-full border border-ig-border px-3 py-1 text-xs text-ig-text-secondary"
          >
            {t(`placeQa.presets.${p}`)}
          </button>
        ))}
      </div>

      {/* Questions + anonymous answers */}
      <div className="mt-3 space-y-3">
        {questions.length === 0 && <p className="text-sm text-ig-text-tertiary">{t('placeQa.noQuestions')}</p>}
        {questions.map((q) => (
          <div key={q.id} className="rounded-lg border-2 border-ig-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-ig-text-primary">{questionLabel(q)}</span>
              <span className="text-xs text-ig-text-tertiary">{t(`rightNow.fresh.${q.freshness}`)}</span>
            </div>

            {q.suppressedForAnonymity ? (
              <p className="mt-2 text-xs text-ig-text-tertiary">{t('placeQa.suppressed')}</p>
            ) : q.answers.length === 0 ? (
              <p className="mt-2 text-xs text-ig-text-tertiary">{t('placeQa.noAnswers')}</p>
            ) : (
              <div className="mt-2 space-y-2">
                {q.answers.map((a) => (
                  <div key={a.id} className="rounded-md bg-ig-secondary px-2 py-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ig-text-tertiary">
                      {a.statusChip && (
                        <span className="font-bold text-ig-text-primary">{t(`rightNow.status.${a.statusChip}`)}</span>
                      )}
                      {a.contributorTier === 'TRUSTED' && (
                        <span className="rounded bg-ig-primary px-1.5 py-0.5">{t('placeQa.trusted')}</span>
                      )}
                      {a.corroborated && <span>{t('placeQa.corroborated')}</span>}
                    </div>
                    {a.bodyText && <p className="mt-1 text-sm text-ig-text-primary">{a.bodyText}</p>}
                    <div className="mt-1 flex gap-3 text-xs">
                      <button onClick={() => doVote(a.id)} className="font-bold text-ig-text-primary">
                        {t('placeQa.helpful')}
                      </button>
                      <button onClick={() => doFlag(a.id)} className="text-ig-text-tertiary">
                        {t('placeQa.report')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Answer — present-only (native app) */}
            <div className="mt-2">
              {isNative() ? (
                <button
                  onClick={() => {
                    setAnsweringId(q.id);
                    setAnswerText('');
                  }}
                  className="text-xs font-bold text-ig-text-primary"
                >
                  {t('placeQa.answer')}
                </button>
              ) : (
                <span className="text-xs text-ig-text-tertiary">{t('placeQa.answerRequiresApp')}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Answer sheet */}
      {answeringId && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setAnsweringId(null)}>
          <div
            className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-ig-border bg-ig-elevated p-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display font-black text-ig-text-primary">{t('placeQa.answerTitle')}</p>
            <p className="mt-1 text-xs text-ig-text-tertiary">{t('placeQa.answerHint')}</p>
            <input
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              maxLength={280}
              placeholder={t('placeQa.answerPlaceholder')}
              className="mt-3 w-full rounded-lg border-2 border-ig-border bg-transparent px-3 py-2 text-sm text-ig-text-primary"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              {ANSWER_CHIPS.map((s) => (
                <button
                  key={s}
                  disabled={busy}
                  onClick={() => doAnswer(s)}
                  className="rounded-lg border-2 border-ig-border px-3 py-2.5 text-sm font-bold text-ig-text-primary disabled:opacity-50"
                >
                  {t(`rightNow.status.${s}`)}
                </button>
              ))}
            </div>
            <button
              disabled={busy}
              onClick={() => doAnswer()}
              className="mt-2 w-full rounded-lg bg-ig-text-primary py-2.5 text-sm font-bold text-ig-primary disabled:opacity-50"
            >
              {busy ? t('placeQa.sending') : t('placeQa.send')}
            </button>
            <button onClick={() => setAnsweringId(null)} className="mt-2 w-full py-2 text-sm text-ig-text-tertiary">
              {t('placeQa.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
