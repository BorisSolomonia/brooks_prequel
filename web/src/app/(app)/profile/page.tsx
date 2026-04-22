'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';
import PlaceholderNotice from '@/components/ui/PlaceholderNotice';
import { AiKeysPanel } from '@/components/ai/AiKeysPanel';
import { useAccessToken } from '@/hooks/useAccessToken';
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, loading: tokenLoading } = useAccessToken();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeTab: Tab = (searchParams.get('tab') as Tab) ?? 'overview';

  useEffect(() => {
    if (!tokenLoading && !token) {
      router.push('/api/auth/login');
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
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      activeTab === tab
        ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
    }`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Tab bar */}
      <div className="flex border-b border-[var(--border)] mb-6">
        <Link href={tabHref('overview')} className={tabClass('overview')}>Overview</Link>
        <Link href={tabHref('ai-keys')} className={tabClass('ai-keys')}>AI Keys</Link>
      </div>

      {activeTab === 'overview' && (
        <>
          <PlaceholderNotice
            title="Profile overview is partially implemented"
            body="Your live profile data is loaded here now, including whether you have creator coordinates for the maps experience. Guide analytics and richer creator insights are still pending."
          />

          {error && <p className="mb-4 text-sm text-ig-error">{error}</p>}

          {profile ? (
            <div className="rounded-2xl border border-ig-border bg-ig-elevated p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <Avatar src={profile.avatarUrl} name={profile.displayName ?? profile.username ?? 'User'} size="xl" verified={profile.verified} />
                  <div>
                    <h1 className="text-2xl font-bold text-ig-text-primary">
                      {profile.displayName ?? profile.username ?? 'Unnamed creator'}
                    </h1>
                    {profile.username && <p className="mt-1 text-sm text-ig-text-tertiary">@{profile.username}</p>}
                    {profile.bio && <p className="mt-3 max-w-xl text-sm text-ig-text-secondary">{profile.bio}</p>}
                  </div>
                </div>
                <Link href="/profile/edit" className="rounded-md border border-ig-border px-4 py-2 text-sm font-semibold text-ig-text-primary hover:bg-ig-hover">
                  Edit profile
                </Link>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-ig-border bg-ig-primary p-3">
                  <p className="text-xs uppercase tracking-wide text-ig-text-tertiary">Followers</p>
                  <p className="mt-2 text-xl font-semibold text-ig-text-primary">{profile.followerCount}</p>
                </div>
                <div className="rounded-xl border border-ig-border bg-ig-primary p-3">
                  <p className="text-xs uppercase tracking-wide text-ig-text-tertiary">Following</p>
                  <p className="mt-2 text-xl font-semibold text-ig-text-primary">{profile.followingCount}</p>
                </div>
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
            </div>
          ) : (
            !error && <p className="text-sm text-ig-text-tertiary">No profile data loaded.</p>
          )}
        </>
      )}

      {activeTab === 'ai-keys' && (
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1">AI Provider Keys</h2>
          <AiKeysPanel />
        </div>
      )}
    </div>
  );
}
