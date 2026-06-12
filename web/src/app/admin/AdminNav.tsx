'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';

const NAV_LINKS = [
  { href: '/admin/commission', labelKey: 'creatorTools.admin.navCommission' },
  { href: '/admin/promotions', labelKey: 'creatorTools.admin.navPromotions' },
  { href: '/admin/earnings', labelKey: 'creatorTools.admin.navEarnings' },
];

export default function AdminNav() {
  const { t } = useTranslation();
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {NAV_LINKS.map(({ href, labelKey }) => (
        <Link
          key={href}
          href={href}
          className={`font-display block rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
            pathname.startsWith(href)
              ? 'border border-[var(--brand-primary)] bg-[var(--bg-hover)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          {t(labelKey)}
        </Link>
      ))}
    </nav>
  );
}
