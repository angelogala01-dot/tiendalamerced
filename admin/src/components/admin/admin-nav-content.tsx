'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Package, LogOut, ExternalLink, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ADMIN_ROUTES, STORE_URL } from '@/constants/routes';
import { createClient } from '@/lib/supabase/client';
import { NAV_SECTIONS, isNavActive, type NavSection } from '@/components/admin/nav-config';
import { useStaffRole } from '@/hooks/use-staff-role';
import { ROLE_LABELS } from '@/lib/rbac';

type AdminNavContentProps = {
  onNavigate?: () => void;
  className?: string;
};

const COLLAPSE_KEY = 'lm-admin-nav-collapsed';

export function AdminNavContent({ onNavigate, className }: AdminNavContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const role = useStaffRole();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(COLLAPSE_KEY);
      if (raw) setCollapsed(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
  }, []);

  function toggleSection(title: string) {
    setCollapsed((prev) => {
      const currentlyOpen = isSectionOpen(title, prev);
      const next = { ...prev, [title]: currentlyOpen };
      try {
        sessionStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function isSectionOpen(title: string, state = collapsed) {
    const section = NAV_SECTIONS.find((s) => s.title === title);
    if (!section) return true;
    const hasActive = section.items.some((item) => isNavActive(pathname, item.href));
    if (hasActive) return true;
    if (!section.collapsible) return true;
    return state[title] !== true;
  }

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
          <p className="truncate text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {role ? ROLE_LABELS[role] : 'Panel'}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((item) => !item.roles || (role && item.roles.includes(role)));
          if (!items.length) return null;
          return (
            <NavBlock
              key={section.title}
              section={{ ...section, items }}
              pathname={pathname}
              open={isSectionOpen(section.title)}
              onToggle={() => toggleSection(section.title)}
              onNavigate={onNavigate}
            />
          );
        })}
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

function NavBlock({
  section,
  pathname,
  open,
  onToggle,
  onNavigate,
}: {
  section: NavSection;
  pathname: string;
  open: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const headingId = `nav-section-${section.title}`;
  let lastGroup: string | undefined;

  return (
    <div className="mb-4 last:mb-0">
      {section.collapsible ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={headingId}
          className="mb-1 flex w-full items-center justify-between rounded-lg px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          {section.title}
          <ChevronDown
            className={cn('size-3.5 transition-transform', open ? 'rotate-0' : '-rotate-90')}
            aria-hidden
          />
        </button>
      ) : (
        <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {section.title}
        </p>
      )}

      {open ? (
        <ul className="space-y-0.5" id={headingId} aria-label={section.title}>
          {section.items.map(({ href, label, icon: Icon, group }) => {
            const showGroup = group && group !== lastGroup;
            lastGroup = group;
            const active = isNavActive(pathname, href);
            return (
              <li key={href}>
                {showGroup ? (
                  <p className="mb-1 mt-3 px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
                    {group}
                  </p>
                ) : null}
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
      ) : null}
    </div>
  );
}
