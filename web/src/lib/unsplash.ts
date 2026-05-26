'use client';

// Unsplash photo search for the place "Select from Web suggestions" option.
// Requires NEXT_PUBLIC_UNSPLASH_ACCESS_KEY; returns [] (graceful no-op) if the
// key is absent so the rest of the photo sheet still works.

const ACCESS_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY ?? '';

export interface WebImage {
  id: string;
  /** Small thumbnail for the picker grid. */
  thumbUrl: string;
  /** Full-size URL to download + re-upload into our own media storage. */
  fullUrl: string;
  authorName: string;
}

export function unsplashConfigured(): boolean {
  return Boolean(ACCESS_KEY);
}

export async function searchWebImages(query: string): Promise<WebImage[]> {
  const q = query.trim();
  if (!ACCESS_KEY || q.length < 2) return [];
  try {
    const url =
      `https://api.unsplash.com/search/photos?per_page=12&orientation=landscape` +
      `&query=${encodeURIComponent(q)}&client_id=${ACCESS_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Array<{
        id: string;
        urls?: { small?: string; regular?: string };
        user?: { name?: string };
      }>;
    };
    return (data.results ?? [])
      .filter((r) => r.urls?.small && r.urls?.regular)
      .map((r) => ({
        id: r.id,
        thumbUrl: r.urls!.small!,
        fullUrl: r.urls!.regular!,
        authorName: r.user?.name ?? 'Unsplash',
      }));
  } catch {
    return [];
  }
}

/** Fetch a remote image as a File so it can go through our normal upload pipeline. */
export async function urlToFile(url: string, filename: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  const ext = blob.type.includes('png') ? 'png' : 'jpg';
  return new File([blob], `${filename}.${ext}`, { type: blob.type || 'image/jpeg' });
}
