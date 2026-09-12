import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  Truck,
  Warehouse,
  ScanLine,
  ShoppingCart,
  Users,
  ClipboardList,
  BarChart3,
  Settings,
  MessageCircle,
  Percent,
  Shield,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { ADMIN_ROUTES } from '@/constants/routes';
import { ROUTE_ROLES } from '@/lib/rbac';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Etiqueta de subgrupo; se muestra una sola vez al cambiar de grupo. */
  group?: string;
  roles?: readonly string[];
};

export type NavSection = {
  title: string;
  collapsible?: boolean;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Panel',
    items: [
      {
        href: ADMIN_ROUTES.DASHBOARD,
        label: 'Dashboard',
        icon: LayoutDashboard,
        roles: ROUTE_ROLES[ADMIN_ROUTES.DASHBOARD],
      },
    ],
  },
  {
    title: 'Catálogo',
    collapsible: true,
    items: [
      { href: ADMIN_ROUTES.PRODUCTS, label: 'Productos', icon: Package, roles: ROUTE_ROLES[ADMIN_ROUTES.PRODUCTS] },
      { href: ADMIN_ROUTES.INVENTORY, label: 'Inventario', icon: Warehouse, roles: ROUTE_ROLES[ADMIN_ROUTES.INVENTORY] },
      { href: ADMIN_ROUTES.CATEGORIES, label: 'Categorías', icon: FolderTree, group: 'Datos maestros', roles: ROUTE_ROLES[ADMIN_ROUTES.CATEGORIES] },
      { href: ADMIN_ROUTES.BRANDS, label: 'Marcas', icon: Tag, group: 'Datos maestros', roles: ROUTE_ROLES[ADMIN_ROUTES.BRANDS] },
      { href: ADMIN_ROUTES.SUPPLIERS, label: 'Proveedores', icon: Truck, group: 'Datos maestros', roles: ROUTE_ROLES[ADMIN_ROUTES.SUPPLIERS] },
    ],
  },
  {
    title: 'Ventas',
    collapsible: true,
    items: [
      { href: ADMIN_ROUTES.POS, label: 'Caja', icon: ScanLine, roles: ROUTE_ROLES[ADMIN_ROUTES.POS] },
      { href: ADMIN_ROUTES.SALES, label: 'Ventas', icon: ShoppingCart, roles: ROUTE_ROLES[ADMIN_ROUTES.SALES] },
      { href: ADMIN_ROUTES.ORDERS, label: 'Pedidos', icon: ClipboardList, roles: ROUTE_ROLES[ADMIN_ROUTES.ORDERS] },
      { href: ADMIN_ROUTES.CUSTOMERS, label: 'Clientes', icon: Users, roles: ROUTE_ROLES[ADMIN_ROUTES.CUSTOMERS] },
      { href: ADMIN_ROUTES.INVOICES, label: 'Comprobantes', icon: FileText, roles: ROUTE_ROLES[ADMIN_ROUTES.INVOICES] },
      { href: ADMIN_ROUTES.PROMOTIONS, label: 'Promociones', icon: Percent, roles: ROUTE_ROLES[ADMIN_ROUTES.PROMOTIONS] },
    ],
  },
  {
    title: 'Sistema',
    collapsible: true,
    items: [
      { href: ADMIN_ROUTES.USERS, label: 'Usuarios', icon: Shield, roles: ROUTE_ROLES[ADMIN_ROUTES.USERS] },
      { href: ADMIN_ROUTES.REPORTS, label: 'Reportes', icon: BarChart3, roles: ROUTE_ROLES[ADMIN_ROUTES.REPORTS] },
      { href: ADMIN_ROUTES.CHATBOT, label: 'Chat Bot', icon: MessageCircle, roles: ROUTE_ROLES[ADMIN_ROUTES.CHATBOT] },
      { href: ADMIN_ROUTES.SETTINGS, label: 'Configuración', icon: Settings, roles: ROUTE_ROLES[ADMIN_ROUTES.SETTINGS] },
    ],
  },
];

export const CATALOG_TABS = [
  {
    href: ADMIN_ROUTES.PRODUCTS,
    label: 'Productos',
    hint: 'SKU, precio, fotos y stock visible en la tienda',
  },
  {
    href: ADMIN_ROUTES.INVENTORY,
    label: 'Inventario',
    hint: 'Entradas, salidas y ajustes de almacén',
  },
  {
    href: ADMIN_ROUTES.CATEGORIES,
    label: 'Categorías',
    hint: 'Agrupan el catálogo en la tienda (calzado, ropa…)',
  },
  {
    href: ADMIN_ROUTES.BRANDS,
    label: 'Marcas',
    hint: 'Línea comercial del producto; puede tener proveedor',
  },
  {
    href: ADMIN_ROUTES.SUPPLIERS,
    label: 'Proveedores',
    hint: 'Quién abastece marcas y mercadería',
  },
] as const;

export function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isCatalogPath(pathname: string) {
  return CATALOG_TABS.some((tab) => isNavActive(pathname, tab.href));
}
