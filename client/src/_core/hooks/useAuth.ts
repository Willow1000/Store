import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { clearPendingAuthAction } from "@/lib/authPendingAction";
import { saveAuthRedirect } from "@/lib/authRedirect";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useState } from "react";

const AUTH_SESSION_STARTED_AT_KEY = "auth_session_started_at";

function getSessionStartedAt() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_SESSION_STARTED_AT_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function setSessionStartedAt(timestampMs: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_SESSION_STARTED_AT_KEY, String(timestampMs));
}

function clearSessionStartedAt() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_SESSION_STARTED_AT_KEY);
}

function clearAppStorage() {
  if (typeof window === "undefined") return;

  const localKeysToRemove = [
    "manus-runtime-user-info",
    "checkout-step",
    "checkout-form-data",
    "checkout-cart-snapshot-v1",
    "oauth_return_to",
    "cart",
    "sessionId",
  ];

  const sessionKeysToRemove = ["cart-auth-redirect-pending-v1"];

  try {
    for (const key of localKeysToRemove) {
      localStorage.removeItem(key);
    }

    // Remove app-scoped keys while preserving third-party auth/session keys.
    for (const key of Object.keys(localStorage)) {
      if (
        key.startsWith("motorvault_") ||
        key.startsWith("meta-purchase-tracked-v1:")
      ) {
        localStorage.removeItem(key);
      }
    }

    for (const key of sessionKeysToRemove) {
      sessionStorage.removeItem(key);
    }

    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith("motorvault_")) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {}
}

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

/**
 * Whether a Supabase session could still be on its way: a stored auth token
 * (being refreshed) or an OAuth result in the URL. Without either the visitor
 * is simply signed out, and waiting to double-check only delays every guest -
 * most visibly checkout, which could not decide between the sign-in prompt
 * and the shipping form.
 */
function mayHaveStoredSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const { search, hash } = window.location;
    if (/[?&]code=/.test(search) || /access_token=/.test(hash)) return true;
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i) || "";
      if (key.startsWith("sb-") && key.includes("auth-token")) return true;
    }
  } catch {
    return true;
  }
  return false;
}

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/" } =
    options ?? {};
  const utils = trpc.useUtils();
  const [supabaseSession, setSupabaseSession] = useState<any>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [sessionRestored, setSessionRestored] = useState(false);

  const expireIfNeeded = useCallback(async (session: any) => {
    if (!session) return;

    // Keep refresh/session continuity stable and rely on Supabase token expiry/refresh.
    if (!getSessionStartedAt()) {
      setSessionStartedAt(Date.now());
    }
  }, []);

  // Get Supabase session
  useEffect(() => {
    let isMounted = true;
    let initialSessionHandled = false;

    const getSession = async () => {
      try {
        let { data: { session } = { session: null }, error } =
          await supabase.auth.getSession();

        // A session-less first result right after a fresh page load (e.g.
        // landing back on /checkout from a Stripe redirect, which is a real
        // browser navigation, not a SPA route change - the whole app
        // re-initializes from scratch) can mean Supabase's own internal
        // refresh-token exchange just hasn't completed yet, not that the
        // user is actually signed out. One short retry avoids treating that
        // transient gap as a real logout and bouncing the user to a
        // sign-in prompt they don't need.
        if (!session && !error && isMounted && mayHaveStoredSession()) {
          await new Promise(resolve => setTimeout(resolve, 400));
          if (!isMounted) return;
          const retry = await supabase.auth.getSession();
          session = retry.data.session;
          error = retry.error;
        }

        if (error) {
        }
        if (isMounted) {
          setSupabaseSession(session);
          setIsSessionLoading(false);
        }
        // Check session expiry after restoring it
        if (session) {
          await expireIfNeeded(session);
        }
        // Mark initial session attempt as completed so UI relying on
        // `sessionRestored` can render even when no session exists.
        if (isMounted) {
          setSessionRestored(true);
        }
      } catch (error) {
        if (isMounted) {
          setIsSessionLoading(false);
          setSessionRestored(true);
        }
      }
    };

    getSession();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isMounted) {
        setSupabaseSession(session);
        setIsSessionLoading(false);
      }

      if (event === "INITIAL_SESSION") {
        initialSessionHandled = true;
        if (isMounted) {
          setSessionRestored(true);
        }
        // Ensure auth.me runs again after Supabase restores session on refresh.
        utils.auth.me.invalidate();
      }

      if (event === "SIGNED_OUT") {
        clearSessionStartedAt();
        utils.auth.me.setData(undefined, null);
        try {
          clearAppStorage();
          clearPendingAuthAction();
          window.dispatchEvent(new Event("cartUpdated"));
        } catch {}
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (event === "SIGNED_IN" && !getSessionStartedAt()) {
          setSessionStartedAt(Date.now());
        }

        await expireIfNeeded(session);

        // Sanity check: ensure Supabase can resolve the user after session updates.
        const { data: userData, error: userError } =
          await supabase.auth.getUser();
        if (userError || !userData?.user) {
        }
        // Invalidate the auth query to refetch user data
        utils.auth.me.invalidate();

        if (!initialSessionHandled && isMounted) {
          setSessionRestored(true);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [utils, expireIfNeeded]);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    // Retry network blips, but not answers: a 4xx will be the same next time,
    // and `retry: true` used to repeat a failing check every few seconds for
    // as long as the page stayed open.
    retry: (failureCount, error) => {
      // data.httpStatus for a real tRPC error; meta.response.status when the
      // reply was not a tRPC response at all (e.g. another program answering
      // the API port).
      const err = error as {
        data?: { httpStatus?: number };
        meta?: { response?: { status?: number } };
      } | null;
      const status = err?.data?.httpStatus ?? err?.meta?.response?.status;
      if (status && status >= 400 && status < 500) return false;
      return failureCount < 3;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: true,
    // Avoid firing protected auth checks before the initial session restore
    // completes, which can look like a logout during refresh.
    enabled: sessionRestored,
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
        clearAppStorage();
        clearPendingAuthAction();
        window.dispatchEvent(new Event("cartUpdated"));
      } catch {}
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    const fallbackUser = supabaseSession?.user
      ? {
          id: supabaseSession.user.id,
          email: supabaseSession.user.email ?? "",
          role: "user",
          name:
            supabaseSession.user.user_metadata?.name ??
            supabaseSession.user.user_metadata?.full_name ??
            supabaseSession.user.email ??
            "User",
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
      loading:
        meQuery.isLoading || logoutMutation.isPending || isSessionLoading,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(resolvedUser),
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
    if (meQuery.isLoading || logoutMutation.isPending || isSessionLoading)
      return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    saveAuthRedirect();
    window.location.href = redirectPath;
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
