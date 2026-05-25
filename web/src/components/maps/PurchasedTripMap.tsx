'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker, Polyline as LeafletPolyline } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { rasterTileUrl, useMapboxStyle } from '@/lib/mapboxStyle';
import type { MyTripItem } from '@/types';

// Renders purchased-guide places on a map. Uses Leaflet + Mapbox RASTER tiles
// (plain <img>, no WebGL) instead of mapbox-gl: the Android System WebView's
// GPU layer never frees mapbox-gl's evicted tile GL textures on pan, which
// ratchets memory to ~4 GB → LMK kill. With raster tiles there are no GL
// textures to leak, so this stays bounded even with many guides/places open
// across the app. See POSTMORTEM_MAPS_GPU_OOM.md.

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

function chronologicalSort(a: MyTripItem, b: MyTripItem): number {
  const aTime = a.scheduledStart ? new Date(a.scheduledStart).getTime() : 0;
  const bTime = b.scheduledStart ? new Date(b.scheduledStart).getTime() : 0;
  return aTime - bTime;
}

export default function PurchasedTripMap({ items, mapboxToken, mapStyle: _mapStylePropIgnored }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LeafletMarker[]>([]);
  const routeRef = useRef<LeafletPolyline | null>(null);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [mapReady, setMapReady] = useState(false);
  const themedStyle = useMapboxStyle();

  const initialCenterRef = useRef<[number, number] | null>(null);
  const initialZoomRef = useRef<number>(3);
  if (!initialCenterRef.current) {
    const validItems = items.filter((item) => item.latitude !== null && item.longitude !== null && !item.skipped);
    const firstItem = validItems[0];
    // [lat, lng] for Leaflet. Default to Tbilisi when there are no points yet.
    initialCenterRef.current = firstItem
      ? [firstItem.latitude as number, firstItem.longitude as number]
      : [41.6938, 44.8014];
    initialZoomRef.current = firstItem ? 10 : 3;
  }

  const filteredItems = activeCategory === 'ALL'
    ? items
    : items.filter((item) => item.blockCategory === activeCategory);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !mapboxToken || !themedStyle) {
      return;
    }

    let cancelled = false;

    const initialize = async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !mapContainerRef.current) {
        return;
      }

      const map = L.map(mapContainerRef.current, {
        center: initialCenterRef.current!,
        zoom: initialZoomRef.current,
        zoomControl: true,
        attributionControl: true,
        zoomSnap: 0.5,
      });
      mapRef.current = map;

      L.tileLayer(rasterTileUrl(themedStyle, mapboxToken), {
        tileSize: 512,
        zoomOffset: -1,
        minZoom: 1,
        maxZoom: 20,
        crossOrigin: true,
        attribution: '© Mapbox © OpenStreetMap',
      }).addTo(map);

      map.whenReady(() => {
        if (cancelled) return;
        // Leaflet measures the container at init; re-measure now and next frame
        // in case the surrounding layout settled a tick late (blank/half map).
        map.invalidateSize();
        requestAnimationFrame(() => { if (!cancelled) map.invalidateSize(); });
        setMapReady(true);
      });
    };

    initialize().catch(() => {});

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      routeRef.current?.remove();
      routeRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [themedStyle, mapboxToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }

    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !mapRef.current) return;

      const validItems = filteredItems
        .filter((item) => item.latitude !== null && item.longitude !== null && !item.skipped)
        .slice()
        .sort(chronologicalSort);

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      validItems.forEach((item, index) => {
        const html = `<div style="width:32px;height:32px;border-radius:9999px;background:var(--brand-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;border:2px solid rgba(255,255,255,0.95);box-shadow:0 6px 14px rgba(0,0,0,0.25)">${index + 1}</div>`;
        const icon = L.divIcon({ html, className: '', iconSize: [32, 32], iconAnchor: [16, 16] });
        const marker = L.marker([item.latitude as number, item.longitude as number], { icon })
          .bindPopup(
            `<div style="color:#111827;font-weight:700;font-size:13px;line-height:1.3;padding:2px 0;">${index + 1}. ${item.placeName.replace(/</g, '&lt;')}</div>`,
            { offset: [0, -14] },
          )
          .addTo(map);
        markersRef.current.push(marker);
      });

      // Dashed route line connecting the places in order.
      routeRef.current?.remove();
      routeRef.current = null;
      if (validItems.length >= 2) {
        const latlngs = validItems.map((item) => [item.latitude as number, item.longitude as number] as [number, number]);
        routeRef.current = L.polyline(latlngs, {
          color: '#ef2f6d',
          weight: 3,
          dashArray: '6 6',
          opacity: 0.85,
        }).addTo(map);
      }

      if (validItems.length > 1) {
        const bounds = L.latLngBounds(
          validItems.map((item) => [item.latitude as number, item.longitude as number] as [number, number]),
        );
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 });
      } else if (validItems.length === 1) {
        map.setView([validItems[0].latitude as number, validItems[0].longitude as number], 12, { animate: false });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filteredItems, mapReady]);

  if (!mapboxToken || !themedStyle) {
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
