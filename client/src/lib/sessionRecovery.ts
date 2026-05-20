import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

let recoveryInProgress = false;

function clearBrowserStorage() {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.clear();
  } catch (error) {
    console.warn('[sessionRecovery] Failed to clear localStorage', error);
  }
}

export async function recoverFromTimeout(reason = 'Session expired. Please log in again.') {
  if (recoveryInProgress) return;
  recoveryInProgress = true;

  try {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('[sessionRecovery] Failed to sign out after timeout', error);
    }

    clearBrowserStorage();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('auth:required', {
          detail: {
            reason: 'session-timeout',
            message: reason,
          },
        })
      );
    }

    toast.error(reason);
  } finally {
    setTimeout(() => {
      recoveryInProgress = false;
    }, 1000);
  }
}

export function isTimeoutError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return message.includes('timed out') || message.includes('timeout');
}