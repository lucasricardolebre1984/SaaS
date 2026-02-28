# AWS Deploy Dev Runbook (SaaS matriz)

Date: 2026-02-26
Status: Baseline approved for dev environment
Scope: `dev.automaniaai.com` (environment dev), single deploy multi-tenant

## 1. Target architecture
- App runtime: `app-platform-api` on AWS EC2 Ubuntu, port `4001`.
- Reverse proxy: Nginx (TLS) exposing `https://dev.automaniaai.com`.
- Database: AWS RDS PostgreSQL (`ORCHESTRATION_STORE_BACKEND=postgres`).
- WhatsApp provider: Evolution API server-side (container/host), integrated by tenant.
- Tenant model: one deploy, many tenants (`tenant_id`).

## 2. DNS (Hostinger)
1. Create/confirm `A` record:
   - host: `dev`
   - value: `<EC2_PUBLIC_IP>`
2. TTL: 300s during cutover.
3. Validate from local terminal:
   - `Resolve-DnsName dev.automaniaai.com`

## 3. EC2 bootstrap
1. Install runtime dependencies:
   - git
   - node 20+
   - npm
   - nginx
2. Clone repo in host (repo oficial: https://github.com/lucasricardolebre1984/SaaS):
   - `git clone https://github.com/lucasricardolebre1984/SaaS.git /srv/SaaS`
   - **Nota:** No Ubuntu em uso, o app está em `/srv/SaaS` e a Evolution API em `/srv/evolution`. Para novos deploys, seguir o path do clone acima; para comandos no servidor existente, usar `cd /srv/SaaS`.
- **Evolution no servidor:** docker-compose em `/srv/evolution` deve usar a imagem **evoapicloud/evolution-api:v2.3.5** (retorna QR no endpoint connect; v2.1.1 tem bug) e expor a API em `0.0.0.0:8080`. O `.env` do app em `/srv/SaaS` usa `EVOLUTION_HTTP_BASE_URL=http://127.0.0.1:8080` (mesmo host). No `.env` da **Evolution** (`/srv/evolution`): `SERVER_URL=https://dev.automaniaai.com.br/evolution-api` (URL pública para webhooks/links); **para o celular exibir "Evolution API" (ou nome do produto) na conexao:** `CONFIG_SESSION_PHONE_CLIENT=Evolution API` e `CONFIG_SESSION_PHONE_NAME=Evolution API` (ver RUNBOOK-EVOLUTION-WHATSAPP.md). Opcional: `CONFIG_SESSION_PHONE_VERSION=2.3000.1033703022` (compatibilidade WhatsApp). **Nginx:** `location /evolution-api/` com `proxy_pass http://127.0.0.1:8080/` (Evolution acessível em `https://dev.automaniaai.com.br/evolution-api/`). SSH: `ubuntu@ec2-54-233-196-148.sa-east-1.compute.amazonaws.com` (54.233.196.148).
3. Checkout branch e remote:
   - `cd /srv/SaaS && git remote set-url origin https://github.com/lucasricardolebre1984/SaaS.git` (se estiver apontando para fabio)
   - `cd /srv/SaaS && git checkout main && git pull origin main`
4. Install dependencies:
   - `npm ci`
5. (Opcional) SASS (CSS preprocessor) no servidor para compilacao SCSS:
   - `sudo npm install -g sass` — ja aplicado no Ubuntu dev; versao: `sass --version`. O projeto inclui `sass` em devDependencies para builds que usem SCSS.

## 4. Environment configuration
1. Create `/srv/SaaS/.env` from `.env.aws.example`.
2. Required baseline:
   - `ORCHESTRATION_STORE_BACKEND=postgres`
   - `ORCHESTRATION_PG_DSN=<RDS_DSN>`
   - `OPENAI_API_KEY=<secret>`
   - `EVOLUTION_HTTP_BASE_URL=<evolution_url>`
   - `EVOLUTION_API_KEY=<secret>`
   - `EVOLUTION_INSTANCE_ID=fabio`
   - `CORS_ALLOW_ORIGINS=https://dev.automaniaai.com,https://www.automaniaai.com.br,https://automaniaai.com.br`

## 5. Reverse proxy (Nginx)
Example server block:

```nginx
server {
  server_name dev.automaniaai.com;

  location / {
    proxy_pass http://127.0.0.1:4001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 30s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
  }
}
```

If you see **502 Bad Gateway** when calling `/v1/whatsapp/evolution/qr` or other API routes, ensure the block above includes the timeout directives and run `sudo nginx -t && sudo systemctl reload nginx`. On the same host, keep `EVOLUTION_HTTP_BASE_URL=http://127.0.0.1:8080` in `/srv/SaaS/.env`.
```

After enabling site:
- `sudo nginx -t`
- `sudo systemctl reload nginx`

TLS:
- certbot for `dev.automaniaai.com`.

## 6. App process management
Recommended: systemd service `saas.service`.

Minimal unit command:
- `ExecStart=/usr/bin/npm run serve:saas`
- `WorkingDirectory=/srv/SaaS`
- `EnvironmentFile=/srv/SaaS/.env`

Then:
- `sudo systemctl daemon-reload`
- `sudo systemctl enable saas.service`
- `sudo systemctl restart saas.service`
- `sudo systemctl status saas.service`

## 6.1 Deploy sequence (após git pull no servidor)
Na máquina Ubuntu, a partir de `/srv/SaaS`:
1. `git pull origin main`
2. `npm ci` (instalação completa; o serviço usa `nx` para `serve`, não usar `--omit=dev` se o unit chamar nx)
3. `sudo systemctl restart saas.service`
4. `sudo systemctl status saas.service` e `curl -sS http://127.0.0.1:4001/health`

## 7. Mandatory gates before and after deploy
Before deploy (local or server):
- `npm run deploy:aws:readiness`

Post-deploy checks:
- `curl -fsS https://dev.automaniaai.com/health`
- open `https://dev.automaniaai.com/owner/`
- open `https://dev.automaniaai.com/crm/`
- test one interaction + one CRM lead + one reminder + one charge

## 7.1 Verificar, backup e atualizar no Ubuntu (SSH)

Executar **no servidor** apos conectar por SSH (ex.: `ssh ubuntu@54.233.196.148`). O script faz: verificacao pre-update, backup de `.env` e `.runtime-data`, `git pull origin main`, `npm ci`, restart do servico, verificacao pos-update e exibe o checklist CRM.

1. Copiar o script para o servidor (se ainda nao estiver la):
   - O script esta em `tools/ubuntu-verify-backup-update.sh` no repo. Apos `git pull`, ele estara em `$SAAS_ROOT/tools/ubuntu-verify-backup-update.sh`.
2. No servidor, ir para a raiz do app: `cd /srv/SaaS`
3. Executar (backup + update): `bash tools/ubuntu-verify-backup-update.sh`
4. Opcionais: `--skip-backup` (nao fazer backup); `--skip-pull` (nao atualizar git/npm).
5. Backup fica em `/srv/backups/saas-YYYYMMDD-HHMMSS/` (`.env`, `.runtime-data`, `git-head.txt`).

### Checklist CRM (deixar perfeito e configurado)

| Onde | O que conferir |
|------|----------------|
| **App** (`/srv/SaaS/.env`) | `EVOLUTION_HTTP_BASE_URL=http://127.0.0.1:8080`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_ID=fabio`, `CORS_ALLOW_ORIGINS` com os dominios do front (ex.: `https://dev.automaniaai.com.br`) |
| **Evolution** (`/srv/evolution`) | `.env` com `SERVER_URL=https://dev.automaniaai.com.br/evolution-api` (webhook do SaaS). `CONFIG_SESSION_PHONE_CLIENT` e `CONFIG_SESSION_PHONE_NAME` para nome no celular. Imagem recomendada: `evoapicloud/evolution-api:v2.3.5`. |
| **Nginx** | `location /evolution-api/` proxy para `http://127.0.0.1:8080`; `location /` proxy para `http://127.0.0.1:4001`; timeouts 30s. |
| **URLs publicas** | `https://dev.automaniaai.com.br/api/health`, `/owner/`, `/crm/` retornando 200. No CRM: Gerar QR Code e escanear para vincular WhatsApp. |

Detalhes Evolution e QR: `apps/platform-api/RUNBOOK-EVOLUTION-WHATSAPP.md` e `tools/evolution-aws-check.sh`.

## 8. Operational constraints
- Do not share fabio2 infra state with SaaS matriz.
- Use dedicated Postgres DB/schema for this repo.
- Keep one deploy and separate customers by `tenant_id`.
- Keep institutional site (`www.automaniaai.com.br`) independent from SaaS runtime.
