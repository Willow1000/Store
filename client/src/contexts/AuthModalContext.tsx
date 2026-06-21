import { createContext, useContext, useEffect, useState } from 'react';
import { PendingAuthAction, savePendingAuthAction, clearPendingAuthAction } from '@/lib/authPendingAction';
import { saveAuthRedirect, sanitizeInternalRedirect } from '@/lib/authRedirect';

interface AuthModalContextType {
  isOpen: boolean;
  mode: 'login' | 'signup';
  actionType?: 'cart' | 'wishlist' | 'checkout' | 'tickets' | null;
  openAuthModal: (
    mode?: 'login' | 'signup',
    actionType?: 'cart' | 'wishlist' | 'checkout' | 'tickets',
    pendingAction?: PendingAuthAction
  ) => void;
  closeAuthModal: () => void;
  setMode: (mode: 'login' | 'signup') => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [actionType, setActionType] = useState<'cart' | 'wishlist' | 'checkout' | 'tickets' | null>(null);

  const openAuthModal = (
    newMode: 'login' | 'signup' = 'login',
    newActionType?: 'cart' | 'wishlist' | 'checkout' | 'tickets',
    pendingAction?: PendingAuthAction
  ) => {
    setMode(newMode);
    setActionType(newActionType ?? null);

    const currentPath = typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : '/';

    // Ensure auth-required flows always retain an intended return URL.
    const normalizedPendingAction: PendingAuthAction | undefined = pendingAction
      ? {
          ...pendingAction,
          type: pendingAction.type || (newActionType as PendingAuthAction['type']),
          redirectTo: pendingAction.redirectTo || currentPath,
        }
      : (newActionType
          ? {
              type: newActionType as PendingAuthAction['type'],
              redirectTo:
                newActionType === 'cart'
                  ? '/cart'
                  : newActionType === 'checkout'
                    ? '/checkout'
                    : currentPath,
            }
          : undefined);

    if (normalizedPendingAction) savePendingAuthAction(normalizedPendingAction);
    const safeRedirectTo = sanitizeInternalRedirect(normalizedPendingAction?.redirectTo);
    if (typeof window !== 'undefined' && safeRedirectTo) {
      try {
        saveAuthRedirect(safeRedirectTo);
        if (safeRedirectTo === '/cart') {
          sessionStorage.setItem('cart-auth-redirect-pending-v1', '1');
        }
      } catch {
        // ignore storage issues
      }
    }
    setIsOpen(true);
  };

  const closeAuthModal = () => {
    setIsOpen(false);
    setActionType(null);
    clearPendingAuthAction();
  };

  useEffect(() => {
    const handleAuthRequired = (event: Event) => {
      const customEvent = event as CustomEvent<PendingAuthAction & { actionType?: 'cart' | 'wishlist' | 'checkout' | 'tickets'; message?: string; reason?: string }>;
      const pendingAction = customEvent.detail;
      openAuthModal('login', pendingAction?.actionType, pendingAction);
    };

    window.addEventListener('auth:required', handleAuthRequired as EventListener);
    return () => window.removeEventListener('auth:required', handleAuthRequired as EventListener);
  }, []);

  return (
    <AuthModalContext.Provider value={{ isOpen, mode, actionType, openAuthModal, closeAuthModal, setMode }}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within AuthModalProvider');
  }
  return context;
}
