import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Clock, CheckCircle, Truck, Package } from "lucide-react";
import { useSupabaseOrders } from "@/hooks/useSupabaseOrders";
import { supabase } from "@/lib/supabase";
import { requestAuthenticationForPath } from "@/lib/authRequired";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge, statusTone } from "@/components/StatusBadge";
import { ProductImage } from "@/components/ProductImage";

export default function OrderDetail({ params }: { params: { id: string } }) {
  const { user, isAuthenticated, sessionRestored, loading } = useAuth();
  const authPromptedRef = useRef(false);
  const [, setLocation] = useLocation();
  const orderId = params.id;
  const { orders, isLoading } = useSupabaseOrders(user?.id ?? null);
  const [shippingInfo, setShippingInfo] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });

  useEffect(() => {
    if (
      !sessionRestored ||
      loading ||
      isAuthenticated ||
      authPromptedRef.current
    )
      return;
    authPromptedRef.current = true;
    requestAuthenticationForPath();
  }, [isAuthenticated, sessionRestored, loading]);

  // Initialize order from orders array - moved before conditional returns
  const order = orders?.find(o => String(o.id) === String(orderId));

  useEffect(() => {
    let cancelled = false;

    const parseName = (name: string | null | undefined) => {
      const raw = String(name || "").trim();
      if (!raw) return { firstName: "", lastName: "" };
      const [firstName, ...rest] = raw.split(" ");
      return { firstName, lastName: rest.join(" ") };
    };

    const parseAddressLine = (addressLine: string | null | undefined) => {
      const raw = String(addressLine || "");
      const [addressPart, statePart] = raw.split(" | ");
      return {
        address: (addressPart || "").trim(),
        state: (statePart || "").trim(),
      };
    };

    async function loadShippingInfo() {
      // Guard: only load if we have an order
      if (!order) return;

      const userName = parseName(user?.name);

      // 1) Preferred source: payment metadata captured at checkout time for this order.
      const { data: paymentRow } = await supabase
        .from("payments")
        .select("metadata")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const metadata =
        paymentRow?.metadata && typeof paymentRow.metadata === "object"
          ? (paymentRow.metadata as Record<string, any>)
          : null;

      if (metadata) {
        const metaName = parseName(metadata.name);
        const next = {
          firstName:
            metadata.firstName || metaName.firstName || userName.firstName,
          lastName: metadata.lastName || metaName.lastName || userName.lastName,
          address: metadata.address || "",
          city: metadata.city || "",
          state: metadata.state || "",
          zip: metadata.zip || metadata.postalCode || "",
          country: metadata.country || "US",
        };

        if (!cancelled) setShippingInfo(next);
        return;
      }

      // 2) Fallback: current default address for the user.
      if (user?.id) {
        const { data: addressRow } = await supabase
          .from("addresses")
          .select("address_line, city, postal_code, country")
          .eq("user_id", user.id)
          .eq("is_default", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (addressRow) {
          const parsed = parseAddressLine(addressRow.address_line);
          const next = {
            firstName: userName.firstName,
            lastName: userName.lastName,
            address: parsed.address,
            city: addressRow.city || "",
            state: parsed.state,
            zip: addressRow.postal_code || "",
            country: addressRow.country || "US",
          };
          if (!cancelled) setShippingInfo(next);
          return;
        }
      }

      // 3) Last fallback: user name only.
      if (!cancelled) {
        setShippingInfo(prev => ({
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

  const backToOrders = (
    <button
      onClick={() => setLocation("/orders")}
      className="mb-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-ink underline-offset-4 hover:underline"
    >
      <ArrowLeft size={16} />
      Back to Orders
    </button>
  );

  const loadingState = (
    <div className="container py-8 sm:py-12">
      <div className="animate-pulse space-y-4" aria-hidden="true">
        <div className="h-8 w-40 rounded bg-muted"></div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="h-72 rounded-xl bg-muted md:col-span-2"></div>
          <div className="h-56 rounded-xl bg-muted"></div>
        </div>
      </div>
    </div>
  );

  if (!sessionRestored || loading) {
    return loadingState;
  }

  if (!isAuthenticated) {
    // No order data for guests; the sign-in prompt is opened by the effect
    // above, and this gives them a way to reopen it.
    return (
      <div className="container py-10 sm:py-16">
        <h1 className="sr-only">Order</h1>
        <EmptyState icon={<Package />} title="Sign in to view your orders">
          <button
            type="button"
            className="btn-primary"
            onClick={() => requestAuthenticationForPath()}
          >
            Sign in
          </button>
        </EmptyState>
      </div>
    );
  }

  if (isLoading) {
    return loadingState;
  }

  if (!order) {
    return (
      <div className="container py-8 sm:py-12">
        {backToOrders}
        <h1 className="sr-only">Order</h1>
        <EmptyState icon={<Package />} title="Order not found" />
      </div>
    );
  }

  const orderItems = Array.isArray((order as any).items)
    ? (order as any).items
    : [];
  const subtotal = Number(
    order.subtotal ?? order.total_amount ?? order.total ?? 0
  );
  const shipping = Number(
    (order as any).shippingCost ?? (order as any).shipping_cost ?? 0
  );
  const tax = Number(order.tax ?? 0);
  const discount = Number(
    (order as any).discountAmount ?? (order as any).discount_amount ?? 0
  );
  const total = Number(
    order.total ??
      order.total_amount ??
      Math.max(0, subtotal + shipping + tax - discount)
  );
  // Same convention as the orders list: amounts are shown in the currency the
  // order was placed in.
  const money = (amount: number) =>
    `${order.currency ? `${order.currency} ` : "$"}${amount.toFixed(2)}`;
  const statusIcon =
    order.status === "pending" ? (
      <Clock size={14} />
    ) : String(order.status) === "shipped" ? (
      <Truck size={14} />
    ) : String(order.status) === "confirmed" ? (
      <CheckCircle size={14} />
    ) : undefined;

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-white">
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="container py-5 sm:py-7">
          {backToOrders}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="price text-ink">
              Order #{String(order.id).slice(0, 8)}
            </h1>
            <StatusBadge tone={statusTone(order.status)} icon={statusIcon}>
              {String(order.status)}
            </StatusBadge>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            <span>Order Date</span>:{" "}
            <span className="font-medium text-ink">
              {new Date(order.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </p>
        </div>
      </div>

      <div className="container py-8 sm:py-10">
        <div className="grid gap-6 md:grid-cols-3 md:items-start lg:gap-8">
          {/* Order Info */}
          <div className="space-y-6 md:col-span-2">
            {/* Order Items */}
            <div className="panel">
              <h2 className="mb-2 text-lg font-bold text-ink">Order Items</h2>
              <div className="divide-y divide-gray-200">
                {orderItems.length === 0 ? (
                  <p className="py-3 text-sm text-gray-600">
                    No order items found for this order.
                  </p>
                ) : (
                  orderItems.map((item: any) => {
                    const quantity = Number(item?.quantity || 1);
                    const unitPrice = Number(item?.price || 0);
                    const lineTotal = quantity * unitPrice;
                    return (
                      <div
                        key={item.id || `${item.product_id}-${quantity}`}
                        className="flex items-start gap-3 py-3.5"
                      >
                        <ProductImage
                          src={item?.product?.cover_image_url}
                          alt=""
                          compactFallback
                          className="h-14 w-14 flex-none rounded-md"
                          imgClassName="p-1"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-semibold text-ink">
                            {item?.product?.title ||
                              item?.product?.name ||
                              "Product"}
                          </p>
                          <p className="price mt-0.5 text-xs text-gray-600">
                            Qty: {quantity}
                          </p>
                        </div>
                        <p className="price flex-none text-sm font-semibold text-ink">
                          {money(lineTotal)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="panel">
              <h2 className="mb-3 text-lg font-bold text-ink">
                Shipping Address
              </h2>
              <div className="space-y-1 text-sm text-gray-700">
                <p className="font-semibold text-ink">
                  {shippingInfo.firstName} {shippingInfo.lastName}
                </p>
                <p>{shippingInfo.address}</p>
                <p>
                  {shippingInfo.city}, {shippingInfo.state} {shippingInfo.zip}
                </p>
                <p>{shippingInfo.country}</p>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="md:col-span-1 md:sticky md:top-24">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 sm:p-6">
              <h2 className="mb-5 text-lg font-bold text-ink">Order Summary</h2>

              <div className="mb-4 space-y-3 border-b border-gray-200 pb-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="price font-semibold text-ink">
                    {money(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-600">Shipping</span>
                  <span className="price font-semibold text-ink">
                    {shipping === 0 ? "FREE" : money(shipping)}
                  </span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600">Tax</span>
                    <span className="price font-semibold text-ink">
                      {money(tax)}
                    </span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600">Discount</span>
                    <span className="price font-semibold text-success">
                      -{money(discount)}
                    </span>
                  </div>
                )}
              </div>

              <div className="mb-5 flex items-baseline justify-between gap-4">
                <span className="text-base font-bold text-ink">Total</span>
                <span className="price text-2xl font-bold text-ink">
                  {money(total)}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-gray-600">
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
