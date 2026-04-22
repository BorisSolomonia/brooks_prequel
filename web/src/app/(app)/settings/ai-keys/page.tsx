'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AiKeysRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/profile?tab=ai-keys');
  }, [router]);
  return null;
}
