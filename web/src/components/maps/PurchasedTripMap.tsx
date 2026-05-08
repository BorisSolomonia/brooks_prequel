'use client';

import { useEffect, useRef, useState } from 'react';
import type { GeoJSONSource, Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { MyTripItem } from '@/types';

const CATEGORY_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVITY', label: 'Activity' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'SAFETY', label: 'Safety' },
  { value: 'ACCOMMODATION', label: 'Stay' },
  { value: 'SHOPPING', label: 'Shopping' },
];

const TRIP_ROUTE_SOURCE_ID = 'trip-route';
const TRIP_ROUTE_LAYER_ID = 'trip-route-line';

interface Props {
  items: MyTripItem[];
  mapboxToken: string;
  mapStyle: string;
}

function chronologicalSort(a: MyTripItem, b: MyTripItem): number {
  const aTime = a.scheduledStart ? new Date(a.scheduledStart).getTime() : 0;
  const bTime = b.scheduledStart ? new Date(b.scheduledStart).getTime() : 0;
  return aTime - bTime;
}

export default function PurchasedTripMap({ items, mapboxToken, mapStyle }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<MapboxMarker[]>([]);
  const mapboxModuleRef = useRef<typeof import('mapbox-gl') | null>(null);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [mapReady, setMapReady] = useState(false);

  const filteredItems = activeCategory === 'ALL'
    ? items
    : items.filter((item) => item.blockCategory === activeCategory);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !mapboxToken || !mapStyle) {
      return;
    }

    let cancelled = false;

    const initialize = async () => {
      const mapboxglModule = await import('mapbox-gl');
      const mapboxgl = mapboxglModule.default;
      mapboxModuleRef.current = mapboxglModule;
      mapboxgl.accessToken = mapboxToken;

      if (cancelled || !mapContainerRef.current) {
        return;
      }

      const validItems = items.filter((item) => item.latitude !== null && item.longitude !== null && !item.skipped);
      const firstItem = validItems[0];

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: mapStyle,
        center: firstItem ? [firstItem.longitude as number, firstItem.latitude as number] : [44.8014, 41.6938],
        zoom: firstItem ? 10 : 3,
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
      mapRef.current = map;

      map.on('load', () => {
        if (cancelled) return;
        map.addSource(TRIP_ROUTE_SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        map.addLayer({
          id: TRIP_ROUTE_LAYER_ID,
          type: 'line',
          source: TRIP_ROUTE_SOURCE_ID,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#ef2f6d',
            'line-width': 3,
            'line-dasharray': [2, 2],
            'line-opacity': 0.85,
          },
        });
        setMapReady(true);
      });
    };

    initialize().catch(() => {});

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      mapboxModuleRef.current = null;
      setMapReady(false);
    };
  }, [items, mapStyle, mapboxToken]);

  useEffect(() => {
    const map = mapRef.current;
    const mapboxglModule = mapboxModuleRef.current;
    if (!map || !mapboxglModule || !mapReady) {
      return;
    }

    const mapboxgl = mapboxglModule.default;
    const validItems = filteredItems
      .filter((item) => item.latitude !== null && item.longitude !== null && !item.skipped)
      .slice()
      .sort(chronologicalSort);

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    validItems.forEach((item, index) => {
      const markerElement = document.createElement('div');
      markerElement.style.width = '32px';
      markerElement.style.height = '32px';
      markerElement.style.borderRadius = '9999px';
      markerElement.style.background = 'var(--brand-primary)';
      markerElement.style.color = '#ffffff';
      markerElement.style.display = 'flex';
      markerElement.style.alignItems = 'center';
      markerElement.style.justifyContent = 'center';
      markerElement.style.fontSize = '13px';
      markerElement.style.fontWeight = '800';
      markerElement.style.border = '2px solid rgba(255,255,255,0.95)';
      markerElement.style.boxShadow = '0 6px 14px rgba(0,0,0,0.25)';
      markerElement.textContent = String(index + 1);

      const marker = new mapboxgl.Marker({ element: markerElement })
        .setLngLat([item.longitude as number, item.latitude as number])
        .setPopup(new mapboxgl.Popup({ offset: 14 }).setHTML(
          `<div style="color:#111827;font-weight:700;font-size:13px;line-height:1.3;padding:2px 0;">${index + 1}. ${item.placeName.replace(/</g, '&lt;')}</div>`
        ))
        .addTo(map);

      markersRef.current.push(marker);
    });

    const source = map.getSource(TRIP_ROUTE_SOURCE_ID) as GeoJSONSource | undefined;
    if (source) {
      const coordinates = validItems.map((item) => [item.longitude as number, item.latitude as number]);
      const features = coordinates.length >= 2
        ? [{
            type: 'Feature' as const,
            geometry: { type: 'LineString' as const, coordinates },
            properties: {},
          }]
        : [];
      source.setData({ type: 'FeatureCollection', features });
    }

    if (validItems.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      validItems.forEach((item) => bounds.extend([item.longitude as number, item.latitude as number]));
      map.fitBounds(bounds, { padding: 48, maxZoom: 12 });
    } else if (validItems.length === 1) {
      map.flyTo({
        center: [validItems[0].longitude as number, validItems[0].latitude as number],
        zoom: 12,
      });
    }
  }, [filteredItems, mapReady]);

  if (!mapboxToken || !mapStyle) {
    return (
      <div className="rounded-2xl border border-ig-border bg-ig-elevated p-4 text-sm text-ig-text-tertiary">
        Map configuration is missing. Set `MAPBOX_PUBLIC_TOKEN` and `MAPBOX_STYLE` to show purchased guide places on a map.
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-3">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setActiveCategory(cat.value)}
            className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors lg:min-h-0 lg:px-3 lg:py-1 lg:text-xs ${
              activeCategory === cat.value
                ? 'border-brand-500 bg-brand-500/15 text-brand-500'
                : 'border-ig-border bg-ig-elevated text-ig-text-secondary hover:border-ig-blue/40'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div ref={mapContainerRef} className="h-[40vh] max-h-72 min-h-56 w-full overflow-hidden rounded-2xl border border-ig-border md:h-80 md:max-h-96 md:min-h-72" />
    </div>
  );
}
