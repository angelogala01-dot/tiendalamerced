'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProductCard } from '@/components/public/product-card';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { Reveal } from '@/components/public/reveal';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'featured', label: 'Destacados' },
  { id: 'new', label: 'Novedades' },
  { id: 'popular', label: 'Más vendidos' },
] as const;

interface FeaturedProductsProps {
  products: Product[];
}

export function FeaturedProducts({ products }: FeaturedProductsProps) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('featured');

  const displayed =
    activeTab === 'new'
      ? [...products].reverse()
      : activeTab === 'popular'
        ? [...products].sort((a, b) => b.stock_quantity - a.stock_quantity)
        : products;

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <Reveal className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow mb-2">Colección</p>
            <h2 className="section-heading">Nuevos ingresos</h2>
          </div>
          <div className="flex flex-wrap gap-1 rounded-full border border-border bg-card/80 p-1 shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'rounded-full px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all',
                  activeTab === tab.id
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </Reveal>

        {displayed.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {displayed.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} variant="boutique" />
            ))}
          </div>
        ) : (
          <p className="py-16 text-center text-muted-foreground">
            Próximamente nuevos productos en el catálogo.
          </p>
        )}

        <div className="mt-14 text-center">
          <Link href={PUBLIC_ROUTES.CATALOG} className="btn-bazu">
            Ver todo el catálogo
          </Link>
        </div>
      </div>
    </section>
  );
}
