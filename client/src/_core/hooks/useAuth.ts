import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { clearPendingAuthAction } from "@/lib/authPendingAction";
import { SESSION_DURATION_MS } from "@/const";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useState } from "react";

const AUTH_SESSION_STARTED_AT_KEY = 'auth_session_started_at';

function getSessionStartedAt() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_SESSION_STARTED_AT_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function setSessionStartedAt(timestampMs: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_SESSION_STARTED_AT_KEY, String(timestampMs));
}

function clearSessionStartedAt() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_SESSION_STARTED_AT_KEY);
}

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/" } =
    options ?? {};
  const utils = trpc.useUtils();
  const [supabaseSession, setSupabaseSession] = useState<any>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [sessionRestored, setSessionRestored] = useState(false);

  const expireIfNeeded = useCallback(async (session: any) => {
    if (!session) return;

    const now = Date.now();
    const startedAt = getSessionStartedAt() ?? now;

    if (!getSessionStartedAt()) {
      setSessionStartedAt(startedAt);
      return;
    }

    if (now - startedAt <= SESSION_DURATION_MS) {
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('[useAuth] Failed to sign out after session expiry window', error);
    }
  }, []);

  // Get Supabase session
  useEffect(() => {
    let isMounted = true;

    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[useAuth] Error getting Supabase session:', error);
        }
        if (isMounted) {
          setSupabaseSession(session);
          setIsSessionLoading(false);
          // Only mark session as restored AFTER we have the session state
          setTimeout(() => {
            if (isMounted) {
              setSessionRestored(true);
            }
          }, 0);
        }
        // Check session expiry after restoring it
        if (session) {
          await expireIfNeeded(session);
        }
      } catch (error) {
        console.error('[useAuth] Error in getSession:', error);
        if (isMounted) {
          setIsSessionLoading(false);
          setSessionRestored(true);
        }
      }
    };

    getSession();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {

        if (isMounted) {
          setSupabaseSession(session);
          setIsSessionLoading(false);
        }
        if (event === 'SIGNED_OUT') {
          clearSessionStartedAt();
          utils.auth.me.setData(undefined, null);
          try {
            // Clear auth data but preserve checkout progress and pending actions
            localStorage.removeItem('manus-runtime-user-info');
            localStorage.removeItem('supabase.auth.token');
              localStorage.removeItem('cart');
              clearPendingAuthAction();
              window.dispatchEvent(new Event('cartUpdated'));
          } catch (storageError) {
            console.warn('[useAuth] Failed to clear browser storage on sign out', storageError);
          }
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (event === 'SIGNED_IN') {
            setSessionStartedAt(Date.now());
          }

          await expireIfNeeded(session);

          // Sanity check: ensure Supabase can resolve the user after session updates.
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError || !userData?.user) {
            console.warn('[useAuth] Session exists but getUser() returned no user', userError);
          }
          // Invalidate the auth query to refetch user data
          utils.auth.me.invalidate();
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [utils, expireIfNeeded]);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: true,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: true,
    enabled: !!supabaseSession?.access_token, // Only fetch if we have a valid Supabase session
    staleTime: 0, // Always consider it stale so it refetches
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      // Sign out from tRPC backend
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      clearSessionStartedAt();
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
      try {
        // Clear auth data but preserve checkout progress and pending actions
        localStorage.removeItem('manus-runtime-user-info');
        localStorage.removeItem('supabase.auth.token');
        clearPendingAuthAction();
        window.dispatchEvent(new Event('cartUpdated'));
      } catch (storageError) {
        console.warn('[useAuth] Failed to clear browser storage during logout', storageError);
      }
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    const fallbackUser = supabaseSession?.user
      ? {
          id: supabaseSession.user.id,
          email: supabaseSession.user.email ?? '',
          role: 'user',
          name:
            supabaseSession.user.user_metadata?.name ??
            supabaseSession.user.user_metadata?.full_name ??
            supabaseSession.user.email ??
            'User',
        }
      : null;
    const resolvedUser = meQuery.data ?? fallbackUser;

    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(resolvedUser)
    );
    return {
      user: resolvedUser,
      session: supabaseSession,
      loading: meQuery.isLoading || logoutMutation.isPending || isSessionLoading,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(supabaseSession),
      sessionRestored,
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
    supabaseSession,
    isSessionLoading,
    sessionRestored,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending || isSessionLoading) return;
    if (state.user && supabaseSession) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    isSessionLoading,
    state.user,
    supabaseSession,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
