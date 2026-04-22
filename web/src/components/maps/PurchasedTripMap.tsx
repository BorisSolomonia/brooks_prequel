'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl';
import type { MyTripItem } from '@/types';

const CATEGORY_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVITY', label: 'Activity' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'SAFETY', label: 'Safety' },
  { value: 'ACCOMMODATION', label: 'Stay' },
  { value: 'SHOPPING', label: 'Shopping' },
];

interface Props {
  items: MyTripItem[];
  mapboxToken: string;
  mapStyle: string;
}

export default function PurchasedTripMap({ items, mapboxToken, mapStyle }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<MapboxMarker[]>([]);
  const mapboxModuleRef = useRef<typeof import('mapbox-gl') | null>(null);
  const [activeCategory, setActiveCategory] = useState('ALL');

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
    };

    initialize().catch(() => {});

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      mapboxModuleRef.current = null;
    };
  }, [items, mapStyle, mapboxToken]);

  useEffect(() => {
    const map = mapRef.current;
    const mapboxglModule = mapboxModuleRef.current;
    if (!map || !mapboxglModule) {
      return;
    }

    const mapboxgl = mapboxglModule.default;
    const validItems = filteredItems.filter((item) => item.latitude !== null && item.longitude !== null && !item.skipped);

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    validItems.forEach((item, index) => {
      const markerElement = document.createElement('div');
      markerElement.style.width = '28px';
      markerElement.style.height = '28px';
      markerElement.style.borderRadius = '9999px';
      markerElement.style.background = 'var(--brand-primary)';
      markerElement.style.color = '#ffffff';
      markerElement.style.display = 'flex';
      markerElement.style.alignItems = 'center';
      markerElement.style.justifyContent = 'center';
      markerElement.style.fontSize = '12px';
      markerElement.style.fontWeight = '700';
      markerElement.style.border = '2px solid rgba(255,255,255,0.92)';
      markerElement.textContent = String(index + 1);

      const marker = new mapboxgl.Marker({ element: markerElement })
        .setLngLat([item.longitude as number, item.latitude as number])
        .setPopup(new mapboxgl.Popup({ offset: 12 }).setHTML(`<strong>${item.placeName}</strong>`))
        .addTo(map);

      markersRef.current.push(marker);
    });

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
  }, [filteredItems]);

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
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              activeCategory === cat.value
                ? 'border-ig-blue bg-ig-blue/10 text-ig-blue'
                : 'border-ig-border bg-ig-elevated text-ig-text-secondary hover:border-ig-blue/40'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div ref={mapContainerRef} className="h-80 w-full overflow-hidden rounded-2xl border border-ig-border" />
    </div>
  );
}
