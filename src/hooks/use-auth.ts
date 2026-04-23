'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

export type CurrentUser = {
  id: string;
  email: string | null;
  name: string;
  role: 'admin' | 'worker' | string;
};

type AuthState = {
  status: 'loading' | 'authenticated' | 'unauthenticated';
  session: Session | null;
  currentUser: CurrentUser | null;
};

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    status: 'loading',
    session: null,
    currentUser: null,
  });

  const fetchCurrentUser = useCallback(async (accessToken: string): Promise<CurrentUser | null> => {
    try {
      const response = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.user ?? null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!supabase) {
        if (!cancelled) {
          setState({ status: 'unauthenticated', session: null, currentUser: null });
        }
        return;
      }

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        if (!cancelled) {
          setState({ status: 'unauthenticated', session: null, currentUser: null });
        }
        return;
      }

      const user = await fetchCurrentUser(session.access_token);
      if (!cancelled) {
        setState({ status: 'authenticated', session, currentUser: user });
      }
    }

    void bootstrap();

    const listener = supabase?.auth.onAuthStateChange(async (_event, nextSession) => {
      if (cancelled) return;
      if (!nextSession) {
        setState({ status: 'unauthenticated', session: null, currentUser: null });
        return;
      }
      const user = await fetchCurrentUser(nextSession.access_token);
      if (!cancelled) {
        setState({ status: 'authenticated', session: nextSession, currentUser: user });
      }
    });

    return () => {
      cancelled = true;
      listener?.data?.subscription.unsubscribe();
    };
  }, [fetchCurrentUser]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  return {
    ...state,
    signOut,
  };
}
