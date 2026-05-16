'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import OnboardingProvider from '@/components/onboarding/OnboardingProvider';
import { setupNativeAuthListener } from '@/lib/capacitor';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === '/';

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
            {!isLandingPage && <Navbar />}
            <main className={isLandingPage ? '' : 'min-h-dvh pb-[calc(5rem_+_env(safe-area-inset-bottom))] md:pb-0'}>{children}</main>
            {!isLandingPage && <Footer />}
          </OnboardingProvider>
        </ConfirmProvider>
      </ToastProvider>
    </UserProvider>
  );
}
