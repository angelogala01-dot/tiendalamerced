'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShoppingCart,
  Heart,
  User,
  Search,
  Menu,
  MessageCircle,
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

const ACCOUNT_LINKS = [
  { href: PUBLIC_ROUTES.PROFILE, label: 'Perfil' },
  { href: PUBLIC_ROUTES.ORDERS, label: 'Mis pedidos' },
  { href: PUBLIC_ROUTES.ORDER_TRACK, label: 'Seguimiento' },
] as const;

const iconLinkClass =
  'inline-flex size-10 items-center justify-center rounded-full text-foreground/80 transition-all duration-200 hover:bg-accent/10 hover:text-accent hover:-translate-y-0.5';

const accountMenuClass =
  'w-[13.5rem] min-w-[13.5rem] rounded-none border-0 bg-[#1C1410] p-6 text-[#E8E0D8] shadow-xl ring-0';

const accountItemClass =
  'cursor-pointer rounded-none px-0 py-2 text-[15px] font-normal text-[#E8E0D8] focus:bg-transparent focus:text-white data-[highlighted]:bg-transparent data-[highlighted]:text-white';

export function PublicHeader({ cartCount = 0 }: PublicHeaderProps) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [headerQuery, setHeaderQuery] = useState('');
  const headerSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) headerSearchRef.current?.focus();
  }, [searchOpen]);

  function submitHeaderSearch(event: FormEvent) {
    event.preventDefault();
    const query = headerQuery.trim();
    setSearchOpen(false);
    setHeaderQuery('');
    if (pathname === PUBLIC_ROUTES.CATALOG && !query) {
      document.getElementById('catalog-search')?.focus();
      return;
    }
    const href = query
      ? `${PUBLIC_ROUTES.CATALOG}?q=${encodeURIComponent(query)}`
      : `${PUBLIC_ROUTES.CATALOG}?focus=1`;
    router.push(href);
  }

  async function handleSignOut() {
    await signOut();
    window.location.href = PUBLIC_ROUTES.HOME;
  }

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
            {searchOpen ? (
              <form onSubmit={submitHeaderSearch} className="hidden sm:block">
                <input
                  ref={headerSearchRef}
                  type="search"
                  value={headerQuery}
                  onChange={(e) => setHeaderQuery(e.target.value)}
                  placeholder="Buscar productos..."
                  className="h-10 w-48 rounded-full border border-input bg-background px-4 text-sm outline-none md:w-64 focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Buscar productos"
                  onBlur={() => {
                    if (!headerQuery.trim()) setSearchOpen(false);
                  }}
                />
              </form>
            ) : (
              <button
                type="button"
                className={iconLinkClass}
                aria-label="Buscar"
                onClick={() => {
                  if (pathname === PUBLIC_ROUTES.CATALOG) {
                    document.getElementById('catalog-search')?.focus();
                    return;
                  }
                  if (window.innerWidth < 640) {
                    router.push(`${PUBLIC_ROUTES.CATALOG}?focus=1`);
                    return;
                  }
                  setSearchOpen(true);
                }}
              >
                <Search className="h-[18px] w-[18px]" strokeWidth={1.6} />
              </button>
            )}
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

            <DropdownMenu>
              <DropdownMenuTrigger
                className={iconLinkClass}
                aria-label="Mi cuenta"
              >
                <User className="h-[18px] w-[18px]" strokeWidth={1.6} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={10} className={accountMenuClass}>
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="mb-3 px-0 py-0 font-[family-name:var(--font-heading)] text-[13px] font-semibold tracking-[0.18em] text-[#D4CBC3]">
                    MI CUENTA
                  </DropdownMenuLabel>
                  {ACCOUNT_LINKS.map((item) => (
                    <DropdownMenuItem key={item.href} className={accountItemClass}>
                      <Link href={item.href} className="block w-full">
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                {user ? (
                  <DropdownMenuItem
                    className={cn(accountItemClass, 'mt-3 pt-3 text-[#D4CBC3]/70')}
                    onClick={() => {
                      void handleSignOut();
                    }}
                  >
                    Cerrar sesión
                  </DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuItem className={cn(accountItemClass, 'mt-3 pt-3')}>
                      <Link href={PUBLIC_ROUTES.LOGIN} className="block w-full">
                        Entrar
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className={accountItemClass}>
                      <Link href={PUBLIC_ROUTES.REGISTER} className="block w-full">
                        Registro
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

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
                    href={`${PUBLIC_ROUTES.CATALOG}?focus=1`}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-4 py-3 text-sm font-medium transition hover:bg-muted"
                  >
                    Buscar productos
                  </Link>
                  <Link
                    href={PUBLIC_ROUTES.CHAT}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-4 py-3 text-sm font-medium transition hover:bg-muted"
                  >
                    Chat en línea
                  </Link>
                  <div className="mt-4 rounded-none bg-[#1C1410] px-5 py-5 text-[#E8E0D8]">
                    <p className="mb-3 font-[family-name:var(--font-heading)] text-[13px] font-semibold tracking-[0.18em] text-[#D4CBC3]">
                      MI CUENTA
                    </p>
                    {ACCOUNT_LINKS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="block py-2 text-[15px] hover:text-white"
                      >
                        {item.label}
                      </Link>
                    ))}
                    {user ? (
                      <button
                        type="button"
                        className="mt-3 block py-2 text-[15px] text-[#D4CBC3]/70"
                        onClick={() => {
                          setOpen(false);
                          void handleSignOut();
                        }}
                      >
                        Cerrar sesión
                      </button>
                    ) : (
                      <>
                        <Link
                          href={PUBLIC_ROUTES.LOGIN}
                          onClick={() => setOpen(false)}
                          className="mt-3 block py-2 text-[15px] hover:text-white"
                        >
                          Entrar
                        </Link>
                        <Link
                          href={PUBLIC_ROUTES.REGISTER}
                          onClick={() => setOpen(false)}
                          className="block py-2 text-[15px] hover:text-white"
                        >
                          Registro
                        </Link>
                      </>
                    )}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
