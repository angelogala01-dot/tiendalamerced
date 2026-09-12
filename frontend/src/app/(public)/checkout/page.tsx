'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Building2,
  CreditCard,
  MapPin,
  Package,
  Smartphone,
  Store,
  Truck,
} from 'lucide-react';
import { useCart } from '@/providers/cart-provider';
import { useAuth } from '@/providers/auth-provider';
import { useApi } from '@/hooks/use-api';
import { createClient } from '@/lib/supabase/client';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { CartLineItem } from '@/components/public/cart-line-item';
import { MockPaymentDialog } from '@/components/public/mock-payment-dialog';
import { OrderTotalsSummary, useOrderTotals } from '@/components/public/order-totals-summary';
import { useDocumentLookup } from '@/hooks/use-document-lookup';
import { cartLineKey } from '@/lib/catalog/variants';
import {
  PERU_DEPARTMENTS,
  PERU_DISTRICTS,
  formatPeruLocation,
  parsePeruLocation,
  type PeruDepartment,
} from '@/lib/peru-locations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  isOptionalPeruDni,
  restrictDigits,
} from '@/lib/validation/peru';

const PAYMENT_METHODS = [
  { value: 'card', label: 'Tarjeta', description: 'Visa, Mastercard, Amex', icon: CreditCard },
  { value: 'yape', label: 'Yape', description: 'Pago con celular', icon: Smartphone },
  { value: 'plin', label: 'Plin', description: 'Transferencia instantánea', icon: Smartphone },
  { value: 'transfer', label: 'Transferencia', description: 'Banco local', icon: Building2 },
  { value: 'cash', label: 'Efectivo', description: 'Paga al recibir o recoger', icon: Banknote },
] as const;

const STEPS = [
  { id: 1, label: 'Resumen', icon: Package },
  { id: 2, label: 'Entrega', icon: Truck },
  { id: 3, label: 'Pago', icon: CreditCard },
] as const;

const UNSET = '__unset__';

