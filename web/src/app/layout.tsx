import type { Metadata, Viewport } from 'next';
import { Archivo, Bricolage_Grotesque } from 'next/font/google';
import AppShell from '@/components/layout/AppShell';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
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
  // Apple PWA metadata — used when the site is added to the iOS Home Screen
  // and when iOS Safari renders the status bar in standalone mode.
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Brooks',
  },
  // Prevent iOS Safari from auto-linking digit sequences as tappable phone
  // numbers (price strings, order ids, etc).
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // viewportFit:'cover' lets `env(safe-area-inset-*)` produce non-zero values on
  // iPhone X+. Without it, the iOS status-bar area is reserved by the browser
  // and content can't extend behind the notch / Dynamic Island.
  viewportFit: 'cover',
  // Distinct theme colors per scheme so the iOS Safari address-bar tint matches
  // each mode. Values come from --bg-primary in globals.css.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F1E4D1' },
    { media: '(prefers-color-scheme: dark)', color: '#0E0E0E' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${archivo.variable} ${bricolage.variable} bg-ig-primary font-sans text-ig-text-primary`}>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
