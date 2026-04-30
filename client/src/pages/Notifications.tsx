import { useAuth } from '@/_core/hooks/useAuth';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Bell, CheckCircle, AlertCircle, Package, Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';

export default function Notifications() {
  const { isAuthenticated, sessionRestored } = useAuth();
  const { openAuthModal } = useAuthModal();
  const authPromptedRef = useRef(false);
  const [location] = useLocation();
  const { data: notifications, isLoading } = trpc.notifications.list.useQuery(undefined, {
    enabled: sessionRestored && isAuthenticated,
  });

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

  if (!sessionRestored) {
    return null;
  }

  if (isLoading) {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const notificationsList = notifications || [];

  if (notificationsList.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12">
        <h1 className="mb-8 text-4xl font-bold">Notifications</h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-secondary py-12">
          <Bell size={48} className="mb-4 text-gray-400" />
          <p className="mb-2 text-lg font-semibold">No notifications</p>
          <p className="text-sm text-gray-600">You're all caught up!</p>
        </div>
      </div>
    );
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_placed':
        return <Package className="text-blue-600" size={20} />;
      case 'order_confirmed':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'order_shipped':
        return <Package className="text-purple-600" size={20} />;
      case 'payment_failed':
        return <AlertCircle className="text-red-600" size={20} />;
      default:
        return <Bell className="text-gray-600" size={20} />;
    }
  };

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12">
        <h1 className="mb-8 text-4xl font-bold">Notifications</h1>

        <div className="space-y-4">
          {notificationsList.map((notification: any) => (
            <div
              key={notification.id}
              className={`flex items-start gap-4 rounded-lg border border-border p-4 ${
                notification.read ? 'bg-white' : 'bg-blue-50'
              }`}
            >
              <div className="flex-shrink-0 mt-1">
                {getNotificationIcon(notification.type)}
              </div>

              <div className="flex-1">
                <h3 className="font-semibold">{notification.title}</h3>
                {notification.content && (
                  <p className="mt-1 text-sm text-gray-600">{notification.content}</p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  {new Date(notification.createdAt).toLocaleDateString()} at{' '}
                  {new Date(notification.createdAt).toLocaleTimeString()}
                </p>
              </div>

              <button className="flex-shrink-0 text-gray-400 hover:text-gray-600">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
