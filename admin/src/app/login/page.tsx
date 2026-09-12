'use client';

import { Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@/features/auth/schemas/auth.schema';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { clearApiTokenCache } from '@/lib/api-token';
import { useRouter, useSearchParams } from 'next/navigation';
import { ADMIN_ROUTES, STAFF_ROLES } from '@/constants/routes';
import { canAccessPath, homeForRole } from '@/lib/rbac';
import { toast } from 'sonner';
import { Package, Shield } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? ADMIN_ROUTES.DASHBOARD;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    try {
      const supabase = createClient();
      const { data: authData, error } = await supabase.auth.signInWithPassword(data);
      if (error) {
        toast.error(error.message);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      const role =
        profile?.role ??
        (authData.user.app_metadata?.role as string | undefined);

      if (
        profileError?.message?.includes('profiles') ||
        (!profile && !role)
      ) {
        // Tabla profiles aún no migrada — usar rol de app_metadata del seed
      }

      if (!role || !STAFF_ROLES.includes(role as typeof STAFF_ROLES[number])) {
        await supabase.auth.signOut();
        toast.error('No tienes acceso al panel administrativo');
        return;
      }

      toast.success('Bienvenido al panel admin');
      clearApiTokenCache();
      const target =
        redirect && canAccessPath(role, redirect) ? redirect : homeForRole(role);
      router.push(target);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error && err.message.includes('fetch')
          ? 'No se pudo conectar con Supabase. Verifica admin/.env.local y reinicia el servidor (npm run dev).'
          : err instanceof Error
            ? err.message
            : 'Error de conexión';
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="tu@empresa.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
          {...register('password')}
        />
        {errors.password && (
          <p id="password-error" className="text-sm text-destructive" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>
      <Button type="submit" className="h-10 w-full rounded-xl" disabled={isSubmitting}>
        {isSubmitting ? 'Ingresando...' : 'Acceder al panel'}
      </Button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.52_0.22_285/0.12),transparent_50%),radial-gradient(ellipse_at_bottom_left,oklch(0.62_0.18_330/0.08),transparent_50%)]"
        aria-hidden
      />
      <Card className="relative w-full max-w-md overflow-hidden rounded-3xl border-0 shadow-[0_30px_80px_-24px_oklch(0.52_0.22_285/0.35)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-chart-2 to-chart-3" />
        <CardHeader className="space-y-4 text-center pb-2">
          <div
            className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-chart-2 text-primary-foreground shadow-[0_12px_28px_-12px_oklch(0.52_0.22_285/0.9)]"
            aria-hidden
          >
            <Package className="size-7" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold">Panel Administrativo</CardTitle>
            <CardDescription className="flex items-center justify-center gap-1.5">
              <Shield className="size-3.5" aria-hidden />
              Acceso exclusivo para personal autorizado
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {!isSupabaseConfigured() && (
            <div
              className="mb-5 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground"
              role="status"
            >
              Supabase no está configurado. Copia tus claves en{' '}
              <code className="rounded bg-background/60 px-1 text-xs">admin/.env.local</code> y
              reinicia el servidor.
            </div>
          )}
          <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando...</p>}>
            <AdminLoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
