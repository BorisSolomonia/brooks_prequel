'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function AboutPage() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto flex min-h-[calc(100vh-140px)] max-w-4xl flex-col justify-center px-5 py-14">
      <p className="mw-eyebrow">{t('about.eyebrow')}</p>
      <h1 className="mw-section-title mt-5 text-4xl md:text-6xl">
        {t('about.title')}
      </h1>
      <div className="mt-7 space-y-5 text-base leading-7 text-ig-text-secondary md:text-lg">
        <p>{t('about.p1')}</p>
        <p>{t('about.p2')}</p>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/guides" className="mw-button-primary rounded-md px-5 py-3 text-sm">
          {t('landing.guides.button')}
        </Link>
        <Link href="/contact" className="mw-button-secondary rounded-md px-5 py-3 text-sm">
          {t('nav.links.contact')}
        </Link>
      </div>
    </main>
  );
}
