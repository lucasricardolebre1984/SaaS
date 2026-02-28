#!/bin/bash
# Evolution API check on AWS dev — run on server (e.g. after ssh ubuntu@<IP>)
# Repo: https://github.com/lucasricardolebre1984/SaaS
# Usage: bash evolution-aws-check.sh   (from app root or set SAAS_ROOT)
# On Ubuntu: app at /srv/SaaS (repo SaaS), Evolution at /srv/evolution.

set -e
SAAS_ROOT="${SAAS_ROOT:-/srv/SaaS}"
cd "$SAAS_ROOT"

echo "=== 1. .env Evolution vars ==="
grep -E '^EVOLUTION_' .env 2>/dev/null || { echo "No .env or no EVOLUTION_*"; exit 1; }

echo ""
echo "=== 2. Load EVOLUTION_* (no echo) ==="
export $(grep -E '^EVOLUTION_' .env | xargs)

echo "=== 3. Evolution reachable? ==="
EVO_URL="${EVOLUTION_HTTP_BASE_URL%/}"
curl -sf -o /dev/null -w "%{http_code}" --connect-timeout 5 "$EVO_URL/" 2>/dev/null && echo " OK" || echo " FAIL (check EVOLUTION_HTTP_BASE_URL and Evolution process)"

echo "=== 4. Instance connect (QR/state) ==="
curl -sf -H "apikey: $EVOLUTION_API_KEY" "$EVO_URL/instance/connect/${EVOLUTION_INSTANCE_ID:-fabio}" 2>/dev/null | head -c 500
echo ""

echo "=== 5. If 404, create instance ==="
echo "Run manually if needed:"
echo "  curl -X POST \"$EVO_URL/instance/create\" -H \"apikey: \$EVOLUTION_API_KEY\" -H \"Content-Type: application/json\" -d '{\"instanceName\":\"${EVOLUTION_INSTANCE_ID:-fabio}\",\"qrcode\":true}'"
