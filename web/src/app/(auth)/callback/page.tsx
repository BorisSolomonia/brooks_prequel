'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Auth0 callback is handled by the SDK
    // After auth, redirect to the maps landing experience.
    router.replace('/maps');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ig-blue mx-auto mb-4" />
        <p className="text-ig-text-secondary">Signing you in...</p>
      </div>
    </div>
  );
}
