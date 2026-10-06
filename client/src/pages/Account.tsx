import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useRef } from "react";
import { SEOHead } from "@/components/SEOHead";
import { User, Mail, LogOut, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { requestAuthenticationForPath } from "@/lib/authRequired";

export default function Account() {
  const { user, isAuthenticated, sessionRestored, logout } = useAuth();
  const authPromptedRef = useRef(false);

  useEffect(() => {
    if (!sessionRestored || isAuthenticated || authPromptedRef.current) return;
    authPromptedRef.current = true;
    requestAuthenticationForPath();
  }, [isAuthenticated, sessionRestored]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      window.location.href = "/";
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  if (!sessionRestored) {
    return (
      <div className="min-h-screen bg-white">
        <PageHeader title="My Account" />
        <div className="container py-8 sm:py-12">
          <div className="grid gap-6 md:grid-cols-3" aria-hidden="true">
            <div className="h-72 animate-pulse rounded-xl bg-muted" />
            <div className="h-72 animate-pulse rounded-xl bg-muted md:col-span-2" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Guests get no account data; the sign-in prompt is opened by the effect
    // above, and this gives them a way to reopen it.
    return (
      <div className="min-h-screen w-full overflow-x-clip bg-white">
        <PageHeader title="My Account" />
        <div className="container py-10 sm:py-16">
          <EmptyState icon={<User />} title="Sign in to view your account">
            <button
              type="button"
              className="btn-primary"
              onClick={() => requestAuthenticationForPath()}
            >
              Sign in
            </button>
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-white">
      <PageHeader title="My Account" />
      <div className="container py-8 sm:py-12">
        <div className="grid gap-6 md:grid-cols-3 md:items-start">
          {/* Profile Card */}
          <div className="panel">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-ink font-display text-xl font-bold text-white">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-ink">
                  {user.name || "User"}
                </h2>
                <p className="truncate text-sm text-gray-600">{user.email}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3 border-t border-gray-200 pt-5">
              <div className="flex items-center gap-3">
                <Mail size={16} className="flex-none text-gray-500" />
                <span className="min-w-0 break-all text-sm">{user.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <User size={16} className="flex-none text-gray-500" />
                <span className="text-sm capitalize">{user.role}</span>
              </div>
            </div>

            <div className="mt-5 grid gap-2 border-t border-gray-200 pt-5">
              <Link href="/orders" className="btn-secondary btn-block">
                My Orders
              </Link>
              <Link href="/tickets" className="btn-secondary btn-block">
                My Tickets
              </Link>
              <button
                onClick={handleLogout}
                className="btn-ghost btn-block text-brand hover:bg-brand-soft"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>

          {/* Account Info */}
          <div className="space-y-6 md:col-span-2">
            {/* Personal Information */}
            <div className="panel">
              <h2 className="mb-5 text-xl font-bold text-ink">
                Personal Information
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Full Name</label>
                  <input
                    type="text"
                    value={user.name || ""}
                    disabled
                    className="field disabled:bg-gray-50 disabled:text-gray-600"
                  />
                </div>
                <div>
                  <label className="label">Email Address</label>
                  <input
                    type="email"
                    value={user.email || ""}
                    disabled
                    className="field disabled:bg-gray-50 disabled:text-gray-600"
                  />
                </div>
              </div>
              <button className="btn-secondary mt-5">Edit Profile</button>
            </div>

            {/* Account Settings */}
            <div className="panel">
              <h2 className="mb-3 text-xl font-bold text-ink">
                Account Settings
              </h2>
              <div className="divide-y divide-gray-200 border-y border-gray-200">
                <button className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-sm font-medium text-ink hover:text-gray-600">
                  Change Password
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
                <button className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-sm font-medium text-ink hover:text-gray-600">
                  Privacy Settings
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
                <button className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-sm font-medium text-ink hover:text-gray-600">
                  Notification Preferences
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
