import type { ProductImage } from '@/types';

export type OrderProduct = {
  id: string;
  name: string;
  sku?: string;
  slug?: string;
  images?: ProductImage[];
};

export type OrderLineItem = {
  id?: string;
  quantity: number;
  unit_price?: number;
  subtotal: number;
  product?: OrderProduct | null;
};

export type OrderInvoice = {
  id: string;
  document_kind: 'boleta' | 'factura';
  serie?: string | null;
  number?: number | null;
  pdf_url?: string | null;
  status: string;
  sunat_description?: string | null;
};

export type OrderSummary = {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  tax?: number;
  shipping_cost?: number;
  discount?: number;
  total: number;
  payment_method?: string;
  shipping_address?: string;
  shipping_city?: string;
  notes?: string;
  created_at: string;
  items?: OrderLineItem[];
  invoices?: OrderInvoice[];
  invoice?: OrderInvoice | null;
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  processing: 'En proceso',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  transfer: 'Transferencia bancaria',
  yape: 'Yape',
  plin: 'Plin',
  card: 'Tarjeta',
  cash: 'Efectivo contra entrega',
};
