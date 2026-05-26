'use client';

// Mapbox Geocoding helpers (forward = search a place, reverse = coords → place).
// These are plain HTTPS/JSON requests of a few KB — NO WebGL, no GPU textures,
// no retained layers — so they have negligible memory cost (unlike map tiles).

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN ?? '';

export interface GeoPlace {
  /** Full human label, e.g. "Tbilisi, Georgia". */
  placeName: string;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
}

interface MapboxContext {
  id?: string;
  text?: string;
}
interface MapboxFeature {
  place_name?: string;
  place_type?: string[];
  text?: string;
  center?: [number, number];
  context?: MapboxContext[];
}

// Pull city/region/country out of a feature: the feature's own `text` covers its
// type, and `context[]` carries the broader administrative levels.
function toGeoPlace(feature: MapboxFeature): GeoPlace | null {
  const center = feature.center;
  if (!center || center.length < 2) return null;
  const ctx = feature.context ?? [];
  const ctxText = (prefix: string) =>
    ctx.find((c) => (c.id ?? '').startsWith(prefix))?.text ?? null;
  const type = feature.place_type?.[0];

  const city = type === 'place' ? feature.text ?? null : ctxText('place');
  const region = type === 'region' ? feature.text ?? null : ctxText('region');
  const country = type === 'country' ? feature.text ?? null : ctxText('country');

  return {
    placeName: feature.place_name ?? feature.text ?? '',
    city,
    region,
    country,
    longitude: center[0],
    latitude: center[1],
  };
}

/** Coords → nearest city/region/country. Returns null on failure (callers fall back gracefully). */
export async function reverseGeocode(latitude: number, longitude: number): Promise<GeoPlace | null> {
  if (!TOKEN) return null;
  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json` +
      `?access_token=${TOKEN}&types=place,region,country&language=en&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: MapboxFeature[] };
    const feature = data.features?.[0];
    return feature ? toGeoPlace(feature) : null;
  } catch {
    return null;
  }
}

// A located point of interest / address — what a place search resolves to.
export interface GeoPoi {
  /** Short name (POI/business name, or the address line). */
  name: string;
  /** Full address label, e.g. "Rustaveli Ave 2, Tbilisi, Georgia". */
  address: string;
  latitude: number;
  longitude: number;
}

function toGeoPoi(feature: MapboxFeature): GeoPoi | null {
  const center = feature.center;
  if (!center || center.length < 2) return null;
  return {
    name: feature.text ?? feature.place_name ?? '',
    address: feature.place_name ?? feature.text ?? '',
    longitude: center[0],
    latitude: center[1],
  };
}

// Search a place by NAME (POIs/landmarks first, then places/addresses). Used by
// the place "name" field: picking a result fills the address + coordinates.
// `kinds` lets the address field bias toward `address,poi` instead.
export async function searchPlaces(
  query: string,
  kinds: string = 'poi,address,place',
): Promise<GeoPoi[]> {
  const q = query.trim();
  if (!TOKEN || q.length < 2) return [];
  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
      `?access_token=${TOKEN}&types=${kinds}&language=en&limit=6`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { features?: MapboxFeature[] };
    return (data.features ?? []).map(toGeoPoi).filter((p): p is GeoPoi => p !== null);
  } catch {
    return [];
  }
}

/** Coords → nearest street address line (for the map picker). Null on failure. */
export async function reverseGeocodeAddress(latitude: number, longitude: number): Promise<string | null> {
  if (!TOKEN) return null;
  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json` +
      `?access_token=${TOKEN}&types=address,poi,place&language=en&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: MapboxFeature[] };
    return data.features?.[0]?.place_name ?? null;
  } catch {
    return null;
  }
}

/** City typeahead — returns up to 5 place suggestions for an input query. */
export async function searchCities(query: string): Promise<GeoPlace[]> {
  const q = query.trim();
  if (!TOKEN || q.length < 2) return [];
  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
      `?access_token=${TOKEN}&types=place&language=en&limit=5`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { features?: MapboxFeature[] };
    return (data.features ?? [])
      .map(toGeoPlace)
      .filter((p): p is GeoPlace => p !== null);
  } catch {
    return [];
  }
}