export default function CheckoutPage() {
  const router = useRouter();
  const { api } = useApi();
  const { user, isLoading: authLoading } = useAuth();
  const { items, total, clearCart } = useCart();
  const { data: storeSettings } = useStoreSettings();
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>('delivery');
  const isPickup = fulfillment === 'pickup';
  const { total: orderTotal } = useOrderTotals(total, isPickup);

  const [step, setStep] = useState(1);
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingDepartment, setShippingDepartment] = useState<PeruDepartment | ''>('Lima');
  const [shippingDistrict, setShippingDistrict] = useState('');
  const shippingCity = formatPeruLocation(shippingDepartment, shippingDistrict);
  const departmentItems = useMemo(
    () => Object.fromEntries(PERU_DEPARTMENTS.map((department) => [department, department])),
    [],
  );
  const districtOptions = useMemo(() => {
    const list = shippingDepartment ? [...PERU_DISTRICTS[shippingDepartment]] : [];
    if (shippingDistrict && !list.includes(shippingDistrict)) list.unshift(shippingDistrict);
    return list;
  }, [shippingDepartment, shippingDistrict]);
  const districtItems = useMemo(
    () => ({
      [UNSET]: 'Selecciona distrito',
      ...Object.fromEntries(districtOptions.map((district) => [district, district])),
    }),
    [districtOptions],
  );

  const applyCityValue = useCallback((value: string) => {
    const parsed = parsePeruLocation(value);
    setShippingDepartment((parsed.department as PeruDepartment) || 'Lima');
    setShippingDistrict(parsed.district);
  }, []);
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof PAYMENT_METHODS)[number]['value']>('card');
  const [notes, setNotes] = useState('');
  const [voucherType, setVoucherType] = useState<'boleta' | 'factura'>('boleta');
  const [documentNumber, setDocumentNumber] = useState('');
  const [legalName, setLegalName] = useState('');
  const [mockCardNumber, setMockCardNumber] = useState('');
  const [mockCardName, setMockCardName] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const { status: lookupStatus, message: lookupMessage } = useDocumentLookup(
    voucherType === 'factura' ? 'ruc' : 'dni',
    documentNumber,
    (data) => {
      setLegalName(data.name);
      if (data.address && !shippingAddress.trim()) setShippingAddress(data.address);
      if (data.district && !shippingDistrict.trim()) applyCityValue(data.district);
    },
  );

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      try {
        const { data: customer } = await supabase
          .from('customers')
          .select('address, city')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cancelled) return;
        if (customer?.address) setShippingAddress(customer.address);
        if (customer?.city) applyCityValue(customer.city);
      } catch {
        // Sin datos guardados — el usuario completa el formulario manualmente
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const checkout = useMutation({
    mutationFn: () =>
      api<{ order_number: string; id: string; invoice_error?: string }>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: items.map((i) => ({
            product_id: i.productId,
            variant_id: i.variantId,
            quantity: i.quantity,
          })),
          payment_method: paymentMethod,
          fulfillment_method: fulfillment,
          shipping_address: isPickup ? undefined : shippingAddress,
          shipping_city: isPickup ? undefined : shippingCity,
          notes: notes || undefined,
          voucher_type: voucherType,
          document_type: voucherType === 'factura' ? 'RUC' : 'DNI',
          document_number: documentNumber.trim() || undefined,
          legal_name: legalName.trim() || undefined,
        }),
      }),
    onSuccess: (order) => {
      clearCart();
      setShowPaymentDialog(false);
      if (order.invoice_error) {
        toast.warning(order.invoice_error);
      } else {
        toast.success(`Pedido ${order.order_number} registrado correctamente`);
      }
      router.push(`${PUBLIC_ROUTES.ORDER_CONFIRMATION}?numero=${order.order_number}`);
    },
    onError: (err: Error) => {
      setShowPaymentDialog(false);
      toast.error(err.message);
    },
  });

  const handlePaymentComplete = useCallback(() => {
    checkout.mutate();
  }, [checkout.mutate]);

  const canGoToShipping = items.length > 0;
  const canGoToPayment =
    (isPickup ||
      (shippingAddress.trim().length > 0 && shippingCity.trim().length > 0)) &&
    (voucherType === 'boleta'
      ? isOptionalPeruDni(documentNumber)
      : legalName.trim().length > 2 && documentNumber.replace(/\D/g, '').length === 11);
  const canPay =
    paymentMethod !== 'card' ||
    (mockCardNumber.replace(/\s/g, '').length >= 12 && mockCardName.trim().length > 2);

  function startMockPayment() {
    if (!canPay) {
      toast.error('Completa los datos de pago simulados');
      return;
    }
    setShowPaymentDialog(true);
  }

  if (!items.length) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
        <Package className="mb-4 size-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold mb-4">No hay productos para checkout</h1>
        <Link href={PUBLIC_ROUTES.CATALOG} className={cn(buttonVariants())}>
          Ir al catálogo
        </Link>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
        Verificando sesión…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Inicia sesión para continuar</h1>
        <p className="text-muted-foreground mb-6">
          Debes tener una cuenta para finalizar tu compra de forma segura.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={`${PUBLIC_ROUTES.LOGIN}?redirect=${encodeURIComponent(PUBLIC_ROUTES.CHECKOUT)}`}
            className={cn(buttonVariants())}
          >
            Iniciar sesión
          </Link>
          <Link href={PUBLIC_ROUTES.REGISTER} className={cn(buttonVariants({ variant: 'outline' }))}>
            Crear cuenta
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto max-w-6xl px-4 py-8 lg:py-12">
        <div className="mb-8">
          <Link
            href={PUBLIC_ROUTES.CART}
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Volver al carrito
          </Link>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Finalizar compra</h1>
          <p className="mt-1 text-muted-foreground">Pago simulado — sin cargo real a tu tarjeta</p>
        </div>

        {/* Progress steps */}
        <ol className="mb-10 flex items-center justify-center gap-2 sm:gap-4">
          {STEPS.map((s, index) => {
            const Icon = s.icon;
            const active = step === s.id;
            const done = step > s.id;
            return (
              <li key={s.id} className="flex items-center gap-2 sm:gap-4">
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:px-4',
                    active && 'bg-primary text-primary-foreground shadow-sm',
                    done && !active && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                    !active && !done && 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.id}</span>
                </div>
                {index < STEPS.length - 1 ? (
                  <div className={cn('h-px w-6 sm:w-12', done ? 'bg-emerald-400' : 'bg-border')} />
                ) : null}
              </li>
            );
          })}
        </ol>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
          <div className="space-y-6">
            {step === 1 ? (
              <Card className="border-0 shadow-md ring-1 ring-border/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="size-5 text-primary" />
                    Tu pedido ({items.length} {items.length === 1 ? 'producto' : 'productos'})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.map((item) => (
                    <CartLineItem key={cartLineKey(item)} item={item} variant="readonly" />
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {step === 2 ? (
              <Card className="border-0 shadow-md ring-1 ring-border/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="size-5 text-primary" />
                    Cómo quieres recibir tu pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setFulfillment('delivery')}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border p-4 text-left transition',
                        !isPickup
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'hover:border-primary/40',
                      )}
                    >
                      <Truck className="mt-0.5 size-5 shrink-0 text-primary" />
                      <div>
                        <p className="font-medium">Delivery</p>
                        <p className="text-xs text-muted-foreground">
                          Envío a tu dirección
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFulfillment('pickup')}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border p-4 text-left transition',
                        isPickup
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'hover:border-primary/40',
                      )}
                    >
                      <Store className="mt-0.5 size-5 shrink-0 text-primary" />
                      <div>
                        <p className="font-medium">Retiro en tienda</p>
                        <p className="text-xs text-muted-foreground">Sin costo de envío</p>
                      </div>
                    </button>
                  </div>

                  {isPickup ? (
                    <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm">
                      <p className="font-medium">
                        {storeSettings?.company_name || 'La Merced PyK'}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {storeSettings?.pickup_address || 'Tienda La Merced PyK'}
                      </p>
                      {storeSettings?.company_phone ? (
                        <p className="mt-1 text-muted-foreground">
                          Tel. {storeSettings.company_phone}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-muted-foreground">
                        Te avisaremos cuando el pedido esté listo para recoger.
                      </p>
                    </div>
                  ) : (
                    <>
                  <div className="space-y-2">
                    <Label htmlFor="address">Dirección de envío</Label>
                    <Input
                      id="address"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Av. Ejemplo 123, Urb. Los Jardines"
                      required
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="department">Departamento</Label>
                      <Select
                        value={shippingDepartment || UNSET}
                        items={departmentItems}
                        onValueChange={(value) => {
                          if (!value || value === UNSET) return;
                          const next = value as PeruDepartment;
                          setShippingDepartment(next);
                          setShippingDistrict((current) =>
                            PERU_DISTRICTS[next].includes(current) ? current : '',
                          );
                        }}
                      >
                        <SelectTrigger id="department" className="h-9 w-full">
                          <SelectValue placeholder="Selecciona departamento">
                            {shippingDepartment || 'Selecciona departamento'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {PERU_DEPARTMENTS.map((department) => (
                            <SelectItem key={department} value={department}>
                              {department}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Distrito / ciudad</Label>
                      <Select
                        value={shippingDistrict || UNSET}
                        items={districtItems}
                        onValueChange={(value) => {
                          if (!value || value === UNSET) {
                            setShippingDistrict('');
                            return;
                          }
                          setShippingDistrict(value);
                        }}
                        disabled={!shippingDepartment}
                      >
                        <SelectTrigger id="city" className="h-9 w-full">
                          <SelectValue placeholder="Selecciona distrito">
                            {shippingDistrict || 'Selecciona distrito'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNSET}>Selecciona distrito</SelectItem>
                          {districtOptions.map((district) => (
                            <SelectItem key={district} value={district}>
                              {district}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="notes">
                      {isPickup ? 'Notas para la tienda (opcional)' : 'Notas para el repartidor (opcional)'}
                    </Label>
                    <Input
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={
                        isPickup ? 'Horario preferido para recoger…' : 'Referencia, horario preferido…'
                      }
                    />
                  </div>
                  <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/30 p-4">
                    <p className="text-sm font-medium">Comprobante electrónico</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          setVoucherType('boleta');
                          setDocumentNumber('');
                          setLegalName('');
                        }}
                        className={cn(
                          'rounded-xl border p-3 text-left text-sm transition',
                          voucherType === 'boleta'
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'hover:border-primary/40',
                        )}
                      >
                        <span className="font-medium">Boleta</span>
                        <p className="text-xs text-muted-foreground">DNI o consumidor final</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVoucherType('factura');
                          setDocumentNumber('');
                          setLegalName('');
                        }}
                        className={cn(
                          'rounded-xl border p-3 text-left text-sm transition',
                          voucherType === 'factura'
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'hover:border-primary/40',
                        )}
                      >
                        <span className="font-medium">Factura</span>
                        <p className="text-xs text-muted-foreground">Requiere RUC</p>
                      </button>
                    </div>
                    {voucherType === 'factura' ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="ruc">RUC</Label>
                          <Input
                            id="ruc"
                            value={documentNumber}
                            onChange={(e) => setDocumentNumber(restrictDigits(e.target.value, 11))}
                            placeholder="20XXXXXXXXX"
                            inputMode="numeric"
                            maxLength={11}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="legal_name">Razón social</Label>
                          <Input
                            id="legal_name"
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
                          <Label htmlFor="dni">DNI (opcional)</Label>
                          <Input
                            id="dni"
                            value={documentNumber}
                            onChange={(e) => setDocumentNumber(restrictDigits(e.target.value, 8))}
                            placeholder="12345678"
                            inputMode="numeric"
                            maxLength={8}
                          />
                        </div>
                        {documentNumber.replace(/\D/g, '').length === 8 ? (
                          <div className="space-y-2">
                            <Label htmlFor="dni_name">Nombre</Label>
                            <Input
                              id="dni_name"
                              value={legalName}
                              onChange={(e) => setLegalName(e.target.value)}
                              placeholder="Se completa al consultar RENIEC"
                            />
                          </div>
                        ) : null}
                      </>
                    )}
                    {lookupMessage ? (
                      <p
                        className={cn(
                          'text-xs',
                          lookupStatus === 'error' ? 'text-destructive' : 'text-muted-foreground',
                        )}
                      >
                        {lookupMessage}
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {step === 3 ? (
              <div className="space-y-6">
                <Card className="border-0 shadow-md ring-1 ring-border/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="size-5 text-primary" />
                      Método de pago
                      <Badge variant="secondary" className="ml-auto text-[10px] font-normal">
                        Simulación
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {PAYMENT_METHODS.map((method) => {
                        const Icon = method.icon;
                        const selected = paymentMethod === method.value;
                        return (
                          <button
                            key={method.value}
                            type="button"
                            onClick={() => setPaymentMethod(method.value)}
                            className={cn(
                              'flex items-start gap-3 rounded-xl border p-4 text-left transition-all',
                              selected
                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                : 'hover:border-primary/40 hover:bg-muted/50',
                            )}
                          >
                            <div
                              className={cn(
                                'flex size-10 shrink-0 items-center justify-center rounded-lg',
                                selected ? 'bg-primary text-primary-foreground' : 'bg-muted',
                              )}
                            >
                              <Icon className="size-5" />
                            </div>
                            <div>
                              <p className="font-medium">{method.label}</p>
                              <p className="text-xs text-muted-foreground">{method.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {paymentMethod === 'card' ? (
                  <Card className="border-dashed border-amber-300/60 bg-amber-50/30 dark:bg-amber-950/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Datos de tarjeta (ficticios)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="card_number">Número de tarjeta</Label>
                        <Input
                          id="card_number"
                          value={mockCardNumber}
                          onChange={(e) => setMockCardNumber(e.target.value)}
                          placeholder="4242 4242 4242 4242"
                          inputMode="numeric"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="card_name">Nombre en la tarjeta</Label>
                        <Input
                          id="card_name"
                          value={mockCardName}
                          onChange={(e) => setMockCardName(e.target.value)}
                          placeholder="Como aparece en la tarjeta"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Usa cualquier número de prueba. No se procesará un pago real.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex items-center gap-3 py-5 text-sm text-muted-foreground">
                      <Smartphone className="size-5 shrink-0 text-primary" />
                      Al confirmar verás una pantalla de pago simulado. No se enviará dinero real.
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                  <ArrowLeft className="mr-2 size-4" />
                  Anterior
                </Button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <Button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={step === 1 ? !canGoToShipping : !canGoToPayment}
                  className="gap-2"
                >
                  Continuar
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="gap-2 shadow-md"
                  disabled={!canPay || checkout.isPending}
                  onClick={startMockPayment}
                >
                  <CreditCard className="size-4" />
                  Pagar S/ {orderTotal.toFixed(2)}
                </Button>
              )}
            </div>
          </div>

          {/* Sidebar summary with mini thumbnails */}
          <div className="lg:sticky lg:top-24">
            <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-border/60">
              <CardHeader className="border-b bg-muted/30 pb-4">
                <CardTitle className="text-base">Resumen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                <div className="flex -space-x-2">
                  {items.slice(0, 4).map((item) => (
                    <div
                      key={cartLineKey(item)}
                      className="relative size-12 overflow-hidden rounded-lg border-2 border-background bg-muted shadow-sm"
                    >
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Package className="size-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {items.length > 4 ? (
                    <div className="flex size-12 items-center justify-center rounded-lg border-2 border-background bg-muted text-xs font-medium">
                      +{items.length - 4}
                    </div>
                  ) : null}
                </div>

                <ul className="max-h-40 space-y-2 overflow-y-auto text-sm">
                  {items.map((item) => (
                    <li key={cartLineKey(item)} className="flex justify-between gap-2">
                      <span className="truncate text-muted-foreground">
                        {item.name}
                        {item.size || item.color
                          ? ` (${[item.size ? `Talla ${item.size}` : null, item.color].filter(Boolean).join(' · ')})`
                          : ''}{' '}
                        × {item.quantity}
                      </span>
                      <span className="shrink-0 tabular-nums font-medium">
                        S/ {(item.price * item.quantity).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>

                <OrderTotalsSummary subtotal={total} pickup={isPickup} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <MockPaymentDialog
        open={showPaymentDialog}
        paymentMethod={paymentMethod}
        total={orderTotal}
        onComplete={handlePaymentComplete}
        onCancel={() => setShowPaymentDialog(false)}
      />
    </>
  );
}
