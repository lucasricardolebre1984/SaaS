# fabio

SaaS base institucional da Automania AI (Nx monorepo).

## Status Atual
- Milestone atual: `Milestone 3 - Production Readiness (execution)`
- Slice ativo: `milestone-3-release-rollback-drill-slice` (concluído)
- Checkpoints recentes:
  - `fix(m3): apply branch protection and resolve automation payload issue` (`1c57e7f`)
  - `fix(ci): make preprod scripts pwsh-compatible for Linux runners` (`d311990`)

## Arquitetura Padrão (fixa)
1. `mod-01-owner-concierge` (chat IA + avatar + memória/contexto)
2. `mod-02-whatsapp-crm`
3. `mod-03-clientes`
4. `mod-04-agenda`
5. `mod-05-faturamento-cobranca`
6. `mod-06-configuracoes` (acesso admin; APIs, integrações, custos e prompts Persona 1/2)

## Fluxo Diário (obrigatório)
```powershell
cd C:\projetos\fabio
npm run init:day
```

Retomar sessão:
```powershell
npm run resume:day
```

Encerrar sessão:
```powershell
npm run end:day
```

## Validar o SaaS local
```powershell
npx nx run app-platform-api:test
npx nx run contract-tests:contract-checks
npx nx run app-owner-console:build
```

Smoke completo com Postgres:
```powershell
npm run smoke:postgres
```

Gate único de pré-produção (orquestra todos os checks):
```powershell
npm run preprod:validate
```

Drills operacionais:
```powershell
npm run release:dry-run
npm run rollback:drill
```

CI:
- workflow `runtime-ci` executa `npm run preprod:validate` em `push/pull_request` para `main`
- relatório disponível como artifact (`preprod-validate-report`)

Proteção de branch (`main`):
- automação disponível: `npm run github:protect-main`
- estado atual: aplicado
- detalhe: `.specs/project/GITHUB-BRANCH-PROTECTION.md`

Nota de isolamento: o smoke deste repositório usa stack Docker `fabio-postgres-smoke` e porta host `55432`, sem conflito com `fabio2` (`5432`).

## Gerar novo SaaS (starter)
```powershell
npm run generate:saas-starter -- --saas-name "Meu SaaS" --tenant-id "tenant_meu_saas" --layout-default studio --palette-default ocean
```

Manual operacional:
- `docs/SAAS-STANDARD-MANUAL.md`
