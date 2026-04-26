import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Clock, CheckCircle, Truck, Package } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function OrderDetail({ params }: { params: { id: string } }) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const orderId = parseInt(params.id);
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
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-32 bg-muted rounded"></div>
          <div className="h-64 w-full bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const order = orders?.find((o) => o.id === orderId);

  if (!order) {
    return (
      <div className="container py-12">
        <button
          onClick={() => setLocation('/orders')}
          className="mb-6 flex items-center gap-2 text-sm font-semibold hover:text-gray-600"
        >
          <ArrowLeft size={18} />
          Back to Orders
        </button>
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-12">
          <Package size={48} className="mb-4 text-gray-400" />
          <p className="text-lg font-semibold">Order not found</p>
        </div>
      </div>
    );
  }

  // Parse shipping address safely
  let shippingInfo = {
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  };

  if (typeof order.shippingAddress === 'string') {
    try {
      shippingInfo = JSON.parse(order.shippingAddress);
    } catch (e) {
      shippingInfo = { ...shippingInfo, address: order.shippingAddress };
    }
  } else if (typeof order.shippingAddress === 'object' && order.shippingAddress) {
    shippingInfo = { ...shippingInfo, ...order.shippingAddress };
  }

  const subtotal = typeof order.total === 'string' ? parseFloat(order.total) : order.total || 0;
  const shipping = 0; // Shipping already included in total

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12">
        <button
          onClick={() => setLocation('/orders')}
          className="mb-6 flex items-center gap-2 text-sm font-semibold hover:text-gray-600"
        >
          <ArrowLeft size={18} />
          Back to Orders
        </button>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Order Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Order Header */}
            <div className="rounded-lg border border-border bg-white p-6">
              <h1 className="text-3xl font-bold mb-6">Order #{order.orderNumber}</h1>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Order Date</p>
                  <p className="font-semibold">
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Order Status</p>
                  <div className="flex items-center gap-2">
                    {order.status === 'pending' && (
                      <>
                        <Clock size={18} className="text-yellow-600" />
                        <span className="font-semibold text-yellow-600">Pending</span>
                      </>
                    )}
                    {order.status === 'confirmed' && (
                      <>
                        <CheckCircle size={18} className="text-green-600" />
                        <span className="font-semibold text-green-600">Confirmed</span>
                      </>
                    )}
                    {order.status === 'shipped' && (
                      <>
                        <Truck size={18} className="text-blue-600" />
                        <span className="font-semibold text-blue-600">Shipped</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="rounded-lg border border-border bg-white p-6">
              <h2 className="text-xl font-bold mb-4">Shipping Address</h2>
              <div className="text-gray-700 space-y-2">
                <p className="font-semibold">
                  {shippingInfo.firstName} {shippingInfo.lastName}
                </p>
                <p className="text-sm">{shippingInfo.address}</p>
                <p className="text-sm">
                  {shippingInfo.city}, {shippingInfo.state} {shippingInfo.zip}
                </p>
                <p className="text-sm">{shippingInfo.country}</p>
              </div>
            </div>

            {/* Order Items */}
            <div className="rounded-lg border border-border bg-white p-6">
              <h2 className="text-xl font-bold mb-4">Order Items</h2>
              <div className="space-y-4">
                <p className="text-gray-600 text-sm">Order items will be displayed here</p>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="md:col-span-1">
            <div className="rounded-lg border border-border bg-white p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-6">Order Summary</h2>

              <div className="space-y-3 mb-6 pb-6 border-b border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">${(subtotal as number).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-semibold">
                    {shipping === 0 ? 'FREE' : `$${(shipping as number).toFixed(2)}`}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-bold text-black">${(subtotal as number).toFixed(2)}</span>
              </div>

              <div className="space-y-2 text-xs text-gray-600">
                <p>✓ Secure checkout</p>
                <p>✓ Fast shipping</p>
                <p>✓ Easy returns</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
