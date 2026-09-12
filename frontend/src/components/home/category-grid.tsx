'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { categoryImage } from '@/lib/theme/images';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { getCategoryLabel } from '@/lib/catalog/normalize';
import { Reveal } from '@/components/public/reveal';
import { TiltCard } from '@/components/public/tilt-card';
import type { Category } from '@/types';

interface CategoryGridProps {
  categories: Category[];
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  const active = categories.filter((c) => c.is_active !== false);
  const items = active.length
    ? active
    : [
        {
          id: '1',
          name: 'Calzado',
          slug: 'calzado',
          description: 'Zapatos y zapatillas',
          image_url: null,
          is_active: true,
        },
        {
          id: '2',
          name: 'Ropa',
          slug: 'ropa',
          description: 'Prendas para todos',
          image_url: null,
          is_active: true,
        },
        {
          id: '3',
          name: 'Accesorios',
          slug: 'accesorios',
          description: 'Complementa tu estilo',
          image_url: null,
          is_active: true,
        },
      ];

  return (
    <section className="bg-secondary/50 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <Reveal className="mb-12 text-center">
          <p className="eyebrow mb-2">Explora</p>
          <h2 className="section-heading">Compra por categoría</h2>
        </Reveal>

        <div className="grid gap-5 md:grid-cols-3">
          {items.map((cat, index) => (
            <TiltCard key={cat.id} intensity={6}>
              <Link
                href={`${PUBLIC_ROUTES.CATALOG}?categoria=${cat.slug}`}
                className="group relative block aspect-[4/5] overflow-hidden rounded-3xl bg-foreground shadow-[0_24px_60px_-28px_oklch(0.2_0.02_40/0.55)]"
              >
                <Image
                  key={cat.image_url || cat.slug}
                  src={categoryImage(cat.slug, cat.image_url)}
                  alt={getCategoryLabel(cat) || cat.name}
                  fill
                  unoptimized={Boolean(cat.image_url?.trim())}
                  className="object-cover opacity-80 transition duration-700 group-hover:scale-110 group-hover:opacity-55"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-8">
                  <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">
                    0{index + 1}
                  </span>
                  <h3 className="mt-2 text-2xl font-semibold md:text-3xl">
                    {getCategoryLabel(cat) || cat.name}
                  </h3>
                  {'description' in cat && cat.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-white/70">{cat.description}</p>
                  )}
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.2em] opacity-80 transition group-hover:opacity-100">
                    Descubrir <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  );
}
