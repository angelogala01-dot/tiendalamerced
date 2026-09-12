import Link from 'next/link';
import Image from 'next/image';
import { getActiveCategories } from '@/lib/catalog/server';
import { Card, CardContent } from '@/components/ui/card';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { getCategoryLabel } from '@/lib/catalog/normalize';
import { categoryImage } from '@/lib/theme/images';

export const revalidate = 10;

export default async function CategoriasPage() {
  const categories = await getActiveCategories();

  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      <p className="eyebrow mb-2">Explora</p>
      <h1 className="section-heading mb-3">Categorías</h1>
      <p className="mb-10 text-muted-foreground">Explora nuestro catálogo por categoría</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => {
          const src = categoryImage(cat.slug, cat.image_url);
          return (
            <Link key={cat.id} href={`${PUBLIC_ROUTES.CATALOG}?categoria=${cat.slug}`}>
              <Card className="h-full overflow-hidden rounded-2xl border-0 py-0 shadow-sm ring-1 ring-border/70 transition hover:-translate-y-1 hover:shadow-lg">
                <div className="relative aspect-[16/10] bg-muted">
                  <Image
                    key={src}
                    src={src}
                    alt={getCategoryLabel(cat) || cat.name}
                    fill
                    unoptimized={Boolean(cat.image_url?.trim())}
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold">{getCategoryLabel(cat) || cat.name}</h3>
                  {cat.description ? (
                    <p className="mt-2 text-sm text-muted-foreground">{cat.description}</p>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
