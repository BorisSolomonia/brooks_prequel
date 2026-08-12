'use client';

import { useEffect, useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import MomentsViewer from '@/components/moments/MomentsViewer';
import { useAccessToken } from '@/hooks/useAccessToken';
import { getUserMoments, reactToMoment, recordMomentView, type MomentView } from '@/lib/moments';

interface ProfileMomentAvatarProps {
  userId: string;
  src?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  verified?: boolean;
}

/**
 * An Avatar that shows a story-style "moment ring" when the profiled user has an active Moment
 * the viewer is allowed to see (follower-scoped — the server returns nothing to a non-follower,
 * so no ring leaks). Tapping the ring opens the full-screen viewer. Falls back to a plain Avatar.
 */
export default function ProfileMomentAvatar({ userId, src, name, size = 'xl', verified = false }: ProfileMomentAvatarProps) {
  const { token } = useAccessToken();
  const [moments, setMoments] = useState<MomentView[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!token || !userId) return;
    getUserMoments(userId, token)
      .then(setMoments)
      .catch(() => {});
  }, [token, userId]);

  if (moments.length === 0) {
    return <Avatar src={src} name={name} size={size} verified={verified} />;
  }

  const onView = (id: string) => {
    if (token) recordMomentView(id, token).catch(() => {});
  };
  const onReact = (id: string) => {
    if (token) reactToMoment(id, token).catch(() => {});
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={name ? `View ${name}'s moments` : 'View moments'}
        className="rounded-full bg-[conic-gradient(from_130deg,#D4AA3A,#C95A7D,#5098B3,#98B54A,#D4AA3A)] p-[3px]"
      >
        <div className="rounded-full bg-ig-primary p-[2px]">
          <Avatar src={src} name={name} size={size} verified={verified} />
        </div>
      </button>
      {open && <MomentsViewer moments={moments} onClose={() => setOpen(false)} onView={onView} onReact={onReact} />}
    </>
  );
}
