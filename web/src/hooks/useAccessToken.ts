'use client';

import { useState, useEffect } from 'react';

interface UseAccessTokenResult {
  token: string | null;
  loading: boolean;
  error: string | null;
}

// Module-level cache — shared across all components for the page session.
// Token is valid for ~1 hour (Auth0 default); 5-minute TTL ensures we
// never serve a stale token after a session expiry edge case.
let cachedToken: string | null = null;
let cacheExpiry = 0;
let inFlight: Promise<string | null> | null = null;

function getToken(): Promise<string | null> {
  if (cachedToken && Date.now() < cacheExpiry) {
    return Promise.resolve(cachedToken);
  }
  if (!inFlight) {
    inFlight = fetch('/api/auth/token')
      .then((res) => res.json())
      .then((data) => {
        cachedToken = data.accessToken ?? null;
        cacheExpiry = Date.now() + 5 * 60 * 1000;
        inFlight = null;
        return cachedToken;
      })
      .catch(() => {
        inFlight = null;
        return null;
      });
  }
  return inFlight;
}

export function useAccessToken(): UseAccessTokenResult {
  const [token, setToken] = useState<string | null>(cachedToken && Date.now() < cacheExpiry ? cachedToken : null);
  const [loading, setLoading] = useState(!(cachedToken && Date.now() < cacheExpiry));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedToken && Date.now() < cacheExpiry) return;
    getToken()
      .then((t) => {
        setToken(t);
        if (!t) setError('Failed to fetch access token');
      })
      .finally(() => setLoading(false));
  }, []);

  return { token, loading, error };
}
