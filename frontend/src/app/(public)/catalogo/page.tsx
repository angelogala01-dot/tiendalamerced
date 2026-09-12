import { Suspense } from 'react';
import { getStoreCatalog } from '@/lib/catalog/server';
import { CatalogoClient } from './catalogo-client';
import { Skeleton } from '@/components/ui/skeleton';

export const revalidate = 60;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CatalogoPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const initial = await getStoreCatalog({
    search: first(params.q),
    categorySlug: first(params.categoria) ?? first(params.category),
    brandSlug: first(params.marca) ?? first(params.brand),
  });

  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-10">
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        </div>
      }
    >
      <CatalogoClient initial={initial} />
    </Suspense>
  );
}
