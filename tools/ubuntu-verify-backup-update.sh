#!/bin/bash
# Ubuntu AWS dev: verificar, backup, atualizar e deixar CRM configurado.
# Executar NO SERVIDOR apos SSH. Uso: bash ubuntu-verify-backup-update.sh [--skip-backup] [--skip-pull]
# No servidor o path do repo e /srv/SaaS. Local: c:\projetos\fabio (clone).
# Repo: https://github.com/lucasricardolebre1984/SaaS
set -e
SAAS_ROOT="${SAAS_ROOT:-/srv/SaaS}"
BACKUP_ROOT="${BACKUP_ROOT:-/srv/backups}"
BRANCH="${BRANCH:-main}"
SERVICE_NAME="${SERVICE_NAME:-saas.service}"
TS=$(date -u +%Y%m%d-%H%M%S)
echo "=== $(date -u -Iseconds) Ubuntu verify/backup/update ==="
echo "SAAS_ROOT=$SAAS_ROOT  BRANCH=$BRANCH  SERVICE=$SERVICE_NAME"
echo ""
echo "=== 1. Verificacao pre-update ==="
cd "$SAAS_ROOT"
[ ! -f .env ] && { echo "ERRO: .env nao encontrado"; exit 1; }
echo ".env OK"
grep -qE '^EVOLUTION_HTTP_BASE_URL=' .env && echo "EVOLUTION_HTTP_BASE_URL presente" || true
grep -qE '^EVOLUTION_API_KEY=' .env && echo "EVOLUTION_API_KEY presente" || true
echo "Git: $(git rev-parse --short HEAD 2>/dev/null || echo n/a)"
systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null && echo "Servico ativo" || echo "Servico inativo"
curl -sf -o /dev/null -w "Health: %{http_code}\n" --connect-timeout 5 http://127.0.0.1:4001/api/health 2>/dev/null || echo "Health: falhou"
DO_BACKUP=true
[[ " $* " =~ " --skip-backup " ]] && DO_BACKUP=false
if $DO_BACKUP; then
  echo ""
  echo "=== 2. Backup ==="
  mkdir -p "$BACKUP_ROOT"
  BACKUP_DIR="$BACKUP_ROOT/saas-$TS"
  mkdir -p "$BACKUP_DIR"
  cp -a "$SAAS_ROOT/.env" "$BACKUP_DIR/.env" 2>/dev/null || true
  [ -d "$SAAS_ROOT/.runtime-data" ] && cp -a "$SAAS_ROOT/.runtime-data" "$BACKUP_DIR/" 2>/dev/null || true
  git -C "$SAAS_ROOT" rev-parse HEAD 2>/dev/null > "$BACKUP_DIR/git-head.txt" || true
  echo "$TS" > "$BACKUP_DIR/backup-ts.txt"
  echo "Backup em: $BACKUP_DIR"
else
  echo ""
  echo "=== 2. Backup (omitido) ==="
fi
DO_PULL=true
[[ " $* " =~ " --skip-pull " ]] && DO_PULL=false
if $DO_PULL; then
  echo ""
  echo "=== 3. Atualizacao ($BRANCH) ==="
  cd "$SAAS_ROOT"
  git fetch origin --prune
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
  npm ci
  echo "Commit: $(git rev-parse --short HEAD)"
else
  echo "=== 3. Atualizacao (omitido) ==="
fi
echo ""
echo "=== 4. Restart ==="
sudo systemctl daemon-reload
sudo systemctl restart "$SERVICE_NAME"
sleep 3
sudo systemctl is-active "$SERVICE_NAME" || exit 1
echo ""
echo "=== 5. Verificacao pos-update ==="
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -sf -o /dev/null --connect-timeout 3 http://127.0.0.1:4001/api/health 2>/dev/null && { echo "Health: 200 OK"; break; }
  [ $i -eq 10 ] && { echo "Health falhou"; exit 1; }
  sleep 2
done
echo ""
echo "=== 6. Checklist CRM ==="
echo "App .env: EVOLUTION_HTTP_BASE_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_ID, CORS_ALLOW_ORIGINS"
echo "Evolution /srv/evolution: SERVER_URL=https://dev.automaniaai.com.br/evolution-api"
echo "Nginx: /evolution-api/ -> 127.0.0.1:8080; / -> 127.0.0.1:4001; timeouts 30s"
echo "URLs: https://dev.automaniaai.com.br/api/health  /owner/  /crm/"
echo "=== Fim $(date -u -Iseconds) ==="
