import type { Metadata, Viewport } from 'next';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'Brooks - Travel Guide Marketplace',
  description: 'Discover, create, and share travel guides. A marketplace for travel creators.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans bg-ig-primary text-ig-text-primary">
        <UserProvider>
          <Navbar />
          <main className="min-h-screen pb-16 md:pb-0">{children}</main>
          <Footer />
        </UserProvider>
      </body>
    </html>
  );
}
