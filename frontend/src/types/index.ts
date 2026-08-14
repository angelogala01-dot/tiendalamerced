export type UserRole =
  | 'super_admin'
  | 'admin'
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
}
