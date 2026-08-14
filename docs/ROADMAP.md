# Plan SCRUM — Producción La Merced PyK

## Equipo sugerido

| Rol | Responsabilidad |
|-----|-----------------|
| Product Owner | Priorización, validación negocio |
| Scrum Master | Ceremonias, impedimentos |
| Tech Lead | Arquitectura, code review |
| Frontend Dev | Next.js portal + admin |
| Backend Dev | NestJS + Supabase |
| Mobile Dev | Flutter |
| QA | Tests, UAT |

## Ceremonias

- **Sprint Planning**: Lunes inicio sprint (2 semanas)
- **Daily**: 15 min
- **Review**: Viernes semana 2 — demo stakeholders
- **Retrospective**: Post-review

---

## Sprint 1 — Fundamentos ✅ (Completado)

**Objetivo**: Base técnica y arquitectura dual portal/admin.

- [x] Monorepo (web, api, mobile, supabase)
- [x] Esquema BD + RLS + RBAC
- [x] API REST modular + Swagger
- [x] Portal público (home, catálogo, carrito, favoritos, chat)
- [x] Panel admin separado `/admin`
- [x] Middleware auth + roles
- [x] React Hook Form + Zod
- [x] Documentación arquitectura

**Story Points**: 34

---

## Sprint 2 — Catálogo e Inventario

**Objetivo**: Gestión completa de productos con imágenes.

| ID | Historia | SP |
|----|----------|-----|
| S2-01 | CRUD productos admin con formulario Zod | 8 |
| S2-02 | Upload imágenes Supabase Storage | 5 |
| S2-03 | CRUD categorías y marcas admin | 5 |
| S2-04 | UI movimientos inventario | 8 |
| S2-05 | Alertas stock crítico en dashboard | 3 |
| S2-06 | Búsqueda avanzada portal (precio, stock) | 5 |

**DoD**: Imágenes en CDN, stock actualizado en tiempo real.

---

## Sprint 3 — Ventas POS

**Objetivo**: Punto de venta operativo en tienda.

| ID | Historia | SP |
|----|----------|-----|
| S3-01 | UI POS con carrito y descuentos | 13 |
| S3-02 | Comprobante PDF/ticket | 5 |
| S3-03 | Historial ventas con filtros | 5 |
| S3-04 | Métodos pago Yape/Plin/efectivo | 3 |
| S3-05 | Integración impresora térmica (opcional) | 8 |

---

## Sprint 4 — E-commerce Cliente

**Objetivo**: Checkout online y pedidos.

| ID | Historia | SP |
|----|----------|-----|
| S4-01 | Checkout carrito → pedido | 13 |
| S4-02 | Sync carrito BD autenticado | 5 |
| S4-03 | Estados pedido + notificaciones email | 8 |
| S4-04 | Perfil cliente editable | 5 |
| S4-05 | Historial compras portal | 5 |

---

## Sprint 5 — Reportes y Analytics

| ID | Historia | SP |
|----|----------|-----|
| S5-01 | Gráficos ventas (Recharts) | 8 |
| S5-02 | Export CSV/PDF reportes | 5 |
| S5-03 | Margen y rentabilidad | 8 |
| S5-04 | Filtros avanzados reportes | 5 |

---

## Sprint 6 — IA y Móvil

| ID | Historia | SP |
|----|----------|-----|
| S6-01 | Chatbot OpenAI/Gemini integrado | 13 |
| S6-02 | Escalación a agente humano | 5 |
| S6-03 | Flutter auth + API token | 8 |
| S6-04 | Push notifications Firebase | 8 |

---

## Sprint 7 — Go-Live

| ID | Historia | SP |
|----|----------|-----|
| S7-01 | Deploy Vercel (web) | 3 |
| S7-02 | Deploy Railway (api) | 3 |
| S7-03 | CI/CD GitHub Actions | 5 |
| S7-04 | Tests E2E Playwright | 8 |
| S7-05 | Documentación usuario + capacitación | 5 |
| S7-06 | Monitoreo y alertas | 5 |

---

## Métricas de éxito

- Tiempo registro venta POS < 2 min
- Portal Lighthouse Performance > 90
- Uptime API > 99.5%
- 0 vulnerabilidades críticas en audit
- Adopción staff > 80% en 30 días post-launch

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Supabase RLS mal configurado | Advisors + tests integración |
| Scope creep electrodomésticos | Módulo categorías extensible, no hardcode |
| Flutter no instalado en dev | CI build automático |
| Migración datos legacy | Script import CSV Sprint 2 |
