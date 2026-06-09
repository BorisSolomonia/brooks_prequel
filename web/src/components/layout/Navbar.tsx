'use client';

import { Suspense, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import GlobalSearchBar from '@/components/layout/GlobalSearchBar';
import ThemeToggle from '@/components/theme/ThemeToggle';
import NotificationBell from '@/components/notifications/NotificationBell';
import { startAuthFlow, startLogoutFlow } from '@/lib/capacitor';
import { clearAccessTokenCache } from '@/hooks/useAccessToken';

// Shared click handler for any "Sign In" entry point. On web this navigates
// to /api/auth/login; on native, startAuthFlow does the full deep-link
// handover (Custom Tab → custom URI scheme → WebView callback).
function handleSignInClick(event: React.MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  void startAuthFlow();
}

// Shared click handler for any "Log Out" entry point. Clears the shared token
// cache, then runs the native-aware logout (web: full nav to /api/auth/logout;
// native: clear local session + Custom-Tab /v2/logout, see startLogoutFlow).
// The <a href="/api/auth/logout"> stays as a no-JS fallback.
function handleLogoutClick(event: React.MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  clearAccessTokenCache();
  void startLogoutFlow();
}

function SearchBarFallback() {
  return (
    <div className="h-11 min-w-0 flex-1 rounded-full border-2 border-ig-border bg-ig-elevated md:h-10 md:max-w-xl" />
  );
}

const desktopLinks = [
  { href: '/search', label: 'Explore' },
  { href: '/maps', label: 'Maps', auth: true },
  { href: '/guides', label: 'My Guides', auth: true },
  { href: '/memories', label: 'My Memories', auth: true },
  { href: '/trips', label: 'Purchased guides', auth: true },
  { href: '/pricing', label: 'Pricing' },
  { href: '/contact', label: 'Contact' },
  { href: '/profile', label: 'Profile', auth: true },
  { href: '/settings', label: 'Settings', auth: true },
];

const mobileTabs = [
  { href: '/search', label: 'Explore', icon: 'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Zm5.3-2.2L21 21' },
  { href: '/maps', label: 'Maps', auth: true, icon: 'M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Zm0 0V3m6 18V6' },
  { href: '/guides', label: 'Guides', auth: true, icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z' },
  // BOR-30: "Purchased guides" left the bottom tab bar in favour of "Memories"
  // (the core social feature). Purchased guides stays reachable via the desktop
  // nav and the mobile "Menu" dropdown below.
  { href: '/memories', label: 'Memories', auth: true, icon: 'M6 4h12v16l-6-4-6 4V4Z' },
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
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);
  const visibleDesktopLinks = desktopLinks.filter((link) => !link.auth || user);
  const visibleMobileTabs = mobileTabs.filter((tab) => !tab.auth || user);

  useEffect(() => {
    if (mobileMenuRef.current?.open) {
      mobileMenuRef.current.removeAttribute('open');
    }
  }, [pathname]);

  return (
    <>
    <nav className="sticky top-0 z-50 border-b-2 border-ig-border bg-ig-elevated/95 pt-safe-top backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-2 px-3 md:h-[60px] md:gap-4 md:px-4">
        <Link href="/" className="font-display shrink-0 text-base font-black uppercase tracking-[0.08em] text-brand-500 md:text-xl">
          Brooks
        </Link>
        <div data-tour="search-bar" className="min-w-0 flex-1">
          <Suspense fallback={<SearchBarFallback />}>
            <GlobalSearchBar />
          </Suspense>
        </div>

        <div className="hidden items-center gap-3 whitespace-nowrap md:flex">
          {isLoading ? (
            <div className="h-9 w-20 animate-pulse rounded-md border border-ig-border bg-ig-elevated" />
          ) : (
            <>
              {visibleDesktopLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  data-tour={link.href === '/trips' ? 'trips-tab' : undefined}
                  className={`font-display text-xs font-bold uppercase tracking-[0.08em] transition-colors ${
                    isActive(pathname, link.href)
                      ? 'text-ig-text-primary'
                      : 'text-ig-text-secondary hover:text-ig-text-primary'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <NotificationBell />
              <ThemeToggle />
              {user ? (
                <a
                  href="/api/auth/logout"
                  onClick={handleLogoutClick}
                  className="mw-button-secondary rounded-md px-4 py-2 text-sm transition-colors hover:bg-ig-hover"
                >
                  Log Out
                </a>
              ) : (
                <Link
                  href="/api/auth/login"
                  onClick={handleSignInClick}
                  className="mw-button-primary rounded-md px-4 py-2 text-sm transition-colors"
                >
                  Sign In
                </Link>
              )}
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 md:hidden">
          <NotificationBell />
          <ThemeToggle />
          {isLoading ? (
            <div className="h-12 w-12 animate-pulse rounded-full border border-ig-border bg-ig-elevated" />
          ) : user ? (
            <details ref={mobileMenuRef} className="group relative">
              <summary className="flex h-12 min-w-12 cursor-pointer list-none items-center justify-center rounded-full border-2 border-ig-border bg-ig-elevated px-3 text-sm font-semibold text-ig-text-primary [&::-webkit-details-marker]:hidden">
                Menu
              </summary>
              <div className="mw-panel absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-2xl">
                <Link href="/search" className="block px-4 py-3 text-sm text-ig-text-primary hover:bg-ig-hover">Explore</Link>
                <Link href="/maps" className="block px-4 py-3 text-sm text-ig-text-primary hover:bg-ig-hover">Maps</Link>
                <Link href="/guides" className="block px-4 py-3 text-sm text-ig-text-primary hover:bg-ig-hover">My Guides</Link>
                <Link href="/trips" className="block px-4 py-3 text-sm text-ig-text-primary hover:bg-ig-hover">Purchased guides</Link>
                <Link href="/profile" className="block px-4 py-3 text-sm text-ig-text-primary hover:bg-ig-hover">Profile</Link>
                <Link href="/settings" className="block px-4 py-3 text-sm text-ig-text-primary hover:bg-ig-hover">Settings</Link>
                <Link href="/pricing" className="block px-4 py-3 text-sm text-ig-text-primary hover:bg-ig-hover">Pricing</Link>
                <Link href="/contact" className="block px-4 py-3 text-sm text-ig-text-primary hover:bg-ig-hover">Contact</Link>
                <a href="/api/auth/logout" onClick={handleLogoutClick} className="block border-t border-ig-border px-4 py-3 text-sm text-ig-text-primary hover:bg-ig-hover">Log Out</a>
              </div>
            </details>
          ) : (
            <Link
              href="/api/auth/login"
              onClick={handleSignInClick}
              className="mw-button-primary inline-flex h-12 items-center rounded-full px-4 text-sm transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
    {/* Stronger backdrop-blur-xl + slight desaturation underneath give the
        bottom-tab nav clear separation from the map / page content without
        sacrificing the parchment transparency. Per-Link text-shadow lifts
        labels + icons over busy backgrounds like map tiles. */}
    {/* Only render the bottom tab bar when it offers real multi-destination
        navigation. For logged-out users every tab except Explore is auth-gated,
        so the bar collapses to a SINGLE Explore/search icon — a redundant
        "transparent search button" sitting next to the top GlobalSearchBar
        (BOR-25). Suppress that degenerate one-button bar; the full logged-in
        5-tab nav and the top search are unaffected. */}
    {visibleMobileTabs.length > 1 && (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-ig-border bg-ig-elevated/95 backdrop-blur-xl backdrop-saturate-50 md:hidden" aria-label="Primary">
      <div className="mx-auto flex max-w-lg justify-around px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)]">
        {visibleMobileTabs.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              data-tour={tab.href === '/trips' ? 'trips-tab' : undefined}
              className={`flex min-h-[60px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold transition-colors [text-shadow:0_1px_2px_rgba(15,23,42,0.18)] ${
                active ? 'text-brand-500' : 'text-ig-text-secondary hover:text-ig-text-primary'
              }`}
            >
              <MobileTabIcon path={tab.icon} />
              <span className="leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
    )}
    </>
  );
}
