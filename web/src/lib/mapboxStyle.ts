'use client';

import { useTheme } from 'next-themes';

const DARK_STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE ?? 'mapbox://styles/mapbox/dark-v11';
const LIGHT_STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE_LIGHT ?? 'mapbox://styles/mapbox/standard';

export function useMapboxStyle(): string {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === 'light' ? LIGHT_STYLE : DARK_STYLE;
}

export function getMapboxStyleForResolvedTheme(resolvedTheme: string | undefined): string {
  return resolvedTheme === 'light' ? LIGHT_STYLE : DARK_STYLE;
}
