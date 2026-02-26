# Research - AWS + Ubuntu Deploy Baseline (SaaS matriz)

Date: 2026-02-26 15:09:31 -03:00
Status: Approved recommendation for `dev.automaniaai.com`
Scope: SaaS `fabio` (Nx monorepo, single deploy multi-tenant)

## 1. Objective
Define the best practical baseline for AWS dev deployment with production-aligned architecture, low operational risk, and clear migration path to hml/prod.

## 2. Decision (closed)
- OS: **Ubuntu Server 24.04 LTS** on EC2.
- App runtime: `app-platform-api` (serving `/owner`, `/crm`, `/api`) via systemd on port `4001`.
- Reverse proxy: Nginx with TLS (Let's Encrypt).
- DB: AWS RDS PostgreSQL (dedicated DB/schema for `fabio`).
- WhatsApp provider: Evolution API server-side (not local desktop).
- Tenant model: one deploy, many tenants (`tenant_id`).

## 3. Why Ubuntu 24.04 LTS (vs Debian for this phase)
1. Faster operational onboarding for this team context (Ubuntu-centric runbooks and package ecosystem).
2. Strong long-term support cycle (LTS) with predictable maintenance windows.
3. Broad compatibility with Node/Nginx/Certbot guides and automation patterns used in this repo.
4. Lower friction for first AWS bootstrap while keeping migration to Debian possible later if needed.

## 4. Production-like topology (dev)
1. EC2 Ubuntu 24.04 LTS
   - inbound: 22 (restricted), 80/443 (public)
   - app bound to localhost `127.0.0.1:4001`
2. RDS PostgreSQL (private subnet preferred)
   - security group allows only EC2 SG on 5432
3. Nginx
   - `dev.automaniaai.com` -> `http://127.0.0.1:4001`
4. TLS
   - certbot + auto-renew

## 5. Execution checklist (recommended order)
1. Provision EC2 (Ubuntu 24.04 LTS) and RDS PostgreSQL.
2. Configure Security Groups:
   - EC2: 80/443 public, 22 only from admin IP.
   - RDS: 5432 only from EC2 SG.
3. Point DNS in Hostinger:
   - `A dev.automaniaai.com -> EC2_PUBLIC_IP`.
4. Deploy code in `/srv/fabio` and configure `.env` from `.env.aws.example`.
5. Set `ORCHESTRATION_STORE_BACKEND=postgres` and valid `ORCHESTRATION_PG_DSN`.
6. Configure Nginx reverse proxy + certbot TLS.
7. Start service by systemd (`npm run serve:saas`).
8. Run gate:
   - `npm run deploy:aws:readiness`
9. Validate:
   - `https://dev.automaniaai.com/health`
   - `/owner/`, `/crm/`, and one full tenant flow.

## 6. Critical controls
- Never share infra state with `fabio2`.
- Keep secrets in server env (no browser/local-only for production behavior).
- Enforce branch protection + gate before deploy.
- Keep report artifacts in `tools/reports/`.

## 7. Official references (with diagrams/screens where applicable)
- AWS EC2 user guide:
  - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EC2_GetStarted.html
- Ubuntu on AWS:
  - https://documentation.ubuntu.com/aws/aws-how-to/instances/find-ubuntu-images/
- AWS RDS getting started:
  - https://docs.aws.amazon.com/AmazonRDS/latest/gettingstartedguide/Welcome.html
- AWS RDS PostgreSQL user guide:
  - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html
- AWS security groups:
  - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html
- Nginx reverse proxy:
  - https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/
- Certbot instructions:
  - https://certbot.eff.org/instructions
- Ubuntu server docs:
  - https://documentation.ubuntu.com/server/

## 8. Next action
Proceed with EC2 + RDS creation and run `deploy:aws:readiness` again after DNS resolves `dev.automaniaai.com`.
