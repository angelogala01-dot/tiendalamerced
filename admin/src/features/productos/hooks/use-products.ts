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
    queryFn: categoriesService.list,
  });
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: brandsService.list,
  });
}
