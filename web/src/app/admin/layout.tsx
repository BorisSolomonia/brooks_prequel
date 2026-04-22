'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAccessToken } from '@/hooks/useAccessToken';
import { api } from '@/lib/api';
import type { User } from '@/types';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { token, loading: tokenLoading } = useAccessToken();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (tokenLoading) return;
    if (!token) {
      router.replace('/');
      return;
    }

    api.get<User>('/api/auth/me', token)
      .then((user) => {
        if (user.role !== 'ADMIN') {
          router.replace('/');
        } else {
          setChecking(false);
        }
      })
      .catch(() => router.replace('/'));
  }, [token, tokenLoading, router]);

  if (tokenLoading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)]" />
      </div>
    );
  }

  const navLinks = [
    { href: '/admin/commission', label: 'Commission Rules' },
    { href: '/admin/promotions', label: 'Promotions' },
    { href: '/admin/earnings', label: 'Earnings' },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-6 shrink-0">
        <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-4">Admin</p>
        <nav className="space-y-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname.startsWith(href)
                  ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 p-8 overflow-auto">{children}</div>
    </div>
  );
}
