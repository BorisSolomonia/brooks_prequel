'use client';

import { useState } from 'react';
import Spinner from '@/components/ui/Spinner';
import { startAuthFlow } from '@/lib/capacitor';

const BLACK = '#050505';
const YELLOW = '#D4AA3A';

export default function GetStartedButton({ mobile }: { mobile: boolean }) {
  const [loggingIn, setLoggingIn] = useState(false);

  const handleClick = () => {
    if (loggingIn) return;
    setLoggingIn(true);
    // startAuthFlow handles both paths:
    //  - web: redirects to /api/auth/login (standard SDK flow)
    //  - native: calls /api/auth/init-app to set cookies in WebView jar,
    //    then opens a Custom Tab with the Auth0 authorize URL pointed at
    //    the uk.brooksweb.app:// custom scheme so the redirect returns
    //    to the app (not lost in Chrome).
    void startAuthFlow();
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
        // Yellow border matches the button's text + arrow colour, giving the
        // pill a clean two-tone identity and lifting it off the warm hero
        // background. 3 px reads well at thumb distance without looking heavy.
        border: `3px solid ${YELLOW}`,
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
