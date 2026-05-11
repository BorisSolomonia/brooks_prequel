'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { api } from '@/lib/api';
import { useAccessToken } from '@/hooks/useAccessToken';
import OnboardingTour from './OnboardingTour';
import { tourSteps, type TourStep } from './tourSteps';

type Status = 'unknown' | 'pending' | 'completed';

type OnboardingContextValue = {
  isActive: boolean;
  currentStepIndex: number;
  currentStep: TourStep | null;
  totalSteps: number;
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
  const [status, setStatus] = useState<Status>('unknown');
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (userLoading || tokenLoading) return;
    if (!user || !token) {
      setStatus('unknown');
      return;
    }
    let cancelled = false;
    api.get<AuthMeResponse>('/api/auth/me', token)
      .then((me) => {
        if (cancelled) return;
        setStatus(me.onboardingCompleted ? 'completed' : 'pending');
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
    const timer = setTimeout(() => {
      setIsActive(true);
      setCurrentStepIndex(0);
    }, 1000);
    return () => clearTimeout(timer);
  }, [status, isActive]);

  const start = useCallback(() => {
    setIsActive(true);
    setCurrentStepIndex(0);
  }, []);

  const next = useCallback(() => {
    setCurrentStepIndex((i) => Math.min(i + 1, tourSteps.length - 1));
  }, []);

  const prev = useCallback(() => {
    setCurrentStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const persistComplete = useCallback(async () => {
    if (!token) return;
    try {
      await api.post('/api/me/onboarding/complete', undefined, token);
    } catch {
      // Best-effort. If it fails, the worst case is the tour replays next session.
    }
  }, [token]);

  const skip = useCallback(() => {
    setIsActive(false);
    setStatus('completed');
    void persistComplete();
  }, [persistComplete]);

  const complete = useCallback(() => {
    setIsActive(false);
    setStatus('completed');
    void persistComplete();
  }, [persistComplete]);

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentStepIndex,
        currentStep: isActive ? tourSteps[currentStepIndex] ?? null : null,
        totalSteps: tourSteps.length,
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
