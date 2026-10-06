import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useRef } from "react";
import { Bell, CheckCircle, AlertCircle, Package, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { requestAuthenticationForPath } from "@/lib/authRequired";

export default function Notifications() {
  const { isAuthenticated, sessionRestored } = useAuth();
  const authPromptedRef = useRef(false);
  const { data: notifications, isLoading } = trpc.notifications.list.useQuery(
    undefined,
    {
      enabled: sessionRestored && isAuthenticated,
    }
  );

  useEffect(() => {
    if (!sessionRestored || isAuthenticated || authPromptedRef.current) return;
    authPromptedRef.current = true;
    requestAuthenticationForPath();
  }, [isAuthenticated, sessionRestored]);

  if (!sessionRestored) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <div className="container py-8 sm:py-12">
        <h1 className="mb-6 text-ink">Notifications</h1>
        <div className="panel">{/* blank for guests */}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background w-full overflow-x-hidden">
        <div className="container py-8 sm:py-12 space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4"
              >
                <Skeleton className="mt-1 h-5 w-5 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-9 w-9 rounded-md flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const notificationsList = notifications || [];

  if (notificationsList.length === 0) {
    return (
      <div className="container py-8 sm:py-12">
        <h1 className="mb-6 text-ink">Notifications</h1>
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
      case "order_placed":
        return <Package className="text-ink" size={20} />;
      case "order_confirmed":
        return <CheckCircle className="text-success" size={20} />;
      case "order_shipped":
        return <Package className="text-ink" size={20} />;
      case "payment_failed":
        return <AlertCircle className="text-brand" size={20} />;
      default:
        return <Bell className="text-gray-600" size={20} />;
    }
  };

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <div className="container py-8 sm:py-12">
        <h1 className="mb-6 text-ink">Notifications</h1>

        <div className="space-y-4">
          {notificationsList.map((notification: any) => (
            <div
              key={notification.id}
              className={`flex items-start gap-4 rounded-xl border p-4 ${
                notification.read
                  ? "border-gray-200 bg-white"
                  : "border-gray-300 bg-gray-50"
              }`}
            >
              <div className="flex-shrink-0 mt-1">
                {getNotificationIcon(notification.type)}
              </div>

              <div className="flex-1">
                <h3 className="flex items-center gap-2 font-sans text-[15px] font-semibold tracking-normal text-ink">
                  {!notification.read && (
                    <span
                      className="h-2 w-2 flex-none rounded-full bg-brand"
                      aria-label="Unread"
                    />
                  )}
                  {notification.title}
                </h3>
                {notification.content && (
                  <p className="mt-1 text-sm text-gray-600">
                    {notification.content}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  {new Date(notification.createdAt).toLocaleDateString()} at{" "}
                  {new Date(notification.createdAt).toLocaleTimeString()}
                </p>
              </div>

              <button
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-ink"
                aria-label="Delete notification"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
