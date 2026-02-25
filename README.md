# fabio

SaaS base institucional da Automania AI (Nx monorepo).

## Status Atual
- Milestone atual: `Milestone 4 - Next Cycle Definition (in progress)`
- Slice ativo: `milestone-4-mod-01-confirmation-workflow-slice` (concluído)
- Checkpoints recentes:
  - `feat(mod-01): enforce tool execution policy for task dispatch decisions`
  - `feat(mod-01): add explicit confirmation workflow endpoint for confirm_required`

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

Novo endpoint de confirmacao explicita:
- `POST /v1/owner-concierge/interaction-confirmations`
- uso: resolver `confirmation_id` pendente com `decision=approve|reject` (criado no retorno de `/v1/owner-concierge/interaction` quando a policy retorna `confirm_required`).

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
