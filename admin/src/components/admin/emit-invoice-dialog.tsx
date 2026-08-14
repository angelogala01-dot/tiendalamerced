'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import type { Invoice } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDocumentLookup } from '@/hooks/use-document-lookup';

type EmitInvoiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId?: string;
  saleId?: string;
  defaultKind?: 'boleta' | 'factura';
  defaultDocumentNumber?: string;
  defaultLegalName?: string;
};

export function issuedInvoice(invoices?: Invoice[] | null) {
  return invoices?.find((item) => item.status === 'issued') ?? invoices?.[0] ?? null;
}

export function EmitInvoiceDialog({
  open,
  onOpenChange,
  orderId,
  saleId,
  defaultKind = 'boleta',
  defaultDocumentNumber = '',
  defaultLegalName = '',
}: EmitInvoiceDialogProps) {
  const { api } = useApi();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<'boleta' | 'factura'>(defaultKind);
  const [documentNumber, setDocumentNumber] = useState(defaultDocumentNumber);
  const [legalName, setLegalName] = useState(defaultLegalName);
  const [clientAddress, setClientAddress] = useState('');
  const { status: lookupStatus, message: lookupMessage } = useDocumentLookup(
    kind === 'factura' ? 'ruc' : 'dni',
    documentNumber,
    (data) => {
      setLegalName(data.name);
      if (data.address) setClientAddress(data.address);
    },
  );

  useEffect(() => {
    if (!open) return;
    setKind(defaultKind);
    setDocumentNumber(defaultDocumentNumber);
    setLegalName(defaultLegalName);
  }, [open, defaultKind, defaultDocumentNumber, defaultLegalName]);

  const emitMutation = useMutation({
    mutationFn: () =>
      api<Invoice>('/billing/emit', {
        method: 'POST',
        body: JSON.stringify({
          kind,
          order_id: orderId,
          sale_id: saleId,
          document_type: kind === 'factura' ? 'RUC' : 'DNI',
          document_number: documentNumber.trim() || undefined,
          legal_name: legalName.trim() || undefined,
          address: clientAddress.trim() || undefined,
        }),
      }),
    onSuccess: (invoice) => {
      toast.success(
        invoice.pdf_url
          ? `${invoice.document_kind === 'factura' ? 'Factura' : 'Boleta'} emitida`
          : 'Comprobante registrado',
      );
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-order'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sales'] });
      onOpenChange(false);
      if (invoice.pdf_url) {
        window.open(invoice.pdf_url, '_blank', 'noopener,noreferrer');
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canEmit =
    kind === 'boleta' ||
    (legalName.trim().length > 2 && documentNumber.replace(/\D/g, '').length === 11);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Emitir comprobante</DialogTitle>
          <DialogDescription>
            Se enviará a SUNAT a través de Nubefact (boleta o factura electrónica).
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canEmit) return;
            emitMutation.mutate();
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={kind === 'boleta' ? 'default' : 'outline'}
              onClick={() => setKind('boleta')}
            >
              Boleta
            </Button>
            <Button
              type="button"
              variant={kind === 'factura' ? 'default' : 'outline'}
              onClick={() => setKind('factura')}
            >
              Factura
            </Button>
          </div>
          {kind === 'factura' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="emit-ruc">RUC</Label>
                <Input
                  id="emit-ruc"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="20XXXXXXXXX"
                  inputMode="numeric"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emit-legal-name">Razón social</Label>
                <Input
                  id="emit-legal-name"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Se completa al consultar SUNAT"
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="emit-dni">DNI (opcional)</Label>
                <Input
                  id="emit-dni"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="12345678 — vacío = consumidor final"
                  inputMode="numeric"
                />
              </div>
              {documentNumber.replace(/\D/g, '').length === 8 ? (
                <div className="space-y-2">
                  <Label htmlFor="emit-dni-name">Nombre</Label>
                  <Input
                    id="emit-dni-name"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="Se completa al consultar RENIEC"
                  />
                </div>
              ) : null}
            </>
          )}
          {lookupMessage ? (
            <p className={`text-xs ${lookupStatus === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
              {lookupMessage}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canEmit || emitMutation.isPending}>
              {emitMutation.isPending ? 'Emitiendo…' : 'Emitir'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
