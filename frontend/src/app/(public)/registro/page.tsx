'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { registerSchema, type RegisterInput } from '@/features/auth/schemas/auth.schema';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api/client';
import type { Promotion } from '@/types';
import { Percent, Gift } from 'lucide-react';

type RegisterResponse = {
  welcome: { eligible: boolean; promotion: Promotion | null };
};

export default function RegisterPage() {
  const router = useRouter();

  const { data: promotions } = useQuery({
    queryKey: ['promotions-active'],
    queryFn: () => apiFetch<Promotion[]>('/promotions'),
  });

  const welcomePromo =
    promotions?.find((p) => p.name.toLowerCase().includes('bienvenida')) ?? promotions?.[0];

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterInput) {
    const email = data.email.trim().toLowerCase();
    const supabase = createClient();

    try {
      const result = await apiFetch<RegisterResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: data.password,
          full_name: data.full_name,
          phone: data.phone || undefined,
        }),
      });

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password: data.password,
      });

      if (loginError) {
        toast.success('Cuenta creada. Inicia sesión con tu correo y contraseña.');
        router.push(PUBLIC_ROUTES.LOGIN);
        return;
      }

      if (result.welcome?.eligible && result.welcome.promotion) {
        toast.success(
          `¡Cuenta creada! Tienes ${result.welcome.promotion.discount_value}% de descuento en tu primera compra.`,
          { duration: 6000 },
        );
      } else {
        toast.success('¡Cuenta creada! Ya puedes empezar a comprar.');
      }

      router.push(PUBLIC_ROUTES.CATALOG);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear la cuenta';
      toast.error(message);
    }
  }

  return (
    <div className="page-enter flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-4">
        {welcomePromo ? (
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="flex items-start gap-3 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Gift className="size-5" aria-hidden />
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {welcomePromo.name}
                  <Badge variant="secondary" className="gap-1">
                    <Percent className="size-3" />
                    {welcomePromo.discount_type === 'percentage'
                      ? `${welcomePromo.discount_value}% de descuento`
                      : `S/ ${welcomePromo.discount_value} de descuento`}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground">{welcomePromo.description}</p>
                {welcomePromo.min_purchase ? (
                  <p className="text-xs text-muted-foreground">
                    Compra mínima: S/ {Number(welcomePromo.min_purchase).toFixed(2)}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="w-full rounded-3xl border-0 shadow-[0_30px_70px_-28px_oklch(0.2_0.02_40/0.35)] ring-1 ring-border/70">
          <CardHeader>
            <p className="eyebrow">Bienvenida</p>
            <CardTitle className="text-3xl">Crear cuenta</CardTitle>
            <CardDescription>
              Regístrate con cualquier correo (ej. prueba@test.com) — sin confirmación por email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre completo</Label>
                <Input id="full_name" autoComplete="name" {...register('full_name')} />
                {errors.full_name ? (
                  <p className="text-sm text-destructive" role="alert">{errors.full_name.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="usuario@ejemplo.com"
                  {...register('email')}
                />
                {errors.email ? (
                  <p className="text-sm text-destructive" role="alert">{errors.email.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono (opcional)</Label>
                <Input id="phone" type="tel" autoComplete="tel" {...register('phone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
                {errors.password ? (
                  <p className="text-sm text-destructive" role="alert">{errors.password.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirmar contraseña</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  {...register('confirm_password')}
                />
                {errors.confirm_password ? (
                  <p className="text-sm text-destructive" role="alert">{errors.confirm_password.message}</p>
                ) : null}
              </div>
              <Button type="submit" className="h-11 w-full rounded-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta y activar descuento'}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{' '}
              <Link href={PUBLIC_ROUTES.LOGIN} className="text-primary hover:underline">
                Inicia sesión
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
