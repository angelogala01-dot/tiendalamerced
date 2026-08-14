import type { Metadata } from 'next';
import { HeroCarousel } from '@/components/home/hero-carousel';
import { FeaturesStrip } from '@/components/home/features-strip';
import { FeaturedProducts } from '@/components/home/featured-products';
import { CategoryGrid } from '@/components/home/category-grid';
import { EditorialBanner } from '@/components/home/editorial-banner';
import { TestimonialsCarousel } from '@/components/home/testimonials-carousel';
import { NewsletterSection } from '@/components/home/newsletter-section';
import { getHomeCatalog } from '@/lib/catalog/server';

export const metadata: Metadata = {
  title: 'La Merced PyK — Calzado, Ropa y Más',
  description:
    'Tienda online de Multiservicios La Merced PyK S.A.C. Calzado, prendas de vestir y accesorios. Envíos y atención personalizada.',
  openGraph: {
    title: 'La Merced PyK',
    description: 'Calzado, ropa y más al mejor precio',
    type: 'website',
  },
};

export default async function HomePage() {
  const { products, categories, promotions } = await getHomeCatalog();

  return (
    <>
      <HeroCarousel />
      <FeaturesStrip />
      <FeaturedProducts products={products} />
      <CategoryGrid categories={categories} />
      <EditorialBanner promotions={promotions} />
      <TestimonialsCarousel />
      <NewsletterSection />
    </>
  );
}
