'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProductCard } from '@/components/public/product-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProducts, useCategories, useBrands } from '@/features/productos/hooks/use-products';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { getBrandLabel, getCategoryLabel } from '@/lib/catalog/normalize';
import { PUBLIC_ROUTES } from '@/constants/routes';
import type { Brand, Category, Product } from '@/types';

const ALL = 'all';

type CatalogInitial = {
  data: Product[];
  total: number;
  categories: Category[];
  brands: Brand[];
};

function CatalogSkeletons() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-xl" />
      ))}
    </div>
  );
}

export function CatalogoClient({ initial }: { initial: CatalogInitial }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(search.trim());
  const lastQuery = useRef((searchParams.get('q') ?? '').trim());

  const { data: categories } = useCategories(initial.categories);
  const { data: brands } = useBrands(initial.brands);

  const activeCategories = useMemo(
    () => (categories ?? []).filter((c) => c.is_active !== false),
    [categories],
  );

  const categoriaParam = searchParams.get('categoria') ?? searchParams.get('category');
  const marcaParam = searchParams.get('marca') ?? searchParams.get('brand');
  const [seed] = useState(() => ({
    q: (searchParams.get('q') ?? '').trim(),
    categoria: categoriaParam ?? '',
    marca: marcaParam ?? '',
  }));
  const useServerData =
    (debouncedSearch || '') === seed.q &&
    (categoriaParam ?? '') === seed.categoria &&
    (marcaParam ?? '') === seed.marca;

  const categoryId = useMemo(() => {
    if (!categoriaParam) return undefined;
    return activeCategories.find((c) => c.id === categoriaParam || c.slug === categoriaParam)?.id;
  }, [activeCategories, categoriaParam]);

  const brandId = useMemo(() => {
    if (!marcaParam || !brands?.length) return undefined;
    return brands.find((b) => b.id === marcaParam || b.slug === marcaParam)?.id;
  }, [brands, marcaParam]);

  function replaceParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete('category');
    params.delete('brand');
    const query = params.toString();
    router.replace(query ? `${PUBLIC_ROUTES.CATALOG}?${query}` : PUBLIC_ROUTES.CATALOG, {
      scroll: false,
    });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const urlQuery = (searchParams.get('q') ?? '').trim();

  useEffect(() => {
    if (urlQuery === lastQuery.current) return;
    lastQuery.current = urlQuery;
    setSearch(searchParams.get('q') ?? '');
    setDebouncedSearch(urlQuery);
  }, [urlQuery, searchParams]);

  useEffect(() => {
    if (debouncedSearch === lastQuery.current) return;
    lastQuery.current = debouncedSearch;
    replaceParams((params) => {
      if (debouncedSearch) params.set('q', debouncedSearch);
      else params.delete('q');
    });
  }, [debouncedSearch]);

  useEffect(() => {
    if (searchParams.get('focus') !== '1') return;
    document.getElementById('catalog-search')?.focus();
    replaceParams((params) => params.delete('focus'));
  }, [searchParams]);

  const productParams = {
    search: debouncedSearch || undefined,
    categoryId,
    brandId,
  };

  const { data, isLoading } = useProducts(productParams, {
    initialData: useServerData ? { data: initial.data, total: initial.total } : undefined,
  });

  const categoryItems = useMemo(() => {
    const items: Record<string, string> = { [ALL]: 'Todas las categorías' };
    for (const category of activeCategories) {
      items[category.id] = getCategoryLabel(category) || 'Categoría';
    }
    return items;
  }, [activeCategories]);

  const brandItems = useMemo(() => {
    const items: Record<string, string> = { [ALL]: 'Todas las marcas' };
    for (const brand of brands ?? []) {
      items[brand.id] = getBrandLabel(brand) || 'Marca';
    }
    return items;
  }, [brands]);

  function onCategoryChange(value: string | null) {
    replaceParams((params) => {
      if (!value || value === ALL) {
        params.delete('categoria');
        return;
      }
      const selected = activeCategories.find((c) => c.id === value);
      params.set('categoria', selected?.slug || value);
    });
  }

  function onBrandChange(value: string | null) {
    replaceParams((params) => {
      if (!value || value === ALL) {
        params.delete('marca');
        return;
      }
      const selected = brands?.find((b) => b.id === value);
      params.set('marca', selected?.slug || value);
    });
  }

  const total = data?.total ?? data?.data?.length ?? 0;
  const resultsLabel =
    total === 1 ? '1 producto encontrado' : `${total} productos encontrados`;

  const selectedCategoryLabel = categoryId
    ? getCategoryLabel(activeCategories.find((c) => c.id === categoryId)) || 'Categoría'
    : 'Todas las categorías';

  const selectedBrandLabel = brandId
    ? getBrandLabel(brands?.find((b) => b.id === brandId)) || 'Marca'
    : 'Todas las marcas';

  return (
    <div className="container mx-auto px-4 py-10 md:py-14">
      <div className="mb-10">
        <p className="eyebrow mb-2">Tienda</p>
        <h1 className="section-heading">Catálogo</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Encuentra calzado, ropa y accesorios seleccionados para ti.
        </p>
      </div>

      <div className="mb-10 flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm sm:flex-row sm:items-center">
        <Input
          id="catalog-search"
          placeholder="Buscar productos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 rounded-xl border-0 bg-muted/60 sm:max-w-xs"
          aria-label="Buscar productos"
        />
        <Select
          value={categoryId ?? ALL}
          onValueChange={onCategoryChange}
          items={categoryItems}
        >
          <SelectTrigger className="h-11 w-full rounded-xl sm:w-56" aria-label="Filtrar por categoría">
            <SelectValue placeholder="Categoría">{selectedCategoryLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las categorías</SelectItem>
            {activeCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {getCategoryLabel(category) || 'Categoría'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={brandId ?? ALL} onValueChange={onBrandChange} items={brandItems}>
          <SelectTrigger className="h-11 w-full rounded-xl sm:w-56" aria-label="Filtrar por marca">
            <SelectValue placeholder="Marca">{selectedBrandLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las marcas</SelectItem>
            {(brands ?? []).map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                {getBrandLabel(brand) || 'Marca'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <CatalogSkeletons />
      ) : data?.data?.length ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">{resultsLabel}</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {data.data.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      ) : (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">No se encontraron productos con esos filtros.</p>
          {debouncedSearch || categoriaParam || marcaParam ? (
            <Button
              variant="outline"
              className="mt-4 rounded-full"
              onClick={() => {
                lastQuery.current = '';
                setSearch('');
                setDebouncedSearch('');
                router.replace(PUBLIC_ROUTES.CATALOG, { scroll: false });
              }}
            >
              Limpiar búsqueda
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
