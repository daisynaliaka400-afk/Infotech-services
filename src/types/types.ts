export interface BundleCategory {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Bundle {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  validity: string;
  data_amount: string | null;
  sms_amount: string | null;
  minutes_amount: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  bundle_categories?: BundleCategory;
}

export type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';

export interface Order {
  id: string;
  order_number: string;
  bundle_id: string;
  bundle_name: string;
  bundle_price: number;
  phone_number: string;
  payment_status: PaymentStatus;
  payment_reference: string | null;
  giftedpay_transaction_id: string | null;
  checkout_request_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentLog {
  id: string;
  order_id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  admin_id: string | null;
  admin_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface Settings {
  site_name: string;
  logo_url: string;
  whatsapp_number: string;
  support_email: string;
  footer_text: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_revenue: number;
  total_orders: number;
  pending_orders: number;
  success_orders: number;
  failed_orders: number;
}
