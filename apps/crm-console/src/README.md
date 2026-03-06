# app-crm-console

Module 02 visual shell for CRM WhatsApp operations.

## Current scope

- KPI cards by lead stage
- Lead listing (`GET /v1/crm/leads`)
- Lead creation form (`POST /v1/crm/leads`)
- Tenant and API URL controls
- Dual layout engine:
  - `fabio2`: canonical dashboard shell
  - `studio`: premium AI-first shell
- Palette presets:
  - `ocean`, `forest`, `sunset`
- Tenant theme map:
  - configured in `app.js` (`TENANT_THEME_PRESETS`)

This shell is neutral and intended as baseline for future SaaS clones.
