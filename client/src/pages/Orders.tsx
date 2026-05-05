import { useAuth } from '@/_core/hooks/useAuth';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Package, Clock, CheckCircle, Truck, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSupabaseOrders } from '@/hooks/useSupabaseOrders';

export default function Orders() {
  const { user, isAuthenticated, sessionRestored, loading } = useAuth();
  const { openAuthModal } = useAuthModal();
  const authPromptedRef = useRef(false);
  const [location, setLocation] = useLocation();
  const { orders, isLoading, error } = useSupabaseOrders(user?.id ?? null);

  useEffect(() => {
    if (!sessionRestored || loading) return;
    if (isAuthenticated) {
      authPromptedRef.current = false;
      return;
    }
    if (authPromptedRef.current) return;
    authPromptedRef.current = true;
    openAuthModal('login', undefined, { redirectTo: location });
  }, [isAuthenticated, sessionRestored, loading, location, openAuthModal]);

  if (!sessionRestored || loading) {
    return (
      <div className="min-h-screen bg-background w-full overflow-x-hidden">
        <div className="max-w-screen-xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12 space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-white p-6 space-y-4">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-28" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-7 w-24" />
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <Skeleton className="h-10 w-32 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background w-full overflow-x-hidden">
        <div className="max-w-screen-xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12 space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-white p-6 space-y-4">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-28" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-7 w-24" />
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <Skeleton className="h-10 w-32 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12">
        <h1 className="mb-8 text-4xl font-bold">My Orders</h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-12">
          <XCircle size={48} className="mb-4 text-red-500" />
          <p className="mb-2 text-lg font-semibold text-red-700">Unable to load orders</p>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const ordersList = orders || [];

  if (ordersList.length === 0) {
    return (
      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12">
        <h1 className="mb-8 text-4xl font-bold">My Orders</h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-secondary py-12">
          <Package size={48} className="mb-4 text-gray-400" />
          <p className="mb-2 text-lg font-semibold">No orders yet</p>
          <p className="text-sm text-gray-600">Start shopping to place your first order</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12">
        <h1 className="mb-8 text-4xl font-bold">My Orders</h1>

        <div className="space-y-4">
          {ordersList.map((order) => (
            <div key={order.id} className="rounded-lg border border-border bg-white p-6">
              <div className="mb-4 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <p className="text-sm text-gray-600">Order Number</p>
                  <p className="font-semibold">#{order.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Order Date</p>
                  <p className="font-semibold">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{order.currency} {Number(order.total_amount).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {order.status === 'pending' && (
                    <>
                      <Clock size={20} className="text-yellow-600" />
                      <span className="text-sm font-semibold text-yellow-600">Pending</span>
                    </>
                  )}
                  {order.status === 'completed' && (
                    <>
                      <CheckCircle size={20} className="text-green-600" />
                      <span className="text-sm font-semibold text-green-600">Completed</span>
                    </>
                  )}
                  {order.status === 'failed' && (
                    <>
                      <XCircle size={20} className="text-red-600" />
                      <span className="text-sm font-semibold text-red-600">Failed</span>
                    </>
                  )}
                  {order.status === 'refunded' && (
                    <>
                      <Truck size={20} className="text-blue-600" />
                      <span className="text-sm font-semibold text-blue-600">Refunded</span>
                    </>
                  )}
                </div>
              </div>

              <button 
                onClick={() => setLocation(`/orders/${order.id}`)}
                className="rounded-md border border-gray-200 bg-white py-2 px-4 text-sm font-semibold hover:bg-gray-50"
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
