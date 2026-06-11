'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import OnboardingProvider from '@/components/onboarding/OnboardingProvider';
import PermissionsBootstrap from '@/components/PermissionsBootstrap';
import { setupNativeAuthListener } from '@/lib/capacitor';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { MenuCoordinatorProvider } from '@/components/layout/MenuCoordinator';

// Immersive routes — full-screen experiences where the in-document chrome
// (Footer in particular) competes with the primary surface. On these the
// Footer is suppressed at every breakpoint, including desktop, so the map /
// memory reveal owns the entire viewport edge-to-edge.
const IMMERSIVE_ROUTES = ['/maps', '/m'];

function isImmersiveRoute(pathname: string): boolean {
  return IMMERSIVE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === '/';
  const isImmersive = isImmersiveRoute(pathname);
  // Footer logic: never on landing (its own design), never on immersive
  // surfaces (map / memory reveal), and never on mobile at all (relocated
  // to Settings → Legal & company per the May 2026 IA cleanup). The desktop
  // fat footer is still useful for SEO and convention on long-form pages.
  const showFooter = !isLandingPage && !isImmersive;

  // Register the appUrlOpen deep-link listener once at app startup. No-op on
  // web. Required so Auth0's redirect to uk.brooksweb.app://auth/callback
  // gets routed into /api/auth/callback inside the WebView.
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    void setupNativeAuthListener().then((teardown) => {
      cleanup = teardown;
    });
    return () => {
      cleanup?.();
    };
  }, []);

  return (
    <UserProvider>
      <ToastProvider>
        <ConfirmProvider>
          <OnboardingProvider>
            {/* BOR-47: shares menu-open state across the Navbar "upper menu" and
                the map "burger" drawer so only one can be open at a time. */}
            <MenuCoordinatorProvider>
              <PermissionsBootstrap />
              {!isLandingPage && <Navbar />}
              <main
                className={
                  isLandingPage || isImmersive
                    ? ''
                    : 'min-h-dvh pb-[calc(5rem_+_env(safe-area-inset-bottom))] md:pb-0'
                }
              >
                {children}
              </main>
              {showFooter && <Footer />}
            </MenuCoordinatorProvider>
          </OnboardingProvider>
        </ConfirmProvider>
      </ToastProvider>
    </UserProvider>
  );
}
