# Sistema de diseño — Panel Admin La Merced PyK

Referencia visual: plantilla **MatDash** (sidebar claro, acento púrpura, tarjetas con sombra suave).

## Paleta de colores

| Token | Uso | Valor (modo claro) |
|-------|-----|-------------------|
| `--primary` | Botones, nav activo, enlaces | Púrpura `oklch(0.52 0.22 285)` |
| `--background` | Fondo del panel | Gris frío `oklch(0.975 0.006 265)` |
| `--card` | Tarjetas y header | Blanco |
| `--muted-foreground` | Texto secundario | Gris medio |
| `--success` | Indicadores positivos | Verde |
| `--warning` | Alertas de stock | Ámbar |
| `--info` | Métricas informativas | Azul |
| `--destructive` | Errores, stock crítico | Rojo |
| `--chart-1..5` | Gráficos futuros | Púrpura, rosa, teal, ámbar, verde |

## Tipografía

- **Fuente principal:** Inter (`--font-inter`)
- **Mono:** Geist Mono (SKU, códigos)
- **Jerarquía:**
  - H1 página: `text-2xl sm:text-3xl font-bold`
  - Títulos de tarjeta: `text-base font-semibold`
  - Cuerpo: `text-sm`
  - Labels de sección nav: `text-[10px] uppercase tracking-widest`

## Espaciado y radios

- `--radius`: `0.75rem` (12px)
- Padding main: `p-4 sm:p-6 lg:p-8`
- Gap entre secciones: `space-y-6` / `space-y-8`
- Tarjetas: `rounded-xl` con sombra `--shadow-card`

## Componentes reutilizables

| Componente | Ruta | Propósito |
|------------|------|-----------|
| `AdminShell` | `components/admin/admin-shell.tsx` | Layout sidebar + header + main |
| `AdminNavContent` | `components/admin/admin-nav-content.tsx` | Navegación agrupada por sección |
| `AdminHeader` | `components/admin/admin-header.tsx` | Barra superior con búsqueda y usuario |
| `PageHeader` | `components/admin/page-header.tsx` | Título y acciones de página |
| `StatCard` | `components/admin/stat-card.tsx` | KPI con icono de acento |
| `DataTableShell` | `components/admin/data-table-shell.tsx` | Contenedor de tablas |
| `ModulePlaceholder` | `components/admin/module-placeholder.tsx` | Módulos en desarrollo |

## Navegación

Secciones definidas en `components/admin/nav-config.ts`:

1. **Panel** — Dashboard
2. **Catálogo** — Productos, Categorías, Marcas, Inventario
3. **Ventas** — POS, Clientes, Pedidos, Promociones
4. **Sistema** — Usuarios, Reportes, Chat Bot, Configuración

## Modo oscuro

Activado vía `next-themes` (`ThemeProvider`). Variables en `.dark` dentro de `globals.css`.

## Animaciones

- Entrada de página: `.admin-page-enter`
- KPIs escalonados: `.admin-stagger`
- Respeta `prefers-reduced-motion: reduce`

## Accesibilidad (WCAG 2.1)

- Skip link al contenido principal
- `aria-current="page"` en nav activa
- `aria-label` en controles icon-only
- Contraste primary sobre blanco ≥ 4.5:1
- Focus visible con `ring-ring`
- Áreas táctiles mínimo 40×40px en nav y botones

## Clases utilitarias

```css
.admin-card       /* Tarjeta con sombra y hover */
.admin-page-enter  /* Animación de entrada */
.admin-stagger     /* Hijos con delay escalonado */
```
