'use client';

import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

const testimonials = [
  {
    quote: 'Excelente calidad en zapatillas y muy buena atención en tienda.',
    author: 'María G.',
    role: 'Cliente frecuente',
  },
  {
    quote: 'Encontré ropa para toda la familia a buen precio. El delivery llegó rápido.',
    author: 'Carlos R.',
    role: 'Compra online',
  },
  {
    quote: 'Variedad de marcas y tallas. Siempre vuelvo por la confianza.',
    author: 'Lucía V.',
    role: 'Cliente desde 2024',
  },
];

export function TestimonialsCarousel() {
  const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 5000 })]);

  return (
    <section className="relative overflow-hidden border-y bg-foreground py-16 text-background md:py-24">
      <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-accent/25 blur-3xl" />
      <div className="container relative mx-auto px-4">
        <p className="mb-10 text-center text-[11px] font-semibold uppercase tracking-[0.32em] text-background/50">
          Lo que dicen nuestros clientes
        </p>
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {testimonials.map((item) => (
              <div key={item.author} className="min-w-0 flex-[0_0_100%] px-4">
                <div className="mx-auto max-w-3xl text-center">
                  <p className="font-[family-name:var(--font-heading)] text-2xl leading-relaxed md:text-4xl">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                  <div className="mt-10">
                    <p className="text-sm font-semibold uppercase tracking-widest">{item.author}</p>
                    <p className="mt-1 text-sm text-background/60">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
