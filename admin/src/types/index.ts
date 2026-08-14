export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'seller'
  | 'warehouse'
  | 'customer';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

export interface Product {
  id: string;
  sku: string;
  slug: string | null;
  name: string;
  description: string | null;
  sale_price: number;
  cost_price: number;
  stock_quantity: number;
  min_stock: number;
  is_active: boolean;
  category?: Category;
  brand?: Brand;
  images?: ProductImage[];
}

export interface ProductImage {
  id: string;
  url: string;
  is_primary: boolean;
  storage_path?: string | null;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface DashboardOverview {
  salesToday: number;
  salesMonth: number;
  salesGrowthPercent: number;
  lowStockCount: number;
  pendingOrders: number;
  newCustomers: number;
  activeProducts?: number;
  topProducts: { name: string; sku: string; qty: number }[];
  lowStock: { id: string; sku: string; name: string; stock_quantity: number; min_stock: number }[];
}

export interface Promotion {
  id: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase?: number;
  start_date: string;
  end_date: string;
  is_active?: boolean;
}

export interface Customer {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  document_type: string | null;
  document_number: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  status: string;
  total: number;
  subtotal: number;
  tax?: number;
  shipping_cost?: number;
  discount?: number;
  payment_method?: string;
  shipping_address?: string;
  shipping_city?: string;
  notes?: string;
  created_at: string;
  customer?: Customer;
  items?: OrderItem[];
  history?: OrderStatusHistory[];
  invoices?: Invoice[];
}

export interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product?: Product;
}

export interface OrderStatusHistory {
  id: string;
  status: string;
  notes?: string;
  created_at: string;
}

export interface Sale {
  id: string;
  sale_number: string;
  total: number;
  subtotal: number;
  payment_method: string;
  status: string;
  created_at: string;
  customer?: Customer;
  invoices?: Invoice[];
}

export interface Invoice {
  id: string;
  document_kind: 'boleta' | 'factura';
  serie?: string | null;
  number?: number | null;
  unique_code?: string | null;
  order_id?: string | null;
  sale_id?: string | null;
  client_name?: string | null;
  client_document_number?: string | null;
  total: number;
  pdf_url?: string | null;
  xml_url?: string | null;
  status: 'pending' | 'issued' | 'rejected' | 'error';
  sunat_description?: string | null;
  error_message?: string | null;
  created_at: string;
  order?: { id: string; order_number: string } | null;
  sale?: { id: string; sale_number: string } | null;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  movement_type: 'entry' | 'exit' | 'adjustment';
  quantity: number;
  stock_before: number;
  stock_after: number;
  notes: string | null;
  created_at: string;
  product?: { id: string; sku: string; name: string };
}

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  keywords: string[] | null;
  is_active: boolean;
  sort_order: number;
}

export interface AppSetting {
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  updated_at: string;
}

export interface TopProductReport {
  name?: string;
  sku?: string;
  qty?: number;
  quantity?: number;
  product_id?: string;
  product?: { name: string; sku: string };
}
