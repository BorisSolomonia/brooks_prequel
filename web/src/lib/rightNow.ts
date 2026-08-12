// BOR-86 "Right Now" — typed client for the community live-location endpoints.
// Design: repo root BOR86_RIGHT_NOW_DESIGN.md. The server never returns an author id,
// an exact timestamp, or a numeric reputation — only coarse, k-gated signals.

import { api } from '@/lib/api';

export type RightNowStatus = 'QUIET' | 'NORMAL' | 'BUSY' | 'CLOSED';
export type FlagCategory = 'MISLEADING' | 'OUTDATED' | 'UNSAFE' | 'HARASSMENT' | 'ILLEGAL' | 'OTHER';
export type ConsentPurpose = 'LOCATION_ELIGIBILITY' | 'PUBLIC_CARD';
// Coarse-key vocabularies shared with the server — drift becomes a compile error, not a
// silently missing translation. i18n keys are derived by convention: rightNow.fresh.<key>.
export type Freshness = 'under_15_min' | 'about_30_min' | 'about_1_hour' | 'over_1_hour';
export type DemandBucket = 'few' | 'several' | 'many';

// Policy constants that must match the backend defaults (app.community.*). One named home each,
// rather than magic numbers embedded in the view.
export const RIGHT_NOW_DWELL_SECONDS = 120;
export const RIGHT_NOW_ATTESTATION_TOKEN = 'native-attest-v1';
export const RIGHT_NOW_MIN_ACCURACY_FALLBACK = 9999;
export const DEFAULT_FLAG_CATEGORY: FlagCategory = 'MISLEADING';

export interface CommunityPlace {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  footfallClass: string;
}

export interface RightNowReportView {
  id: string;
  status: string; // effective key, e.g. QUIET / CLOSED / CLOSED_UNCONFIRMED
  waitBucket: string | null;
  freshness: Freshness;
  contributorTier: string | null; // TRUSTED or null — never a count
  corroborated: boolean;
  publicShared: boolean;
}

export interface RightNowFeed {
  placeId: string;
  placeName: string;
  demand: DemandBucket | null; // or null below K_count
  suppressedForAnonymity: boolean;
  reports: RightNowReportView[];
}

export interface AskResponse {
  placeId: string;
  demand: string | null;
  expiresInMinutes: number;
}

export interface ReportCreated {
  id: string;
  statusEffective: string;
  expiresInMinutes: number;
}

export interface SubmitReportBody {
  status: RightNowStatus;
  waitBucket?: string | null;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  attestationToken?: string | null;
  dwellSeconds?: number | null;
}

/** A small bounding box (~a few hundred metres) around a point. */
export function bboxAround(lat: number, lng: number, deltaDeg = 0.02) {
  return { north: lat + deltaDeg, south: lat - deltaDeg, east: lng + deltaDeg, west: lng - deltaDeg };
}

export function listPlaces(
  box: { north: number; south: number; east: number; west: number },
  token: string,
): Promise<CommunityPlace[]> {
  const qs = `north=${box.north}&south=${box.south}&east=${box.east}&west=${box.west}`;
  return api.get<CommunityPlace[]>(`/api/community/places?${qs}`, token);
}

/** Search places by name (remote asking / discovery), optionally scoped to a city. */
export function searchPlaces(query: string, token: string, city?: string): Promise<CommunityPlace[]> {
  const qs = `q=${encodeURIComponent(query)}${city ? `&city=${encodeURIComponent(city)}` : ''}`;
  return api.get<CommunityPlace[]>(`/api/community/places/search?${qs}`, token);
}

export function getRightNow(placeId: string, token: string): Promise<RightNowFeed> {
  return api.get<RightNowFeed>(`/api/community/places/${placeId}/right-now`, token);
}

export function askRightNow(placeId: string, token: string): Promise<AskResponse> {
  return api.post<AskResponse>(`/api/community/places/${placeId}/ask`, undefined, token);
}

export function submitReport(placeId: string, body: SubmitReportBody, token: string): Promise<ReportCreated> {
  return api.post<ReportCreated>(`/api/community/places/${placeId}/reports`, body, token);
}

/** Assemble the answer body from a status + a GPS fix. Keeps policy constants out of the view. */
export function buildSubmitBody(
  status: RightNowStatus,
  coords: { latitude: number; longitude: number; accuracy?: number },
  native: boolean,
): SubmitReportBody {
  return {
    status,
    latitude: coords.latitude,
    longitude: coords.longitude,
    // A vague fix can't prove presence; the server also rejects accuracy > radius.
    accuracyMeters: coords.accuracy ?? RIGHT_NOW_MIN_ACCURACY_FALLBACK,
    // Real Play Integrity / App Attest is a documented follow-up; the native shell is treated
    // as attested in v1. Web has no token → the server rejects (answering needs the app).
    attestationToken: native ? RIGHT_NOW_ATTESTATION_TOKEN : null,
    dwellSeconds: RIGHT_NOW_DWELL_SECONDS,
  };
}

export function voteHelpful(reportId: string, token: string): Promise<void> {
  return api.post<void>(`/api/community/reports/${reportId}/helpful`, undefined, token);
}

export function flagReport(reportId: string, category: FlagCategory, token: string): Promise<void> {
  return api.post<void>(`/api/community/reports/${reportId}/flag`, { category }, token);
}

export function blockContributor(userId: string, token: string): Promise<void> {
  return api.post<void>(`/api/community/contributors/${userId}/block`, undefined, token);
}

export function grantConsent(purpose: ConsentPurpose, token: string): Promise<void> {
  return api.post<void>(`/api/community/consent/${purpose}`, undefined, token);
}
