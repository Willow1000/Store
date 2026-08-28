import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

let recoveryInProgress = false;

function clearBrowserStorage() {
  if (typeof window === "undefined") return;

  const authKeys = [
    "motorvault_auth_redirect",
    "oauth_return_to",
    "pending_auth_action",
    "auth_session_started_at",
    "manus-runtime-user-info",
    "isMigratingCart",
    "cart",
    "checkout-cart-snapshot-v1",
  ];
  const sessionKeys = ["cart-auth-redirect-pending-v1"];

  try {
    for (const key of authKeys) {
      window.localStorage.removeItem(key);
    }
    for (const key of sessionKeys) {
      window.sessionStorage.removeItem(key);
    }
  } catch {}
}

export async function recoverFromTimeout(
  reason = "Session expired. Please log in again."
) {
  if (recoveryInProgress) return;
  recoveryInProgress = true;

  try {
    try {
      await supabase.auth.signOut();
    } catch {}

    clearBrowserStorage();

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("auth:required", {
          detail: {
            reason: "session-timeout",
            message: reason,
          },
        })
      );
      setTimeout(() => {
        window.location.reload();
      }, 250);
    }

    toast.error(reason);
  } finally {
    setTimeout(() => {
      recoveryInProgress = false;
    }, 1000);
  }
}

function normalizeErrorMessage(error: unknown): string {
  if (typeof error === "string") return error.toLowerCase();
  if (error instanceof Error) return error.message.toLowerCase();
  if (error && typeof (error as any).message === "string") {
    return (error as any).message.toLowerCase();
  }
  return "";
}

export function isTimeoutError(error: unknown) {
  const message = normalizeErrorMessage(error);
  if (!message) return false;

  // Only match phrases that unambiguously indicate the user's own session
  // has actually expired or been invalidated - not generic auth-failure
  // text. A bare "jwt", "unauthorized", or "access denied" match is far
  // too broad: those substrings show up in transient, unrelated Supabase/
  // PostgREST errors (e.g. a request that raced ahead of session restore
  // on page load, or an RLS denial for a completely different reason),
  // and recoverFromTimeout() responds by signing the user out and
  // reloading the page - a false positive here means a real, valid
  // session gets forcibly logged out over a one-off unrelated error. That
  // combination previously caused signed-in users to get logged out again
  // on refresh.
  return (
    message.includes("session expired") ||
    message.includes("refresh token") ||
    message.includes("jwt expired") ||
    message.includes("invalid token") ||
    message.includes("token has expired") ||
    message.includes("invalid jwt")
  );
}
