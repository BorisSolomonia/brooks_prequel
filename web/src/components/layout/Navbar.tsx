'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import GlobalSearchBar from '@/components/layout/GlobalSearchBar';

function SearchBarFallback() {
  return (
    <div className="h-11 min-w-0 flex-1 rounded-full border border-ig-border bg-ig-elevated md:h-10 md:max-w-xl" />
  );
}

const desktopLinks = [
  { href: '/search', label: 'Explore' },
  { href: '/maps', label: 'Maps', auth: true },
  { href: '/purchases', label: 'Purchases', auth: true },
  { href: '/guides', label: 'My Guides', auth: true },
  { href: '/trips', label: 'My Trips', auth: true },
  { href: '/contact', label: 'Contact' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/profile', label: 'Profile', auth: true },
];

const mobileTabs = [
  { href: '/search', label: 'Explore', icon: 'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Zm5.3-2.2L21 21' },
  { href: '/maps', label: 'Maps', auth: true, icon: 'M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Zm0 0V3m6 18V6' },
  { href: '/guides', label: 'Guides', auth: true, icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z' },
  { href: '/trips', label: 'Trips', auth: true, icon: 'M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Zm0-8.5A2.5 2.5 0 1 0 12 7a2.5 2.5 0 0 0 0 5.5Z' },
  { href: '/profile', label: 'Profile', auth: true, icon: 'M20 21a8 8 0 1 0-16 0m12-13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z' },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MobileTabIcon({ path }: { path: string }) {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

export default function Navbar() {
  const { user, isLoading } = useUser();
  const pathname = usePathname();
  const visibleDesktopLinks = desktopLinks.filter((link) => !link.auth || user);
  const visibleMobileTabs = mobileTabs.filter((tab) => !tab.auth || user);

  return (
    <>
    <nav className="sticky top-0 z-50 border-b border-ig-border bg-ig-primary/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-2 px-3 md:h-[60px] md:gap-4 md:px-4">
        <Link href="/" className="shrink-0 text-base font-semibold text-ig-text-primary md:text-xl">
          Brooks
        </Link>
        <Suspense fallback={<SearchBarFallback />}>
          <GlobalSearchBar />
        </Suspense>

        <div className="hidden items-center gap-3 whitespace-nowrap md:flex">
          {isLoading ? (
            <div className="h-9 w-20 animate-pulse rounded-md border border-ig-border bg-ig-elevated" />
          ) : (
            <>
              {visibleDesktopLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-normal transition-colors ${
                    isActive(pathname, link.href)
                      ? 'text-ig-text-primary'
                      : 'text-ig-text-secondary hover:text-ig-text-primary'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <a
                  href="/api/auth/logout"
                  className="rounded-md border border-ig-border bg-ig-elevated px-4 py-2 text-sm font-semibold text-ig-text-primary transition-colors hover:bg-ig-hover"
                >
                  Log Out
                </a>
              ) : (
                <Link
                  href="/api/auth/login"
                  className="rounded-md bg-ig-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ig-blue-hover"
                >
                  Sign In
                </Link>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 md:hidden">
          {isLoading ? (
            <div className="h-12 w-12 animate-pulse rounded-full border border-ig-border bg-ig-elevated" />
          ) : user ? (
            <details className="group relative">
              <summary className="flex h-12 min-w-12 cursor-pointer list-none items-center justify-center rounded-full border border-ig-border bg-ig-elevated px-3 text-sm font-semibold text-ig-text-primary [&::-webkit-details-marker]:hidden">
                Menu
              </summary>
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-48 overflow-hidden rounded-2xl border border-ig-border bg-ig-elevated shadow-2xl">
                <Link href="/purchases" className="block px-4 py-3 text-sm text-ig-text-primary hover:bg-ig-hover">Purchases</Link>
                <a href="/api/auth/logout" className="block px-4 py-3 text-sm text-ig-text-primary hover:bg-ig-hover">Log Out</a>
              </div>
            </details>
          ) : (
            <Link
              href="/api/auth/login"
              className="inline-flex h-12 items-center rounded-full bg-ig-blue px-4 text-sm font-semibold text-white transition-colors hover:bg-ig-blue-hover"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-ig-border bg-ig-primary/95 backdrop-blur md:hidden" aria-label="Primary">
      <div className="mx-auto flex max-w-lg justify-around px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)]">
        {visibleMobileTabs.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-[60px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium transition-colors ${
                active ? 'text-ig-blue' : 'text-ig-text-tertiary hover:text-ig-text-primary'
              }`}
            >
              <MobileTabIcon path={tab.icon} />
              <span className="leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
    </>
  );
}
