# Marketing del sitio web dentro del super-admin

El super-admin ahora tiene dos espacios de trabajo. Al entrar con correo y contraseña llega a
**/super-admin (Inicio)** y elige:

| Espacio | Qué incluye | Rutas |
|---|---|---|
| **Marketing y sitio web** | Visitas de zensya.cl, páginas más vistas, tests A/B, landings de campaña con video (VSL), links con UTM y pixeles de Meta/Google | `/super-admin/marketing/*` |
| **Clínicas** | Todo lo que ya existía: Overview, clínicas, usuarios, roles, módulos, trials y recursos | `/super-admin/resumen` (Overview) y el resto igual |

Todo se guarda en la **misma base Neon** de la plataforma, en 4 tablas nuevas que no tocan las existentes.

## Cómo funciona

```
zensya.cl (sitio, repo zensya-landing-page)            app.zensya.cl (este repo)                Neon
 ─ registra visitas, clics a WhatsApp, tests A/B  ──►  POST /api/marketing/eventos        ──►  MarketingEvent
 ─ pide pixeles y tests activos                   ──►  GET  /api/marketing/publico        ──►  MarketingConfig, MarketingExperiment
 ─ muestra landings /l/<slug>                     ──►  GET  /api/marketing/landing/<slug> ──►  MarketingLanding
                                                        /super-admin/marketing (panel)
                                                        /api/super-admin/marketing/*  (solo super-admin)
```

- Las rutas `/api/marketing/*` son públicas pero **solo de lectura limitada o de escritura**: no exponen eventos ni
  datos de clínicas. Aceptan llamadas solo desde `https://zensya.cl`, `https://www.zensya.cl` y localhost.
- Las rutas `/api/super-admin/marketing/*` exigen sesión de super-admin (`requireAuthSession` + `isSuperAdmin`).
- El sitio solo mide si el visitante acepta las cookies (configurable en el panel → Pixeles).

## Puesta en marcha

1. **Migración en Neon** (crea `MarketingConfig`, `MarketingExperiment`, `MarketingLanding` y `MarketingEvent`):

   ```bash
   # con DATABASE_URL apuntando a la URL directa (sin pooler) de Neon
   npx prisma migrate deploy
   ```

   La migración es `prisma/migrations/20261021120000_add_marketing`. Solo crea tablas nuevas.

2. **Variables de entorno opcionales** en Vercel (proyecto de la app):

   | Variable | Para qué | Por defecto |
   |---|---|---|
   | `NEXT_PUBLIC_SITE_URL` | Dirección del sitio para los links de vista previa y campañas | `https://zensya.cl` |
   | `MARKETING_ALLOWED_ORIGINS` | Otros orígenes que pueden enviar visitas (ej. previews de Vercel), separados por coma | — |

3. **En el sitio** (proyecto zensya-landing-page en Vercel): `VITE_MARKETING_API=https://app.zensya.cl` y volver a publicar.

## Archivos

| Archivo | Qué hace |
|---|---|
| `prisma/schema.prisma` (al final) | Modelos `Marketing*` |
| `src/server/marketing/sql.ts` | Consultas de estadísticas (resumen, resultados de tests, embudo de landings) |
| `src/server/marketing/datos.ts` | Lectura y escritura con Prisma |
| `src/server/marketing/mapeo.ts` | Validación (zod) y traducción entre la base y el formato del panel/sitio |
| `src/server/marketing/http.ts` | CORS para zensya.cl y control de super-admin |
| `src/app/api/marketing/*` | API pública para el sitio |
| `src/app/api/super-admin/marketing/*` | API del panel |
| `src/app/super-admin/page.tsx` | Inicio: elegir Marketing o Clínicas |
| `src/app/super-admin/resumen/page.tsx` | Overview de clínicas (antes estaba en `/super-admin`) |
| `src/app/super-admin/marketing/*` | Páginas del panel de marketing |
| `src/presentation/superadmin/marketing/*` | Componentes del panel (estilos acotados a `.mk` en `marketing.css`) |
| `src/presentation/superadmin/SuperAdminSidebar.tsx` | Menú con Inicio, grupo Clínicas y grupo Marketing |

## Tests A/B: elementos que se pueden cambiar

Están en `src/presentation/superadmin/marketing/ab-elementos.js` (copia de `src/lib/ab-elementos.js` del sitio).
Para sumar uno: en el sitio, agrega `data-ab="nombre"` al elemento y regístralo en los dos archivos.
También se puede escribir un selector CSS directo en el panel.
