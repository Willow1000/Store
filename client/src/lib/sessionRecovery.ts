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
  } catch (error) {
    console.warn("[sessionRecovery] Failed to clear browser storage", error);
  }
}

export async function recoverFromTimeout(
  reason = "Session expired. Please log in again."
) {
  if (recoveryInProgress) return;
  recoveryInProgress = true;

  try {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn("[sessionRecovery] Failed to sign out after timeout", error);
    }

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

  return (
    message.includes("session expired") ||
    message.includes("refresh token") ||
    message.includes("jwt expired") ||
    message.includes("invalid token") ||
    message.includes("unauthorized") ||
    message.includes("access denied") ||
    message.includes("token has expired") ||
    message.includes("invalid jwt") ||
    message.includes("jwt")
  );
}
