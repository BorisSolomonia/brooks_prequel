'use client';

import { openExternalAuth } from '@/lib/capacitor';

export default function LoginPage() {
  const handleLogin = () => {
    void openExternalAuth(`${window.location.origin}/api/auth/login`);
  };

  const handleGoogleLogin = () => {
    void openExternalAuth(
      `${window.location.origin}/api/auth/login?connection=google-oauth2`,
    );
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ig-primary px-4">
      <div className="mw-card w-full max-w-md p-8">
        <h1 className="mw-section-title mb-2 text-center text-2xl">Welcome to Brooks</h1>
        <p className="mb-8 text-center text-ig-text-secondary">Sign in to start your journey</p>

        <div className="space-y-4">
          <button
            onClick={handleLogin}
            className="mw-button-primary w-full rounded-lg py-3"
          >
            Sign in with Email
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-ig-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-ig-elevated px-2 text-ig-text-secondary">or</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="mw-button-secondary flex w-full items-center justify-center gap-2 rounded-lg py-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
