import { Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/admin/page-header';

type ModulePlaceholderProps = {
  title: string;
  description: string;
  sprint?: string;
  features?: string[];
};

export function ModulePlaceholder({
  title,
  description,
  sprint = 'Próximo sprint',
  features = [],
}: ModulePlaceholderProps) {
  return (
    <div className="admin-page-enter space-y-6">
      <PageHeader title={title} description={description} />

      <Card className="admin-card overflow-hidden border-0">
        <CardContent className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center sm:py-20">
          <div
            className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"
            aria-hidden
          >
            <Construction className="size-8" />
          </div>
          <div className="max-w-md space-y-2">
            <Badge variant="secondary" className="mb-1">
              {sprint}
            </Badge>
            <h2 className="text-lg font-semibold text-foreground">Módulo en desarrollo</h2>
            <p className="text-sm text-muted-foreground">
              Esta sección se habilitará en una próxima iteración del roadmap. El diseño y la
              navegación ya están preparados para integrar la funcionalidad.
            </p>
          </div>
          {features.length > 0 ? (
            <ul className="mt-2 flex flex-wrap justify-center gap-2" aria-label="Funcionalidades planificadas">
              {features.map((f) => (
                <li key={f}>
                  <Badge variant="outline">{f}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
