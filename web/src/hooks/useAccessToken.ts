'use client';

import { useState, useEffect } from 'react';

interface UseAccessTokenResult {
  token: string | null;
  loading: boolean;
  error: string | null;
}

// Module-level cache — shared across all components for the page session.
let cachedToken: string | null = null;
let cacheExpiry = 0;
let inFlight: Promise<string | null> | null = null;

// Read the JWT `exp` claim and use it for cache expiry. This avoids the previous 5-minute
// fixed TTL, which forced every component to re-fetch /api/auth/token 12 times per hour.
// Refresh 60s before actual expiry to absorb clock skew.
function expiryFromJwt(token: string): number {
  try {
    const payload = token.split('.')[1];
    if (!payload) return Date.now() + 50 * 60 * 1000;
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    );
    if (typeof decoded?.exp === 'number') {
      return decoded.exp * 1000 - 60_000;
    }
  } catch {
    // Fall through to default below.
  }
  return Date.now() + 50 * 60 * 1000;
}

function getToken(): Promise<string | null> {
  if (cachedToken && Date.now() < cacheExpiry) {
    return Promise.resolve(cachedToken);
  }
  if (!inFlight) {
    inFlight = fetch('/api/auth/token')
      .then((res) => res.json())
      .then((data) => {
        cachedToken = data.accessToken ?? null;
        cacheExpiry = cachedToken ? expiryFromJwt(cachedToken) : 0;
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
