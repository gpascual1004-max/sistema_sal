#!/bin/bash
# Copia Code.gs -> Código.js (nombre real del archivo en Apps Script) e index.html,
# y hace clasp push. Correr desde la carpeta del repo: bash gas_deploy/sync_and_push.sh
set -e
cd "$(dirname "$0")"
cp ../Code.gs "./Código.js"
cp ../index.html "./index.html"
clasp push "$@"
