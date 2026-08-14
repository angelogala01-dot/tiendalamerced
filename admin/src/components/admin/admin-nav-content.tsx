'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Package, LogOut, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ADMIN_ROUTES, STORE_URL } from '@/constants/routes';
import { createClient } from '@/lib/supabase/client';
import { NAV_SECTIONS, isNavActive } from '@/components/admin/nav-config';

type AdminNavContentProps = {
  onNavigate?: () => void;
  className?: string;
};

export function AdminNavContent({ onNavigate, className }: AdminNavContentProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push(ADMIN_ROUTES.LOGIN);
    router.refresh();
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-5">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-chart-2 text-primary-foreground shadow-[0_10px_24px_-12px_oklch(0.52_0.22_285/0.9)]"
          aria-hidden
        >
          <Package className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">La Merced PyK</p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Panel Admin
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-5 last:mb-0">
            <p
              className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
              id={`nav-section-${section.title}`}
            >
              {section.title}
            </p>
            <ul className="space-y-0.5" aria-labelledby={`nav-section-${section.title}`}>
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = isNavActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        active
                          ? 'bg-primary text-primary-foreground shadow-[0_10px_20px_-12px_oklch(0.52_0.22_285/0.85)]'
                          : 'text-sidebar-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 rounded-xl text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="size-4" aria-hidden />
          Cerrar sesión
        </Button>
        <a
          href={STORE_URL}
          className="mt-1 flex min-h-9 items-center justify-center gap-1.5 rounded-lg text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="size-3" aria-hidden />
          Ir al portal público
        </a>
      </div>
    </div>
  );
}
