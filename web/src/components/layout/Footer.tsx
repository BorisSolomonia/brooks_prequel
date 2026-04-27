import Link from 'next/link';
import { compliance } from '@/lib/compliance';

const links = [
  { href: '/pricing', label: 'Products & prices' },
  { href: '/contact', label: 'Contact' },
  { href: '/terms', label: 'Terms' },
  { href: '/delivery', label: 'Delivery' },
  { href: '/refund', label: 'Refunds' },
];

export default function Footer() {
  return (
    <footer className="border-t border-ig-border bg-ig-primary px-4 py-8 pb-24 md:pb-8">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <p className="text-sm font-semibold text-ig-text-primary">{compliance.companyName}</p>
          <p className="mt-2 text-sm text-ig-text-secondary">
            {compliance.legalEntity} · {compliance.legalIdentifier}
          </p>
          <p className="mt-1 text-sm text-ig-text-tertiary">
            Support: {compliance.email} · {compliance.phone}
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="Legal and business information">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-ig-text-secondary transition-colors hover:text-ig-text-primary">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
