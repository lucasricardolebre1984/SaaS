# Spec - milestone-2-ui-shell-slice

Status: Approved
Date: 2026-02-23

## Objective
Start Milestone 2 by delivering a real visual SaaS shell for Module 01 (Owner Console) and Module 02 (CRM Console), replacing placeholder apps.

## Scope
- Convert `owner-console` and `crm-console` from placeholder to runnable static web apps.
- Establish first design token baseline (palette + typography + spacing variables).
- Provide minimal API connectivity from UI to existing runtime endpoints.
- Keep shell neutral and reusable across future SaaS products.
- Provide two layout profiles:
  - `fabio2`: baseline visual parity with legacy dashboard shell
  - `studio`: premium AI-first layout for modern SaaS positioning

## Functional Requirements
1. Owner console must include:
   - fixed module menu (1..5)
   - chat area with message composer
   - continuous mode toggle
   - avatar panel using existing local assets
2. CRM console must include:
   - pipeline overview sections
   - lead listing by tenant
   - lead creation form wired to runtime API
3. Both consoles must allow configurable API base URL.
4. Nx targets must run real `serve` and `build` commands (not `echo` placeholders).
5. Both consoles must allow runtime switching of:
   - layout profile (`fabio2` | `studio`)
   - palette profile (`ocean` | `forest` | `sunset`)
6. Visual mode selection must persist locally and allow tenant preset application.

## Non-Functional Requirements
- Desktop and mobile-friendly layout.
- Avoid hardcoded tenant persona behavior in core shell.
- Keep implementation dependency-light.
- Keep design token model simple for clone/rebrand in new SaaS projects.

## Out Of Scope
- Full production design system package.
- Authentication and RBAC screens.
- Full module 3/4/5 UI pages.

## Acceptance Criteria
- `app-owner-console:serve` and `app-crm-console:serve` run local static apps.
- `app-owner-console:build` and `app-crm-console:build` produce distributable artifacts.
- UI shells are visually coherent and interactive with API endpoints.
- `layout=fabio2` reproduces canonical sidebar/topbar SaaS shell.
- `layout=studio` provides a clearly more premium modern visual mode.
- Palette swap does not require code changes outside token values.
