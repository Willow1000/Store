import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { executePendingAuthAction, getPendingAuthAction } from '@/lib/authPendingAction';

export default function AuthCallback() {
  const [, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if Supabase successfully processed the OAuth callback
        const { data: { session }, error } = await supabase.auth.getSession();
        
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
          const response = await fetch('/api/trpc/auth.syncOAuthUser', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              json: {
                id: user.id,
                email: user.email,
                name: user.user_metadata?.name,
                loginMethod: user.user_metadata?.provider === 'google' ? 'google' : user.user_metadata?.provider || 'email',
              },
            }),
          });

          if (!response.ok) {
            console.warn('Failed to sync user to backend:', response.status);
            // Continue anyway - user is authenticated with Supabase
          }
        } catch (syncError) {
          console.warn('Error syncing user to backend:', syncError);
          // Continue anyway - user is authenticated with Supabase
        }

        toast.success(`Welcome, ${user.user_metadata?.name || user.email}!`);

        const handledPendingAction = getPendingAuthAction()
          ? await executePendingAuthAction(user.id, navigate)
          : false;
        
        // Redirect to home immediately
        setIsProcessing(false);
        if (!handledPendingAction) {
          navigate('/');
        }
      } catch (error) {
        console.error('Callback error:', error);
        toast.error('Authentication failed. Please try again.');
        setIsProcessing(false);
        setTimeout(() => navigate('/'), 2000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background w-full overflow-x-hidden">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
        <p className="text-gray-600">Completing your sign in...</p>
      </div>
    </div>
  );
}
