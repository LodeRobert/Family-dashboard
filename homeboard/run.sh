#!/bin/sh
set -e

mkdir -p /data /data/avatars

if [ -f /data/options.json ]; then
  echo "[HomeBoard Add-on] /data/options.json gevonden, Home Assistant Supervisor integratie actief."
fi

cd /app
exec ./node_modules/.bin/tsx server.ts
