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

export function useMapboxStyle(): string {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === 'light' ? LIGHT_STYLE : DARK_STYLE;
}

export function getMapboxStyleForResolvedTheme(resolvedTheme: string | undefined): string {
  return resolvedTheme === 'light' ? LIGHT_STYLE : DARK_STYLE;
}
