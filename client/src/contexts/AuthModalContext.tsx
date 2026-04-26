import { createContext, useContext, useState } from 'react';

interface AuthModalContextType {
  isOpen: boolean;
  mode: 'login' | 'signup';
  actionType?: 'cart' | 'wishlist' | 'checkout' | null;
  openAuthModal: (mode?: 'login' | 'signup', actionType?: 'cart' | 'wishlist' | 'checkout') => void;
  closeAuthModal: () => void;
  setMode: (mode: 'login' | 'signup') => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [actionType, setActionType] = useState<'cart' | 'wishlist' | 'checkout' | null>(null);

  const openAuthModal = (newMode: 'login' | 'signup' = 'login', newActionType?: 'cart' | 'wishlist' | 'checkout') => {
    setMode(newMode);
    if (newActionType) setActionType(newActionType);
    setIsOpen(true);
  };

  const closeAuthModal = () => {
    setIsOpen(false);
    setActionType(null);
  };

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
