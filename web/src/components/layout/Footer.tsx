'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { compliance } from '@/lib/compliance';
import { useOnboarding } from '@/components/onboarding/OnboardingProvider';

// BOR-41: labels are i18n keys resolved at render.
const links = [
  { href: '/pricing', labelKey: 'footer.links.productsAndPrices' },
  { href: '/contact', labelKey: 'footer.links.contact' },
  { href: '/terms', labelKey: 'footer.links.terms' },
  { href: '/privacy', labelKey: 'footer.links.privacy' },
  { href: '/refund', labelKey: 'footer.links.refunds' },
  { href: '/delivery', labelKey: 'footer.links.delivery' },
];

export default function Footer() {
  const { start } = useOnboarding();
  const { t } = useTranslation();
  // Hidden on mobile (`hidden md:block`): the legal/business links here are
  // relocated to /settings on small screens — May 2026 IA cleanup keeps every
  // mobile page edge-to-edge. The desktop fat footer is preserved for SEO
  // and the long-form-page convention.
  return (
    <footer className="hidden border-t-2 border-ig-border bg-ig-primary px-4 py-8 md:block md:pb-8">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <p className="font-display text-sm font-black uppercase tracking-[0.08em] text-ig-text-primary">{compliance.companyName}</p>
          <p className="mt-2 text-sm text-ig-text-secondary">
            {compliance.legalEntity} - {compliance.legalIdentifier}
          </p>
          <p className="mt-1 text-sm text-ig-text-tertiary">
            {t('footer.support')}: {compliance.email} - {compliance.phone}
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 font-display text-xs font-black uppercase tracking-[0.08em]" aria-label={t('footer.ariaLegal')}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-ig-text-secondary transition-colors hover:text-brand-500">
              {t(link.labelKey)}
            </Link>
          ))}
          <button
            type="button"
            onClick={start}
            data-tour="help-link"
            className="text-ig-text-secondary transition-colors hover:text-brand-500"
          >
            {t('footer.help')}
          </button>
        </nav>
      </div>
    </footer>
  );
}
