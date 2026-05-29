export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  display_order: number;
  active: boolean;
}

export interface ProductExtra {
  id: string;
  product_id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  promotion?: boolean;
old_price?: number;
  image_url: string;
  active: boolean;
  featured: boolean;
  display_order: number;
  serves: number;
  categories?: Category;
  product_extras?: ProductExtra[];
}

export interface Neighborhood {
  id: string;
  name: string;
  delivery_fee: number;
  delivery_time_min: number;
  delivery_time_max: number;
  active: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_delivery';
  value: number;
  min_order: number;
  max_uses: number | null;
  uses_count: number;
  active: boolean;
  expires_at: string | null;
}

export interface CartExtra {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  extras: CartExtra[];
  notes: string;
  itemTotal: number;
}

export type OrderStatus = 'received' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'cash';
export type OrderType = 'delivery' | 'pickup';

export interface Order {
  id: string;
  order_number: number;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  address: string;
  neighborhood_id: string | null;
  neighborhood_name: string;
  complement: string;
  order_type: OrderType;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: string;
  payment_id: string;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  coupon_code: string;
  needs_change: boolean;
  change_for: number;
  change_amount: number;
  notes: string;
  estimated_time: number;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  payments?: Payment[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  extras: CartExtra[];
  notes: string;
}

export interface Payment {
  id: string;
  order_id: string;
  external_id: string;
  method: string;
  status: string;
  amount: number;
  qr_code: string;
  qr_code_base64: string;
  ticket_url: string;
  created_at: string;
}

export interface CheckoutForm {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  order_type: OrderType;
  address: string;
  neighborhood: string;
  complement: string;
  payment_method: PaymentMethod;
  needs_change: boolean;
  change_for: number;
  notes: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string;
  zip_code: string | null;
  street: string | null;
  street_number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
}
