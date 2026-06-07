'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';
import { AiKeysPanel } from '@/components/ai/AiKeysPanel';
import { useAccessToken } from '@/hooks/useAccessToken';
import { redirectToLogin } from '@/lib/capacitor';
import { api } from '@/lib/api';
import type { Profile } from '@/types';

type Tab = 'overview' | 'ai-keys';

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-12 text-center text-ig-text-tertiary">Loading...</div>}>
      <ProfilePageInner />
    </Suspense>
  );
}

function ProfilePageInner() {
  const searchParams = useSearchParams();
  const { token, loading: tokenLoading } = useAccessToken();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeTab: Tab = (searchParams.get('tab') as Tab) ?? 'overview';

  useEffect(() => {
    if (!tokenLoading && !token) {
      redirectToLogin();
      return;
    }
    if (!token) return;
    api.get<Profile>('/api/me', token)
      .then(setProfile)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load profile'));
  }, [router, token, tokenLoading]);

  if (tokenLoading) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-ig-text-tertiary">Loading...</div>;
  }

  function tabHref(tab: Tab) {
    return tab === 'overview' ? '/profile' : `/profile?tab=${tab}`;
  }

  const tabClass = (tab: Tab) =>
    `inline-flex min-h-11 items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      activeTab === tab
        ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
    }`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Tab bar */}
      <div className="mb-6 flex overflow-x-auto border-b border-[var(--border)]">
        <Link href={tabHref('overview')} className={tabClass('overview')}>Overview</Link>
        <Link href={tabHref('ai-keys')} className={tabClass('ai-keys')}>AI Keys</Link>
      </div>

      {activeTab === 'overview' && (
        <>
          {error && <p className="mb-4 text-sm text-ig-error">{error}</p>}

          {profile ? (
            <div className="rounded-2xl border border-ig-border bg-ig-elevated p-6">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                <div className="flex min-w-0 gap-4">
                  <Avatar src={profile.avatarUrl} name={profile.displayName ?? profile.username ?? 'User'} size="xl" verified={profile.verified} />
                  <div>
                    <h1 className="text-2xl font-bold text-ig-text-primary">
                      {profile.displayName ?? profile.username ?? 'Unnamed creator'}
                    </h1>
                    {profile.username && <p className="mt-1 text-sm text-ig-text-tertiary">@{profile.username}</p>}
                    {profile.bio && <p className="mt-3 max-w-xl text-sm text-ig-text-secondary">{profile.bio}</p>}
                  </div>
                </div>
                <Link href="/profile/edit" className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-ig-border px-4 py-2 text-sm font-semibold text-ig-text-primary hover:bg-ig-hover sm:w-auto">
                  Edit profile
                </Link>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Link
                  href="/profile/followers"
                  className="rounded-xl border border-ig-border bg-ig-primary p-3 transition-colors hover:bg-ig-hover"
                >
                  <p className="text-xs uppercase tracking-wide text-ig-text-tertiary">Followers</p>
                  <p className="mt-2 text-xl font-semibold text-ig-text-primary">{profile.followerCount}</p>
                </Link>
                <Link
                  href="/profile/following"
                  className="rounded-xl border border-ig-border bg-ig-primary p-3 transition-colors hover:bg-ig-hover"
                >
                  <p className="text-xs uppercase tracking-wide text-ig-text-tertiary">Following</p>
                  <p className="mt-2 text-xl font-semibold text-ig-text-primary">{profile.followingCount}</p>
                </Link>
                <div className="rounded-xl border border-ig-border bg-ig-primary p-3">
                  <p className="text-xs uppercase tracking-wide text-ig-text-tertiary">Guides</p>
                  <p className="mt-2 text-xl font-semibold text-ig-text-primary">{profile.guideCount}</p>
                </div>
                <div className="rounded-xl border border-ig-border bg-ig-primary p-3">
                  <p className="text-xs uppercase tracking-wide text-ig-text-tertiary">Map Location</p>
                  <p className="mt-2 text-sm font-semibold text-ig-text-primary">
                    {profile.latitude !== null && profile.longitude !== null ? 'Configured' : 'Missing'}
                  </p>
                </div>
              </div>

              <div className="mt-6 text-sm text-ig-text-secondary">
                {profile.latitude !== null && profile.longitude !== null ? (
                  <p>Coordinates: {profile.latitude}, {profile.longitude}</p>
                ) : (
                  <p>Add your creator coordinates in profile edit to appear on the maps page.</p>
                )}
              </div>

              <div className="mt-6 border-t border-ig-border pt-6">
                <h2 className="font-display text-sm font-black uppercase tracking-[0.08em] text-ig-text-tertiary">Account</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/trips"
                    className="group flex items-center justify-between rounded-xl border border-ig-border bg-ig-primary p-4 transition-colors hover:border-brand-500/50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ig-text-primary">Purchased guides</p>
                      <p className="mt-0.5 text-xs text-ig-text-tertiary">Open the guides you have bought</p>
                    </div>
                    <span aria-hidden className="text-ig-text-tertiary transition-colors group-hover:text-brand-500">→</span>
                  </Link>
                  {/* TODO N1 — surface /purchases (order history with payment
                      receipts) inside the profile section instead of the top
                      nav. /purchases URL stays as-is because BOG iPay's
                      post-checkout redirect points at it. */}
                  <Link
                    href="/purchases"
                    className="group flex items-center justify-between rounded-xl border border-ig-border bg-ig-primary p-4 transition-colors hover:border-brand-500/50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ig-text-primary">Order history</p>
                      <p className="mt-0.5 text-xs text-ig-text-tertiary">Payment receipts and order status</p>
                    </div>
                    <span aria-hidden className="text-ig-text-tertiary transition-colors group-hover:text-brand-500">→</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            !error && <p className="text-sm text-ig-text-tertiary">No profile data loaded.</p>
          )}
        </>
      )}

      {activeTab === 'ai-keys' && (
        <div data-tour="ai-keys-panel">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1">AI Provider Keys</h2>
          <AiKeysPanel />
        </div>
      )}
    </div>
  );
}
