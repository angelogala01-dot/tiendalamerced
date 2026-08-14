export const PERMISSIONS = {
  PRODUCTS_READ: 'products.read',
  PRODUCTS_WRITE: 'products.write',
  CATEGORIES_READ: 'categories.read',
  CATEGORIES_WRITE: 'categories.write',
  INVENTORY_READ: 'inventory.read',
  INVENTORY_WRITE: 'inventory.write',
  SALES_READ: 'sales.read',
  SALES_WRITE: 'sales.write',
  ORDERS_READ: 'orders.read',
  ORDERS_WRITE: 'orders.write',
  CUSTOMERS_READ: 'customers.read',
  CUSTOMERS_WRITE: 'customers.write',
  USERS_READ: 'users.read',
  USERS_WRITE: 'users.write',
  REPORTS_READ: 'reports.read',
  PROMOTIONS_WRITE: 'promotions.write',
  SETTINGS_WRITE: 'settings.write',
  CHATBOT_MANAGE: 'chatbot.manage',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
