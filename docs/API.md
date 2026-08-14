# API Reference — La Merced PyK

Base URL: `http://localhost:4000/api/v1` (desarrollo)

Swagger interactivo: `http://localhost:4000/api/docs`

## Autenticación

Header: `Authorization: Bearer <supabase_access_token>`

Los endpoints marcados `[Staff]` requieren rol: `super_admin`, `admin`, `manager`, `seller` o `warehouse`.

Los endpoints marcados `[Admin]` requieren rol: `super_admin` o `admin`.

## Rate limiting

120 solicitudes por minuto por IP. Respuesta `429` si se excede.

---

## Health

```
GET /health
```

## Auth

```
GET  /auth/me          [Auth] Perfil + usuario
```

## Products

```
GET    /products                    Listado (?search, ?categoryId, ?brandId, ?page, ?limit)
GET    /products/low-stock          [Staff] Alertas stock
GET    /products/:id                Detalle
POST   /products                    [Staff] Crear
PATCH  /products/:id                [Staff] Actualizar
DELETE /products/:id                [Staff] Eliminar
```

## Categories & Brands

```
GET    /categories
POST   /categories                  [Staff] Crear
PATCH  /categories/:id              [Staff] Actualizar
DELETE /categories/:id              [Staff] Eliminar

GET    /brands
POST   /brands                      [Staff] Crear
PATCH  /brands/:id                  [Staff] Actualizar
DELETE /brands/:id                  [Staff] Eliminar
```

## Inventory

```
GET  /inventory/movements           [Staff] (?productId)
POST /inventory/movements           [Staff] entry|exit|adjustment
```

## Sales (POS)

```
GET  /sales                         [Staff]
GET  /sales/:id                     [Staff]
POST /sales                         [Staff] Crear venta
```

## Customers

```
GET  /customers                     [Staff] (?search)
GET  /customers/:id                 [Staff]
POST /customers                     [Staff]
```

## Orders

```
GET   /orders                       [Staff] (?status)
GET   /orders/my                    [Auth] Pedidos del cliente autenticado
POST  /orders                       [Auth] Crear pedido (checkout)
GET   /orders/track/:orderNumber    Público — seguimiento
PATCH /orders/:id/status            [Staff]
```

## Dashboard

```
GET /dashboard/overview             [Staff] KPIs completos
```

## Reports

```
GET /reports/dashboard              [Staff] (legacy)
GET /reports/top-products           [Staff]
```

## Promotions

```
GET  /promotions                    Público — activas
GET  /promotions/admin              [Admin]
POST /promotions                    [Admin]
```

## Users

```
GET   /users                        [Staff]
PATCH /users/:id/role               [Admin]
PATCH /users/:id/status             [Admin] { is_active: boolean }
```

## Settings

```
GET /settings                       [Admin] Listar configuración
GET /settings/:key                  [Admin]
PUT /settings/:key                  [Admin] { value, description? }
```

## Audit

```
GET /audit/logs                     [Admin] (?module, ?userId, ?page, ?limit)
```

## Monitoring

```
POST /monitoring/errors             Público — reportar error cliente
POST /monitoring/errors/auth        [Auth] — reportar error autenticado
```

## Chatbot

```
POST   /chatbot/chat                { message, sessionId? }
GET    /chatbot/faq                 Público
GET    /chatbot/faq/admin           [Admin]
POST   /chatbot/faq                 [Admin]
PATCH  /chatbot/faq/:id             [Admin]
DELETE /chatbot/faq/:id             [Admin]
```

---

## Formato de respuesta

```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "limit": 20
}
```

Errores:

```json
{
  "statusCode": 403,
  "message": "No tienes permisos para esta acción"
}
```

## Códigos de respuesta

| Código | Significado |
|--------|-------------|
| 200 | OK |
| 201 | Creado |
| 400 | Validación fallida |
| 401 | No autenticado |
| 403 | Sin permisos (RBAC) |
| 404 | No encontrado |
| 429 | Rate limit excedido |
| 500 | Error interno |

---

## Mantenimiento

1. Variables de entorno: ver `backend/.env.example`, `admin/.env.example`, `frontend/.env.example`
2. Migraciones BD: `npm run db:apply` desde la raíz
3. Usuario admin semilla: `npm run seed:admin`
4. Arranque desarrollo: `npm run dev` (backend :4000, frontend :3000, admin :3001)
