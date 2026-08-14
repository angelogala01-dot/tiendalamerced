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

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Plan SCRUM](docs/ROADMAP.md)
