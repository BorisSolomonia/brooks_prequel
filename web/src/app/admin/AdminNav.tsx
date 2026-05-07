'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/admin/commission', label: 'Commission Rules' },
  { href: '/admin/promotions', label: 'Promotions' },
  { href: '/admin/earnings', label: 'Earnings' },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {NAV_LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`font-display block rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
            pathname.startsWith(href)
              ? 'border border-[var(--brand-primary)] bg-[var(--bg-hover)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
