'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  updatePasswordSchema,
  type UpdatePasswordInput,
} from '@/features/auth/schemas/auth.schema';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ActualizarContrasenaPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
  });

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function prepareSession() {
      const hash = window.location.hash.replace(/^#/, '');
      const search = window.location.search.replace(/^\?/, '');
      const params = new URLSearchParams(hash || search);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');
      const code = new URLSearchParams(window.location.search).get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!active) return;
        if (error) {
          setInvalid(true);
          setReady(true);
          return;
        }
        window.history.replaceState({}, '', window.location.pathname);
        setReady(true);
        return;
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!active) return;
        if (error || (type && type !== 'recovery')) {
          setInvalid(true);
          setReady(true);
          return;
        }
        window.history.replaceState({}, '', window.location.pathname);
        setReady(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        setReady(true);
        return;
      }

      setInvalid(true);
      setReady(true);
    }

    void prepareSession();
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(data: UpdatePasswordInput) {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Contraseña actualizada');
    router.push(PUBLIC_ROUTES.LOGIN);
    router.refresh();
  }

  return (
    <div className="container mx-auto flex min-h-[60vh] max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Nueva contraseña</CardTitle>
          <CardDescription>
            Elige una contraseña nueva para tu cuenta de La Merced.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!ready ? (
            <p className="text-sm text-muted-foreground">Validando enlace…</p>
          ) : invalid ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Este enlace no es válido o ya venció. Solicita uno nuevo.
              </p>
              <Link
                href={PUBLIC_ROUTES.RECOVER_PASSWORD}
                className={cn(buttonVariants())}
              >
                Recuperar contraseña
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...register('password')}
                />
                {errors.password ? (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.password.message}
                  </p>
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
                  <p className="text-sm text-destructive" role="alert">
                    {errors.confirm_password.message}
                  </p>
                ) : null}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
