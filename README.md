# fabio

SaaS base institucional da Automania AI (Nx monorepo).

## Status Atual
- Milestone atual: `Milestone 4 - Next Cycle Definition (in progress)`
- Slice ativo: `milestone-4-owner-console-approval-queue-ui-slice` (concluído)
- Checkpoints recentes:
  - `feat(mod-01): add confirmation queue safeguards and listing endpoint`
  - `feat(owner-console): add approvals queue UI with approve/reject actions`

## Arquitetura Padrão (fixa)
1. `mod-01-owner-concierge` (chat IA + avatar + memória/contexto)
2. `mod-02-whatsapp-crm`
3. `mod-03-clientes`
4. `mod-04-agenda`
5. `mod-05-faturamento-cobranca`
6. `mod-06-configuracoes` (acesso admin; APIs, integrações, custos e prompts Persona 1/2)

Observacao modulo 06:
- configuracoes OpenAI/persona agora sincronizam com backend por tenant (nao local-only).
- endpoints:
  - `POST /v1/owner-concierge/runtime-config`
  - `GET /v1/owner-concierge/runtime-config?tenant_id=<id>`

Observacao modulo 02:
- no Owner Console, o item `02 CRM WhatsApp` agora abre o CRM embutido (sem placeholder), sincronizado com tenant/api/layout/paleta atuais.

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
Subir o SaaS completo unificado (recomendado: API + Owner + CRM no mesmo endpoint):
```powershell
npm run serve:saas
```

Endpoint unico:
- `http://127.0.0.1:4001/owner/` (Owner Console)
- `http://127.0.0.1:4001/crm/` (CRM Console)
- `http://127.0.0.1:4001/api/*` (API)

Modo split (legado, 3 portas/processos):
```powershell
npm run serve:split
```

Endpoints:
- `http://127.0.0.1:4300` (API)
- `http://127.0.0.1:4401` (Owner Console)
- `http://127.0.0.1:4402` (CRM Console)

Parar tudo: `Ctrl + C`.

Checks individuais:
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

Fila operacional de confirmacoes:
- `GET /v1/owner-concierge/interaction-confirmations?tenant_id=<id>&status=pending&limit=50`
- safeguards ativos:
  - limite de pendentes por tenant (`OWNER_CONFIRMATION_MAX_PENDING_PER_TENANT`, default `20`)
  - TTL de confirmacao (`OWNER_CONFIRMATION_TTL_SECONDS`, default `900`)
- no Owner Console (modulo 01), o painel `Fila de Aprovacoes` permite listar e executar `Aprovar/Rejeitar` direto no chat.

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
