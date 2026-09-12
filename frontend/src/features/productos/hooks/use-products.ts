import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { productsService, categoriesService, brandsService } from '@/services/catalog.service';
import type { Brand, Category, Product } from '@/types';

export function useProducts(
  params?: {
    search?: string;
    categoryId?: string;
    brandId?: string;
  },
  options?: { initialData?: { data: Product[]; total: number } },
) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productsService.list(params),
    placeholderData: keepPreviousData,
    initialData: options?.initialData,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCategories(initialData?: Category[]) {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await categoriesService.list();
      return Array.isArray(res) ? res : [];
    },
    initialData,
    staleTime: 10 * 60 * 1000,
  });
}

export function useBrands(initialData?: Brand[]) {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await brandsService.list();
      return Array.isArray(res) ? res : [];
    },
    initialData,
    staleTime: 10 * 60 * 1000,
  });
}
