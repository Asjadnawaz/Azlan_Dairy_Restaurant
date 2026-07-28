/**
 * TypeScript types matching the actual Supabase schema.
 */

export type ItemCategory =
  | "All"
  | "Signature"
  | "Broast"
  | "Burgers"
  | "Rolls & Wraps"
  | "BBQ"
  | "Sides"
  | "Beverages";

export type Item = {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  description: string | null;
  long_description: string | null;
  price: number;
  image_path: string;
  category: string;
  category_slug: string;
  category_icon: string;
  category_tagline: string | null;
  sort_order: number;
  badges: string[];
  tags: string[];
  rating: number;
  review_count: number;
  prep_time_min: number | null;
  servings: number;
  nutrition: Record<string, unknown> | null;
  ingredients: string[];
  allergens: string[];
  is_available: boolean;
  created_at?: string;
  updated_at?: string;
};

export type OrderStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "delivering"
  | "completed"
  | "cancelled";

export type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_note: string | null;
  subtotal: number;
  discount: number;
  total: number;
  loyalty_points_used: number;
  loyalty_points_earned: number;
  status: OrderStatus;
  source: string;
  eta_minutes: number;
  placed_at: string;
  confirmed_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  delivering_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  delivery_distance_km: number | null;
  delivery_coordinates: { lat: number; lng: number } | null;
  delivery_fee: number;
};

export type OrderItem = {
  id: string;
  order_id: string;
  item_id: string | null;
  name_snapshot: string;
  price_snapshot: number;
  quantity: number;
  line_total: number;
  spice_level: string | null;
  extras: Record<string, unknown>[];
  sort_order: number;
  created_at: string;
};

export type Review = {
  id: string;
  order_id: string | null;
  item_id: string;
  customer_name: string;
  customer_phone: string;
  rating: number;
  comment: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type Settings = {
  id: number;
  is_active: boolean;
  store_name: string;
  whatsapp_number: string;
  phone: string;
  address: string;
  hours: string;
  email: string;
  min_order_value: number;
  delivery_fee: number;
  updated_at?: string;
};
