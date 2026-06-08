'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { RecaptchaCheckbox } from '@/components/RecaptchaCheckbox';

/**
 * InlineCheckoutAuth: Embedded authentication component for the checkout flow.
 * 
 * This component provides a seamless authentication experience by embedding
 * Google OAuth directly into the checkout form, without modal/popup interruptions.
 * 
 * Features:
 * - Google OAuth only (no email/password)
 * - Embedded directly in checkout form
 * - Auto-continues to checkout after successful auth
 * - No page redirects during auth
 * - User data (name, email) auto-filled from Google profile
 */

interface InlineCheckoutAuthProps {
  onAuthSuccess?: () => void;
}

export function InlineCheckoutAuth({ onAuthSuccess }: InlineCheckoutAuthProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const oauthRedirectUrl = (() => {
    const configuredRedirect = import.meta.env.VITE_SUPABASE_OAUTH_REDIRECT_URL?.trim();
    const configuredAppUrl = import.meta.env.VITE_APP_URL?.trim();
    const runtimeOrigin = window.location.origin;
    const defaultCallbackPath = '/auth/callback';
    const looksLikePlaceholderAppUrl = !configuredAppUrl || /your-production-domain\.com|replace-with-your/i.test(configuredAppUrl);

    if (configuredRedirect && /^https?:\/\//i.test(configuredRedirect)) {
      return configuredRedirect;
    }

    let baseOrigin = runtimeOrigin;
    if (configuredAppUrl && !looksLikePlaceholderAppUrl) {
      try {
        baseOrigin = new URL(configuredAppUrl).origin;
      } catch {
        baseOrigin = runtimeOrigin;
      }
    }

    const redirectPath = configuredRedirect || defaultCallbackPath;
    const fullPath = redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`;
    
    return `${baseOrigin}${fullPath}`;
  })();

  const handleGoogleSignIn = async () => {
    if (!captchaToken) {
      const captchaEl = document.querySelector('.recaptcha-checkbox, .RecaptchaCheckbox, [data-testid="recaptcha"]');
      if (captchaEl && typeof captchaEl.scrollIntoView === 'function') {
        captchaEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      toast.error('Please complete the security check (captcha) before continuing.');
      return;
    }

    setIsLoading(true);
    try {
      // Store the current checkout location so we redirect back after OAuth
      if (typeof window !== 'undefined') {
        localStorage.setItem('oauth_return_to', '/checkout');
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: oauthRedirectUrl,
        },
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
      }
      // On success, the OAuth redirect will handle the rest
    } catch (error) {
      toast.error('Authentication failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
            <Lock className="h-6 w-6 text-gray-600" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Proceed to secure checkout
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Secure your order with a quick sign-in
            </p>
          </div>
        </div>

        {/* Message */}
        <p className="text-gray-700 mb-6 text-sm sm:text-base">
          Using your Google account, you can securely complete your purchase. Your information will be automatically filled in after sign-in.
        </p>

        {/* Google Sign-in Button */}
        <button
          disabled={isLoading || !captchaToken}
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 border-2 border-gray-300 hover:border-gray-400 disabled:border-gray-300 rounded-lg py-3 px-4 font-semibold text-sm sm:text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-50 disabled:hover:bg-white"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#4A90E2" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#FBBC05" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {isLoading ? 'Signing in...' : 'Continue with Google'}
        </button>

        {/* Captcha */}
        <div className="mt-6">
          <RecaptchaCheckbox
            onChange={setCaptchaToken}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 sm:px-4 py-3 sm:py-4"
            helperText={!captchaToken ? 'Please complete this security check to continue' : ''}
          />
        </div>

        {/* Security Note */}
        <p className="text-xs text-gray-500 mt-6 text-center">
          ✓ Secure checkout using Google OAuth  •  Your data is encrypted
        </p>
      </div>
    </div>
  );
}
