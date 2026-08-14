'use client';

import { calculateOrderTotals, useStoreSettings } from '@/hooks/use-store-settings';
import { useWelcomeDiscount } from '@/hooks/use-welcome-discount';
import { Badge } from '@/components/ui/badge';

export function useOrderTotals(subtotal: number) {
  const { data: settings } = useStoreSettings();
  const { discount, promotion, eligible, missingForPromo } = useWelcomeDiscount(subtotal);
  const totals = calculateOrderTotals(subtotal, settings!, discount);

  return {
    ...totals,
    welcomePromotion: promotion,
    welcomeEligible: eligible,
    missingForPromo,
  };
}

export function OrderTotalsSummary({ subtotal }: { subtotal: number }) {
  const {
    shipping,
    total,
    discount,
    welcomePromotion,
    welcomeEligible,
    missingForPromo,
  } = useOrderTotals(subtotal);
  const { data: settings } = useStoreSettings();

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="tabular-nums">S/ {subtotal.toFixed(2)}</span>
      </div>

      {discount > 0 && welcomePromotion ? (
        <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
          <span className="flex items-center gap-2">
            Descuento {welcomePromotion.name}
            <Badge variant="secondary" className="text-[10px]">
              -{welcomePromotion.discount_type === 'percentage'
                ? `${welcomePromotion.discount_value}%`
                : `S/ ${welcomePromotion.discount_value}`}
            </Badge>
          </span>
          <span className="tabular-nums">- S/ {discount.toFixed(2)}</span>
        </div>
      ) : null}

      {welcomeEligible && missingForPromo > 0 && welcomePromotion ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Agrega S/ {missingForPromo.toFixed(2)} más para activar {welcomePromotion.name}
        </p>
      ) : null}

      <div className="flex justify-between">
        <span className="text-muted-foreground">Envío</span>
        <span className="tabular-nums">
          {shipping === 0 ? 'Gratis' : `S/ ${shipping.toFixed(2)}`}
        </span>
      </div>
      {settings && subtotal - discount < settings.free_shipping_min && subtotal > 0 ? (
        <p className="text-xs text-muted-foreground">
          Envío gratis en compras desde S/ {settings.free_shipping_min.toFixed(2)}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Precios con IGV incluido ({settings?.tax_rate ?? 18}%)
      </p>
      <div className="flex justify-between border-t pt-2 font-bold text-base">
        <span>Total</span>
        <span className="tabular-nums">S/ {total.toFixed(2)}</span>
      </div>
    </div>
  );
}
