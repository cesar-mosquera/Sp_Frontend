#!/usr/bin/env bash
# Actualiza en un solo paso todas las ocurrencias del origen del backend
# (protocolo + host + puerto) dentro de vercel.json.
#
# vercel.json es JSON estatico: Vercel no soporta interpolar variables de
# entorno dentro de sus reglas de "rewrites", asi que el origen del backend
# tiene que existir ahi literalmente. Este script es la "fuente unica de
# verdad" para actualizarlo sin tener que buscar manualmente cada linea.
#
# Uso:
#   ./scripts/update-backend-origin.sh https://3.19.5.169.sslip.io https://api.tudominio.com
#
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Uso: $0 <origen-actual> <origen-nuevo>" >&2
  echo "Ejemplo: $0 https://3.19.5.169.sslip.io https://api.tudominio.com" >&2
  exit 1
fi

OLD_ORIGIN="$1"
NEW_ORIGIN="$2"
VERCEL_JSON="$(dirname "$0")/../vercel.json"

if [ ! -f "$VERCEL_JSON" ]; then
  echo "No se encontro vercel.json en $VERCEL_JSON" >&2
  exit 1
fi

COUNT_BEFORE=$(grep -o "$OLD_ORIGIN" "$VERCEL_JSON" | wc -l | tr -d ' ')

if [ "$COUNT_BEFORE" -eq 0 ]; then
  echo "No se encontro ninguna ocurrencia de '$OLD_ORIGIN' en vercel.json." >&2
  echo "Verifica que el origen actual sea exactamente el que aparece ahi." >&2
  exit 1
fi

sed -i.bak "s#${OLD_ORIGIN}#${NEW_ORIGIN}#g" "$VERCEL_JSON"
rm -f "${VERCEL_JSON}.bak"

COUNT_AFTER=$(grep -o "$NEW_ORIGIN" "$VERCEL_JSON" | wc -l | tr -d ' ')

echo "Reemplazadas $COUNT_BEFORE ocurrencias de '$OLD_ORIGIN' por '$NEW_ORIGIN' en vercel.json."
echo "Verificacion: $COUNT_AFTER ocurrencias del nuevo origen encontradas."

if [ "$COUNT_AFTER" -ne "$COUNT_BEFORE" ]; then
  echo "ADVERTENCIA: el numero de ocurrencias no coincide, revisa vercel.json manualmente." >&2
  exit 1
fi

echo ""
echo "Siguiente paso: hacer commit de vercel.json y desplegar (git push)."
echo "Vercel aplicara las nuevas reglas de proxy en el proximo deploy."
