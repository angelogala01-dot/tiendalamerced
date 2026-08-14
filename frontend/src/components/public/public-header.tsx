'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingCart,
  Heart,
  User,
  Search,
  Menu,
  MessageCircle,
  LogIn,
  LogOut,
  UserPlus,
} from 'lucide-react';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface PublicHeaderProps {
  cartCount?: number;
}

const NAV = [
  { href: PUBLIC_ROUTES.CATALOG, label: 'Catálogo' },
  { href: PUBLIC_ROUTES.CATEGORIES, label: 'Categorías' },
  { href: PUBLIC_ROUTES.PROMOTIONS, label: 'Promociones' },
  { href: PUBLIC_ROUTES.CONTACT, label: 'Contacto' },
] as const;

const iconLinkClass =
  'inline-flex size-10 items-center justify-center rounded-full text-foreground/80 transition-all duration-200 hover:bg-accent/10 hover:text-accent hover:-translate-y-0.5';

export function PublicHeader({ cartCount = 0 }: PublicHeaderProps) {
  const { user, profile, signOut } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    window.location.href = PUBLIC_ROUTES.HOME;
  }

  const displayName =
    profile?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'Cuenta';

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-foreground text-background">
        <div className="container mx-auto flex h-9 items-center justify-center px-4 text-center text-[11px] font-medium tracking-[0.18em]">
          Envíos en la ciudad · 10% de descuento en tu primera compra al registrarte
        </div>
      </div>

      <div className="glass-panel border-b border-border/60">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4 md:h-[4.75rem]">
          <Link
            href={PUBLIC_ROUTES.HOME}
            className="shrink-0 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight md:text-2xl"
          >
            La Merced <span className="text-accent">PyK</span>
          </Link>

          <nav className="hidden items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] lg:flex">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group relative rounded-full px-4 py-2 text-foreground/70 transition-colors hover:text-foreground',
                    active && 'text-foreground',
                  )}
                >
                  {item.label}
                  <span
                    className={cn(
                      'absolute inset-x-3 -bottom-0.5 h-px origin-left bg-accent transition-transform duration-300',
                      active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <Link
              href={PUBLIC_ROUTES.CATALOG}
              className={cn(iconLinkClass, 'hidden sm:inline-flex')}
              aria-label="Buscar"
            >
              <Search className="h-[18px] w-[18px]" strokeWidth={1.6} />
            </Link>
            <Link href={PUBLIC_ROUTES.CHAT} className={iconLinkClass} aria-label="Chat">
              <MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.6} />
            </Link>
            <Link href={PUBLIC_ROUTES.FAVORITES} className={iconLinkClass} aria-label="Favoritos">
              <Heart className="h-[18px] w-[18px]" strokeWidth={1.6} />
            </Link>
            <Link
              href={PUBLIC_ROUTES.CART}
              className={cn(iconLinkClass, 'relative')}
              aria-label="Carrito"
            >
              <ShoppingCart className="h-[18px] w-[18px]" strokeWidth={1.6} />
              {cartCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground shadow-sm">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={iconLinkClass}
                  aria-label={`Menú de ${displayName}`}
                >
                  <User className="h-[18px] w-[18px]" strokeWidth={1.6} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                      <p className="text-sm font-medium">{displayName}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Link href={PUBLIC_ROUTES.PROFILE} className="w-full">
                      Mi perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href={PUBLIC_ROUTES.ORDERS} className="w-full">
                      Mis pedidos
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      void handleSignOut();
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link
                  href={PUBLIC_ROUTES.LOGIN}
                  className={cn(iconLinkClass, 'md:hidden')}
                  aria-label="Iniciar sesión"
                  title="Iniciar sesión"
                >
                  <LogIn className="h-[18px] w-[18px]" strokeWidth={1.6} />
                </Link>
                <div className="ml-1 hidden items-center gap-2 md:flex">
                  <Link href={PUBLIC_ROUTES.LOGIN}>
                    <Button variant="ghost" size="sm" className="h-9 rounded-full px-4 text-xs">
                      Entrar
                    </Button>
                  </Link>
                  <Link href={PUBLIC_ROUTES.REGISTER}>
                    <Button size="sm" className="h-9 rounded-full px-4 text-xs">
                      <UserPlus className="size-3.5" />
                      Registro
                    </Button>
                  </Link>
                </div>
              </>
            )}

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden rounded-full"
                    aria-label="Abrir menú"
                  />
                }
              >
                <Menu className="h-[18px] w-[18px]" strokeWidth={1.6} />
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(100%,20rem)] p-0">
                <SheetHeader className="border-b px-6 py-5">
                  <SheetTitle className="font-[family-name:var(--font-heading)] text-xl">
                    La Merced <span className="text-accent">PyK</span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 p-4">
                  {NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="rounded-xl px-4 py-3 text-sm font-medium transition hover:bg-muted"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Link
                    href={PUBLIC_ROUTES.CHAT}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-4 py-3 text-sm font-medium transition hover:bg-muted"
                  >
                    Chat en línea
                  </Link>
                  {!user ? (
                    <div className="mt-4 grid gap-2 px-2">
                      <Link href={PUBLIC_ROUTES.LOGIN} onClick={() => setOpen(false)}>
                        <Button variant="outline" className="w-full rounded-full">
                          Iniciar sesión
                        </Button>
                      </Link>
                      <Link href={PUBLIC_ROUTES.REGISTER} onClick={() => setOpen(false)}>
                        <Button className="w-full rounded-full">Crear cuenta</Button>
                      </Link>
                    </div>
                  ) : null}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
