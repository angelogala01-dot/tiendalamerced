'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { OrderReceipt } from '@/components/public/order-receipt';
import { ordersService } from '@/services/catalog.service';
import type { OrderSummary } from '@/types/order';

const trackSchema = z.object({
  order_number: z.string().min(5, 'Número de pedido inválido'),
});

type TrackInput = z.infer<typeof trackSchema>;

export default function SeguimientoPage() {
  const [result, setResult] = useState<OrderSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<TrackInput>({
    resolver: zodResolver(trackSchema),
  });

  useEffect(() => {
    const numero = new URLSearchParams(window.location.search).get('numero');
    if (numero) setValue('order_number', numero);
  }, [setValue]);

  async function onSubmit(data: TrackInput) {
    setError(null);
    setResult(null);
    try {
      const order = await ordersService.track(data.order_number.trim());
      setResult(order);
    } catch {
      setError('Pedido no encontrado. Verifica el número e intenta de nuevo.');
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Seguimiento de pedido</h1>
      <p className="text-muted-foreground mb-8">Ingresa tu número de pedido (ej: P-20250621-00001)</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="order_number">Número de pedido</Label>
          <Input id="order_number" {...register('order_number')} placeholder="P-YYYYMMDD-00001" />
          {errors.order_number ? (
            <p className="text-sm text-destructive mt-1">{errors.order_number.message}</p>
          ) : null}
        </div>
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Consultando…' : 'Consultar estado'}
        </Button>
      </form>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      {result ? (
        <div className="mt-8">
          <OrderReceipt order={result} />
        </div>
      ) : null}
    </div>
  );
}
