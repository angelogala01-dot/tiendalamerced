import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type DataTableShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  isLoading?: boolean;
  loadingRows?: number;
  className?: string;
};

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Cargando tabla">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function DataTableShell({
  title,
  description,
  children,
  actions,
  isLoading,
  loadingRows = 5,
  className,
}: DataTableShellProps) {
  return (
    <Card className={cn('admin-card overflow-hidden border-0 py-0', className)}>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto p-4 sm:p-6">
          {isLoading ? <TableSkeleton rows={loadingRows} /> : children}
        </div>
      </CardContent>
    </Card>
  );
}
