export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  SELLER = 'seller',
  WAREHOUSE = 'warehouse',
  CUSTOMER = 'customer',
}

export const STAFF_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.SELLER,
  UserRole.WAREHOUSE,
];

export const ADMIN_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

/** Catálogo, inventario y maestros */
export const CATALOG_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.WAREHOUSE,
];

/** Caja, ventas, clientes y comprobantes */
export const SALES_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.SELLER,
];

/** Pedidos y entregas (incluye almacén para despacho) */
export const ORDERS_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.SELLER,
  UserRole.WAREHOUSE,
];

/** Reportes y promociones */
export const REPORTS_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MANAGER,
];
