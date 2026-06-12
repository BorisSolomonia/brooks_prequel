'use client';

import { useTheme } from 'next-themes';

const DARK_STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE ?? 'mapbox://styles/mapbox/dark-v11';
// IMPORTANT: keep this on `light-v11` (the classic 2D style), NOT
// `standard`. Mapbox Standard is the newer 3D-with-terrain style that
// loads vector terrain meshes + 3D buildings + atmospheric effects.
// On Android WebView renderers that's enough memory pressure to push
// /maps past the OOM ceiling we already fight with maxTileCacheSize.
// Light-v11 uses the same render path as dark-v11, which we know
// stays inside the renderer's budget. Override via
// NEXT_PUBLIC_MAPBOX_STYLE_LIGHT env var only when targeting a
// platform that can afford the 3D style (desktop, future native iOS).
const LIGHT_STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE_LIGHT ?? 'mapbox://styles/mapbox/light-v11';

// BOR-57: only the actual dark theme gets dark map tiles. light AND the new
// "dim" (cool-light) theme both use the light style — keying on `=== 'dark'`
// (rather than `=== 'light'`) makes dim fall through to light tiles correctly.
export function useMapboxStyle(): string {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === 'dark' ? DARK_STYLE : LIGHT_STYLE;
}

export function getMapboxStyleForResolvedTheme(resolvedTheme: string | undefined): string {
  return resolvedTheme === 'dark' ? DARK_STYLE : LIGHT_STYLE;
}

// Convert the mapbox style URL (mapbox://styles/<user>/<style>) into a Mapbox
// *raster* tiles endpoint (512px @2x) for Leaflet. Raster tiles are plain
// <img> elements the WebView garbage-collects normally — unlike mapbox-gl's
// WebGL tile textures, which the Android System WebView's GPU layer never frees
// on pan (it ratchets to ~4 GB → LMK kill). Every map in the app must render
// through Leaflet + this URL, never mapbox-gl, to stay inside the WebView's
// memory budget. See POSTMORTEM_MAPS_GPU_OOM.md.
export function rasterTileUrl(themedStyle: string, token: string): string {
  const path = themedStyle.replace('mapbox://styles/', '').trim() || 'mapbox/dark-v11';
  return `https://api.mapbox.com/styles/v1/${path}/tiles/512/{z}/{x}/{y}@2x?access_token=${token}`;
}
