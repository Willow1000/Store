import { PendingAuthActionType, savePendingAuthAction } from '@/lib/authPendingAction';
import { getCurrentInternalPath, saveAuthRedirect, sanitizeInternalRedirect } from '@/lib/authRedirect';

export function requestAuthenticationForPath(actionType?: PendingAuthActionType) {
  if (typeof window === 'undefined') return;

  const redirectTo = sanitizeInternalRedirect(getCurrentInternalPath()) || '/';
  saveAuthRedirect(redirectTo);
  savePendingAuthAction({
    type: actionType,
    redirectTo,
  });

  window.dispatchEvent(
    new CustomEvent('auth:required', {
      detail: {
        type: actionType,
        actionType,
        redirectTo,
      },
    })
  );
}
