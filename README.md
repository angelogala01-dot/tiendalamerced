# La Merced PyK — Sistema Multiplataforma

```
merded/
├── frontend/      → Portal público (Next.js) — puerto 3000
├── admin/         → Panel administrativo (Next.js) — puerto 3001
├── backend/       → API REST (NestJS) — puerto 4000
├── mobile_app/    → App móvil (Flutter)
├── supabase/      → Migraciones y configuración BD
├── productos.json → Datos semilla de productos
├── startup.js     → Arranque de todos los servicios
└── package.json   → Scripts del monorepo
```

## URLs locales

| Servicio | URL |
|----------|-----|
| Portal tienda | http://localhost:3000 |
| Panel admin | http://localhost:3001 |
| API REST | http://localhost:4000/api/v1 |
| Swagger | http://localhost:4000/api/docs |

## Inicio rápido

```bash
# Instalar dependencias
npm run install:all

# Configurar variables de entorno
cp frontend/.env.example frontend/.env.local
cp admin/.env.example admin/.env.local
cp backend/.env.example backend/.env

# Iniciar todo (frontend + admin + backend)
npm run dev
```

O por separado:

```bash
npm run dev:frontend   # :3000
npm run dev:admin      # :3001
npm run dev:backend    # :4000
```

## Despliegue en Railway (GitHub)

No hace falta Docker. El repo [angelogala01-dot/tiendalamerced](https://github.com/angelogala01-dot/tiendalamerced) se conecta a Railway y se publican **3 servicios** del mismo repositorio.

| Servicio Railway | Root Directory | Healthcheck |
|------------------|----------------|-------------|
| `api` | `backend` | `/api/v1/health` |
| `frontend` | `frontend` | `/` |
| `admin` | `admin` | `/` |

### Pasos

1. En [Railway](https://railway.app) crea un proyecto y conéctalo al repo de GitHub.
2. Crea el primer servicio desde el repo. En **Settings → Root Directory** pon `backend`. Genera un dominio público.
3. **New → GitHub Repo** otra vez (el mismo repo) para `frontend` y otra para `admin`. Cambia el Root Directory de cada uno.
4. Copia las variables de `deploy/railway.env.example` en cada servicio.
5. En frontend y admin, `NEXT_PUBLIC_*` se aplican en el **build**. Si cambias la URL de la API, redespliega esos dos servicios.
6. En Supabase → Authentication → URL Configuration:
   - Site URL: URL del frontend
   - Redirect URLs: `https://TU-FRONTEND.up.railway.app/**` y `https://TU-ADMIN.up.railway.app/**`

La app Flutter no se despliega en Railway.

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Plan SCRUM](docs/ROADMAP.md)
