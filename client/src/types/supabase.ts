// Generated from your Supabase schema

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin' | 'seller';
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  created_at: string;
};

export type Product = {
  id: string;
  title: string;
  url: string;
  category_name: string;
  owner_id: string | null;
  price: number;
  condition: string;
  cover_image_url: string;
  brand: string | null;
  model: string | null;
  item_specifics: Record<string, any> | null;
  created_at: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  created_at: string;
};

export type CartItem = {
  id: string;
  user_id: string | null;
  product_id: string;
  quantity: number;
  created_at: string;
  product?: Product;
};

export type WishlistItem = {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
};

export type Address = {
  id: string;
  user_id: string;
  country: string | null;
  city: string | null;
  address_line: string | null;
  postal_code: string | null;
  is_default: boolean;
  created_at: string;
};

export type Order = {
  id: string;
  user_id: string | null;
  total_amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  items?: OrderItem[];
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  created_at: string;
  product?: Product;
};

export type Payment = {
  id: string;
  order_id: string;
  provider: 'paystack' | 'stripe' | 'mpesa' | 'paypal';
  reference: string;
  status: 'pending' | 'success' | 'failed';
  amount: number;
  created_at: string;
};
