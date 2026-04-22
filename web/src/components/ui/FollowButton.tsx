'use client';

import { useState, useEffect } from 'react';
import { useAccessToken } from '@/hooks/useAccessToken';
import { api } from '@/lib/api';
import type { FollowResponse } from '@/types';

interface FollowButtonProps {
  userId: string;
  initialFollowing?: boolean;
  onFollowChange?: (following: boolean) => void;
}

export default function FollowButton({ userId, initialFollowing = false, onFollowChange }: FollowButtonProps) {
  const { token, loading: tokenLoading } = useAccessToken();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (tokenLoading || !token || !userId) return;
    api.get<{ following: boolean }>(`/api/users/${userId}/follow-status`, token)
      .then((res) => setFollowing(res.following))
      .catch(() => {});
  }, [token, tokenLoading, userId]);

  const handleToggle = async () => {
    if (!token) {
      const returnTo = encodeURIComponent(window.location.pathname);
      window.location.href = `/api/auth/login?returnTo=${returnTo}`;
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      if (following) {
        await api.delete<FollowResponse>(`/api/users/${userId}/follow`, token);
        setFollowing(false);
        onFollowChange?.(false);
      } else {
        await api.post<FollowResponse>(`/api/users/${userId}/follow`, undefined, token);
        setFollowing(true);
        onFollowChange?.(true);
      }
    } catch {
      // Silently fail — button stays in current state
    } finally {
      setBusy(false);
    }
  };

  if (tokenLoading) {
    return (
      <button
        type="button"
        disabled
        className="rounded-md border border-ig-border bg-ig-elevated px-5 py-[7px] text-sm font-semibold text-ig-text-tertiary opacity-70"
      >
        Follow
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={handleToggle}
      className={`rounded-md px-5 py-[7px] text-sm font-semibold transition-colors ${
        following
          ? 'bg-ig-elevated border border-ig-border text-ig-text-primary hover:bg-ig-secondary'
          : 'bg-ig-blue text-white hover:bg-ig-blue-hover'
      } ${busy ? 'opacity-70' : ''}`}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
