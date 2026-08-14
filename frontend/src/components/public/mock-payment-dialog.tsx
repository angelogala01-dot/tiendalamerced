'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PAYMENT_LABELS: Record<string, string> = {
  transfer: 'Transferencia bancaria',
  yape: 'Yape',
  plin: 'Plin',
  card: 'Tarjeta de crédito/débito',
  cash: 'Efectivo contra entrega',
};

type PaymentPhase = 'processing' | 'success';

interface MockPaymentDialogProps {
  open: boolean;
  paymentMethod: string;
  total: number;
  onComplete: () => void;
  onCancel: () => void;
}

export function MockPaymentDialog({
  open,
  paymentMethod,
  total,
  onComplete,
  onCancel,
}: MockPaymentDialogProps) {
  const [phase, setPhase] = useState<PaymentPhase>('processing');
  const [progress, setProgress] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!open) {
      setPhase('processing');
      setProgress(0);
      return;
    }

    setPhase('processing');
    setProgress(0);

    const progressInterval = window.setInterval(() => {
      setProgress((p) => Math.min(p + 8, 92));
    }, 180);

    const successTimer = window.setTimeout(() => {
      window.clearInterval(progressInterval);
      setProgress(100);
      setPhase('success');
    }, 2400);

    const completeTimer = window.setTimeout(() => {
      onCompleteRef.current();
    }, 3200);

    return () => {
      window.clearInterval(progressInterval);
      window.clearTimeout(successTimer);
      window.clearTimeout(completeTimer);
    };
  }, [open]);

  const label = PAYMENT_LABELS[paymentMethod] ?? paymentMethod;

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) onCancel();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <Badge variant="secondary" className="mx-auto mb-2 w-fit">
            Pago simulado — sin cargo real
          </Badge>
          <DialogTitle className="flex items-center justify-center gap-2">
            {phase === 'success' ? (
              <CheckCircle2 className="size-6 text-emerald-600" />
            ) : (
              <CreditCard className="size-6 text-primary" />
            )}
            {phase === 'success' ? '¡Pago aprobado!' : 'Procesando pago'}
          </DialogTitle>
          <DialogDescription>
            {phase === 'success'
              ? 'Tu pago ficticio fue aprobado. Registrando tu pedido…'
              : `Validando ${label} por S/ ${total.toFixed(2)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {phase === 'processing' ? (
            <>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Conectando con pasarela de prueba…
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
                <CheckCircle2 className="size-10 text-emerald-600" />
              </div>
              <p className="text-sm text-muted-foreground">Redirigiendo al comprobante…</p>
            </div>
          )}

          <div
            className={cn(
              'flex items-center gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground',
              phase === 'success' && 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30',
            )}
          >
            <ShieldCheck className="size-4 shrink-0" />
            Este es un entorno de demostración. No se realizará ningún cobro real.
          </div>

          {phase === 'processing' ? (
            <Button type="button" variant="outline" className="w-full" onClick={onCancel}>
              Cancelar pago
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
