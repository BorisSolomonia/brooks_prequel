// Right Now v2 · Phase A2 — typed client for free-text + preset Place Q&A.
// Design: repo root RIGHT_NOW_V2_DESIGN.md §4. Asking is remote-allowed (no coords); answering
// is present-only (native app). Answers are anonymous — the server never returns a responder id.

import { api } from '@/lib/api';
import { isNative } from '@/lib/capacitor';
import type { FlagCategory, Freshness } from '@/lib/rightNow';
import {
  RIGHT_NOW_ATTESTATION_TOKEN,
  RIGHT_NOW_DWELL_SECONDS,
  RIGHT_NOW_MIN_ACCURACY_FALLBACK,
} from '@/lib/rightNow';

/** Preset question keys — i18n by convention: placeQa.presets.<key>. */
export const QUESTION_PRESETS = ['CROWDED', 'OPEN', 'WEATHER', 'WAIT'] as const;
export type QuestionPreset = (typeof QUESTION_PRESETS)[number];

export interface PlaceAnswerView {
  id: string;
  bodyText: string | null;
  statusChip: string | null;
  freshness: Freshness;
  corroborated: boolean;
  contributorTier: string | null; // "TRUSTED" or null
}

export interface PlaceQuestionView {
  id: string;
  placeId: string;
  presetKey: string | null;
  bodyText: string | null;
  freeText: boolean;
  freshness: Freshness;
  suppressedForAnonymity: boolean;
  answers: PlaceAnswerView[];
}

export interface QuestionCreated {
  id: string;
  expiresInMinutes: number;
}

export interface AnswerCreated {
  id: string;
  expiresInMinutes: number;
}

export interface AskBody {
  presetKey?: string | null;
  bodyText?: string | null;
}

export interface AnswerBody {
  bodyText?: string | null;
  statusChip?: string | null;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  attestationToken?: string | null;
  dwellSeconds?: number | null;
}

export function askQuestion(placeId: string, body: AskBody, token: string): Promise<QuestionCreated> {
  return api.post<QuestionCreated>(`/api/community/places/${placeId}/questions`, body, token);
}

export function listQuestions(placeId: string, token: string): Promise<PlaceQuestionView[]> {
  return api.get<PlaceQuestionView[]>(`/api/community/places/${placeId}/questions`, token);
}

export function answerQuestion(questionId: string, body: AnswerBody, token: string): Promise<AnswerCreated> {
  return api.post<AnswerCreated>(`/api/community/questions/${questionId}/answers`, body, token);
}

export function voteAnswerHelpful(answerId: string, token: string): Promise<void> {
  return api.post<void>(`/api/community/answers/${answerId}/helpful`, undefined, token);
}

export function flagAnswer(answerId: string, category: FlagCategory, token: string): Promise<void> {
  return api.post<void>(`/api/community/answers/${answerId}/flag`, { category }, token);
}

/** Assemble the answer body from a GPS fix + content. Present-only; native supplies attestation. */
export function buildAnswerBody(
  coords: { latitude: number; longitude: number; accuracy?: number },
  content: { bodyText?: string; statusChip?: string },
): AnswerBody {
  return {
    bodyText: content.bodyText?.trim() || null,
    statusChip: content.statusChip || null,
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracyMeters: coords.accuracy ?? RIGHT_NOW_MIN_ACCURACY_FALLBACK,
    attestationToken: isNative() ? RIGHT_NOW_ATTESTATION_TOKEN : null,
    dwellSeconds: RIGHT_NOW_DWELL_SECONDS,
  };
}
