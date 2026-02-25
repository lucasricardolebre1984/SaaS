# Design - milestone-3-ci-preprod-gate-slice

Status: Approved
Date: 2026-02-25

## Workflow Strategy
- Reusar `.github/workflows/runtime-ci.yml`.
- Substituir jobs separados por um job único:
  - `preprod-validate`
  - comando: `npm run preprod:validate`

## CI Artifact
- Upload de `tools/reports/preprod-validate-*.log` com:
  - `actions/upload-artifact@v4`
  - `if: always()` para preservar evidência mesmo em falha

## Risk Controls
1. Timeout explícito de job para evitar execução presa.
2. `fetch-depth: 1` para checkout rápido.
3. Sem alteração de gatilhos de branch.
