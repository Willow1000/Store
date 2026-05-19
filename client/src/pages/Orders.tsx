import { useAuth } from '@/_core/hooks/useAuth';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { Package, Clock, CheckCircle, Truck, XCircle, ChevronDown, ChevronUp, Calendar, DollarSign, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSupabaseOrders } from '@/hooks/useSupabaseOrders';

export default function Orders() {
  const { user, isAuthenticated, sessionRestored, loading } = useAuth();
  const { openAuthModal } = useAuthModal();
  const authPromptedRef = useRef(false);
  const [location, setLocation] = useLocation();
  const { orders, isLoading, error } = useSupabaseOrders(user?.id ?? null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  const toggleExpanded = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-50 border-blue-200';
      case 'packaged':
        return 'bg-amber-50 border-amber-200';
      case 'shipped':
        return 'bg-purple-50 border-purple-200';
      case 'delivered':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={20} className="text-yellow-600" />;
      case 'confirmed':
        return <CheckCircle size={20} className="text-blue-600" />;
      case 'packaged':
        return <Package size={20} className="text-amber-600" />;
      case 'shipped':
        return <Truck size={20} className="text-purple-600" />;
      case 'delivered':
        return <CheckCircle size={20} className="text-green-600" />;
      case 'failed':
        return <XCircle size={20} className="text-red-600" />;
      default:
        return <Package size={20} className="text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  let filteredOrders = orders || [];
  if (filterStatus !== 'all') {
    filteredOrders = filteredOrders.filter(order => order.status === filterStatus);
  }

  // Sort orders
  filteredOrders = [...filteredOrders].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'highest':
        return Number(b.total_amount) - Number(a.total_amount);
      case 'lowest':
        return Number(a.total_amount) - Number(b.total_amount);
      default:
        return 0;
    }
  });

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
        <div className="mb-8">
          <h1 className="mb-4 text-4xl font-bold">My Orders</h1>
          <p className="text-gray-600">Track and manage all your orders</p>
        </div>

        {/* Filter and Sort Controls */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-lg border border-border">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <label className="text-sm font-medium text-gray-600">Filter by Status:</label>
            <div className="flex flex-wrap gap-2">
              {['all', 'pending', 'confirmed', 'packaged', 'shipped', 'delivered'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filterStatus === status
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'All Orders' : getStatusLabel(status)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 rounded border border-gray-300 text-sm font-medium hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrders.has(order.id);
            return (
              <div key={order.id} className={`rounded-lg border transition-all duration-200 ${getStatusColor(order.status)} hover:shadow-md`}>
                <div
                  className="p-6 cursor-pointer select-none"
                  onClick={() => toggleExpanded(order.id)}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        {getStatusIcon(order.status)}
                        <div>
                          <p className="text-xs text-gray-600 uppercase tracking-wide">Order Number</p>
                          <p className="font-bold text-lg truncate">#{order.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Order Date</p>
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-gray-500" />
                          <p className="font-semibold">{new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Total Amount</p>
                        <div className="flex items-center gap-2">
                          <DollarSign size={16} className="text-gray-500" />
                          <p className="text-xl font-bold">{order.currency} {Number(order.total_amount).toFixed(2)}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Status</p>
                        <div className="flex items-center gap-2 font-semibold text-sm">
                          <span className="capitalize">{getStatusLabel(order.status)}</span>
                          {isExpanded ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t px-6 py-4 space-y-4 bg-white bg-opacity-50">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="p-4 rounded bg-white border border-gray-200">
                        <p className="text-xs text-gray-600 uppercase tracking-wide mb-2 font-semibold">Order ID</p>
                        <p className="font-mono text-sm break-all">{order.id}</p>
                      </div>
                      <div className="p-4 rounded bg-white border border-gray-200">
                        <p className="text-xs text-gray-600 uppercase tracking-wide mb-2 font-semibold">Currency</p>
                        <p className="font-semibold">{order.currency}</p>
                      </div>
                    </div>

                    <div className="p-4 rounded bg-white border border-gray-200">
                      <p className="text-xs text-gray-600 uppercase tracking-wide mb-3 font-semibold flex items-center gap-2">
                        <MapPin size={14} /> Order Status Timeline
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span>Order Placed</span>
                        </div>
                        {['confirmed', 'packaged', 'shipped', 'delivered'].includes(order.status) && (
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span>Order Confirmed</span>
                          </div>
                        )}
                        {['packaged', 'shipped', 'delivered'].includes(order.status) && (
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span>Order Packaged</span>
                          </div>
                        )}
                        {['shipped', 'delivered'].includes(order.status) && (
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span>Order Shipped</span>
                          </div>
                        )}
                        {order.status === 'delivered' && (
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span>Order Delivered</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setLocation(`/orders/${order.id}`)}
                      className="w-full rounded-md bg-black text-white py-3 font-semibold hover:bg-gray-800 transition-colors"
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
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-secondary py-12">
            <Package size={48} className="mb-4 text-gray-400" />
            <p className="mb-2 text-lg font-semibold">No orders found</p>
            <p className="text-sm text-gray-600">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
