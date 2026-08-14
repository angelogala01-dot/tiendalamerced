import { useQuery } from '@tanstack/react-query';
import { productsService, categoriesService, brandsService } from '@/services/catalog.service';

export function useProducts(params?: {
  search?: string;
  categoryId?: string;
  brandId?: string;
}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productsService.list(params),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await categoriesService.list();
      return Array.isArray(res) ? res : [];
    },
  });
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await brandsService.list();
      return Array.isArray(res) ? res : [];
    },
  });
}
