# app-crm-console

Module 02 visual shell for CRM WhatsApp operations.

## Current scope

- KPI cards by lead stage
- Lead listing (`GET /v1/crm/leads`)
- Lead creation form (`POST /v1/crm/leads`)
- Tenant and API URL controls
- Triple layout engine:
  - `layout1`: institutional premium shell
  - `layout2`: flagship neural shell
  - `layout3`: executive light shell
- Palette presets:
  - `palette1`, `palette2`, `palette3`, `palette4`
- Tenant theme map:
  - configured in `app.js` (`TENANT_THEME_PRESETS`)

This shell is neutral and intended as baseline for future SaaS clones.
