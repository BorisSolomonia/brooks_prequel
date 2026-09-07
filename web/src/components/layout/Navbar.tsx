'use client';

import { Suspense, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useTranslation } from 'react-i18next';
import { useMenuCoordinator } from '@/components/layout/MenuCoordinator';
import { Button } from '@/components/ui/Postcard';
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
  const headerRef = useRef<HTMLElement>(null);
  const bottomRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
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

  useEffect(() => {
    const header = headerRef.current;
    const bottom = bottomRef.current;
    const measure = () => {
      document.documentElement.style.setProperty('--header-height', `${header?.getBoundingClientRect().height ?? 0}px`);
      document.documentElement.style.setProperty('--bottom-nav-height', `${bottom?.getBoundingClientRect().height ?? 0}px`);
    };
    const observer = new ResizeObserver(measure);
    if (header) observer.observe(header);
    if (bottom) observer.observe(bottom);
    measure();
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--header-height');
      document.documentElement.style.removeProperty('--bottom-nav-height');
    };
  }, [user]);

  useEffect(() => {
    if (!upperOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu('upper');
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [upperOpen, closeMenu]);

  return (
    <>
      <nav ref={headerRef} className="pc-header" aria-label={t('nav.menu.ariaPrimary')}>
        <div className="pc-header-inner">
          <Link href={user ? '/maps' : '/'} className="pc-brand" aria-label={t('nav.brand')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 22s7-7 7-13a7 7 0 0 0-14 0c0 6 7 13 7 13Z" /><circle cx="12" cy="9" r="2.5" /></svg>
            brooks
          </Link>
          <div data-tour="search-bar" className="pc-header-search">
            <Suspense fallback={<SearchBarFallback />}><GlobalSearchBar /></Suspense>
          </div>
          <div className="pc-header-links">
            {visibleDesktopLinks.filter(link => ['/search', '/maps', '/guides'].includes(link.href)).map(link => (
              <Link key={link.href} href={link.href} aria-current={isActive(pathname, link.href) ? 'page' : undefined} className="pc-header-link">{t(link.labelKey)}</Link>
            ))}
          </div>
          <div className="pc-header-actions">
            {user && <NotificationBell />}
            <ThemeToggle />
            {!user && !isLoading && <Link href="/api/auth/login" onClick={handleSignInClick} className="pc-button hidden sm:inline-flex">{t('nav.auth.signIn')}</Link>}
            <div className="relative">
              <Button ref={menuButtonRef} tone="secondary" aria-expanded={upperOpen} aria-controls="account-navigation" onClick={() => upperOpen ? closeMenu('upper') : openMenu('upper')}>
                {t('nav.menu.open')}
              </Button>
              {upperOpen && (
                <>
                  <button type="button" aria-label={t('common.actions.close')} onClick={() => closeMenu('upper')} className="fixed inset-0 z-40 cursor-default" tabIndex={-1} />
                  <div id="account-navigation" className="pc-account-menu">
                    {!user && <Link href="/api/auth/login" onClick={handleSignInClick}>{t('nav.auth.signIn')}</Link>}
                    {visibleDesktopLinks.map(link => <Link key={link.href} href={link.href} aria-current={isActive(pathname, link.href) ? 'page' : undefined} onClick={() => closeMenu('upper')}>{t(link.labelKey)}</Link>)}
                    {user && <>
                      <Link href="/right-now" onClick={() => closeMenu('upper')}>{t('nav.links.rightNow')}</Link>
                      <Link href="/moments" onClick={() => closeMenu('upper')}>{t('nav.links.moments')}</Link>
                      <a href="/api/auth/logout" className="border-t border-ig-border" onClick={event => { closeMenu('upper'); handleLogoutClick(event); }}>{t('nav.auth.logOut')}</a>
                    </>}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      {visibleMobileTabs.length > 1 && (
        <nav ref={bottomRef} className="pc-bottom-nav" aria-label={t('nav.menu.ariaPrimary')}>
          <div className="mx-auto flex max-w-lg justify-around gap-1 px-2 py-1 pb-[max(env(safe-area-inset-bottom),0.25rem)]">
            {visibleMobileTabs.map(tab => (
              <Link key={tab.href} href={tab.href} aria-current={isActive(pathname, tab.href) ? 'page' : undefined} className="flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-[11px] font-semibold text-ig-text-secondary">
                <MobileTabIcon path={tab.icon} /><span className="text-center leading-tight">{t(tab.labelKey)}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
