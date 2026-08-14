'use client';

import { Truck, ShieldCheck, Headphones, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { RevealStagger, revealItem } from '@/components/public/reveal';

const features = [
  {
    icon: Truck,
    title: 'Delivery en la ciudad',
    desc: 'Entregas rápidas y seguras',
  },
  {
    icon: ShieldCheck,
    title: 'Compra protegida',
    desc: 'Yape, Plin, tarjeta y efectivo',
  },
  {
    icon: Headphones,
    title: 'Atención personalizada',
    desc: 'Chat en línea y soporte humano',
  },
  {
    icon: RotateCcw,
    title: 'Cambios fáciles',
    desc: 'Política clara de devoluciones',
  },
];

export function FeaturesStrip() {
  return (
    <section className="relative border-b bg-secondary/40">
      <div className="container mx-auto px-4 py-12 md:py-14">
        <RevealStagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <motion.div
              key={title}
              variants={revealItem}
              className="group flex items-start gap-4 rounded-2xl p-2 transition hover:-translate-y-1"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-background shadow-sm transition group-hover:border-accent/40 group-hover:shadow-[0_12px_24px_-16px_oklch(0.58_0.16_42/0.8)]">
                <Icon className="h-5 w-5 text-accent" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            </motion.div>
          ))}
        </RevealStagger>
      </div>
    </section>
  );
}
