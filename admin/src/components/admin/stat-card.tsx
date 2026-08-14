import Link from 'next/link';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export type StatAccent = 'primary' | 'success' | 'warning' | 'info' | 'destructive' | 'chart-2';

const accentStyles: Record<StatAccent, { icon: string; bg: string; glow: string }> = {
  primary: {
    icon: 'text-primary',
    bg: 'bg-primary/10',
    glow: 'from-primary/15',
  },
  success: {
    icon: 'text-success',
    bg: 'bg-success/10',
    glow: 'from-success/15',
  },
  warning: {
    icon: 'text-warning-foreground',
    bg: 'bg-warning/20',
    glow: 'from-warning/20',
  },
  info: {
    icon: 'text-info',
    bg: 'bg-info/10',
    glow: 'from-info/15',
  },
  destructive: {
    icon: 'text-destructive',
    bg: 'bg-destructive/10',
    glow: 'from-destructive/15',
  },
  'chart-2': {
    icon: 'text-chart-2',
    bg: 'bg-chart-2/10',
    glow: 'from-chart-2/15',
  },
};

type StatCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  accent?: StatAccent;
  href?: string;
  linkLabel?: string;
  isLoading?: boolean;
  className?: string;
};

export function StatCard({
  title,
  value,
  icon: Icon,
  accent = 'primary',
  href,
  linkLabel = 'Ver detalles',
  isLoading,
  className,
}: StatCardProps) {
  const styles = accentStyles[accent];

  return (
    <Card
      className={cn(
        'admin-card relative overflow-hidden border-0 py-0 transition hover:-translate-y-0.5',
        className,
      )}
    >
      <div
        className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent', styles.glow)}
        aria-hidden
      />
      <CardContent className="relative flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-sm',
              styles.bg,
            )}
            aria-hidden
          >
            <Icon className={cn('size-5', styles.icon)} />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-24" aria-label="Cargando indicador" />
          ) : (
            <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{value}</p>
          )}
        </div>
        {href ? (
          <Link
            href={href}
            className="text-xs font-medium text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:underline"
          >
            {linkLabel} →
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
