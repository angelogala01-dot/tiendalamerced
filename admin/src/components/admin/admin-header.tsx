'use client';

import { useEffect, useState } from 'react';
import { Menu, Search, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AdminNavContent } from '@/components/admin/admin-nav-content';
import { ADMIN_ROUTES } from '@/constants/routes';
import { ROLE_LABELS } from '@/lib/rbac';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/types';

type Account = {
  name: string;
  email: string;
  avatarUrl: string | null;
  roleLabel: string | null;
};

function initialsFrom(name: string, email: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  return (email[0] ?? 'U').toUpperCase();
}

export function AdminHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [themeReady, setThemeReady] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    setThemeReady(true);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, role')
        .eq('id', user.id)
        .maybeSingle();
      const name =
        (profile?.full_name as string | undefined)?.trim() ||
        (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '') ||
        user.email?.split('@')[0] ||
        'Cuenta';
      const role = (profile?.role as UserRole | undefined) ?? (user.app_metadata?.role as UserRole | undefined);
      setAccount({
        name,
        email: user.email ?? '',
        avatarUrl: (profile?.avatar_url as string | null | undefined) ?? null,
        roleLabel: role ? ROLE_LABELS[role] ?? role : null,
      });
    });
  }, []);

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push(ADMIN_ROUTES.LOGIN);
    router.refresh();
  }

  const isDark = themeReady && resolvedTheme === 'dark';

  return (
    <header className="admin-glass sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/70 px-4 md:gap-4 md:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
            />
          }
          aria-label="Abrir menú de navegación"
        >
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
          <AdminNavContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="relative hidden flex-1 max-w-md md:block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Buscar productos, pedidos..."
          className="h-10 rounded-2xl border-border/70 bg-muted/40 pl-9 text-sm"
          aria-label="Buscar en el panel"
        />
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Menú de usuario"
          >
            <Avatar className="size-8">
              {account?.avatarUrl ? <AvatarImage src={account.avatarUrl} alt="" /> : null}
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {account ? initialsFrom(account.name, account.email) : '…'}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <p className="truncate text-sm font-medium">{account?.name ?? 'Mi cuenta'}</p>
                {account?.email ? (
                  <p className="truncate text-xs font-normal text-muted-foreground">{account.email}</p>
                ) : null}
                {account?.roleLabel ? (
                  <Badge variant="secondary" className="mt-2">
                    {account.roleLabel}
                  </Badge>
                ) : null}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {isDark ? 'Modo claro' : 'Modo oscuro'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
