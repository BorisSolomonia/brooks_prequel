'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { api } from '@/lib/api';
import { useAccessToken } from '@/hooks/useAccessToken';
import OnboardingTour from './OnboardingTour';
import RoleSelectionModal from './RoleSelectionModal';
import { tourSteps, stepsForRole, type TourStep, type TourRole } from './tourSteps';

// localStorage mirror of the chosen role, so we don't re-prompt or re-fetch /api/me every load.
const ROLE_STORAGE_KEY = 'brooks.onboarding.role';

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

export default function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: userLoading } = useUser();
  const { token, loading: tokenLoading } = useAccessToken();
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('unknown');
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [sampleCreatorUsername, setSampleCreatorUsername] = useState<string | null>(null);
  // Self-selected intent. null = unknown until resolved. `roleResolved` gates the prompt so
  // returning users (who already have a role) don't see a flash of the modal before /api/me returns.
  const [role, setRole] = useState<TourRole | null>(null);
  const [roleResolved, setRoleResolved] = useState(false);
  // The active step list depends on the chosen role. Creator = full tour (unchanged);
  // Traveler = the abbreviated subset. Memoised so the array identity is stable per role.
  const activeSteps = useMemo<TourStep[]>(() => (role ? stepsForRole(role) : tourSteps), [role]);
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
    // Tour gate is LOCAL-FIRST: a fresh install (no localStorage key) shows the
    // tour even if the user previously completed it on another install. This
    // matches user expectation that deleting + reinstalling the app shows the
    // walkthrough again — the prior backend-completed shortcut killed that flow.
    // We still POST /api/me/onboarding/complete on completion for analytics
    // (see persistComplete below), but we don't READ that flag here.
    if (typeof window !== 'undefined' && window.localStorage.getItem(LOCAL_STORAGE_KEY) === 'true') {
      setStatus('completed');
      return;
    }
    if (userLoading || tokenLoading) return;
    if (!user || !token) {
      setStatus('unknown');
      return;
    }
    setStatus('pending');
  }, [user, token, userLoading, tokenLoading]);

  // Resolve the chosen role: localStorage fast-path, else GET /api/me. Until resolved we don't
  // show the prompt (avoids a modal flash for returning users). Stays null → prompt for new users.
  useEffect(() => {
    if (role || !user || !token) return;
    if (typeof window !== 'undefined') {
      const cached = window.localStorage.getItem(ROLE_STORAGE_KEY);
      if (cached === 'traveler' || cached === 'creator') {
        setRole(cached);
        setRoleResolved(true);
        return;
      }
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await api.get<{ primaryIntent?: string | null }>('/api/me', token);
        if (cancelled) return;
        const pi = me?.primaryIntent;
        if (pi === 'TRAVELER' || pi === 'CREATOR') {
          const r = pi.toLowerCase() as TourRole;
          setRole(r);
          try { window.localStorage.setItem(ROLE_STORAGE_KEY, r); } catch { /* incognito */ }
        }
      } catch {
        // Leave role null → show the prompt; the POST on choose persists it.
      } finally {
        if (!cancelled) setRoleResolved(true);
      }
    })();
    return () => { cancelled = true; };
  }, [role, user, token]);

  useEffect(() => {
    // Only auto-start once a role is known (role-set users who haven't finished). New users
    // (role === null) get the role prompt instead, which launches the tour on choose.
    if (status !== 'pending' || isActive || !role) return;
    // Only fire the welcome on /maps (post-auth landing for new users).
    // The user-clicked Help link calls start() directly, bypassing this gate.
    if (!pathname || !pathname.startsWith('/maps')) return;
    const timer = setTimeout(() => {
      setIsActive(true);
      setCurrentStepIndex(0);
    }, 800);
    return () => clearTimeout(timer);
  }, [status, isActive, pathname, role]);

  const start = useCallback(() => {
    setIsActive(true);
    setCurrentStepIndex(0);
    // Re-validate the cached sample creator each time the tour is explicitly started,
    // so a stale username (deleted account) can't strand the user on a 404.
    prefetchedRef.current = false;
    setSampleCreatorUsername(null);
    void fetchSampleCreator();
  }, [fetchSampleCreator]);

  // Choose a role: persist (localStorage + backend, best-effort) and immediately launch that
  // role's tour. Called by the role-selection modal.
  const chooseRole = useCallback((r: TourRole) => {
    setRole(r);
    setRoleResolved(true);
    try { window.localStorage.setItem(ROLE_STORAGE_KEY, r); } catch { /* incognito */ }
    if (token) {
      void api.post('/api/me/onboarding/role', { role: r.toUpperCase() }, token).catch(() => {
        // Best-effort; localStorage keeps the choice for this session.
      });
    }
    setIsActive(true);
    setCurrentStepIndex(0);
    prefetchedRef.current = false;
    setSampleCreatorUsername(null);
    void fetchSampleCreator();
  }, [token, fetchSampleCreator]);

  const next = useCallback(() => {
    setCurrentStepIndex((i) => Math.min(i + 1, activeSteps.length - 1));
  }, [activeSteps.length]);

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

  // New, authed users who haven't chosen a role yet get the must-choose prompt (once the role
  // has been resolved, to avoid flashing it for returning users). It launches the tour on choose.
  // Gated to /maps (the post-login landing) so it never appears over public pages the user
  // navigated to — e.g. browsing /search/guides while logged-in-but-not-onboarded.
  const needsRoleSelection =
    status === 'pending' && !isActive && roleResolved && role === null && !!user && !!token
    && !!pathname && pathname.startsWith('/maps');

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentStepIndex,
        currentStep: isActive ? activeSteps[currentStepIndex] ?? null : null,
        totalSteps: activeSteps.length,
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
      {needsRoleSelection && <RoleSelectionModal onChoose={chooseRole} />}
    </OnboardingContext.Provider>
  );
}
