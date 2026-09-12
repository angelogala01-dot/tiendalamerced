/** Imágenes de referencia inspiradas en el template Bazu (front/bazu-package) */
export const BAZU_IMAGES = {
  hero: [
    {
      src: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1920&q=80',
      alt: 'Zapatillas deportivas',
      eyebrow: 'Nueva temporada',
      title: 'Calzado que',
      highlight: 'marca estilo',
      price: 'Desde S/ 45.00',
    },
    {
      src: 'https://images.unsplash.com/photo-1483985988350-763728e1935b?w=1920&q=80',
      alt: 'Moda y ropa',
      eyebrow: 'Colección 2026',
      title: 'Ropa para',
      highlight: 'toda la familia',
      price: 'Hasta 10% de descuento',
    },
    {
      src: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1920&q=80',
      alt: 'Accesorios',
      eyebrow: 'Detalles que importan',
      title: 'Accesorios',
      highlight: 'esenciales',
      price: 'Complementa tu look',
    },
  ],
  categories: {
    calzado:
      'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80',
    ropa: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80',
    accesorios:
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
    default:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
  },
  editorial: {
    primary:
      'https://images.unsplash.com/photo-1445205170230-053b83016050?w=900&q=80',
    secondary:
      'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&q=80',
  },
} as const;

export function categoryImage(slug: string, imageUrl?: string | null) {
  const custom = imageUrl?.trim();
  if (custom) return custom;

  const aliases: Record<string, keyof typeof BAZU_IMAGES.categories> = {
    footwear: 'calzado',
    shoes: 'calzado',
    zapatos: 'calzado',
    zapatillas: 'calzado',
    clothing: 'ropa',
    clothes: 'ropa',
    apparel: 'ropa',
    accessories: 'accesorios',
  };
  const normalized = aliases[slug] ?? slug;
  const key = normalized as keyof typeof BAZU_IMAGES.categories;
  return BAZU_IMAGES.categories[key] ?? BAZU_IMAGES.categories.default;
}
