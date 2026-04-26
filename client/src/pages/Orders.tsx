import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Package, Clock, CheckCircle, Truck } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';

export default function Orders() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { data: orders, isLoading } = trpc.orders.list.useQuery();

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="container py-12">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const ordersList = orders || [];

  if (ordersList.length === 0) {
    return (
      <div className="container py-12">
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
    <div className="min-h-screen bg-background">
      <div className="container py-12">
        <h1 className="mb-8 text-4xl font-bold">My Orders</h1>

        <div className="space-y-4">
          {ordersList.map((order) => (
            <div key={order.id} className="rounded-lg border border-border bg-white p-6">
              <div className="mb-4 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <p className="text-sm text-gray-600">Order Number</p>
                  <p className="font-semibold">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Order Date</p>
                  <p className="font-semibold">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold">${order.total}</p>
                </div>
                <div className="flex items-center gap-2">
                  {order.status === 'pending' && (
                    <>
                      <Clock size={20} className="text-yellow-600" />
                      <span className="text-sm font-semibold text-yellow-600">Pending</span>
                    </>
                  )}
                  {order.status === 'confirmed' && (
                    <>
                      <CheckCircle size={20} className="text-green-600" />
                      <span className="text-sm font-semibold text-green-600">Confirmed</span>
                    </>
                  )}
                  {order.status === 'shipped' && (
                    <>
                      <Truck size={20} className="text-blue-600" />
                      <span className="text-sm font-semibold text-blue-600">Shipped</span>
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
