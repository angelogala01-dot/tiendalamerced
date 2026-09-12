export const ADMIN_ROUTES = {
  DASHBOARD: '/dashboard',
  PRODUCTS: '/productos',
  CATEGORIES: '/categorias',
  BRANDS: '/marcas',
  SUPPLIERS: '/proveedores',
  INVENTORY: '/inventario',
  CUSTOMERS: '/clientes',
  ORDERS: '/pedidos',
  SALES: '/ventas',
  POS: '/caja',
  INVOICES: '/comprobantes',
  USERS: '/usuarios',
  PROMOTIONS: '/promociones',
  REPORTS: '/reportes',
  CHATBOT: '/chatbot',
  SETTINGS: '/configuracion',
  LOGIN: '/login',
} as const;

export const STAFF_ROLES = ['super_admin', 'admin', 'manager', 'seller', 'warehouse'] as const;

export const STORE_URL = process.env.NEXT_PUBLIC_STORE_URL ?? 'http://localhost:3000';
