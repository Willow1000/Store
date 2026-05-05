import { useAuth } from '@/_core/hooks/useAuth';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { SEOHead } from '@/components/SEOHead';
import { User, Mail, Phone, MapPin, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function Account() {
  const { user, isAuthenticated, sessionRestored, logout } = useAuth();
  const { openAuthModal } = useAuthModal();
  const authPromptedRef = useRef(false);
  const [location] = useLocation();

  useEffect(() => {
    if (!sessionRestored) return;
    if (isAuthenticated) {
      authPromptedRef.current = false;
      return;
    }
    if (authPromptedRef.current) return;
    authPromptedRef.current = true;
    openAuthModal('login', undefined, { redirectTo: location });
  }, [isAuthenticated, sessionRestored, location, openAuthModal]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      window.location.href = '/';
    } catch (error) {
      console.error('[Account] Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  if (!sessionRestored) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12">
          <div className="space-y-4">
            <div className="h-10 w-48 bg-muted rounded animate-pulse" />
            <div className="grid gap-8 md:grid-cols-3">
              <div className="h-80 rounded-lg bg-muted animate-pulse" />
              <div className="md:col-span-2 h-80 rounded-lg bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12">
        <h1 className="mb-8 text-4xl font-bold">My Account</h1>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Profile Card */}
          <div className="rounded-lg border border-border bg-white p-6">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black text-2xl font-bold text-white">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="text-xl font-bold">{user.name || 'User'}</h2>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-6">
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-gray-600" />
                <span className="text-sm">{user.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <User size={18} className="text-gray-600" />
                <span className="text-sm capitalize">{user.role}</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-md bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>

          {/* Account Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="rounded-lg border border-border bg-white p-6">
              <h2 className="mb-6 text-2xl font-bold">Personal Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Full Name</label>
                  <input
                    type="text"
                    value={user.name || ''}
                    disabled
                    className="mt-1 w-full rounded-md border border-input bg-gray-50 px-4 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Email Address</label>
                  <input
                    type="email"
                    value={user.email || ''}
                    disabled
                    className="mt-1 w-full rounded-md border border-input bg-gray-50 px-4 py-2 text-sm"
                  />
                </div>
                <button className="rounded-md border border-border bg-background py-2 text-sm font-semibold hover:bg-secondary">
                  Edit Profile
                </button>
              </div>
            </div>

            {/* Account Settings */}
            <div className="rounded-lg border border-border bg-white p-6">
              <h2 className="mb-6 text-2xl font-bold">Account Settings</h2>
              <div className="space-y-4">
                <button className="w-full rounded-md border border-border bg-background py-3 text-left text-sm font-semibold hover:bg-secondary">
                  Change Password
                </button>
                <button className="w-full rounded-md border border-border bg-background py-3 text-left text-sm font-semibold hover:bg-secondary">
                  Privacy Settings
                </button>
                <button className="w-full rounded-md border border-border bg-background py-3 text-left text-sm font-semibold hover:bg-secondary">
                  Notification Preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
