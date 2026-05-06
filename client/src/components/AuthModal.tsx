'use client';

import { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, Phone, MapPin, Eye, EyeOff } from 'lucide-react';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { executePendingAuthAction, getPendingAuthAction } from '@/lib/authPendingAction';
import { RecaptchaCheckbox } from '@/components/RecaptchaCheckbox';

export default function AuthModal() {
  const { isOpen, mode, actionType, closeAuthModal, setMode } = useAuthModal();
  const { refresh } = useAuth();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginCaptchaToken, setLoginCaptchaToken] = useState<string | null>(null);
  const [signupCaptchaToken, setSignupCaptchaToken] = useState<string | null>(null);

  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
  });

  if (!isOpen) return null;

  const oauthRedirectUrl = (() => {
    const configuredRedirect = import.meta.env.VITE_SUPABASE_OAUTH_REDIRECT_URL?.trim();
    const runtimeOrigin = window.location.origin;

    if (!configuredRedirect) {
      return `${runtimeOrigin}/api/oauth/callback`;
    }

    if (/^https?:\/\//i.test(configuredRedirect)) {
      try {
        const configuredUrl = new URL(configuredRedirect);
        const runtimeUrl = new URL(runtimeOrigin);

        // Always use the current origin and keep only path/query/hash from configured values.
        return new URL(
          `${configuredUrl.pathname}${configuredUrl.search}${configuredUrl.hash}`,
          `${runtimeUrl.protocol}//${runtimeUrl.host}`,
        ).href;
      } catch {
        return `${runtimeOrigin}/api/oauth/callback`;
      }
    }

    return new URL(configuredRedirect.startsWith("/") ? configuredRedirect : `/${configuredRedirect}`, runtimeOrigin).href;
  })();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
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
    } catch (error) {
      toast.error('Google sign-in failed. Please try again.');
      setIsLoading(false);
    }
  };



  const syncUserToBackend = async (userId: string, email: string, name?: string) => {
    try {
      const response = await fetch('/api/trpc/auth.syncOAuthUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          json: {
            id: userId,
            email,
            name,
            loginMethod: 'email',
          },
        }),
      });

      if (!response.ok) {
        console.warn('Failed to sync user to backend:', response.status);
      }
    } catch (error) {
      console.warn('Error syncing user to backend:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!loginCaptchaToken) {
      toast.error('Please complete the reCAPTCHA before signing in.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) {
        toast.error(error.message);
      } else if (data.user) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          toast.error('Login session not found. Please try again.');
          return;
        }

        // Sync user to backend
        await syncUserToBackend(data.user.id, data.user.email || '', data.user.user_metadata?.name);
        
        // Wait a moment for backend to process, then refresh auth state
        await new Promise(resolve => setTimeout(resolve, 500));
        refresh();

        const hadPendingAction = Boolean(getPendingAuthAction());
        if (hadPendingAction) {
          try {
            await executePendingAuthAction(data.user.id, navigate);
          } catch (pendingActionError) {
            const message = pendingActionError instanceof Error
              ? pendingActionError.message
              : 'The product is out of stock.';
            toast.error(message);
          }
        }
        
        toast.success('Signed in successfully!');
        closeAuthModal();
        setLoginData({ email: '', password: '' });
        setLoginCaptchaToken(null);
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupData.email || !signupData.password || !signupData.name) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!signupCaptchaToken) {
      toast.error('Please complete the reCAPTCHA before creating an account.');
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          data: {
            name: signupData.name,
            phone: signupData.phone,
            address: signupData.address,
          },
        },
      });

      if (error) {
        toast.error(error.message);
      } else if (data.user) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          toast.error('Signup session not found. Please verify and sign in again.');
          return;
        }

        // Sync user to backend immediately (even before email verification)
        await syncUserToBackend(data.user.id, data.user.email || '', signupData.name);
        
        // Wait a moment for backend to process, then refresh auth state
        await new Promise(resolve => setTimeout(resolve, 500));
        refresh();

        const hadPendingAction = Boolean(getPendingAuthAction());
        if (hadPendingAction) {
          try {
            await executePendingAuthAction(data.user.id, navigate);
          } catch (pendingActionError) {
            const message = pendingActionError instanceof Error
              ? pendingActionError.message
              : 'The product is out of stock.';
            toast.error(message);
          }
        }
        
        toast.success('Account created! Please check your email to verify.');
        closeAuthModal();
        setSignupData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          phone: '',
          address: '',
        });
        setSignupCaptchaToken(null);
      }
    } catch (error) {
      toast.error('Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const actionMessages = {
    cart: 'Sign in to add items to your cart',
    wishlist: 'Sign in to save items to your wishlist',
    checkout: 'Sign in to complete your purchase',
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeAuthModal}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-visible animate-in fade-in zoom-in-95 duration-300 flex flex-col">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute right-4 top-4 z-10 rounded-full bg-gray-100 hover:bg-gray-200 p-2 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-black to-gray-800 px-6 md:px-8 pt-6 md:pt-8 pb-4 md:pb-6 flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-300 text-xs md:text-sm">
            {actionType ? actionMessages[actionType] : (mode === 'login' ? 'Sign in to your account' : 'Join us to get started')}
          </p>
        </div>

        {/* Content - Scrollable */}
        <div className="px-6 md:px-8 py-6 md:py-8 overflow-y-auto flex-1">
          {/* Tab Switcher */}
          <div className="flex gap-2 mb-4 md:mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 px-3 md:px-4 rounded-md font-medium text-xs md:text-sm transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 px-3 md:px-4 rounded-md font-medium text-xs md:text-sm transition-all duration-200 ${
                mode === 'signup'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Google OAuth Button - Priority */}
          <button
            disabled={isLoading || (mode === 'login' ? !loginCaptchaToken : !signupCaptchaToken)}
            type="button"
            className="w-full flex items-center justify-center gap-2 md:gap-3 border border-gray-300 hover:border-gray-400 hover:disabled:border-gray-300 rounded-lg py-2.5 md:py-3 font-medium text-xs md:text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            onClick={handleGoogleSignIn}
            title={mode === 'login' ? (!loginCaptchaToken ? 'Please complete the security check first' : '') : (!signupCaptchaToken ? 'Please complete the security check first' : '')}
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#4A90E2" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#FBBC05" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="relative my-4 md:my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs md:text-sm">
              <span className="px-2 bg-white text-gray-600">or continue with email</span>
            </div>
          </div>
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                  <input
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2 md:py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2 md:py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 md:w-5 md:h-5" /> : <Eye className="w-4 h-4 md:w-5 md:h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !loginCaptchaToken}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 md:py-2.5 rounded-lg text-sm md:text-base transition-all duration-200 mt-4 md:mt-6"
                title={!loginCaptchaToken ? 'Please complete the security check first' : ''}
              >
                {isLoading ? 'Signing In...' : !loginCaptchaToken ? 'Complete security check to sign in' : 'Sign In'}
              </button>

              <RecaptchaCheckbox
                onChange={setLoginCaptchaToken}
                className="rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50 px-3 sm:px-4 py-3 sm:py-4 mt-4"
                helperText={!loginCaptchaToken ? 'Please complete this security check to continue' : ''}
              />

              <p className="text-center text-xs md:text-sm text-gray-600 mt-3">
                Forgot your password?{' '}
                <button className="text-blue-600 hover:text-blue-700 font-medium text-xs md:text-sm">
                  Reset it
                </button>
              </p>
            </form>
          )}

          {/* Signup Form */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-3">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                  <input
                    type="text"
                    value={signupData.name}
                    onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-2 md:py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                  <input
                    type="email"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2 md:py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">
                  Phone (optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={signupData.phone}
                    onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                    placeholder="+234 801 000 0000"
                    className="w-full pl-10 pr-4 py-2 md:py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">
                  Address (optional)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                  <input
                    type="text"
                    value={signupData.address}
                    onChange={(e) => setSignupData({ ...signupData, address: e.target.value })}
                    placeholder="123 Main St, City"
                    className="w-full pl-10 pr-4 py-2 md:py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2 md:py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 md:w-5 md:h-5" /> : <Eye className="w-4 h-4 md:w-5 md:h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={signupData.confirmPassword}
                    onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2 md:py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !signupCaptchaToken}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 md:py-2.5 rounded-lg text-sm md:text-base transition-all duration-200 mt-4 md:mt-6"
                title={!signupCaptchaToken ? 'Please complete the security check first' : ''}
              >
                {isLoading ? 'Creating Account...' : !signupCaptchaToken ? 'Complete security check to sign up' : 'Create Account'}
              </button>

              <RecaptchaCheckbox
                onChange={setSignupCaptchaToken}
                className="rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50 px-3 sm:px-4 py-3 sm:py-4 mt-4"
                helperText={!signupCaptchaToken ? 'Please complete this security check to continue' : ''}
              />

              <p className="text-center text-xs md:text-xs text-gray-600 mt-3">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          )}


        </div>

        {/* Footer Note */}
        <div className="border-t border-gray-200 px-6 md:px-8 py-3 md:py-4 bg-gray-50 text-center text-xs md:text-sm text-gray-600 flex-shrink-0">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => setMode('signup')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign up here
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign in here
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
