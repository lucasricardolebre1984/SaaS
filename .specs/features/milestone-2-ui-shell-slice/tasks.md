# Tasks - milestone-2-ui-shell-slice

Status: Completed
Date: 2026-02-23

## M2U-001 - Replace owner-console placeholder with runnable shell
- Status: completed
- Output:
  - real owner console page with module menu, chat area, continuous mode controls, and avatar panel
- Evidence:
  - `apps/owner-console/src/index.html`
  - `apps/owner-console/src/styles.css`
  - `apps/owner-console/src/app.js`

## M2U-002 - Replace crm-console placeholder with runnable shell
- Status: completed
- Output:
  - real CRM console page with pipeline board, lead list, and lead creation form
- Evidence:
  - `apps/crm-console/src/index.html`
  - `apps/crm-console/src/styles.css`
  - `apps/crm-console/src/app.js`

## M2U-003 - Add static serve/build toolchain and Nx targets
- Status: completed
- Output:
  - static server and build scripts
  - updated `project.json` targets for owner/crm apps
- Evidence:
  - `tools/serve-static-app.mjs`
  - `tools/build-static-app.mjs`
  - `apps/owner-console/project.json`
  - `apps/crm-console/project.json`

## M2U-004 - Validate and close governance checkpoint
- Status: completed
- Output:
  - build targets pass for both apps
  - update `STATE/worklog/costlog`
- Verification:
  - `npx nx run app-owner-console:build`
  - `npx nx run app-crm-console:build`
  - `npx nx run app-owner-console:serve` (HTTP check `200` on `http://127.0.0.1:4401`)
  - `npx nx run app-crm-console:serve` (HTTP check `200` on `http://127.0.0.1:4402`)

## M2U-005 - Add dual layout + palette engine for clone-ready SaaS branding
- Status: completed
- Output:
  - two layout modes (`fabio2`, `studio`) available in both consoles
  - three palette modes (`ocean`, `forest`, `sunset`)
  - local persistence and tenant preset hooks
- Evidence:
  - `apps/owner-console/src/index.html`
  - `apps/owner-console/src/styles.css`
  - `apps/owner-console/src/app.js`
  - `apps/crm-console/src/index.html`
  - `apps/crm-console/src/styles.css`
  - `apps/crm-console/src/app.js`
