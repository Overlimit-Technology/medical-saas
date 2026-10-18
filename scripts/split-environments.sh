#!/usr/bin/env bash
# Separa los entornos de Vercel de produccion.
#
# Que hace (en este orden):
#   1. Deja DATABASE_URL, DIRECT_URL, MONGO_DB_NAME, SESSION_SECRET, APP_PASSWORD_GMAIL y
#      GMAIL_USER como variables SOLO de Production (no cambia sus valores).
#   2. Crea las variables de Preview y Development apuntando a las ramas de Neon `preview` y `dev`,
#      con una base de Mongo distinta y un SESSION_SECRET nuevo. El correo queda sin configurar
#      en esos entornos, asi que no envian correos reales.
#   3. Con --local reescribe DATABASE_URL y DIRECT_URL de tu .env para usar la rama `dev`.
#
# Uso:
#   DRY_RUN=1 bash scripts/split-environments.sh        # solo muestra lo que haria
#   bash scripts/split-environments.sh                  # aplica en Vercel
#   bash scripts/split-environments.sh --local          # ademas cambia tu .env local
#
# Requisitos: sesion iniciada en `vercel` y las cadenas de conexion de las ramas en $TEMP/neon-env
# (dev.direct, dev.pooled, preview.direct, preview.pooled). Borra esa carpeta al terminar.

set -euo pipefail

TEAM="testing-3d1db53e"
PROJECT="zensya"
DIR="${TEMP:-/tmp}/neon-env"
DRY="${DRY_RUN:-0}"
LOCAL=0
[ "${1:-}" = "--local" ] && LOCAL=1

# IDs de las variables actuales (se obtienen con: vercel api "/v10/projects/zensya/env?teamId=...")
declare -A IDS=(
  [DATABASE_URL]="TTRUcSmH7GrBm97Q"
  [DIRECT_URL]="ipYGfuju3BhiAObA"
  [MONGO_DB_NAME]="9ZfRnkJbNUUsPmq6"
  [SESSION_SECRET]="QGkVm1i6C3qt00HR"
  [APP_PASSWORD_GMAIL]="D34L24fo8n0IKRSY"
  [GMAIL_USER]="NQehm2YANNsAUpac"
)

for f in dev.direct dev.pooled preview.direct preview.pooled; do
  [ -s "$DIR/$f" ] || { echo "Falta $DIR/$f"; exit 1; }
done

# Seguridad: ninguna cadena de las ramas puede apuntar al host de produccion.
PROD_HOST="ep-damp-wave-ai2eiplt"
if grep -q "$PROD_HOST" "$DIR"/*.direct "$DIR"/*.pooled; then
  echo "ABORTO: una cadena de rama apunta a produccion."; exit 1
fi

TMP_JSON="$(mktemp)"
trap 'rm -f "$TMP_JSON"' EXIT

api() { # api METODO RUTA  (cuerpo en $TMP_JSON)
  if [ "$DRY" = "1" ]; then echo "  [simulacion] $1 $2"; return 0; fi
  vercel api -X "$1" "$2" --input "$TMP_JSON" >/dev/null
}

echo "== 1/3 Variables sensibles: solo Production"
for key in "${!IDS[@]}"; do
  printf '{"target":["production"]}' > "$TMP_JSON"
  echo "  $key -> production"
  api PATCH "/v9/projects/$PROJECT/env/${IDS[$key]}?teamId=$TEAM"
done

add_env() { # add_env CLAVE VALOR ENTORNO
  python - "$1" "$2" "$3" "$TMP_JSON" <<'PY'
import json, sys
key, value, target, out = sys.argv[1:5]
open(out, "w", encoding="utf-8").write(json.dumps({"key": key, "value": value, "type": "encrypted", "target": [target]}))
PY
  echo "  $1 -> $3"
  api POST "/v10/projects/$PROJECT/env?teamId=$TEAM"
}

new_secret() { python -c "import secrets; print(secrets.token_urlsafe(48))"; }

echo "== 2/3 Variables de Preview y Development"
add_env DATABASE_URL "$(cat "$DIR/preview.direct")" preview
add_env DIRECT_URL   "$(cat "$DIR/preview.pooled")" preview
add_env MONGO_DB_NAME "ZensyaCluster_preview" preview
add_env SESSION_SECRET "$(new_secret)" preview

add_env DATABASE_URL "$(cat "$DIR/dev.direct")" development
add_env DIRECT_URL   "$(cat "$DIR/dev.pooled")" development
add_env MONGO_DB_NAME "ZensyaCluster_dev" development
add_env SESSION_SECRET "$(new_secret)" development

if [ "$LOCAL" = "1" ]; then
  echo "== 3/3 .env local -> rama dev"
  if [ "$DRY" = "1" ]; then
    echo "  [simulacion] respaldo en .env.antes-de-dev.local y reescritura de DATABASE_URL y DIRECT_URL"
  else
    cp .env .env.antes-de-dev.local
    python - "$DIR" <<'PY'
import re, sys
d = sys.argv[1]
direct = open(f"{d}/dev.direct").read().strip()
pooled = open(f"{d}/dev.pooled").read().strip()
text = open(".env", encoding="utf-8").read()
text = re.sub(r'(?m)^DATABASE_URL=.*$', f'DATABASE_URL="{direct}"', text)
text = re.sub(r'(?m)^DIRECT_URL=.*$', f'DIRECT_URL="{pooled}"', text)
open(".env", "w", encoding="utf-8", newline="\n").write(text)
PY
    echo "  Listo. Respaldo en .env.antes-de-dev.local (contiene la URL de produccion: no lo subas a git)."
  fi
else
  echo "== 3/3 .env local: sin cambios (usa --local para cambiarlo)"
fi

echo
echo "Hecho. Verifica con: vercel env ls"
echo "Falta agregar GEMINI_API_KEY solo en preview y development (ver docs/ENTORNOS.md)."
