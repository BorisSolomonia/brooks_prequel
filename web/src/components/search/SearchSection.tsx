'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

interface SearchSectionProps {
  title: string;
  totalCount: number;
  seeAllHref: string;
  children: React.ReactNode;
}

export default function SearchSection({ title, totalCount, seeAllHref, children }: SearchSectionProps) {
  const { t } = useTranslation();
  if (totalCount === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-black uppercase tracking-[0.08em] text-ig-text-primary">{title}</h2>
        {totalCount > 5 && (
          <Link
            href={seeAllHref}
            className="inline-flex min-h-11 items-center font-display text-sm font-black uppercase tracking-[0.08em] text-brand-500 hover:text-brand-400 lg:min-h-0"
          >
            {t('discovery.search.seeAllResults', { count: totalCount })}
          </Link>
        )}
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </section>
  );
}
