'use client';

import { useState, useEffect } from 'react';

interface UseAccessTokenResult {
  token: string | null;
  loading: boolean;
  error: string | null;
}

type TokenFetchResult = {
  token: string | null;
  error: string | null;
};

// Module-level cache shared across all components for the page session.
let cachedToken: string | null = null;
let cacheExpiry = 0;
let inFlight: Promise<TokenFetchResult> | null = null;

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

// Invalidate the shared token cache. Called on logout so no component keeps
// serving a stale access token through the logout transition (defends against
// a silent re-auth even if a future logout path stops doing a full reload).
export function clearAccessTokenCache(): void {
  cachedToken = null;
  cacheExpiry = 0;
  inFlight = null;
}

function getToken(): Promise<TokenFetchResult> {
  if (cachedToken && Date.now() < cacheExpiry) {
    return Promise.resolve({ token: cachedToken, error: null });
  }
  if (!inFlight) {
    inFlight = fetch('/api/auth/token')
      .then(async (res) => {
        if (res.status === 401) {
          cachedToken = null;
          cacheExpiry = 0;
          return { token: null, error: null };
        }
        if (!res.ok) {
          throw new Error(`Token endpoint failed: HTTP ${res.status}`);
        }
        const data = await res.json();
        cachedToken = data.accessToken ?? null;
        cacheExpiry = cachedToken ? expiryFromJwt(cachedToken) : 0;
        return { token: cachedToken, error: null };
      })
      .catch((err) => {
        cachedToken = null;
        cacheExpiry = 0;
        const message = err instanceof Error ? err.message : 'Failed to fetch access token';
        console.error('[auth] token fetch failed:', message);
        return { token: null, error: message };
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export function useAccessToken(): UseAccessTokenResult {
  const hasFreshToken = Boolean(cachedToken && Date.now() < cacheExpiry);
  const [token, setToken] = useState<string | null>(hasFreshToken ? cachedToken : null);
  const [loading, setLoading] = useState(!hasFreshToken);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedToken && Date.now() < cacheExpiry) return;
    getToken()
      .then((result) => {
        setToken(result.token);
        setError(result.error);
      })
      .finally(() => setLoading(false));
  }, []);

  return { token, loading, error };
}
