import Link from 'next/link';
import { PUBLIC_ROUTES } from '@/constants/routes';

export function PublicFooter() {
  return (
    <footer className="relative mt-auto overflow-hidden bg-foreground text-background">
      <div className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
      <div className="container relative mx-auto px-4 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <p className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
              La Merced <span className="text-accent">PyK</span>
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-background/60">
              Multiservicios La Merced PyK S.A.C. — calzado, ropa y accesorios con
              calidad y confianza para toda la familia.
            </p>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-background/50">
              Tienda
            </h4>
            <ul className="mt-5 space-y-3 text-sm text-background/65">
              <li>
                <Link href={PUBLIC_ROUTES.CATALOG} className="transition hover:text-background">
                  Catálogo
                </Link>
              </li>
              <li>
                <Link href={PUBLIC_ROUTES.CATEGORIES} className="transition hover:text-background">
                  Categorías
                </Link>
              </li>
              <li>
                <Link href={PUBLIC_ROUTES.PROMOTIONS} className="transition hover:text-background">
                  Promociones
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-background/50">
              Mi cuenta
            </h4>
            <ul className="mt-5 space-y-3 text-sm text-background/65">
              <li>
                <Link href={PUBLIC_ROUTES.PROFILE} className="transition hover:text-background">
                  Perfil
                </Link>
              </li>
              <li>
                <Link href={PUBLIC_ROUTES.ORDERS} className="transition hover:text-background">
                  Mis pedidos
                </Link>
              </li>
              <li>
                <Link href={PUBLIC_ROUTES.ORDER_TRACK} className="transition hover:text-background">
                  Seguimiento
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-background/50">
              Ayuda
            </h4>
            <ul className="mt-5 space-y-3 text-sm text-background/65">
              <li>
                <Link href={PUBLIC_ROUTES.CONTACT} className="transition hover:text-background">
                  Contacto
                </Link>
              </li>
              <li>
                <Link href={PUBLIC_ROUTES.CHAT} className="transition hover:text-background">
                  Chat en línea
                </Link>
              </li>
              <li>
                <Link href={PUBLIC_ROUTES.LOGIN} className="transition hover:text-background">
                  Iniciar sesión
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-background/10 pt-8 text-center text-xs text-background/40 sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} Multiservicios La Merced PyK S.A.C.</p>
          <p className="uppercase tracking-[0.16em]">Boutique · Calidad · Confianza</p>
        </div>
      </div>
    </footer>
  );
}
