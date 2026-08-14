'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { toast } from 'sonner';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { useWelcomeDiscount } from '@/hooks/use-welcome-discount';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Nombre requerido'),
  phone: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function PerfilPage() {
  const router = useRouter();
  const { user, profile, isLoading, signOut, refresh } = useAuth();
  const { eligible, promotion } = useWelcomeDiscount(0);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: '', phone: '' },
  });

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`${PUBLIC_ROUTES.LOGIN}?redirect=${encodeURIComponent(PUBLIC_ROUTES.PROFILE)}`);
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (profile) {
      form.reset({ full_name: profile.full_name ?? '', phone: profile.phone ?? '' });
    }
  }, [profile, form]);

  async function onSubmit(values: ProfileForm) {
    if (!profile) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: values.full_name, phone: values.phone || null })
      .eq('id', profile.id);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Perfil actualizado');
    await refresh();
  }

  async function handleSignOut() {
    await signOut();
    window.location.href = PUBLIC_ROUTES.HOME;
  }

  if (isLoading || !user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
        Cargando perfil…
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Mi perfil</h1>
        <Button variant="outline" onClick={() => void handleSignOut()} className="gap-2">
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>

      {eligible && promotion ? (
        <Card className="mb-6 border-accent/30 bg-accent/5">
          <CardContent className="p-4 text-sm">
            <p className="font-medium">{promotion.name} disponible</p>
            <p className="text-muted-foreground">{promotion.description}</p>
            <Badge variant="secondary" className="mt-2">
              Se aplicará automáticamente en tu primera compra
            </Badge>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input id="email" value={profile?.email ?? ''} disabled aria-readonly="true" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre completo</Label>
              <Input id="full_name" {...form.register('full_name')} />
              {form.formState.errors.full_name ? (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.full_name.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" type="tel" {...form.register('phone')} />
            </div>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={PUBLIC_ROUTES.ORDERS}><Button variant="outline">Mis pedidos</Button></Link>
        <Link href={PUBLIC_ROUTES.FAVORITES}><Button variant="outline">Favoritos</Button></Link>
        <Link href={PUBLIC_ROUTES.RECOVER_PASSWORD} className={cn(buttonVariants({ variant: 'ghost' }))}>
          Cambiar contraseña
        </Link>
      </div>
    </div>
  );
}
