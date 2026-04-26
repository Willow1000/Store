# Supabase Frontend Integration Guide

## Overview
Your Supabase database is now integrated with your React frontend through custom hooks. Here's how to use them.

## Files Created

### Types
- `client/src/types/supabase.ts` - TypeScript types for all database tables

### Hooks
- `client/src/hooks/useSupabaseProducts.ts` - Product queries (fetch, search by category, search)
- `client/src/hooks/useSupabaseCart.ts` - Cart and wishlist management
- `client/src/hooks/useSupabaseOrders.ts` - Orders and payments

---

## Usage Examples

### Fetch Products
```tsx
import { useProducts } from '@/hooks/useSupabaseProducts';

function ProductList() {
  const { products, isLoading, error } = useProducts();
  
  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {products.map(product => (
        <div key={product.id}>{product.title}</div>
      ))}
    </div>
  );
}
```

### Fetch Single Product
```tsx
import { useProductById } from '@/hooks/useSupabaseProducts';

function ProductDetail({ productId }) {
  const { product, images, isLoading } = useProductById(productId);
  
  return (
    <div>
      {product && (
        <>
          <h1>{product.title}</h1>
          <p>${product.price}</p>
          <div>
            {images.map(img => (
              <img key={img.id} src={img.image_url} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

### Search Products
```tsx
import { useSearchProducts } from '@/hooks/useSupabaseProducts';

function SearchBar() {
  const [query, setQuery] = useState('');
  const { results, isLoading } = useSearchProducts(query);
  
  return (
    <div>
      <input 
        value={query} 
        onChange={e => setQuery(e.target.value)} 
        placeholder="Search..."
      />
      {results.map(product => (
        <div key={product.id}>{product.title}</div>
      ))}
    </div>
  );
}
```

### Cart Management
```tsx
import { useSupabaseCart } from '@/hooks/useSupabaseCart';
import { useAuth } from '@/_core/hooks/useAuth';

function CartPage() {
  const { user } = useAuth();
  const { items, addToCart, removeFromCart, updateQuantity } = useSupabaseCart(user?.id || null);
  
  return (
    <div>
      {items.map(item => (
        <div key={item.id}>
          <h3>{item.product?.title}</h3>
          <input 
            type="number"
            value={item.quantity}
            onChange={e => updateQuantity(item.id, parseInt(e.target.value))}
          />
          <button onClick={() => removeFromCart(item.id)}>Remove</button>
        </div>
      ))}
    </div>
  );
}
```

### Wishlist
```tsx
import { useSupabaseWishlist } from '@/hooks/useSupabaseCart';
import { useAuth } from '@/_core/hooks/useAuth';

function WishlistButton({ productId }) {
  const { user } = useAuth();
  const { wishedProductIds, toggleWishlist } = useSupabaseWishlist(user?.id || null);
  
  const isWished = wishedProductIds.has(productId);
  
  return (
    <button onClick={() => toggleWishlist(productId)}>
      {isWished ? '❤️ Saved' : '🤍 Save'}
    </button>
  );
}
```

### Orders
```tsx
import { useSupabaseOrders } from '@/hooks/useSupabaseOrders';
import { useAuth } from '@/_core/hooks/useAuth';

function OrderHistory() {
  const { user } = useAuth();
  const { orders, createOrder } = useSupabaseOrders(user?.id || null);
  
  return (
    <div>
      {orders.map(order => (
        <div key={order.id}>
          <p>Order ID: {order.id}</p>
          <p>Total: ${order.total_amount}</p>
          <p>Status: {order.status}</p>
        </div>
      ))}
    </div>
  );
}
```

### Payments
```tsx
import { useSupabasePayments } from '@/hooks/useSupabaseOrders';
import { openPaystackModal } from '@/lib/paystack';

function CheckoutPayment({ orderId, amount, email }) {
  const { recordPayment } = useSupabasePayments();
  
  const handlePayment = async () => {
    try {
      await openPaystackModal({
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email,
        amount,
        onSuccess: async (reference) => {
          // Record payment in Supabase
          await recordPayment(orderId, 'paystack', reference, amount, 'success');
        },
      });
    } catch (error) {
      await recordPayment(orderId, 'paystack', '', amount, 'failed');
    }
  };
  
  return <button onClick={handlePayment}>Pay with Paystack</button>;
}
```

---

## Pages to Update

### 1. ProductDetail.tsx
- Replace JSON file fetch with `useProductById(productId)`
- Use `useSupabaseWishlist` for wishlist button
- Add/remove with `useSupabaseCart`

### 2. Products.tsx
- Replace JSON fetch with `useProducts()`
- Add search with `useSearchProducts(searchTerm)`
- Filter by category with `useProductsByCategory(categoryName)`

### 3. Home.tsx
- Replace JSON with `useProducts()` for featured products
- Use `useCategories()` for category list

### 4. Cart.tsx
- Use `useSupabaseCart(userId)` to load items
- Update quantities and remove items

### 5. Checkout.tsx
- Use `useSupabaseCart` to get cart items
- Use `useSupabaseOrders` to create order
- Use `useSupabasePayments` to record payment

### 6. Orders.tsx
- Use `useSupabaseOrders(userId)` to fetch user orders

---

## Migration Checklist

- [ ] Update ProductDetail.tsx
- [ ] Update Products.tsx  
- [ ] Update Home.tsx
- [ ] Update Cart.tsx
- [ ] Update Checkout.tsx
- [ ] Update Orders.tsx
- [ ] Add seed data to Supabase (optional)
- [ ] Test all flows
- [ ] Set up RLS policies for security

---

## RLS (Row-Level Security) Policies

For production, add these policies to Supabase:

### Products (Public Read)
```sql
CREATE POLICY "Enable read access for all users" ON products
FOR SELECT USING (true);
```

### Cart (User Access)
```sql
CREATE POLICY "Users can manage their own cart" ON cart_items
FOR ALL USING (auth.uid() = user_id);
```

### Wishlist (User Access)
```sql
CREATE POLICY "Users can manage their own wishlist" ON wishlists
FOR ALL USING (auth.uid() = user_id);
```

### Orders (User Access)
```sql
CREATE POLICY "Users can view their own orders" ON orders
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders" ON orders
FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## Next Steps

1. **Add seed data** - Import your existing products to Supabase
2. **Update pages** - Replace JSON fetches with Supabase hooks
3. **Test thoroughly** - Verify cart, wishlist, checkout flows
4. **Set up RLS** - Secure your data with policies
5. **Deploy** - Push to production with Supabase credentials

Need help with any of these steps?
