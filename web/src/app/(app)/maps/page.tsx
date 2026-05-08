import MapsExperience from '@/components/maps/MapsExperience';

// Maps is fully interactive (Mapbox GL on the client) and reads its initial state from
// useSearchParams in the imported component tree. Marking it dynamic avoids the
// "useSearchParams() should be wrapped in a suspense boundary" prerender error.
export const dynamic = 'force-dynamic';

function parseNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function MapsPage() {
  return (
    <MapsExperience
      mapboxToken={process.env.MAPBOX_PUBLIC_TOKEN ?? ''}
      mapStyle={process.env.MAPBOX_STYLE ?? ''}
      fallbackLatitude={parseNumber(process.env.MAP_DEFAULT_LAT)}
      fallbackLongitude={parseNumber(process.env.MAP_DEFAULT_LNG)}
      fallbackZoom={parseNumber(process.env.MAP_DEFAULT_ZOOM)}
    />
  );
}
