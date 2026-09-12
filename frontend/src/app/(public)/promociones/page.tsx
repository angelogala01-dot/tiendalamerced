import { getActivePromotions } from '@/lib/catalog/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Percent } from 'lucide-react';

export const revalidate = 60;

export default async function PromocionesPage() {
  const promotions = await getActivePromotions();

  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      <p className="eyebrow mb-2">Ofertas</p>
      <h1 className="section-heading mb-3">Promociones</h1>
      <p className="mb-10 text-muted-foreground">Ofertas y descuentos vigentes</p>
      {promotions.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {promotions.map((p) => (
            <Card key={p.id} className="rounded-2xl border-0 shadow-sm ring-1 ring-border/70 transition hover:-translate-y-1 hover:shadow-lg">
              <CardHeader className="flex flex-row items-center gap-2">
                <Percent className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{p.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-muted-foreground">{p.description}</p>
                <span className="inline-flex rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                  {p.discount_type === 'percentage'
                    ? `${p.discount_value}% de descuento`
                    : `S/ ${p.discount_value} de descuento`}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No hay promociones activas en este momento.</p>
      )}
    </div>
  );
}
