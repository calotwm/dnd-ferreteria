# DND Ferretería

Sistema de gestión para ferreterías (POS, inventario, fiados, gastos, estadísticas) como **PWA instalable**. Una sola aplicación Fastify sirve la SPA React, la API REST y Socket.io en un mismo origen.

**Stack**: Vite + React 18 + TypeScript + Tailwind v3.4 · Fastify 5 + Prisma 6 + PostgreSQL · JWT (access en memoria + refresh httpOnly) + RBAC · Socket.io · pnpm workspaces.

---

## Requisitos

- Node.js ≥ 20 y `pnpm` (≥ 9). Si falta pnpm: `corepack enable pnpm`
- PostgreSQL (local o Railway)

## Instalación

```bash
pnpm install
```

## Variables de entorno

Copiar `apps/api/.env.example` → `apps/api/.env` (y las variables para Railway):

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión Postgres |
| `JWT_SECRET` | Secreto del access token |
| `JWT_EXPIRES_IN` | Vida del access token (default `15m`) |
| `REFRESH_SECRET` | Secreto del refresh token |
| `REFRESH_EXPIRES_IN` | Vida del refresh (default `7d`) |
| `PORT` / `HOST` | Puerto/host del servidor |
| `R2_ACCOUNT_ID` · `R2_ACCESS_KEY_ID` · `R2_SECRET_ACCESS_KEY` · `R2_BUCKET_NAME` · `R2_PUBLIC_URL` | Cloudflare R2 (opcional — si faltan, las imágenes se guardan como BLOB en la DB) |
| `STATIC_DIR` | Directorio de la SPA compilada (default `apps/web/dist`) |

## Base de datos

```bash
pnpm db:generate        # genera el cliente Prisma
pnpm db:migrate         # aplica migraciones (deploy)
pnpm db:migrate:dev     # migración en desarrollo (crea migration.sql)
pnpm db:seed            # datos demo (admin@dnd.com / admin123)
```

## Desarrollo

```bash
pnpm dev          # levanta API (3000) y web (5173) en paralelo
pnpm dev:api      # solo API
pnpm dev:web      # solo web (con proxy al API)
```

## Build

```bash
pnpm build        # typecheck + build de shared, api y web
pnpm start        # sirve API + SPA compilada (un solo proceso)
```

## Tests

| Comando | Alcance |
|---|---|
| `pnpm test` | Unitarios + componente (Vitest). Reglas de dinero, matriz RBAC, descuento, stock bajo `<5`, validación de import Excel, carrito POS, tabla de inventario. |
| `pnpm --filter @dnd/api test` | Unitarios del servidor (totales, import). |
| `pnpm --filter @dnd/web test` | Unitarios + componente del front. |
| `pnpm test:e2e` | Playwright E2E (requiere API + DB en `localhost`). |

### Pruebas de integridad (integración/E2E)

Los flujos críticos (venta→stock atómico, oversell concurrente, fiado→abono, caja open/close) se verifican con **PostgreSQL real**. Levantar la DB, ejecutar `pnpm db:push && pnpm db:seed`, y luego `pnpm test:e2e`.

## Reglas de negocio clave

- **Dinero**: centavos enteros (`BIGINT`), serializado a JSON como *string* (transform en `@dnd/shared`). `formatMoney` para mostrar.
- **Stock bajo**: `< 5` unidades se muestra en **rojo** (umbral literal en `@dnd/shared`).
- **Venta→stock**: una sola `prisma.$transaction` con bloqueo de filas (`SELECT … FOR UPDATE`) — protección contra oversell; la venta se rechaza si falta stock.
- **Fiados**: principal + abonos únicamente (sin intereses).
- **Comprobantes**: no fiscales — impresión 80mm vía `window.print()` + compartir por WhatsApp (`wa.me` / Web Share API).
- **RBAC**: admin / manager / seller por módulo (matriz en `@dnd/shared`).

## Estructura

```
apps/web        # SPA React (Vite) + PWA
apps/api        # Fastify + Prisma + Socket.io
packages/shared # zod schemas + tipos + reglas (dinero, RBAC, stock bajo, totales)
design-references/  # prototipos Stitch (referencia visual)
```

## Deploy (Railway)

1. Push a GitHub (`calotwm/dnd-ferreteria`).
2. `railway link` → `railway up` (servicio único + plugin Postgres).
3. `railway variables set` con las variables de entorno de arriba.
4. Build automático: `pnpm install && pnpm build`. Start: `pnpm start`.
5. Checklist post-deploy: `migrate deploy` → `seed` → healthcheck `/health` → venta POS de prueba → verificación de instalación PWA.

Rollback: redeploy de una versión anterior en Railway.
