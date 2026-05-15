'use client';

import { useState } from 'react';
import Spinner from '@/components/ui/Spinner';
import { openExternalAuth } from '@/lib/capacitor';

const BLACK = '#050505';
const YELLOW = '#D4AA3A';

export default function GetStartedButton({ mobile }: { mobile: boolean }) {
  const [loggingIn, setLoggingIn] = useState(false);

  const handleClick = () => {
    if (loggingIn) return;
    setLoggingIn(true);
    // On web this is a plain location change. Inside the Capacitor WebView,
    // openExternalAuth opens an Android Custom Tab — the only user agent
    // Google's OAuth screen accepts. Generic WebViews are blocked with
    // "disallowed_useragent" and render as "This page isn't working".
    void openExternalAuth(`${window.location.origin}/api/auth/login`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loggingIn}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: mobile ? 220 : 250,
        height: mobile ? 54 : 60,
        background: BLACK,
        borderRadius: 8,
        marginTop: mobile ? 20 : 24,
        paddingLeft: mobile ? 22 : 26,
        paddingRight: mobile ? 20 : 22,
        border: 'none',
        cursor: loggingIn ? 'wait' : 'pointer',
        opacity: loggingIn ? 0.85 : 1,
        color: YELLOW,
      }}
      aria-label={loggingIn ? 'Signing you in' : 'Get started'}
    >
      <span
        style={{
          fontSize: mobile ? 17 : 19,
          fontWeight: 900,
          color: YELLOW,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {loggingIn ? 'Signing in…' : 'Get started'}
      </span>
      {loggingIn ? (
        <Spinner size={24} ariaLabel="Signing in" />
      ) : (
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={YELLOW} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
}
