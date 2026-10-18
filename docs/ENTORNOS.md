# Entornos: Development, Preview y Production

Objetivo: que nada de lo que se prueba toque datos reales.

## Mapa

| Entorno | Rama Git | Vercel | Base Neon (proyecto `zensya`) | Datos |
|---|---|---|---|---|
| Production | `main` | https://app.zensya.cl | Rama `production` | Reales |
| Preview | Cualquier rama o PR que no sea `main` | URL de cada despliegue | Rama `preview` | Inventados |
| Development | Tu computador (`npm run dev`) | `vercel env pull` | Rama `dev` | Inventados |

Ramas de Neon creadas el 18/10/2026 con `--schema-only` desde `production`, o sea que nunca recibieron datos reales:

| Rama | ID |
|---|---|
| `dev` | `br-dark-shape-ai3cdf0h` |
| `preview` | `br-calm-shape-aiqpmmfm` |
| `production` | `br-gentle-band-ai4krix9` |

Proyecto Neon: `hidden-wildflower-22365167`. Equipo y proyecto de Vercel: `testing-3d1db53e/zensya`.

## Datos de prueba

`dev` y `preview` se llenaron con `prisma/test-seed-current-month.sql`: 12 usuarios, 3 clinicas, 48 pacientes y 641 citas. Los usuarios `*.seed@medigest.test` comparten la clave definida en el encabezado de ese archivo. Es una clave conocida: **no uses estos entornos para nada real** y activa la proteccion de despliegues de Vercel para Preview.

## Variables por entorno

| Variable | Production | Preview | Development |
|---|---|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Rama `production` | Rama `preview` | Rama `dev` |
| `MONGO_DB_NAME` | Actual | `ZensyaCluster_preview` | `ZensyaCluster_dev` |
| `SESSION_SECRET` | Actual | Propio | Propio |
| `APP_PASSWORD_GMAIL`, `GMAIL_USER` | Actuales | No definidas (sin correos) | No definidas (sin correos) |
| `MONGODB_URI`, `CLOUDINARY_*` | Compartidas | Compartidas | Compartidas |
| `GEMINI_API_KEY` | **No definir** hasta tener plan de pago | Si | Si |

Nota: `MONGODB_URI` y Cloudinary siguen compartidos entre entornos. Mongo queda aislado por nombre de base; Cloudinary no, asi que las imagenes de pruebas viven en la misma cuenta.

En este proyecto `DATABASE_URL` usa el host directo de Neon y `DIRECT_URL` el host con `-pooler`. Las ramas siguen la misma convencion.

## Aplicar la configuracion en Vercel

Lo prepara el script `scripts/split-environments.sh` (no incluye ninguna clave). Prueba primero en simulacion:

```bash
DRY_RUN=1 bash scripts/split-environments.sh --local
```

Aplicar solo en Vercel:

```bash
bash scripts/split-environments.sh
```

Aplicar en Vercel y cambiar tu `.env` local a la rama `dev` (deja un respaldo ignorado por git):

```bash
bash scripts/split-environments.sh --local
```

El script lee las cadenas de conexion de `%TEMP%\neon-env`. Al terminar, borra esa carpeta. Si ya no existe, se regeneran con `neonctl connection-string dev --project-id hidden-wildflower-22365167 --database-name neondb --role-name neondb_owner --ssl require` (y `--pooled`).

Despues agrega la clave de Gemini solo donde corresponde:

```bash
vercel env add GEMINI_API_KEY preview
```

```bash
vercel env add GEMINI_API_KEY development
```

## Flujo de trabajo recomendado

1. Trabajas en una rama distinta de `main` (por ejemplo `dev`) y la subes: Vercel crea un Preview contra la rama de Neon `preview`.
2. Si hay migraciones nuevas, las aplicas primero a `dev` y `preview`:

```bash
npx prisma migrate deploy
```

   (con `DATABASE_URL` apuntando a la rama correcta).
3. Cuando todo esta bien, se mezcla a `main`. **Antes** de hacerlo, aplicas las migraciones a produccion.
4. Nunca ejecutes seeds ni scripts de prueba con la URL de produccion.

## Pendiente recomendado

- Activar proteccion de despliegues en Vercel para Preview.
- Proteger la rama `main` en GitHub (PR obligatorio y build en verde).
- Rotar `SESSION_SECRET` y credenciales de produccion si alguna vez se compartieron entre entornos.
- Separar Cloudinary y el cluster de Mongo por entorno.
