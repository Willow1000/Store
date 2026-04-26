import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Order, OrderItem, Payment } from '@/types/supabase';
import { toast } from 'sonner';

export function useSupabaseOrders(userId: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user orders
  const fetchOrders = useCallback(async () => {
    if (!userId) {
      setOrders([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('orders')
        .select('*, items:order_items(*, product:products(*))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;

      setOrders(data as Order[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch orders';
      setError(message);
      console.error('Error fetching orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Create order
  const createOrder = useCallback(
    async (totalAmount: number, items: { product_id: string; quantity: number; price: number }[]) => {
      if (!userId) {
        toast.error('Please sign in to place an order');
        return null;
      }

      try {
        // Create order
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: userId,
            total_amount: totalAmount,
            status: 'pending',
          })
          .select()
          .single();

        if (orderError) throw orderError;

        const orderId = orderData.id;

        // Add order items
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(
            items.map(item => ({
              order_id: orderId,
              product_id: item.product_id,
              quantity: item.quantity,
              price: item.price,
            }))
          );

        if (itemsError) throw itemsError;

        toast.success('Order created successfully');
        await fetchOrders();
        return orderId;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create order';
        toast.error(message);
        console.error('Error creating order:', err);
        return null;
      }
    },
    [userId, fetchOrders]
  );

  // Update order status
  const updateOrderStatus = useCallback(
    async (orderId: string, status: 'pending' | 'completed' | 'failed' | 'refunded') => {
      try {
        const { error: supabaseError } = await supabase
          .from('orders')
          .update({ status })
          .eq('id', orderId);

        if (supabaseError) throw supabaseError;

        toast.success('Order status updated');
        await fetchOrders();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update order';
        toast.error(message);
        console.error('Error updating order:', err);
        return false;
      }
    },
    [fetchOrders]
  );

  // Auto-fetch on userId change
  useEffect(() => {
    fetchOrders();
  }, [userId, fetchOrders]);

  return {
    orders,
    isLoading,
    error,
    createOrder,
    updateOrderStatus,
    refetch: fetchOrders,
  };
}

export function useSupabasePayments() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Record payment
  const recordPayment = useCallback(
    async (orderId: string, provider: string, reference: string, amount: number, status: 'pending' | 'success' | 'failed') => {
      try {
        setIsProcessing(true);
        setError(null);

        const { data, error: supabaseError } = await supabase
          .from('payments')
          .insert({
            order_id: orderId,
            provider: provider as 'paystack' | 'stripe' | 'mpesa' | 'paypal',
            reference,
            amount,
            status,
          })
          .select()
          .single();

        if (supabaseError) throw supabaseError;

        if (status === 'success') {
          // Update order status to completed
          await supabase
            .from('orders')
            .update({ status: 'completed' })
            .eq('id', orderId);

          toast.success('Payment recorded successfully');
        }

        return data as Payment;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to record payment';
        setError(message);
        toast.error(message);
        console.error('Error recording payment:', err);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  // Update payment status
  const updatePaymentStatus = useCallback(
    async (paymentId: string, status: 'pending' | 'success' | 'failed') => {
      try {
        setIsProcessing(true);
        setError(null);

        const { error: supabaseError } = await supabase
          .from('payments')
          .update({ status })
          .eq('id', paymentId);

        if (supabaseError) throw supabaseError;

        toast.success('Payment status updated');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update payment';
        setError(message);
        toast.error(message);
        console.error('Error updating payment:', err);
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  return {
    isProcessing,
    error,
    recordPayment,
    updatePaymentStatus,
  };
}
