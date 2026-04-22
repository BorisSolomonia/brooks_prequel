'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useUser } from '@auth0/nextjs-auth0/client';
import GlobalSearchBar from '@/components/layout/GlobalSearchBar';

function SearchBarFallback() {
  return (
    <div className="h-10 max-w-xl flex-1 rounded-full border border-ig-border bg-ig-elevated" />
  );
}

export default function Navbar() {
  const { user, isLoading } = useUser();

  return (
    <nav className="sticky top-0 z-50 bg-ig-primary border-b border-ig-border">
      <div className="mx-auto flex h-[60px] max-w-[1180px] items-center gap-4 px-4">
        <Link href="/" className="text-xl font-semibold text-ig-text-primary">
          Brooks
        </Link>
        <Suspense fallback={<SearchBarFallback />}>
          <GlobalSearchBar />
        </Suspense>
        <div className="flex items-center gap-3 whitespace-nowrap">
          <Link
            href="/search"
            className="text-ig-text-secondary hover:text-ig-text-primary text-sm font-normal transition-colors"
          >
            Explore
          </Link>
          {isLoading ? (
            <div className="h-9 w-20 animate-pulse rounded-md border border-ig-border bg-ig-elevated" />
          ) : user ? (
            <>
              <Link
                href="/maps"
                className="text-ig-text-secondary hover:text-ig-text-primary text-sm font-normal transition-colors"
              >
                Maps
              </Link>
              <Link
                href="/guides"
                className="text-ig-text-secondary hover:text-ig-text-primary text-sm font-normal transition-colors"
              >
                My Guides
              </Link>
              <Link
                href="/purchases"
                className="text-ig-text-secondary hover:text-ig-text-primary text-sm font-normal transition-colors"
              >
                Purchases
              </Link>
              <Link
                href="/trips"
                className="text-ig-text-secondary hover:text-ig-text-primary text-sm font-normal transition-colors"
              >
                My Trips
              </Link>
              <Link
                href="/transport"
                className="text-ig-text-secondary hover:text-ig-text-primary text-sm font-normal transition-colors"
              >
                Transport
              </Link>
              <Link
                href="/profile"
                className="text-ig-text-secondary hover:text-ig-text-primary text-sm font-normal transition-colors"
              >
                Profile
              </Link>
              <a
                href="/api/auth/logout"
                className="px-4 py-[7px] bg-ig-elevated text-ig-text-primary border border-ig-border rounded-md text-sm font-semibold hover:bg-ig-hover transition-colors"
              >
                Log Out
              </a>
            </>
          ) : (
            <Link
              href="/api/auth/login"
              className="px-4 py-[7px] bg-ig-blue text-white rounded-md text-sm font-semibold hover:bg-ig-blue-hover transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
