'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

// Mock data — a fully-static "preview trip" used by the onboarding tour so a brand-new
// user (who has no purchased trips yet) can see the trip-detail layout with the real
// "Add to Calendar" button in place. No backend calls.
const PREVIEW = {
  title: '48 Hours in Tbilisi',
  region: 'Tbilisi, Georgia',
  dayCount: 2,
  placeCount: 5,
  priceLabel: '$19.00',
  days: [
    {
      number: 1,
      title: 'Old Town & Coffee',
      places: [
        { name: 'Fabrika Tbilisi', address: '8 Ninoshvili Street', time: '09:00', tag: 'CREATIVE HUB',
          image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80' },
        { name: 'Old Town walk', address: 'Avlabari → Narikala', time: '11:30', tag: 'WALK',
          image: 'https://images.unsplash.com/photo-1565008576549-57569a49371d?auto=format&fit=crop&w=600&q=80' },
        { name: 'Lunch — Shavi Lomi', address: '23 Tabidze Street', time: '13:00', tag: 'RESTAURANT',
          image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80' },
      ],
    },
    {
      number: 2,
      title: 'Hills, Wine & Sulphur',
      places: [
        { name: 'Mtatsminda Funicular', address: 'Daniel Chonqadze St.', time: '10:00', tag: 'VIEW',
          image: 'https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0?auto=format&fit=crop&w=600&q=80' },
        { name: 'Sulphur Baths', address: 'Abano Street', time: '15:30', tag: 'EXPERIENCE',
          image: 'https://images.unsplash.com/photo-1542202229-7d93c33f5d07?auto=format&fit=crop&w=600&q=80' },
      ],
    },
  ],
};

export default function PreviewTripPage() {
  const { t } = useTranslation();
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/guides" className="text-sm text-brand-500 hover:text-brand-400">
            {t('guidePages.tripsPreview.backToPurchased')}
          </Link>
          <span className="ml-3 inline-flex items-center rounded-full border border-brand-500/40 bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-500">
            {t('guidePages.tripsPreview.previewBadge')}
          </span>
          <h1 className="mw-section-title mt-3 text-2xl md:text-3xl">{PREVIEW.title}</h1>
          <p className="mt-2 text-sm text-ig-text-secondary">
            {t('guidePages.tripsPreview.description')}
          </p>
          <p className="mt-3 text-xs text-ig-text-tertiary">
            {PREVIEW.region} • {PREVIEW.dayCount} days • {PREVIEW.placeCount} places • {PREVIEW.priceLabel}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 md:w-auto">
          <a
            href="https://www.google.com/maps/search/?api=1&query=41.7151,44.8271"
            target="_blank"
            rel="noreferrer"
            className="mw-button-secondary min-h-11 flex-1 rounded-md px-4 py-2 text-sm md:flex-none"
          >
            {t('guidePages.tripsPreview.openInMaps')}
          </a>
          <button
            data-tour="add-to-calendar"
            onClick={() => setCalendarOpen(true)}
            className="mw-button-primary min-h-11 flex-1 rounded-md px-4 py-2 text-sm md:flex-none"
          >
            📅 {t('guidePages.tripsPreview.addToCalendar')}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="order-2 space-y-6 lg:order-1">
          <div className="rounded-2xl border border-ig-border bg-ig-elevated p-4 md:p-5">
            <h2 className="text-base font-semibold text-ig-text-primary md:text-lg">{t('guidePages.tripsPreview.itinerary')}</h2>
            <div className="mt-4 space-y-6">
              {PREVIEW.days.map((day) => (
                <div key={day.number}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase tracking-wide text-brand-400">{t('guidePages.tripsPreview.dayTitle', { n: day.number, title: day.title })}</span>
                    <span className="text-xs text-ig-text-tertiary">{t('guidePages.tripsPreview.placeStat', { count: day.places.length })}</span>
                  </div>
                  <div className="space-y-3">
                    {day.places.map((place) => (
                      <div key={place.name} className="rounded-xl border border-ig-border bg-ig-primary">
                        <div className="flex gap-3 p-3">
                          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-ig-elevated">
                            <Image src={place.image} alt={place.name} fill sizes="64px" className="object-cover" unoptimized />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-brand-500/15 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-brand-500">
                                {place.time}
                              </span>
                              <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-ig-text-tertiary">
                                {place.tag}
                              </span>
                            </div>
                            <h3 className="mt-0.5 font-display text-sm font-black text-ig-text-primary">{place.name}</h3>
                            <p className="mt-0.5 truncate text-xs text-ig-text-tertiary">{place.address}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="order-1 space-y-6 lg:order-2">
          <div className="rounded-2xl border border-ig-border bg-ig-elevated p-4 md:p-5">
            <h2 className="text-base font-semibold text-ig-text-primary md:text-lg">{t('guidePages.tripsPreview.tripMap')}</h2>
            <p className="mt-1 text-sm text-ig-text-secondary">{t('guidePages.tripsPreview.tripMapDesc')}</p>
            <div className="mt-4 flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-ig-border bg-ig-primary text-sm text-ig-text-tertiary">
              {t('guidePages.tripsPreview.sampleMapPreview')}
            </div>
          </div>
        </div>
      </div>

      {calendarOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setCalendarOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl border border-ig-border bg-ig-elevated p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 text-base font-semibold text-ig-text-primary">{t('guidePages.tripsPreview.calendarModalTitle')}</h2>
            <p className="mb-4 text-sm text-ig-text-secondary">
              {t('guidePages.tripsPreview.calendarModalDesc')}
            </p>
            <button
              onClick={() => setCalendarOpen(false)}
              className="mw-button-primary w-full min-h-11 rounded-md px-4 py-2 text-sm"
            >
              {t('guidePages.tripsPreview.calendarModalGotIt')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
