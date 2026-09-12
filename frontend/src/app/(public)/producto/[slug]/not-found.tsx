import Link from 'next/link';
import { PUBLIC_ROUTES } from '@/constants/routes';

export default function ProductoNoEncontrado() {
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="eyebrow mb-3">Catálogo</p>
      <h1 className="section-heading">Producto no encontrado</h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        Este artículo no está disponible o el enlace ya no es válido. Revisa el catálogo para ver lo que tenemos en tienda.
      </p>
      <Link href={PUBLIC_ROUTES.CATALOG} className="btn-bazu-fill mt-8">
        Ver catálogo
      </Link>
    </div>
  );
}
