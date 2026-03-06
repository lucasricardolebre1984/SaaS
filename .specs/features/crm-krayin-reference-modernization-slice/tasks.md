# Tasks - crm-krayin-reference-modernization-slice

Status: Approved
Date: 2026-03-01

## FOCO
Transformar o CRM em nivel enterprise via implementacao incremental no stack atual, usando Krayin como referencia de produto.

## T0) Benchmark visual e funcional (Krayin-like)
- Status: completed
- Consolidar benchmark em artefato unico:
  - features de leads/pipeline/activities,
  - padrao de shell CRM enterprise,
  - componentes obrigatorios de tela.
- Aceite: checklist de paridade aprovado pelo owner (sem copia literal de codigo).
- Evidencia:
  - clone de referencia atualizado (`git pull`) em `C:\Users\Lucas\AppData\Local\Temp\krayin-laravel-crm-cde876cf`;
  - dependencias instaladas para inspeção real (`npm install` + `composer install --ignore-platform-reqs` via Docker);
  - build front de referencia executado (`npm run build`).

## T1) Design system dark/green institucional (01..06)
- Status: in_progress
- Definir tokens, componentes base e estados visuais.
- Aplicar shell compartilhado em Owner + CRM.
- Aceite: prototipo navegavel com padrao unico dark/green em modulos 01..06.
- Evidencia parcial:
  - novo palette `darkgreen` aplicado em Owner e CRM;
  - defaults de tenant/layout ajustados para `studio + darkgreen`;
  - estilos `studio` migrados para acento baseado em `--color-primary` (removendo viés azul fixo);
  - builds verdes:
    - `npx nx run app-owner-console:build`
    - `npx nx run app-crm-console:build`.

## T2) Gap matrix Krayin x SaaS CRM
- Status: completed
- Entregar comparativo funcional:
  - disponivel no SaaS atual,
  - faltante critico,
  - opcional.
- Aceite: backlog priorizado por impacto e dependencia.
- Evidencia:
  - matriz publicada em `.specs/features/crm-krayin-reference-modernization-slice/gap-matrix.md`;
  - fontes auditadas:
    - Krayin routes no clone local (`packages/Webkul/*/Routes/*`);
    - endpoint map oficial do SaaS (`docs/PLANTA-ENDPOINTS-SAAS.md`);
    - runtime/API real (`apps/platform-api/src/app.mjs`) e UI CRM (`apps/crm-console/src/app.js`).

## T3) Contracts (deals/accounts/contacts/activities/tasks/views)
- Status: completed
- Criar schemas JSON + exemplos validos.
- Atualizar checks de contratos.
- Aceite: `contract-tests:contract-checks` verde.
- Evidencia:
  - novos schemas em `libs/mod-02-whatsapp-crm/contracts/`:
    - `account-{create,list,update}.schema.json`
    - `contact-{create,list,update}.schema.json`
    - `deal-{create,list,update}.schema.json`
    - `activity-{create,list}.schema.json`
    - `task-{create,list}.schema.json`
    - `view-{create,list}.schema.json`
  - exemplos validos:
    - `libs/mod-02-whatsapp-crm/contracts/crm-core-contract-examples.json`
  - gate verde:
    - `npx nx run contract-tests:contract-checks`

## T4) Data model migrations
- Status: completed
- Criar tabelas novas de CRM core com indices por tenant e timeline.
- Aceite: smoke Postgres para CRUD basico de deal + activity + task.
- Evidencia:
  - migracoes adicionadas em `apps/platform-api/sql/orchestration-postgres.sql`:
    - `crm_accounts`
    - `crm_contacts`
    - `crm_deals`
    - `crm_activities`
    - `crm_tasks`
    - `crm_views`
  - mapa de dados atualizado:
    - `libs/core/data-model/table-map.json`
  - smoke Postgres atualizado e validado com CRUD real (`create/read/update/delete`) em `deals/activities/tasks`:
    - `tools/smoke-postgres-orchestration.ps1`
    - comando executado: `powershell -ExecutionPolicy Bypass -File tools/smoke-postgres-orchestration.ps1`
    - resultado: `Postgres smoke passed` com contagem `crm_deals=1`, `crm_activities=1`, `crm_tasks=1`.

