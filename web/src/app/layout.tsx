import type { Metadata, Viewport } from 'next';
import { Archivo, Bricolage_Grotesque } from 'next/font/google';
import AppShell from '@/components/layout/AppShell';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
});

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
});

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
      <body className={`${archivo.variable} ${bricolage.variable} bg-ig-primary font-sans text-ig-text-primary`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
