import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  MapPin,
} from "lucide-react";
import { Link } from "wouter";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge, statusTone } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupabaseOrders } from "@/hooks/useSupabaseOrders";
import { requestAuthenticationForPath } from "@/lib/authRequired";

export default function Orders() {
  const { user, isAuthenticated, sessionRestored, loading } = useAuth();
  const authPromptedRef = useRef(false);
  const [, setLocation] = useLocation();
  const { orders, isLoading, error } = useSupabaseOrders(user?.id ?? null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "highest" | "lowest"
  >("newest");

  const toggleExpanded = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    const className = "text-gray-500";
    switch (status) {
      case "pending":
        return <Clock size={20} className={className} />;
      case "confirmed":
        return <CheckCircle size={20} className={className} />;
      case "packaged":
        return <Package size={20} className={className} />;
      case "shipped":
        return <Truck size={20} className={className} />;
      case "delivered":
        return <CheckCircle size={20} className="text-success" />;
      case "failed":
        return <XCircle size={20} className="text-brand" />;
      default:
        return <Package size={20} className={className} />;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  let filteredOrders = orders || [];
  if (filterStatus !== "all") {
    filteredOrders = filteredOrders.filter(
      order => order.status === filterStatus
    );
  }

  // Sort orders
  filteredOrders = [...filteredOrders].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "oldest":
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      case "highest":
        return (
          Number(b.total ?? b.total_amount ?? 0) -
          Number(a.total ?? a.total_amount ?? 0)
        );
      case "lowest":
        return (
          Number(a.total ?? a.total_amount ?? 0) -
          Number(b.total ?? b.total_amount ?? 0)
        );
      default:
        return 0;
    }
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

  const ordersSkeleton = (
    <div className="min-h-screen w-full overflow-x-clip bg-white">
      <PageHeader title="My Orders" />
      <div className="container space-y-3 py-8 sm:py-12">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="panel">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-28" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (!sessionRestored || loading) {
    return ordersSkeleton;
  }

  if (!isAuthenticated) {
    // No order data for guests; the sign-in prompt is opened by the effect
    // above, and this gives them a way to reopen it.
    return (
      <div className="min-h-screen w-full overflow-x-clip bg-white">
        <PageHeader title="My Orders" />
        <div className="container py-10 sm:py-16">
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
      </div>
    );
  }

  if (isLoading) {
    return ordersSkeleton;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <PageHeader title="My Orders" />
        <div className="container py-10 sm:py-16">
          <EmptyState
            tone="alert"
            icon={<XCircle />}
            title="Unable to load orders"
            description={error}
          />
        </div>
      </div>
    );
  }

  const ordersList = orders || [];

  if (ordersList.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <PageHeader title="My Orders" />
        <div className="container py-10 sm:py-16">
          <EmptyState
            icon={<Package />}
            title="No orders yet"
            description="Start shopping to place your first order"
          >
            <Link href="/products" className="btn-primary">
              All Products
            </Link>
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-white">
      <PageHeader
        title="My Orders"
        description="Track and manage all your orders"
      />
      <div className="container py-8 sm:py-12">
        {/* Filter and Sort Controls */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="sr-only">Filter by Status:</p>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
              {[
                "all",
                "pending",
                "confirmed",
                "packaged",
                "shipped",
                "delivered",
              ].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  aria-pressed={filterStatus === status}
                  className={`inline-flex min-h-9 flex-none items-center rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
                    filterStatus === status
                      ? "border-ink bg-ink text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:border-ink hover:text-ink"
                  }`}
                >
                  {status === "all" ? "All Orders" : getStatusLabel(status)}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-none items-center gap-2">
            <span className="whitespace-nowrap text-sm text-gray-600">
              Sort by:
            </span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="field !min-h-10 sm:w-48"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>
          </label>
        </div>

        {/* Orders List */}
        <div className="space-y-3">
          {filteredOrders.map(order => {
            const isExpanded = expandedOrders.has(order.id);
            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-[border-color,box-shadow] duration-200 hover:border-gray-300 hover:shadow-card-hover"
              >
                <div
                  className="cursor-pointer select-none p-4 sm:p-5"
                  onClick={() => toggleExpanded(order.id)}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-gray-100">
                        {getStatusIcon(order.status)}
                      </div>
                      <div className="min-w-0">
                        <p className="eyebrow">Order Number</p>
                        <p className="price truncate text-base font-bold text-ink">
                          #{order.id.slice(0, 8)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:flex md:items-center md:gap-10">
                      <div>
                        <p className="eyebrow mb-1">Order Date</p>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-gray-400" />
                          <p className="price text-sm font-medium text-ink">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="eyebrow mb-1">Total Amount</p>
                        <p className="price text-base font-bold text-ink">
                          {order.currency ? `${order.currency} ` : "$"}
                          {Number(
                            order.total ?? order.total_amount ?? 0
                          ).toFixed(2)}
                        </p>
                      </div>

                      <div className="col-span-2 flex items-center justify-between gap-3 md:col-span-1 md:justify-start">
                        <p className="sr-only">Status</p>
                        <StatusBadge tone={statusTone(order.status)}>
                          {getStatusLabel(order.status)}
                        </StatusBadge>
                        {isExpanded ? (
                          <ChevronUp size={18} className="text-gray-500" />
                        ) : (
                          <ChevronDown size={18} className="text-gray-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="space-y-4 border-t border-gray-200 bg-gray-50 p-4 sm:p-5">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <p className="eyebrow mb-1.5">Order ID</p>
                        <p className="break-all font-mono text-sm text-ink">
                          {order.id}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <p className="eyebrow mb-1.5">Currency</p>
                        <p className="text-sm font-semibold text-ink">
                          {order.currency}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <p className="eyebrow mb-3 flex items-center gap-2">
                        <MapPin size={14} /> Order Status Timeline
                      </p>
                      <div className="space-y-2.5 text-sm text-ink">
                        <div className="flex items-center gap-3">
                          <div className="h-2.5 w-2.5 rounded-full bg-success"></div>
                          <span>Order Placed</span>
                        </div>
                        {[
                          "confirmed",
                          "packaged",
                          "shipped",
                          "delivered",
                        ].includes(order.status) && (
                          <div className="flex items-center gap-3">
                            <div className="h-2.5 w-2.5 rounded-full bg-success"></div>
                            <span>Order Confirmed</span>
                          </div>
                        )}
                        {["packaged", "shipped", "delivered"].includes(
                          order.status
                        ) && (
                          <div className="flex items-center gap-3">
                            <div className="h-2.5 w-2.5 rounded-full bg-success"></div>
                            <span>Order Packaged</span>
                          </div>
                        )}
                        {["shipped", "delivered"].includes(order.status) && (
                          <div className="flex items-center gap-3">
                            <div className="h-2.5 w-2.5 rounded-full bg-success"></div>
                            <span>Order Shipped</span>
                          </div>
                        )}
                        {String(order.status) === "delivered" && (
                          <div className="flex items-center gap-3">
                            <div className="h-2.5 w-2.5 rounded-full bg-success"></div>
                            <span>Order Delivered</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setLocation(`/orders/${order.id}`)}
                      className="btn-primary btn-block sm:w-auto"
                    >
                      View Full Details
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredOrders.length === 0 && (
          <EmptyState
            icon={<Package />}
            title="No orders found"
            description="Try adjusting your filters"
          />
        )}
      </div>
    </div>
  );
}
