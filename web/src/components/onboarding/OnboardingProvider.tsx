'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { api } from '@/lib/api';
import { useAccessToken } from '@/hooks/useAccessToken';
import OnboardingTour from './OnboardingTour';
import { tourSteps, type TourStep } from './tourSteps';

// Every distinct path the tour will navigate to. Strip query because router.prefetch
// works on path only. Computed once at module load — the step list is static.
const TOUR_PREFETCH_PATHS = Array.from(
  new Set(
    tourSteps
      .filter((step): step is TourStep & { route: string } => 'route' in step && typeof step.route === 'string')
      .map((step) => step.route.split('?')[0]),
  ),
);

const LOCAL_STORAGE_KEY = 'brooks.onboarding.completed';

type Status = 'unknown' | 'pending' | 'completed';

type OnboardingContextValue = {
  isActive: boolean;
  currentStepIndex: number;
  currentStep: TourStep | null;
  totalSteps: number;
  sampleCreatorUsername: string | null;
  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  complete: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return ctx;
}

type AuthMeResponse = {
  id: string;
  email: string;
  username: string | null;
  onboardingCompleted: boolean;
  createdAt: string;
};

export default function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: userLoading } = useUser();
  const { token, loading: tokenLoading } = useAccessToken();
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('unknown');
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [sampleCreatorUsername, setSampleCreatorUsername] = useState<string | null>(null);
  // useRef sentinel (not state) prevents React 18 strict-mode double-effects from firing
  // the prefetch twice. Reset on every start() so each tour invocation re-validates.
  const prefetchedRef = useRef(false);

  const fetchSampleCreator = useCallback(async () => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    try {
      const res = await fetch('/api/tour/sample-creator');
      if (!res.ok) return;
      const data = (await res.json()) as { username?: string };
      if (data?.username) setSampleCreatorUsername(data.username);
    } catch {
      // Tour falls back to live fetch in the step's sideEffect handler.
    }
  }, []);

  // Prefetch once auth is ready, so the cache is warm before the user clicks Help.
  useEffect(() => {
    if (tokenLoading || !user) return;
    if (sampleCreatorUsername) return;
    void fetchSampleCreator();
  }, [tokenLoading, user, sampleCreatorUsername, fetchSampleCreator]);

  // Warm every tour destination chunk the moment the user authenticates. The
  // user is likely to either hit the auto-tour on /maps or click Help in
  // Settings — either way these routes will be needed in the next minute.
  // Idempotent and side-effect-free; Next.js dedupes prefetches per path.
  useEffect(() => {
    if (!user) return;
    TOUR_PREFETCH_PATHS.forEach((path) => router.prefetch(path));
  }, [user, router]);

  // Also warm the creator-deep-link routes the moment the username resolves.
  useEffect(() => {
    if (!sampleCreatorUsername) return;
    const encoded = encodeURIComponent(sampleCreatorUsername);
    router.prefetch(`/creators/${encoded}`);
    router.prefetch(`/search/creators`);
  }, [sampleCreatorUsername, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage.getItem(LOCAL_STORAGE_KEY) === 'true') {
      setStatus('completed');
      return;
    }
    if (userLoading || tokenLoading) return;
    if (!user || !token) {
      setStatus('unknown');
      return;
    }
    let cancelled = false;
    api.get<AuthMeResponse>('/api/auth/me', token)
      .then((me) => {
        if (cancelled) return;
        if (me.onboardingCompleted) {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(LOCAL_STORAGE_KEY, 'true');
          }
          setStatus('completed');
        } else {
          setStatus('pending');
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Fail safe: don't pester the user on a backend hiccup.
        setStatus('completed');
      });
    return () => {
      cancelled = true;
    };
  }, [user, token, userLoading, tokenLoading]);

  useEffect(() => {
    if (status !== 'pending' || isActive) return;
    // Only fire the welcome on /maps (post-auth landing for new users).
    // The user-clicked Help link calls start() directly, bypassing this gate.
    if (!pathname || !pathname.startsWith('/maps')) return;
    const timer = setTimeout(() => {
      setIsActive(true);
      setCurrentStepIndex(0);
    }, 800);
    return () => clearTimeout(timer);
  }, [status, isActive, pathname]);

  const start = useCallback(() => {
    setIsActive(true);
    setCurrentStepIndex(0);
    // Re-validate the cached sample creator each time the tour is explicitly started,
    // so a stale username (deleted account) can't strand the user on a 404.
    prefetchedRef.current = false;
    setSampleCreatorUsername(null);
    void fetchSampleCreator();
  }, [fetchSampleCreator]);

  const next = useCallback(() => {
    setCurrentStepIndex((i) => Math.min(i + 1, tourSteps.length - 1));
  }, []);

  const prev = useCallback(() => {
    setCurrentStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const persistComplete = useCallback(async () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, 'true');
    }
    if (!token) return;
    try {
      await api.post('/api/me/onboarding/complete', undefined, token);
    } catch {
      // localStorage already gates re-firing across reloads; backend sync is best-effort.
    }
  }, [token]);

  // Tour exit always lands on /maps. setTimeout(0) defers the navigation past
  // the current React commit so OnboardingTour can unmount cleanly first —
  // microtasks would race with the unmount and trigger render-phase warnings.
  // router.replace (not push) keeps the back stack clean.
  const exitToMaps = useCallback(() => {
    setTimeout(() => router.replace('/maps'), 0);
  }, [router]);

  const skip = useCallback(() => {
    setIsActive(false);
    setStatus('completed');
    void persistComplete();
    exitToMaps();
  }, [persistComplete, exitToMaps]);

  const complete = useCallback(() => {
    setIsActive(false);
    setStatus('completed');
    void persistComplete();
    exitToMaps();
  }, [persistComplete, exitToMaps]);

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentStepIndex,
        currentStep: isActive ? tourSteps[currentStepIndex] ?? null : null,
        totalSteps: tourSteps.length,
        sampleCreatorUsername,
        start,
        next,
        prev,
        skip,
        complete,
      }}
    >
      {children}
      {isActive && <OnboardingTour stepIndex={currentStepIndex} />}
    </OnboardingContext.Provider>
  );
}
