"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { getPendingAuthAction } from "@/lib/authPendingAction";
import { RecaptchaCheckbox } from "@/components/RecaptchaCheckbox";
import { getCurrentInternalPath, saveAuthRedirect } from "@/lib/authRedirect";

export default function AuthModal() {
  const { isOpen, actionType, closeAuthModal } = useAuthModal();
  const { refresh } = useAuth();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  if (!isOpen) return null;

  const oauthRedirectUrl = (() => {
    const configuredRedirect =
      import.meta.env.VITE_SUPABASE_OAUTH_REDIRECT_URL?.trim();
    const configuredAppUrl = import.meta.env.VITE_APP_URL?.trim();
    const runtimeOrigin = window.location.origin;
    const defaultCallbackPath = "/auth/callback";
    const looksLikePlaceholderAppUrl =
      !configuredAppUrl ||
      /your-production-domain\.com|replace-with-your/i.test(configuredAppUrl);

    // If a full redirect URL is configured, use it as-is
    if (configuredRedirect && /^https?:\/\//i.test(configuredRedirect)) {
      return configuredRedirect;
    }

    // Determine base origin for relative redirects
    let baseOrigin = runtimeOrigin;
    if (configuredAppUrl && !looksLikePlaceholderAppUrl) {
      try {
        baseOrigin = new URL(configuredAppUrl).origin;
      } catch {
        baseOrigin = runtimeOrigin;
      }
    }

    // Use configured relative redirect or fall back to default callback path
    const redirectPath = configuredRedirect || defaultCallbackPath;
    const fullPath = redirectPath.startsWith("/")
      ? redirectPath
      : `/${redirectPath}`;

    return `${baseOrigin}${fullPath}`;
  })();

  const handleGoogleSignIn = async () => {
    if (!captchaToken) {
      const captchaEl = document.querySelector(
        '.recaptcha-checkbox, .RecaptchaCheckbox, [data-testid="recaptcha"]'
      );
      if (captchaEl && typeof captchaEl.scrollIntoView === "function") {
        captchaEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      toast.error(
        "Please complete the security check (captcha) before continuing with Google sign-in."
      );
      return;
    }
    setIsLoading(true);
    try {
      const pendingAction = getPendingAuthAction();
      const returnToPath =
        pendingAction?.redirectTo || getCurrentInternalPath();
      if (typeof window !== "undefined") {
        saveAuthRedirect(returnToPath);
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: oauthRedirectUrl,
        },
      });
      if (error) {
        toast.error(error.message);
        setIsLoading(false);
      }
    } catch (error) {
      toast.error("Google sign-in failed. Please try again.");
      setIsLoading(false);
    }
  };

  const actionMessages = {
    cart: "Sign in to add items to your cart",
    wishlist: "Sign in to save items to your wishlist",
    checkout: "Sign in to complete your purchase",
    tickets: "Sign in to your account to see your ticket(s)",
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeAuthModal}
      />

      <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-pop animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={closeAuthModal}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-shrink-0 bg-gray-950 px-6 pb-5 pt-6 sm:px-8">
          <h2
            id="auth-modal-title"
            className="mb-1.5 pr-10 text-xl font-bold text-white"
          >
            Sign In
          </h2>
          <p className="pr-10 text-sm text-white/75">
            {actionType
              ? actionMessages[actionType]
              : "Sign in with your Google account"}
          </p>
        </div>

        <div className="flex-1 px-6 py-6 sm:px-8">
          <button
            disabled={isLoading || !captchaToken}
            type="button"
            className="btn-secondary btn-lg btn-block gap-3"
            onClick={handleGoogleSignIn}
            title={
              !captchaToken ? "Please complete the security check first" : ""
            }
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#4A90E2"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#FBBC05"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isLoading ? "Signing in..." : "Continue with Google"}
          </button>

          <RecaptchaCheckbox
            onChange={setCaptchaToken}
            className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 sm:px-4 sm:py-4"
            helperText={
              !captchaToken
                ? "Please complete this security check to continue"
                : ""
            }
          />

          <p className="mt-4 text-center text-xs text-gray-500">
            Google OAuth is our secure sign-in method.
          </p>
        </div>
      </div>
    </div>
  );
}
