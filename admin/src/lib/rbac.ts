import { ADMIN_ROUTES, STAFF_ROLES } from '@/constants/routes';
import type { UserRole } from '@/types';

export type StaffRole = (typeof STAFF_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  manager: 'Gerente',
  seller: 'Vendedor',
  warehouse: 'Almacenero',
  customer: 'Cliente',
};

const ALL_STAFF: StaffRole[] = [...STAFF_ROLES];
const CATALOG: StaffRole[] = ['super_admin', 'admin', 'manager', 'warehouse'];
const SALES: StaffRole[] = ['super_admin', 'admin', 'manager', 'seller'];
const ORDERS: StaffRole[] = ['super_admin', 'admin', 'manager', 'seller', 'warehouse'];
const REPORTS: StaffRole[] = ['super_admin', 'admin', 'manager'];
const ADMINS: StaffRole[] = ['super_admin', 'admin'];

export const ROUTE_ROLES: Record<string, StaffRole[]> = {
  [ADMIN_ROUTES.DASHBOARD]: ALL_STAFF,
  [ADMIN_ROUTES.PRODUCTS]: CATALOG,
  [ADMIN_ROUTES.INVENTORY]: CATALOG,
  [ADMIN_ROUTES.CATEGORIES]: CATALOG,
  [ADMIN_ROUTES.BRANDS]: CATALOG,
  [ADMIN_ROUTES.SUPPLIERS]: CATALOG,
  [ADMIN_ROUTES.POS]: SALES,
  [ADMIN_ROUTES.SALES]: SALES,
  [ADMIN_ROUTES.CUSTOMERS]: SALES,
  [ADMIN_ROUTES.INVOICES]: SALES,
  [ADMIN_ROUTES.ORDERS]: ORDERS,
  [ADMIN_ROUTES.PROMOTIONS]: REPORTS,
  [ADMIN_ROUTES.REPORTS]: REPORTS,
  [ADMIN_ROUTES.USERS]: ADMINS,
  [ADMIN_ROUTES.CHATBOT]: ADMINS,
  [ADMIN_ROUTES.SETTINGS]: ADMINS,
};

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return Boolean(role && ALL_STAFF.includes(role as StaffRole));
}

export function canAccessPath(role: string | null | undefined, pathname: string) {
  if (!isStaffRole(role)) return false;
  const match = Object.keys(ROUTE_ROLES)
    .sort((a, b) => b.length - a.length)
    .find((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (!match) return true;
  return ROUTE_ROLES[match].includes(role);
}

export function homeForRole(role: string | null | undefined) {
  if (role === 'seller') return ADMIN_ROUTES.POS;
  if (role === 'warehouse') return ADMIN_ROUTES.INVENTORY;
  return ADMIN_ROUTES.DASHBOARD;
}
