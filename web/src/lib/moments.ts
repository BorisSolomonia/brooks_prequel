// Right Now v2 · Phase A1 — typed client for Location Moments (follower-scoped stories).
// Design: repo root RIGHT_NOW_V2_DESIGN.md. Moments are identified to the poster's FOLLOWERS
// (never public), 24h ephemeral, photo-only at launch. Posting is present-only (native app).

import { api } from '@/lib/api';
import { capturePhoto } from '@/lib/camera';
import { getCurrentCoords } from '@/lib/geolocation';
import { isNative } from '@/lib/capacitor';
import {
  RIGHT_NOW_ATTESTATION_TOKEN,
  RIGHT_NOW_DWELL_SECONDS,
  RIGHT_NOW_MIN_ACCURACY_FALLBACK,
} from '@/lib/rightNow';

export type MomentMediaType = 'PHOTO' | 'VIDEO';
export type MomentVisibility = 'FOLLOWERS' | 'CLOSE_FOLLOWERS';
// Coarse freshness keys shared with the backend MomentService.freshness(); i18n by convention:
// moments.fresh.<key>. Drift becomes a compile error rather than a missing translation.
export type MomentFreshness = 'just_now' | 'within_the_hour' | 'a_few_hours_ago' | 'earlier_today';

export interface MomentView {
  id: string;
  placeId: string;
  placeName: string | null;
  authorId: string;
  authorName: string | null;
  authorAvatarUrl: string | null;
  mediaRef: string;
  mediaType: MomentMediaType;
  caption: string | null;
  freshness: MomentFreshness;
  expiresInMinutes: number;
}

export interface MomentFeed {
  placeId: string;
  placeName: string;
  moments: MomentView[];
}

export interface MomentCreated {
  id: string;
  visibleInMinutes: number;
  expiresInMinutes: number;
}

export interface SubmitMomentBody {
  mediaRef: string;
  mediaType: MomentMediaType;
  caption?: string | null;
  visibility?: MomentVisibility | null;
  delayMinutes?: number | null;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  attestationToken?: string | null;
  dwellSeconds?: number | null;
  deviceId?: string | null;
  installId?: string | null;
  sessionId?: string | null;
}

// Moment media reuses the existing PLACE_IMAGE upload lane (a photo taken at a place) so no
// backend media-usage change is needed — the returned URL becomes the moment's mediaRef.
const MOMENT_MEDIA_USAGE = 'PLACE_IMAGE' as const;

/** Capture a photo (native camera) and upload it, returning the stored media URL. */
export async function captureAndUploadMomentPhoto(token: string): Promise<string | null> {
  const file = await capturePhoto();
  if (!file) return null;
  const uploaded = await api.uploadMedia(file, MOMENT_MEDIA_USAGE, token);
  return uploaded.url;
}

/** Assemble the post body from a media ref + a GPS fix. Keeps policy constants out of the view. */
export function buildMomentBody(
  mediaRef: string,
  coords: { latitude: number; longitude: number; accuracy?: number },
  opts?: { caption?: string; visibility?: MomentVisibility; delayMinutes?: number },
): SubmitMomentBody {
  return {
    mediaRef,
    mediaType: 'PHOTO',
    caption: opts?.caption?.trim() || null,
    visibility: opts?.visibility ?? 'FOLLOWERS',
    delayMinutes: opts?.delayMinutes ?? 0,
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracyMeters: coords.accuracy ?? RIGHT_NOW_MIN_ACCURACY_FALLBACK,
    // Web has no attestation token → the server rejects (posting needs the app), same as v1.
    attestationToken: isNative() ? RIGHT_NOW_ATTESTATION_TOKEN : null,
    dwellSeconds: RIGHT_NOW_DWELL_SECONDS,
  };
}

export function postMoment(placeId: string, body: SubmitMomentBody, token: string): Promise<MomentCreated> {
  return api.post<MomentCreated>(`/api/community/places/${placeId}/moments`, body, token);
}

export function listPlaceMoments(placeId: string, token: string): Promise<MomentFeed> {
  return api.get<MomentFeed>(`/api/community/places/${placeId}/moments`, token);
}

export function getMomentTray(token: string): Promise<MomentView[]> {
  return api.get<MomentView[]>(`/api/community/moments/tray`, token);
}

/** A user's active moments the viewer may see — used for the profile "moment ring". */
export function getUserMoments(userId: string, token: string): Promise<MomentView[]> {
  return api.get<MomentView[]>(`/api/community/users/${userId}/moments`, token);
}

export function recordMomentView(
  momentId: string,
  token: string,
  ping?: { dwellMs?: number; sessionId?: string },
): Promise<void> {
  return api.post<void>(`/api/community/moments/${momentId}/view`, ping ?? {}, token);
}

export function reactToMoment(momentId: string, token: string): Promise<void> {
  return api.post<void>(`/api/community/moments/${momentId}/react`, undefined, token);
}

export function ghostMoment(momentId: string, ghost: boolean, token: string): Promise<void> {
  return api.post<void>(`/api/community/moments/${momentId}/ghost?ghost=${ghost}`, undefined, token);
}

export function takedownMoment(momentId: string, token: string): Promise<void> {
  return api.delete<void>(`/api/community/moments/${momentId}`, token);
}

/** Convenience end-to-end post: capture → upload → resolve coords → post. Native only. */
export async function captureAndPostMoment(
  placeId: string,
  token: string,
  opts?: { caption?: string; visibility?: MomentVisibility; delayMinutes?: number },
): Promise<MomentCreated | null> {
  const mediaRef = await captureAndUploadMomentPhoto(token);
  if (!mediaRef) return null;
  const coords = await getCurrentCoords();
  if (!coords) return null;
  return postMoment(placeId, buildMomentBody(mediaRef, coords, opts), token);
}
