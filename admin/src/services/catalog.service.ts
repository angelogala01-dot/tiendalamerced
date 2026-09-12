import { apiFetch } from '@/lib/api/client';
import type { Product, Category, Brand, Supplier, Promotion, DashboardOverview } from '@/types';

export const productsService = {
  list: (params?: { search?: string; categoryId?: string; brandId?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.categoryId) q.set('categoryId', params.categoryId);
    if (params?.brandId) q.set('brandId', params.brandId);
    if (params?.page) q.set('page', String(params.page));
    const query = q.toString();
    return apiFetch<{ data: Product[]; total: number }>(`/products${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiFetch<Product>(`/products/${id}`),
};

export const categoriesService = {
  list: () => apiFetch<Category[]>('/categories'),
};

export const brandsService = {
  list: () => apiFetch<Brand[]>('/brands'),
};

export const suppliersService = {
  list: (token: string) => apiFetch<Supplier[]>('/suppliers', { token }),
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

export const ordersService = {
  track: (orderNumber: string) => apiFetch(`/orders/track/${orderNumber}`),
};
