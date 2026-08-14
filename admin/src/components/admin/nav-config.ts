import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  Warehouse,
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

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Panel',
    items: [
      { href: ADMIN_ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Catálogo',
    items: [
      { href: ADMIN_ROUTES.PRODUCTS, label: 'Productos', icon: Package },
      { href: ADMIN_ROUTES.CATEGORIES, label: 'Categorías', icon: FolderTree },
      { href: ADMIN_ROUTES.BRANDS, label: 'Marcas', icon: Tag },
      { href: ADMIN_ROUTES.INVENTORY, label: 'Inventario', icon: Warehouse },
    ],
  },
  {
    title: 'Ventas',
    items: [
      { href: ADMIN_ROUTES.SALES, label: 'Ventas POS', icon: ShoppingCart },
      { href: ADMIN_ROUTES.CUSTOMERS, label: 'Clientes', icon: Users },
      { href: ADMIN_ROUTES.ORDERS, label: 'Pedidos', icon: ClipboardList },
      { href: ADMIN_ROUTES.INVOICES, label: 'Comprobantes', icon: FileText },
      { href: ADMIN_ROUTES.PROMOTIONS, label: 'Promociones', icon: Percent },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { href: ADMIN_ROUTES.USERS, label: 'Usuarios', icon: Shield },
      { href: ADMIN_ROUTES.REPORTS, label: 'Reportes', icon: BarChart3 },
      { href: ADMIN_ROUTES.CHATBOT, label: 'Chat Bot', icon: MessageCircle },
      { href: ADMIN_ROUTES.SETTINGS, label: 'Configuración', icon: Settings },
    ],
  },
];

export function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
