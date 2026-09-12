import Link from 'next/link';
import { PUBLIC_ROUTES } from '@/constants/routes';

export default function NotFound() {
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="eyebrow mb-3">404</p>
      <h1 className="section-heading">Página no encontrada</h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        No encontramos esa dirección. Puedes volver al inicio o seguir comprando en el catálogo.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={PUBLIC_ROUTES.HOME} className="btn-bazu">
          Inicio
        </Link>
        <Link href={PUBLIC_ROUTES.CATALOG} className="btn-bazu-fill">
          Ver catálogo
        </Link>
      </div>
    </div>
  );
}
