# Portas de qualidade (Gates)

**Ultima atualizacao:** 2026-02-26

## Gates obrigatorios

1. **Ambiente:** `npm install` sem erros.
2. **Contratos:** `npx nx run contract-tests:contract-checks` em verde.
3. **Testes:** `npx nx run app-platform-api:test` (e demais criticos) em verde.
4. **Specs:** spec.md, design.md, tasks.md aprovados antes de Implement.

## Pre-prod

- `npm run preprod:validate`

Ref: QUALITY_GATES.md, README.md.