## T5) Backend APIs (MVP enterprise)
- Status: completed
- Implementar endpoints de deals/contacts/activities/tasks/views.
- Integrar com eventos auditaveis.
- Aceite: testes de API cobrindo fluxo deal->activity->stage update.
- Evidencia:
  - novos endpoints em `apps/platform-api/src/app.mjs`:
    - `POST/PATCH/GET /v1/crm/accounts`
    - `POST/PATCH/GET /v1/crm/contacts`
    - `POST/PATCH/GET /v1/crm/deals`
    - `POST/GET /v1/crm/activities`
    - `POST/GET /v1/crm/tasks`
    - `POST/GET /v1/crm/views`
  - store core multi-backend adicionado:
    - `apps/platform-api/src/crm-core-store.mjs`
    - `apps/platform-api/src/crm-core-store-file.mjs`
    - `apps/platform-api/src/crm-core-store-postgres.mjs`
  - eventos auditaveis CRM core adicionados em `libs/core/orchestration-contracts/schemas/events.schema.json`:
    - `crm.account.{created,updated}`
    - `crm.contact.{created,updated}`
    - `crm.deal.{created,updated,stage.changed}`
    - `crm.activity.created`
    - `crm.task.created`
    - `crm.view.created`
  - teste de fluxo T5 adicionado em `apps/platform-api/src/app.test.mjs`:
    - `T5 CRM core APIs support deal -> activity -> stage update flow with audit trace`
  - gates verdes:
    - `npx nx run app-platform-api:test` (`63/63` pass)
    - `npx nx run contract-tests:contract-checks`
    - `npm run preprod:validate -- -SkipSmokePostgres -SkipOperationalDrills`

## T6) CRM UI - Inbox + Pipeline + Detail panel
- Status: in_progress
- Evoluir `app-crm-console` para layout 3 paineis e view kanban.
- Aceite: usuario consegue navegar inbox, abrir deal e mover stage sem reload manual; visual dark/green aplicado.
- Evidencia parcial:
  - abas `Inbox/Pipeline/Leads` adicionadas;
  - `Pipeline Kanban` renderizado a partir de `leadsCache`;
  - `Detail panel` com dados do lead e timeline recente de mensagens no inbox.
  - toolbar v2 de CRM com filtros (`buscar`, `stage`, `canal`) e agrupamento do pipeline (`stage`/`channel`);
  - cards de atividade enriquecidos com badges de direcao e delivery;
  - command bar e board-tabs estilo CRM enterprise para aproximar fidelidade Krayin-like;
  - barras graficas dinamicas (stage/canal) no painel lateral;
  - views salvas de filtro (`save/apply/delete`) por tenant;
  - kanban com drag-and-drop para update de stage (quando agrupado por stage);
  - tarefas de follow-up por lead no painel de detalhe (persistidas por tenant);
  - builds verdes apos v2:
    - `npx nx run app-crm-console:build`
    - `npx nx run app-owner-console:build`.

## T7) Module 06 runtime controls
- Status: pending
- Configuracoes por tenant:
  - stages/pipeline,
  - regras de automacao,
  - toggles IA persona 2.
- Aceite: alteracao em menu 06 reflete no comportamento do CRM.

## T8) Validation and UAT
- Status: pending
- Gates:
  - `npx nx run app-platform-api:test`
  - `npx nx run app-crm-console:build`
  - `npx nx run app-owner-console:build`
  - `npx nx run contract-tests:contract-checks`
- UAT com WhatsApp real:
  - inbound -> deal update -> resposta -> qualificacao.

## T9) Deploy and rollback plan
- Status: pending
- Deploy incremental em dev AWS.
- Runbook de rollback por fase.
- Aceite: cada fase com evidencias em STATE/worklog/costlog.
