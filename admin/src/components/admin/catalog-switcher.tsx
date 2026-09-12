'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CATALOG_TABS, isNavActive } from '@/components/admin/nav-config';
import { useStaffRole } from '@/hooks/use-staff-role';
import { canAccessPath } from '@/lib/rbac';
import { cn } from '@/lib/utils';

export function CatalogSwitcher() {
  const pathname = usePathname();
  const role = useStaffRole();
  const tabs = CATALOG_TABS.filter((tab) => !role || canAccessPath(role, tab.href));
  const current = tabs.find((tab) => isNavActive(pathname, tab.href));

  return (
    <div className="space-y-2">
      <nav
        aria-label="Módulos del catálogo"
        className="flex gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-card p-1 shadow-sm"
      >
        {tabs.map((tab) => {
          const active = isNavActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {current ? (
        <p className="px-1 text-xs text-muted-foreground">
          {current.hint}. Un producto usa categoría y marca; la marca puede tener proveedor; el stock se mueve en Inventario.
        </p>
      ) : null}
    </div>
  );
}
