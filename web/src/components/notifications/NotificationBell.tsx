'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccessToken } from '@/hooks/useAccessToken';
import { api } from '@/lib/api';

// In-app notification bell. Polls /api/me/notifications every 60 s for
// new items + unread count, renders a badge on the bell, and opens a
// dropdown with the last 20 notifications when clicked. Tapping a row
// routes the user to the relevant in-app screen based on data.type.

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  dataJson: string | null;
  readAt: string | null;
  createdAt: string;
};

type FeedResponse = {
  items: Notification[];
  unreadCount: number;
};

const POLL_INTERVAL_MS = 60_000;

export default function NotificationBell() {
  const { token } = useAccessToken();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const r = await api.get<FeedResponse>('/api/me/notifications?limit=20', token);
      setItems(r.items ?? []);
      setUnread(r.unreadCount ?? 0);
    } catch {
      /* silent — bell is non-critical */
    }
  }, [token]);

  // Initial load + interval poll. Keeps the unread badge fresh without
  // any real-time infra (FCM-side push has already delivered the system
  // notification; this poll backfills in-app state).
  useEffect(() => {
    if (!token) return;
    void refresh();
    const id = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [token, refresh]);

  // Close dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleOpen = async () => {
    const wasOpen = open;
    setOpen((v) => !v);
    if (!wasOpen && unread > 0 && token) {
      // Mark all read the moment the dropdown opens. We OPTIMISTICALLY drop
      // the badge, then await the POST. If it fails (network, auth, missing
      // @Transactional on the backend, etc.), the next poll will resurrect
      // the badge — but at least we'll have logged the failure instead of
      // silently swallowing it. Previously this was fire-and-forget with a
      // bare .catch() that ate every error, masking the read-all bug.
      setUnread(0);
      try {
        await api.post('/api/me/notifications/read-all', undefined, token);
      } catch (err) {
        console.warn('[notifications] read-all failed:', err);
      }
    }
  };

  const handleTap = (n: Notification) => {
    setOpen(false);
    try {
      const data = n.dataJson ? (JSON.parse(n.dataJson) as Record<string, string>) : {};
      // Route by notification type. New types extend this switch.
      switch (data.type) {
        case 'memory.direct-share':
          if (data.memoryId) router.push(`/maps?memory=${encodeURIComponent(data.memoryId)}`);
          else router.push('/maps');
          break;
        case 'follow':
          // followerUsername is the source of truth for deep-linking; the
          // /creators/[username] route is name-based. Fall back to /maps if
          // backend sent no username (very rare — user without a handle yet).
          if (data.followerUsername) router.push(`/creators/${encodeURIComponent(data.followerUsername)}`);
          else router.push('/maps');
          break;
        case 'test':
          router.push('/maps');
          break;
        default:
          router.push('/maps');
      }
    } catch {
      router.push('/maps');
    }
  };

  if (!token) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
        className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ig-border bg-ig-elevated text-ig-text-secondary transition-colors hover:bg-ig-hover hover:text-ig-text-primary"
      >
        <BellIcon />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-semibold text-white"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        // FIXED positioning anchored to the viewport's right edge — not
        // absolute-to-the-bell. Previously `absolute right-0` anchored the
        // dropdown's right edge to the bell button, but on mobile the bell
        // isn't at the screen's right (theme toggle + menu sit to its right),
        // so a 320 px-wide dropdown going LEFT from the bell overflowed
        // past the screen's left edge on narrow phones. `fixed right-3`
        // pins the dropdown 12 px from the viewport's right edge, which
        // matches the navbar's horizontal padding (px-3).
        // top = navbar bottom (h-16) + safe-area-top + small gap.
        <div
          className="fixed right-3 z-50 w-80 max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border-2 border-ig-border bg-ig-elevated shadow-2xl"
          style={{ top: 'calc(env(safe-area-inset-top) + 4rem + 0.5rem)' }}
        >
          <div className="border-b-2 border-ig-border bg-ig-secondary px-4 py-2.5">
            <p className="font-display text-sm font-black uppercase tracking-[0.08em] text-ig-text-primary">
              Notifications
            </p>
          </div>
          {/* Height capped to viewport minus the navbar + safe-area so the
              full dropdown is always visible on mobile (Pixel 3-button nav,
              iPhone notch). 9rem leaves room for navbar + small buffer. */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100dvh - 9rem - env(safe-area-inset-bottom))' }}>
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-ig-text-tertiary">
                Nothing yet. You&apos;ll see memory shares, follows and updates here.
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleTap(n)}
                  className={`block w-full border-b border-ig-border px-4 py-3 text-left transition-colors hover:bg-ig-hover ${
                    n.readAt ? '' : 'bg-brand-500/5'
                  }`}
                >
                  <p className="text-sm font-semibold text-ig-text-primary">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ig-text-secondary">{n.body}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-ig-text-tertiary">
                    {relativeTime(n.createdAt)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
