import type { Metadata, Viewport } from 'next';
import { Archivo, Bricolage_Grotesque } from 'next/font/google';
import AppShell from '@/components/layout/AppShell';
import RootErrorBoundary from '@/components/RootErrorBoundary';
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

// Cross-origin hosts the WebView is guaranteed to hit early in the session.
// Adding <link rel="preconnect"> kicks off DNS + TCP + TLS in parallel with
// the initial HTML parse, saving 100-300 ms per host on first connection —
// most impactful on mobile networks where setup cost dominates.
const PRECONNECT_HOSTS = [
  // Auth0 OAuth endpoints (login redirect happens early in the session).
  // The exact tenant URL comes from AUTH0_ISSUER_BASE_URL but the host
  // pattern *.us.auth0.com is correct for current production.
  'https://dev-4zduxht0r6gq1f7f.us.auth0.com',
  // Mapbox tile + API endpoints — pulled the moment /maps mounts.
  'https://api.mapbox.com',
  'https://events.mapbox.com',
  // GCS-served images (user avatars, guide covers, memory photos).
  'https://storage.googleapis.com',
  // Google account profile pictures (for Auth0 Google logins).
  'https://lh3.googleusercontent.com',
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {PRECONNECT_HOSTS.map((host) => (
          <link key={`pc-${host}`} rel="preconnect" href={host} crossOrigin="anonymous" />
        ))}
        {PRECONNECT_HOSTS.map((host) => (
          <link key={`dp-${host}`} rel="dns-prefetch" href={host} />
        ))}
      </head>
      <body className={`${archivo.variable} ${bricolage.variable} bg-ig-primary font-sans text-ig-text-primary`}>
        <RootErrorBoundary>
          <ThemeProvider>
            <AppShell>{children}</AppShell>
          </ThemeProvider>
        </RootErrorBoundary>
      </body>
    </html>
  );
}
