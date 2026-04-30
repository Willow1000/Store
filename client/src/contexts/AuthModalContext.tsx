import { createContext, useContext, useEffect, useState } from 'react';
import { PendingAuthAction, savePendingAuthAction, clearPendingAuthAction } from '@/lib/authPendingAction';

interface AuthModalContextType {
  isOpen: boolean;
  mode: 'login' | 'signup';
  actionType?: 'cart' | 'wishlist' | 'checkout' | null;
  openAuthModal: (
    mode?: 'login' | 'signup',
    actionType?: 'cart' | 'wishlist' | 'checkout',
    pendingAction?: PendingAuthAction
  ) => void;
  closeAuthModal: () => void;
  setMode: (mode: 'login' | 'signup') => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [actionType, setActionType] = useState<'cart' | 'wishlist' | 'checkout' | null>(null);

  const openAuthModal = (
    newMode: 'login' | 'signup' = 'login',
    newActionType?: 'cart' | 'wishlist' | 'checkout',
    pendingAction?: PendingAuthAction
  ) => {
    setMode(newMode);
    if (newActionType) setActionType(newActionType);
    if (pendingAction) savePendingAuthAction(pendingAction);
    setIsOpen(true);
  };

  const closeAuthModal = () => {
    setIsOpen(false);
    setActionType(null);
    clearPendingAuthAction();
  };

  useEffect(() => {
    const handleAuthRequired = (event: Event) => {
      const customEvent = event as CustomEvent<PendingAuthAction & { actionType?: 'cart' | 'wishlist' | 'checkout' }>;
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
