'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import { createClient } from '@/lib/supabase/client';
import type { AppSetting } from '@/types';
import { PageHeader } from '@/components/admin/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type CompanySettings = { name: string; phone: string; email: string; address: string };
type StoreSettings = { currency: string; tax_rate: number };

export default function AdminConfiguracionPage() {
  const { api } = useApi();
  const queryClient = useQueryClient();

  const [company, setCompany] = useState<CompanySettings>({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [store, setStore] = useState<StoreSettings>({ currency: 'PEN', tax_rate: 18 });

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');

  const { data: settings = [] } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api<AppSetting[]>('/settings'),
  });

  useEffect(() => {
    const companySetting = settings.find((s) => s.key === 'company');
    const storeSetting = settings.find((s) => s.key === 'store');
    if (companySetting?.value) {
      const v = companySetting.value as CompanySettings;
      setCompany({
        name: v.name ?? '',
        phone: v.phone ?? '',
        email: v.email ?? '',
        address: v.address ?? '',
      });
    }
    if (storeSetting?.value) {
      const v = storeSetting.value as StoreSettings;
      setStore({ currency: v.currency ?? 'PEN', tax_rate: Number(v.tax_rate ?? 18) });
    }
  }, [settings]);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp?.some((f) => f.status === 'verified') ?? false;
      setMfaEnabled(verified);
    })();
  }, []);

  const saveCompanyMutation = useMutation({
    mutationFn: () =>
      api('/settings/company', {
        method: 'PUT',
        body: JSON.stringify({ value: company, description: 'Empresa' }),
      }),
    onSuccess: () => {
      toast.success('Datos de empresa guardados');
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveStoreMutation = useMutation({
    mutationFn: () =>
      api('/settings/store', {
        method: 'PUT',
        body: JSON.stringify({ value: store, description: 'Tienda' }),
      }),
    onSuccess: () => {
      toast.success('Configuración de tienda guardada');
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function startMfaEnroll() {
    setEnrolling(true);
    setQrCode(null);
    setFactorId(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      setQrCode(data.totp.qr_code);
      setFactorId(data.id);
      toast.message('Escanea el código QR con tu app de autenticación');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al activar 2FA');
    } finally {
      setEnrolling(false);
    }
  }

  async function verifyMfa() {
    if (!factorId || !verifyCode.trim()) {
      toast.error('Ingresa el código de verificación');
      return;
    }
    try {
      const supabase = createClient();
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode.trim(),
      });
      if (verifyError) throw verifyError;

      toast.success('Autenticación de dos factores activada');
      setMfaEnabled(true);
      setQrCode(null);
      setFactorId(null);
      setVerifyCode('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Código inválido');
    }
  }

  return (
    <div className="admin-page-enter space-y-6">
      <PageHeader title="Configuración" description="Datos de empresa, tienda y seguridad" />

      <Tabs defaultValue="empresa" className="space-y-6">
        <TabsList aria-label="Secciones de configuración">
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="tienda">Tienda</TabsTrigger>
          <TabsTrigger value="seguridad">Seguridad 2FA</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <Card className="admin-card border-0">
            <CardHeader>
              <CardTitle className="text-base">Datos de la empresa</CardTitle>
              <CardDescription>Información pública y de contacto</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="company-name">Razón social</Label>
                <Input id="company-name" value={company.name} onChange={(e) => setCompany((c) => ({ ...c, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-phone">Teléfono</Label>
                <Input id="company-phone" value={company.phone} onChange={(e) => setCompany((c) => ({ ...c, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-email">Email</Label>
                <Input id="company-email" type="email" value={company.email} onChange={(e) => setCompany((c) => ({ ...c, email: e.target.value }))} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="company-address">Dirección</Label>
                <Input id="company-address" value={company.address} onChange={(e) => setCompany((c) => ({ ...c, address: e.target.value }))} />
              </div>
              <Button
                className="gap-1.5 sm:col-span-2 sm:w-fit"
                onClick={() => saveCompanyMutation.mutate()}
                disabled={saveCompanyMutation.isPending}
              >
                <Save className="size-4" aria-hidden />
                Guardar empresa
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tienda">
          <Card className="admin-card border-0">
            <CardHeader>
              <CardTitle className="text-base">Configuración de tienda</CardTitle>
              <CardDescription>Moneda e impuestos</CardDescription>
            </CardHeader>
            <CardContent className="grid max-w-md gap-4">
              <div className="space-y-2">
                <Label htmlFor="store-currency">Moneda</Label>
                <Input id="store-currency" value={store.currency} onChange={(e) => setStore((s) => ({ ...s, currency: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-tax">IGV / Impuesto (%)</Label>
                <Input
                  id="store-tax"
                  type="number"
                  min="0"
                  step="0.01"
                  value={store.tax_rate}
                  onChange={(e) => setStore((s) => ({ ...s, tax_rate: Number(e.target.value) }))}
                />
              </div>
              <Button
                className="gap-1.5 w-fit"
                onClick={() => saveStoreMutation.mutate()}
                disabled={saveStoreMutation.isPending}
              >
                <Save className="size-4" aria-hidden />
                Guardar tienda
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguridad">
          <Card className="admin-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="size-4" aria-hidden />
                Autenticación de dos factores (2FA)
              </CardTitle>
              <CardDescription>
                Protege tu cuenta con TOTP (Google Authenticator, Authy, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Estado:</span>
                <Badge variant={mfaEnabled ? 'default' : 'secondary'}>
                  {mfaEnabled ? 'Activado' : 'Desactivado'}
                </Badge>
              </div>

              {!mfaEnabled && !qrCode ? (
                <Button onClick={startMfaEnroll} disabled={enrolling}>
                  {enrolling ? 'Generando…' : 'Activar 2FA'}
                </Button>
              ) : null}

              {qrCode ? (
                <div className="space-y-4 rounded-lg border border-border/60 p-4">
                  <p className="text-sm text-muted-foreground">
                    Escanea este código QR con tu app de autenticación:
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCode}
                    alt="Código QR para configurar autenticación de dos factores"
                    className="mx-auto size-48 rounded-lg border bg-white p-2"
                  />
                  <div className="flex max-w-xs flex-col gap-2">
                    <Label htmlFor="mfa-code">Código de verificación</Label>
                    <Input
                      id="mfa-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value)}
                      placeholder="000000"
                      aria-label="Código de verificación TOTP"
                    />
                    <Button onClick={verifyMfa}>Verificar y activar</Button>
                  </div>
                </div>
              ) : null}

              {mfaEnabled ? (
                <p className="text-sm text-muted-foreground">
                  Tu cuenta tiene 2FA activo. Para desactivarlo, usa el panel de Supabase Auth.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
