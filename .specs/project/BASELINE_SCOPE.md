# BASELINE SCOPE

Date: 2026-02-22

## Approved legacy import into fabio
- contratos/
  - templates/*.json
  - contract source assets (*.docx, *.pdf, logos)
  - extraction helper files related to contract content

## Explicitly excluded from import
- backend/
- frontend/
- operational runtime scripts from fabio2 root
- deployment artifacts tied to current production flow

## Rule
Any additional legacy import requires a dedicated feature spec and approval gate.
