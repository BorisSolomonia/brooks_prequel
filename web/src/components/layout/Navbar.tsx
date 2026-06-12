'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useTranslation } from 'react-i18next';
import { useMenuCoordinator } from '@/components/layout/MenuCoordinator';
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

// BOR-41: labels are i18n keys resolved via t() at render. hrefs/icons unchanged.
const desktopLinks = [
  { href: '/search', labelKey: 'nav.links.explore' },
  { href: '/maps', labelKey: 'nav.links.maps', auth: true },
  { href: '/guides', labelKey: 'nav.links.myGuides', auth: true },
  { href: '/memories', labelKey: 'nav.links.myMemories', auth: true },
  { href: '/pricing', labelKey: 'nav.links.pricing' },
  { href: '/contact', labelKey: 'nav.links.contact' },
  { href: '/profile', labelKey: 'nav.links.profile', auth: true },
  { href: '/settings', labelKey: 'nav.links.settings', auth: true },
];

const mobileTabs = [
  { href: '/search', labelKey: 'nav.links.explore', icon: 'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Zm5.3-2.2L21 21' },
  { href: '/maps', labelKey: 'nav.links.maps', auth: true, icon: 'M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Zm0 0V3m6 18V6' },
  { href: '/guides', labelKey: 'nav.links.guides', auth: true, icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z' },
  // BOR-30: "Purchased guides" left the bottom tab bar in favour of "Memories"
  // (the core social feature). Purchased guides stays reachable via the desktop
  // nav and the mobile "Menu" dropdown below.
  { href: '/memories', labelKey: 'nav.links.memories', auth: true, icon: 'M6 4h12v16l-6-4-6 4V4Z' },
  { href: '/profile', labelKey: 'nav.links.profile', auth: true, icon: 'M20 21a8 8 0 1 0-16 0m12-13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z' },
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
  const { t } = useTranslation();
  const { openMenuId, openMenu, closeMenu } = useMenuCoordinator();
  const pathname = usePathname();
  const upperOpen = openMenuId === 'upper';
  const visibleDesktopLinks = desktopLinks.filter((link) => !link.auth || user);
  const visibleMobileTabs = mobileTabs.filter((tab) => !tab.auth || user);

  // The mobile "Menu" is a CONTROLLED menu driven entirely by the shared
  // MenuCoordinator (open ⇔ openMenuId === 'upper'). It used to be a native
  // <details>, but coordinating <details> across components relied on its
  // `toggle` event + programmatic open removal, which was unreliable in the
  // Android WebView and let the map burger and this menu both stay open at once.
  // Controlled state + a tap-outside scrim makes "only one menu open" deterministic.
  // Close it whenever the route changes (a nav link was tapped).
  useEffect(() => {
    closeMenu('upper');
  }, [pathname, closeMenu]);

  return (
    <>
    <nav className="sticky top-0 z-50 border-b-2 border-ig-border bg-ig-elevated/95 pt-safe-top backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-2 px-3 md:h-[60px] md:gap-4 md:px-4">
        <Link href="/" className="font-display shrink-0 text-base font-black uppercase tracking-[0.08em] text-brand-500 md:text-xl">
          {t('nav.brand')}
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
                  {t(link.labelKey)}
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
                  {t('nav.auth.logOut')}
                </a>
              ) : (
                <Link
                  href="/api/auth/login"
                  onClick={handleSignInClick}
                  className="mw-button-primary rounded-md px-4 py-2 text-sm transition-colors"
                >
                  {t('nav.auth.signIn')}
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
            <div className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={upperOpen}
                onClick={() => (upperOpen ? closeMenu('upper') : openMenu('upper'))}
                className="flex h-12 min-w-12 cursor-pointer items-center justify-center rounded-full border-2 border-ig-border bg-ig-elevated px-3 text-sm font-semibold text-ig-text-primary"
              >
                {t('nav.menu.open')}
              </button>
              {upperOpen && (
                <>
                  {/* Tap-outside scrim — deterministic close (no native <details>
                      toggle-event reliance, which let two menus stay open on Android). */}
                  <button
                    type="button"
                    aria-label={t('common.actions.close')}
                    onClick={() => closeMenu('upper')}
                    className="fixed inset-0 z-40 cursor-default"
                  />
                  <div role="menu" className="mw-panel absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-2xl">
                    <Link href="/search" onClick={() => closeMenu('upper')} className="block px-4 py-3 text-sm text-ig-text-primary hover:bg-ig-hover">{t('nav.links.explore')}</Link>
                    <Link href="/maps" onClick={() => closeMenu('upper')} className="block px-4 py-3 text-sm text-ig-text-primary hover:bg-ig-hover">{t('nav.links.maps')}</Link>
                    <Link href="/guides" onClick={() => closeMenu('upper')} className="block px-4 py-3 text-sm text-ig-text-primary hover:bg-ig-hover">{t('nav.links.myGuides')}</Link>
                    <Link href="/profile" onClick={() => closeMenu('upper')} className="block px-4 py-3 text-sm text-ig-text-primary hover:bg-ig-hover">{t('nav.links.profile')}</Link>
                    <Link href="/settings" onClick={() => closeMenu('upper')} className="block px-4 py-3 text-sm text-ig-text-primary hover:bg-ig-hover">{t('nav.links.settings')}</Link>
                    <Link href="/pricing" onClick={() => closeMenu('upper')} className="block px-4 py-3 text-sm text-ig-text-primary hover:bg-ig-hover">{t('nav.links.pricing')}</Link>
                    <Link href="/contact" onClick={() => closeMenu('upper')} className="block px-4 py-3 text-sm text-ig-text-primary hover:bg-ig-hover">{t('nav.links.contact')}</Link>
                    <a href="/api/auth/logout" onClick={(e) => { closeMenu('upper'); handleLogoutClick(e); }} className="block border-t border-ig-border px-4 py-3 text-sm text-ig-text-primary hover:bg-ig-hover">{t('nav.auth.logOut')}</a>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/api/auth/login"
              onClick={handleSignInClick}
              className="mw-button-primary inline-flex h-12 items-center rounded-full px-4 text-sm transition-colors"
            >
              {t('nav.auth.signIn')}
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
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-ig-border bg-ig-elevated/95 backdrop-blur-xl backdrop-saturate-50 md:hidden" aria-label={t('nav.menu.ariaPrimary')}>
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
              <span className="leading-none">{t(tab.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
    )}
    </>
  );
}
