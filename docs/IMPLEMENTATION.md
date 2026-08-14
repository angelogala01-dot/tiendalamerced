# Guía de implementación — La Merced PyK

Documento de referencia para el estado funcional del sistema tras la integración completa admin + frontend.

## Arquitectura

| Componente | Puerto | Stack |
|------------|--------|-------|
| Frontend tienda | 3000 | Next.js 15, Supabase Auth |
| Panel admin | 3001 | Next.js 15, Supabase Auth + API |
| API REST | 4000 | NestJS 11, Supabase PostgreSQL |
| Base de datos | — | Supabase (RLS + RBAC) |

## Flujos principales

### Cliente (frontend)
1. **Catálogo** → carrito (localStorage) → **checkout** (`POST /orders`)
2. **Mis pedidos** (`GET /orders/my`) y **seguimiento** (`GET /orders/track/:numero`)
3. **Perfil** editable vía Supabase + **recuperación de contraseña**
4. Errores reportados a `POST /monitoring/errors`

### Staff (admin)
1. Login con validación de rol staff en middleware
2. Todas las operaciones usan `useApi()` con JWT Supabase
3. Módulos CRUD: productos, categorías, marcas, inventario, ventas POS, clientes, pedidos, usuarios, promociones, FAQ chatbot
4. **Configuración**: settings globales + enrolamiento **2FA (TOTP)** vía Supabase MFA
5. **Auditoría**: mutaciones registradas en `audit_logs` (interceptor global)
6. Monitoreo de errores cliente en tiempo real

## Seguridad

- **RBAC**: `StaffAuth` / `AdminAuth` en endpoints NestJS
- **Rate limit**: 120 req/min por IP
- **Sesión admin**: verificación periódica + redirect a login
- **2FA**: TOTP en `/configuracion` (requiere MFA habilitado en Supabase)
- **RLS**: políticas en PostgreSQL (ver migración principal)

## Variables de entorno

Copiar y completar:
- `backend/.env.example` → `backend/.env`
- `frontend/.env.example` → `frontend/.env.local`
- `admin/.env.example` → `admin/.env.local`

## Comandos

```bash
npm run install:all   # instalar dependencias
npm run db:apply      # aplicar esquema Supabase
npm run seed:admin    # usuario admin de prueba
npm run dev           # backend + frontend + admin
```

## API

Ver [API.md](./API.md) para endpoints completos, autenticación y códigos de respuesta.

## Pruebas

```bash
cd backend && npm test          # unitarios
cd backend && npm run test:e2e  # integración (requiere .env)
```

Cobertura actual en backend: guards, DTOs y health. Ampliar con tests de servicios e integración RLS en iteraciones futuras.

## Pendientes recomendados

- Pasarela de pago (Stripe/Izipay) — actualmente registro de método sin cobro real
- Comentarios/valoraciones — requiere tabla `product_reviews` en BD
- CI/CD (GitLab) y deploy Vercel + Railway
- Tests E2E Playwright para flujos críticos
- Sincronización carrito con `cart_items` en BD para usuarios autenticados
