import MapsExperience from '@/components/maps/MapsExperience';

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
