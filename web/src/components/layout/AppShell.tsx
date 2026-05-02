'use client';

import { usePathname } from 'next/navigation';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === '/';

  return (
    <UserProvider>
      {!isLandingPage && <Navbar />}
      <main className={isLandingPage ? '' : 'min-h-screen pb-[calc(5rem_+_env(safe-area-inset-bottom))] md:pb-0'}>{children}</main>
      {!isLandingPage && <Footer />}
    </UserProvider>
  );
}
