import { apiFetch } from '@/lib/api/client';
import { normalizeProduct } from '@/lib/catalog/normalize';
import type { Product, Category, Brand, Promotion, DashboardOverview } from '@/types';

export const productsService = {
  list: async (params?: { search?: string; categoryId?: string; brandId?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.categoryId) q.set('categoryId', params.categoryId);
    if (params?.brandId) q.set('brandId', params.brandId);
    if (params?.page) q.set('page', String(params.page));
    q.set('active', 'true');
    const query = q.toString();
    const res = await apiFetch<{ data: Product[]; total: number }>(`/products${query ? `?${query}` : ''}`);
    return { ...res, data: (res.data ?? []).map(normalizeProduct) };
  },
  getById: async (id: string) => {
    const product = await apiFetch<Product>(`/products/${id}`);
    return normalizeProduct(product);
  },
};

export const categoriesService = {
  list: () => apiFetch<Category[]>('/categories'),
};

export const brandsService = {
  list: () => apiFetch<Brand[]>('/brands'),
};

export const promotionsService = {
  listActive: () => apiFetch<Promotion[]>('/promotions'),
};

export const dashboardService = {
  overview: (token: string) =>
    apiFetch<DashboardOverview>('/dashboard/overview', { token }),
};

export const chatbotService = {
  send: (message: string, sessionId: string) =>
    apiFetch<{ reply: string; sessionId: string; source?: 'openai' | 'fallback' | 'rules' }>(
      '/chatbot/chat',
      {
        method: 'POST',
        body: JSON.stringify({ message, sessionId }),
      },
    ),
};

import type { OrderSummary } from '@/types/order';

export const ordersService = {
  track: (orderNumber: string) => apiFetch<OrderSummary>(`/orders/track/${encodeURIComponent(orderNumber)}`),
};
