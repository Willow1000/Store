import { useAuth } from '@/_core/hooks/useAuth';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Clock, CheckCircle, Truck, Package } from 'lucide-react';
import { useSupabaseOrders } from '@/hooks/useSupabaseOrders';
import { supabase } from '@/lib/supabase';
import { requestAuthenticationForPath } from '@/lib/authRequired';

export default function OrderDetail({ params }: { params: { id: string } }) {
  const { user, isAuthenticated, sessionRestored, loading } = useAuth();
  const authPromptedRef = useRef(false);
  const [, setLocation] = useLocation();
  const orderId = params.id;
  const { orders, isLoading } = useSupabaseOrders(user?.id ?? null);
  const [shippingInfo, setShippingInfo] = useState({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });

  useEffect(() => {
    if (!sessionRestored || loading || isAuthenticated || authPromptedRef.current) return;
    authPromptedRef.current = true;
    requestAuthenticationForPath();
  }, [isAuthenticated, sessionRestored, loading]);

  // Initialize order from orders array - moved before conditional returns
  const order = orders?.find((o) => String(o.id) === String(orderId));

  useEffect(() => {
    let cancelled = false;

    const parseName = (name: string | null | undefined) => {
      const raw = String(name || '').trim();
      if (!raw) return { firstName: '', lastName: '' };
      const [firstName, ...rest] = raw.split(' ');
      return { firstName, lastName: rest.join(' ') };
    };

    const parseAddressLine = (addressLine: string | null | undefined) => {
      const raw = String(addressLine || '');
      const [addressPart, statePart] = raw.split(' | ');
      return {
        address: (addressPart || '').trim(),
        state: (statePart || '').trim(),
      };
    };

    async function loadShippingInfo() {
      // Guard: only load if we have an order
      if (!order) return;

      const userName = parseName(user?.name);

      // 1) Preferred source: payment metadata captured at checkout time for this order.
      const { data: paymentRow } = await supabase
        .from('payments')
        .select('metadata')
        .eq('order_id', order.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const metadata = (paymentRow?.metadata && typeof paymentRow.metadata === 'object')
        ? (paymentRow.metadata as Record<string, any>)
        : null;

      if (metadata) {
        const metaName = parseName(metadata.name);
        const next = {
          firstName: metadata.firstName || metaName.firstName || userName.firstName,
          lastName: metadata.lastName || metaName.lastName || userName.lastName,
          address: metadata.address || '',
          city: metadata.city || '',
          state: metadata.state || '',
          zip: metadata.zip || metadata.postalCode || '',
          country: metadata.country || 'US',
        };

        if (!cancelled) setShippingInfo(next);
        return;
      }

      // 2) Fallback: current default address for the user.
      if (user?.id) {
        const { data: addressRow } = await supabase
          .from('addresses')
          .select('address_line, city, postal_code, country')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (addressRow) {
          const parsed = parseAddressLine(addressRow.address_line);
          const next = {
            firstName: userName.firstName,
            lastName: userName.lastName,
            address: parsed.address,
            city: addressRow.city || '',
            state: parsed.state,
            zip: addressRow.postal_code || '',
            country: addressRow.country || 'US',
          };
          if (!cancelled) setShippingInfo(next);
          return;
        }
      }

      // 3) Last fallback: user name only.
      if (!cancelled) {
        setShippingInfo((prev) => ({
          ...prev,
          firstName: userName.firstName,
          lastName: userName.lastName,
        }));
      }
    }

    loadShippingInfo();

    return () => {
      cancelled = true;
    };
  }, [order, user?.id, user?.name]);

  if (!sessionRestored || loading) {
    return (
        <div className="max-w-full mx-auto px-2 sm:px-3 md:px-4 py-6 sm:py-8 md:py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-32 bg-muted rounded"></div>
          <div className="h-64 w-full bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-full mx-auto px-2 sm:px-3 md:px-4 py-6 sm:py-8 md:py-12">
        <h1 className="mb-6 text-2xl font-bold">Order</h1>
        <div className="rounded-lg border border-border bg-white p-6">{/* blank for guests */}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-full mx-auto px-2 sm:px-3 md:px-4 py-6 sm:py-8 md:py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-32 bg-muted rounded"></div>
          <div className="h-64 w-full bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-full mx-auto px-2 sm:px-3 md:px-4 py-6 sm:py-8 md:py-12">
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

  const subtotal = Number(order.total_amount || 0);
  const shipping = 0; // Shipping already included in total
  const orderItems = Array.isArray((order as any).items) ? (order as any).items : [];

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <div className="max-w-full mx-auto px-2 sm:px-3 md:px-4 py-6 sm:py-8 md:py-12">
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
              <h1 className="text-3xl font-bold mb-6">Order #{String(order.id).slice(0, 8)}</h1>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Order Date</p>
                  <p className="font-semibold">
                    {new Date(order.created_at).toLocaleDateString('en-US', {
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
                    {String(order.status) === 'confirmed' && (
                      <>
                        <CheckCircle size={18} className="text-green-600" />
                        <span className="font-semibold text-green-600">Confirmed</span>
                      </>
                    )}
                    {String(order.status) === 'shipped' && (
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
                {orderItems.length === 0 ? (
                  <p className="text-gray-600 text-sm">No order items found for this order.</p>
                ) : (
                  orderItems.map((item: any) => {
                    const quantity = Number(item?.quantity || 1);
                    const unitPrice = Number(item?.price || 0);
                    const lineTotal = quantity * unitPrice;
                    return (
                      <div key={item.id || `${item.product_id}-${quantity}`} className="flex items-start justify-between border-b border-gray-100 pb-3 last:border-b-0">
                        <div>
                          <p className="font-semibold text-sm">
                            {item?.product?.title || item?.product?.name || 'Product'}
                          </p>
                          <p className="text-xs text-gray-600">Qty: {quantity}</p>
                        </div>
                        <p className="font-semibold text-sm">${lineTotal.toFixed(2)}</p>
                      </div>
                    );
                  })
                )}
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
