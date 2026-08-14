# Base de datos — La Merced PyK

## Aplicar esquema en Supabase vacío

> Las migraciones antiguas están en `migrations/archive/`. Usa solo el archivo completo.

### Opción A — SQL Editor (recomendado)

1. Abre [Supabase Dashboard](https://supabase.com/dashboard/project/idbzttrtzmhrlwsomphz/sql/new)
2. Copia y ejecuta **todo** el archivo:
   ```
   supabase/migrations/20250622120000_la_merced_complete_schema.sql
   ```
3. Verifica en **Table Editor** que existan tablas: `profiles`, `products`, `categories`, etc.

### Opción B — Script con contraseña de BD

1. En Supabase → **Settings** → **Database** → copia **Connection string** (URI)
2. Añade en `backend/.env`:
   ```env
   DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@...
   ```
3. Ejecuta:
   ```bash
   npm run db:apply
   ```

### Después del esquema

```bash
# Añade SUPABASE_SECRET_KEY en backend/.env primero
npm run seed:admin
```

Credenciales de prueba: `admin@lamerced.com` / `Admin123!`

## Estructura principal

| Módulo | Tablas |
|--------|--------|
| Auth / usuarios | `profiles`, `permissions`, `role_permissions` |
| Catálogo | `categories`, `brands`, `suppliers`, `products`, `product_images` |
| Cliente web | `cart_items`, `favorites`, `customers` |
| Inventario | `inventory_movements` |
| Ventas POS | `sales`, `sale_items` |
| Pedidos | `orders`, `order_items`, `order_status_history` |
| Marketing | `promotions`, `faq_entries` |
| Sistema | `notifications`, `audit_logs`, `app_settings`, `chat_*` |

## Roles

`super_admin` · `admin` · `manager` · `seller` · `warehouse` · `customer`

## Storage (opcional)

Crea bucket `product-images` en Supabase Storage para fotos de productos.
