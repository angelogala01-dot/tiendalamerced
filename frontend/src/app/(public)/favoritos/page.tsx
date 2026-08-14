'use client';

import { useProducts } from '@/features/productos/hooks/use-products';
import { useFavorites } from '@/providers/favorites-provider';
import { ProductCard } from '@/components/public/product-card';
import Link from 'next/link';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function FavoritosPage() {
  const { favorites } = useFavorites();
  const { data } = useProducts();

  const favoriteProducts = data?.data?.filter((p) => favorites.includes(p.id)) ?? [];

  if (!favorites.length) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Sin favoritos</h1>
        <p className="text-muted-foreground mb-6">Guarda productos que te gusten para verlos después.</p>
        <Link href={PUBLIC_ROUTES.CATALOG} className={cn(buttonVariants())}>Ver catálogo</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Mis favoritos</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {favoriteProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
