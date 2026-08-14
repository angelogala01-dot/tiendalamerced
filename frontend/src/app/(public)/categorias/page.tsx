'use client';

import Link from 'next/link';
import { useCategories } from '@/features/productos/hooks/use-products';
import { Card, CardContent } from '@/components/ui/card';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategoryLabel } from '@/lib/catalog/normalize';

export default function CategoriasPage() {
  const { data: categories, isLoading } = useCategories();

  return (
    <div className="page-enter container mx-auto px-4 py-12 md:py-16">
      <p className="eyebrow mb-2">Explora</p>
      <h1 className="section-heading mb-3">Categorías</h1>
      <p className="mb-10 text-muted-foreground">Explora nuestro catálogo por categoría</p>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories
            ?.filter((cat) => cat.is_active !== false)
            .map((cat) => (
              <Link key={cat.id} href={`${PUBLIC_ROUTES.CATALOG}?categoria=${cat.slug}`}>
                <Card className="h-full rounded-2xl border-0 py-0 shadow-sm ring-1 ring-border/70 transition hover:-translate-y-1 hover:shadow-lg">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold">{getCategoryLabel(cat) || cat.name}</h3>
                    {cat.description ? (
                      <p className="mt-2 text-sm text-muted-foreground">{cat.description}</p>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
