'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Spinner from '@/components/ui/Spinner';
import { startAuthFlow } from '@/lib/capacitor';

const BLACK = '#050505';
const YELLOW = '#D4AA3A';
const POSTCARD_PLUM = 'var(--action-primary)';
const POSTCARD_PAPER = 'var(--on-action)';

export default function GetStartedButton({
  mobile,
  variant = 'warhol',
}: {
  mobile: boolean;
  variant?: 'warhol' | 'postcard';
}) {
  const { t } = useTranslation();
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
        width: variant === 'postcard' ? (mobile ? 210 : 224) : (mobile ? 220 : 250),
        height: mobile ? 54 : 60,
        background: variant === 'postcard' ? POSTCARD_PLUM : BLACK,
        borderRadius: variant === 'postcard' ? 6 : 8,
        marginTop: variant === 'postcard' ? 0 : (mobile ? 20 : 24),
        paddingLeft: mobile ? 22 : 26,
        paddingRight: mobile ? 20 : 22,
        // Yellow border matches the button's text + arrow colour, giving the
        // pill a clean two-tone identity and lifting it off the warm hero
        // background. 3 px reads well at thumb distance without looking heavy.
        border: variant === 'postcard' ? `2px solid ${POSTCARD_PLUM}` : `3px solid ${YELLOW}`,
        cursor: loggingIn ? 'wait' : 'pointer',
        opacity: loggingIn ? 0.85 : 1,
        color: variant === 'postcard' ? POSTCARD_PAPER : YELLOW,
      }}
      aria-label={loggingIn ? t('landing.signingInAria') : t('landing.getStarted')}
    >
      <span
        style={{
          fontSize: mobile ? 17 : 19,
          fontWeight: 900,
          color: variant === 'postcard' ? POSTCARD_PAPER : YELLOW,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {loggingIn ? t('landing.signingIn') : t('landing.getStarted')}
      </span>
      {loggingIn ? (
        <Spinner size={24} ariaLabel="Signing in" />
      ) : (
        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={variant === 'postcard' ? POSTCARD_PAPER : YELLOW} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
}
