import type { Metadata, Viewport } from 'next';
import AppShell from '@/components/layout/AppShell';
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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
