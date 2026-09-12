'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from '@/features/auth/schemas/auth.schema';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { apiFetch } from '@/lib/api/client';
import { cn } from '@/lib/utils';

export default function RecuperarContrasenaPage() {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordInput) {
    const email = data.email.trim().toLowerCase();
    try {
      await apiFetch<{ ok: boolean }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    } catch {
      // Misma respuesta visual: no filtramos si el correo existe.
    }
    setSentEmail(email);
    setSent(true);
  }

  return (
    <div className="container mx-auto flex min-h-[60vh] max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Recuperar contraseña</CardTitle>
          <CardDescription>
            Te enviaremos un enlace a tu correo para crear una nueva contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Si <strong>{sentEmail}</strong> está registrado, ya enviamos el enlace.
                Revisa tu bandeja de entrada y spam.
              </p>
              <Link href={PUBLIC_ROUTES.LOGIN} className={cn(buttonVariants())}>
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                />
                {errors.email ? (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.email.message}
                  </p>
                ) : null}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Enviando…' : 'Enviar enlace'}
              </Button>
              <Link
                href={PUBLIC_ROUTES.LOGIN}
                className={cn(buttonVariants({ variant: 'ghost' }), 'w-full')}
              >
                Cancelar
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
