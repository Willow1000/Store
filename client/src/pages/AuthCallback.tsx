import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { trpcClient } from '@/lib/trpc';
import { toast } from 'sonner';
import { executePendingAuthAction, getPendingAuthAction } from '@/lib/authPendingAction';
import { consumeAuthRedirect, sanitizeInternalRedirect } from '@/lib/authRedirect';
import { SEOHead } from '@/components/SEOHead';

export default function AuthCallback() {
  const [, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(true);

  const clearCallbackUrl = () => {
    if (typeof window === 'undefined') return;
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  };

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if Supabase successfully processed the OAuth callback
        // Do NOT clear the callback URL before calling `getSession()` —
        // Supabase parses tokens/codes from the current URL.
        const sessionResult = await supabase.auth.getSession();
        let session = sessionResult.data.session;
        let error = sessionResult.error;

        if (!session && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('code')) {
          const exchangeResult = await supabase.auth.exchangeCodeForSession(window.location.href);
          session = exchangeResult.data.session;
          error = exchangeResult.error;
        }
        
        if (error || !session) {
          console.error('Auth callback error:', error);
          toast.error('Authentication failed. Please try again.');
          setIsProcessing(false);
          // Redirect after a short delay
          setTimeout(() => navigate('/'), 2000);
          return;
        }

        // Session exists, user is authenticated
        const user = session.user;
        
        // Sync OAuth user to backend database
        try {
          await trpcClient.auth.syncOAuthUser.mutate({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name,
            loginMethod: user.user_metadata?.provider === 'google' ? 'google' : user.user_metadata?.provider || 'email',
          });
        } catch (syncError) {
          console.warn('Error syncing user to backend:', syncError);
          // Continue anyway - user is authenticated with Supabase
        }

        toast.success(`Welcome, ${user.user_metadata?.name || user.email}!`);

        const pendingAction = getPendingAuthAction();
        const savedRedirectTarget = consumeAuthRedirect('/');
        let pendingActionTarget: string | null = null;

        if (pendingAction) {
          await executePendingAuthAction(user.id, (to) => {
            pendingActionTarget = sanitizeInternalRedirect(to);
          }).catch((pendingActionError) => {
            const message = pendingActionError instanceof Error
              ? pendingActionError.message
              : 'The product is out of stock.';
            toast.error(message);
          });
        }

        let finalTarget =
          sanitizeInternalRedirect(pendingActionTarget) ||
          sanitizeInternalRedirect(pendingAction?.redirectTo) ||
          savedRedirectTarget;

        if ((!finalTarget || finalTarget === '/') && typeof window !== 'undefined') {
          try {
            if (window.sessionStorage.getItem('cart-auth-redirect-pending-v1') === '1') {
              finalTarget = '/cart';
            }
          } catch {
            // ignore storage issues
          }
        }

        // Clear callback query/hash after the session has been read to avoid
        // removing tokens or auth codes before Supabase can parse them.
        clearCallbackUrl();

        if (finalTarget === '/cart' && typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('cart-auth-redirect-pending-v1', '1');
          } catch {
            // ignore storage issues
          }
        }

        setIsProcessing(false);
        navigate(finalTarget, { replace: true });
      } catch (error) {
        console.error('Callback error:', error);
        toast.error('Authentication failed. Please try again.');
        setIsProcessing(false);
        setTimeout(() => {
          clearCallbackUrl();
          navigate('/', { replace: true });
        }, 2000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background w-full overflow-x-hidden">
      <SEOHead
        title="Signing In | MotorVault"
        description="Completing secure sign in to MotorVault."
        canonical="/auth/callback"
        noIndex
        noFollow
      />
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
        <p className="text-gray-600">Completing your sign in...</p>
      </div>
    </div>
  );
}
