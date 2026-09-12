'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import {
  clearBrokenAuthSession,
  isInvalidRefreshTokenError,
} from '@/lib/supabase/auth-session';
import type { Profile } from '@/types';

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      setProfile(data as Profile | null);
    } catch {
      setProfile(null);
    }
  }, []);

  const applySessionUser = useCallback(
    (nextUser: User | null) => {
      setUser(nextUser);
      if (nextUser) {
        void loadProfile(nextUser.id);
      } else {
        setProfile(null);
      }
    },
    [loadProfile],
  );

  const refresh = useCallback(async () => {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error && isInvalidRefreshTokenError(error)) {
        await clearBrokenAuthSession(supabase);
        applySessionUser(null);
        return;
      }
      applySessionUser(data.session?.user ?? null);
    } catch (error) {
      if (isInvalidRefreshTokenError(error)) {
        await clearBrokenAuthSession(supabase);
      }
      applySessionUser(null);
    }
  }, [applySessionUser]);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error && isInvalidRefreshTokenError(error)) {
          await clearBrokenAuthSession(supabase);
          applySessionUser(null);
          return;
        }

        applySessionUser(data.session?.user ?? null);
      } catch (error) {
        if (!mounted) return;
        if (isInvalidRefreshTokenError(error)) {
          await clearBrokenAuthSession(supabase);
        }
        applySessionUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        applySessionUser(null);
        setIsLoading(false);
        return;
      }

      applySessionUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySessionUser]);

  const signOut = useCallback(async () => {
    setUser(null);
    setProfile(null);

    try {
      await fetch('/auth/signout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      // Continuar con cierre local aunque falle el servidor
    }

    const supabase = createClient();
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      await clearBrokenAuthSession(supabase);
    }
  }, []);

  const value = useMemo(
    () => ({ user, profile, isLoading, signOut, refresh }),
    [user, profile, isLoading, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
