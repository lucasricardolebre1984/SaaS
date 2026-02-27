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
2. Clone repo in host:
   - `git clone https://github.com/lucasricardolebre1984/SaaS.git /srv/SaaS`
3. Checkout branch:
   - `cd /srv/SaaS && git checkout main && git pull origin main`
4. Install dependencies:
   - `npm ci`

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
  }
}
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

## 7. Mandatory gates before and after deploy
Before deploy (local or server):
- `npm run deploy:aws:readiness`

Post-deploy checks:
- `curl -fsS https://dev.automaniaai.com/health`
- open `https://dev.automaniaai.com/owner/`
- open `https://dev.automaniaai.com/crm/`
- test one interaction + one CRM lead + one reminder + one charge

## 8. Operational constraints
- Do not share fabio2 infra state with SaaS matriz.
- Use dedicated Postgres DB/schema for this repo.
- Keep one deploy and separate customers by `tenant_id`.
- Keep institutional site (`www.automaniaai.com.br`) independent from SaaS runtime.
