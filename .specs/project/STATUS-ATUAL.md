# Status Atual — Fabio SaaS (Modelo Universal)

**Documento:** STATUS-ATUAL  
**Ultima atualizacao:** 2026-03-06 (G2 fechado localmente com build executavel da API; G6 e G4 ja publicados em dev AWS)  
**Objetivo:** Snapshot rastreavel do estado do repositorio, modelo de aprendizado continuo e conformidade com specs.

---

## 1. Visao do modelo universal

Este repositorio e a **base institucional** para gerar novos SaaS. Cada proprietario de SaaS que usar o sistema deve poder conduzir o produto e a IA deve **evoluir com o uso** (aprendizado continuo por tenant). Tudo deve ser **rastreavel e auditavel** (data/hora em decisoes, eventos e logs).

---

## 2. Rastreabilidade e auditoria (ja definido)

- **Envelopes de orquestracao:** todos os comandos e eventos possuem `correlation_id`, `trace_id`, `tenant_id`, `created_at`/`emitted_at`.
- **Contratos:** JSON Schema em `libs/core/orchestration-contracts` e modulos; validados em CI (`contract-checks`).
- **Metricas:** `.specs/project/worklog.csv` e `costlog.csv` com formulas em `METRICS.md`.
- **Estado e decisoes:** `.specs/project/STATE.md` com last update; `.specs/project/ROADMAP.md` com status por milestone.
- **Sessao:** `session_id` e `tenant_id` em requests de interaction, memory e confirmations; eventos com source/target module.

Recomendacao: em toda decisao ou artefato novo, registrar **data (e hora quando aplicavel)** para auditoria.

---

## 3. Status por area (2026-02-27)

### 3.1 Modulos e produto

| Area | Status | Observacao |
|------|--------|------------|
| Modulos 01..06 | Implementados (UI + API) | Menu fixo; M06 configuracoes com sync backend por tenant. |
| Persona 1 (Owner Concierge) | Operacional | Responde com dados ao vivo (clientes, agenda, leads, cobrancas) via `operational_context` injetado por turno. |
| Persona 2 (WhatsApp CRM) | Contratos e worker integrado | Comando `crm.whatsapp.send`; eventos `crm.delegation.sent`/`failed` no schema; worker drain emite delegacao para mod-02. |
| Dual-concierge loop P1->P2->P1 | Operacional baseline | Delegacao e feedback via eventos/worker com trilha auditavel tenant-scoped. |

### 3.2 Memoria e aprendizado continuo

| Camada | Spec (CONTEXT) | Implementado | Pendente |
|--------|----------------|--------------|----------|
| **Long** | Conhecimento promovido, auditavel | Sim: owner memory entries, context promotion, retrieval. | — |
| **Medium** | Episodios operacionais | Implementado: memory.episode.created + owner-episode-store (append/list por tenant). | — |
| **Short** | Contexto de sessao ativa | Implementado: store por (tenant_id, session_id); recall antes de gerar; turnos persistidos (M4D-008). | — |
| **Recall (RAG)** | Antes de cada resposta | Implementado: short_memory + operational_context + retrieved_context (M4D-010). | — |
| **Auditoria** | Trace em todos os fluxos | Sim: correlation_id, trace_id, eventos persistidos. | Garantir que eventos de memoria tenham timestamp e tenant/session. |

### 3.3 Aprendizado continuo (estado atual)

- **Status:** fechado no produto para eixo memoria/contexto/aprendizado.
- **Ja implementado:** short + episodios + promocao para long memory com evento auditavel.
- **Foco atual:** deploy AWS dev do SaaS matriz com Postgres + Evolution server-side + DNS `dev.automaniaai.com`.
- **Referencia:** `.specs/project/PROXIMO-PASSO.md`.

### 3.4 Runtime stability hotfix (M5B)

- OpenAI audio runtime:
  - fallback global key aplicado em `audio/transcribe` e `audio/speech` quando chave tenant nao existe.
  - cobertura automatizada adicionada em `app-platform-api:test`.
- Evolution QR runtime:
  - endpoint retorna estado explicito (`ready`, `connected`, `pending_qr`) com mensagem operacional.
  - retry de create/connect para reduzir falso negativo de QR vazio.
- CRM UI:
  - modulo 02 agora renderiza corretamente QR, pairing code e mensagens de estado.
- Webhook inbound auto-reply (2026-03-01):
  - `POST /provider/evolution/webhook` agora tenta envio outbound via Evolution `message/sendText/{instance}`;
  - fallback de compatibilidade de payload (`text` + `textMessage.text`);
  - retorno inclui diagnostico `auto_reply` sem quebrar `status=accepted`.
- CRM modern inbox MVP (2026-03-01):
  - backend com persistencia de conversas/mensagens (`crm_conversations` + `crm_messages`, file/postgres);
  - novos endpoints de inbox/thread/envio/read no modulo 02;
  - webhook Evolution persiste inbound e atualiza delivery/read por `message_id`;
  - console CRM agora abre conversa, mostra thread, permite enviar e qualificar lead.
- Proximo slice de IA (2026-03-01):
  - criado draft `crm-persona2-ai-execution-slice` com spec/design/tasks para Persona 2 IA no thread (suggest-reply, qualify, execute assistido), pendente aprovacao para implementar.
- Deploy:
  - commit `8474a4e` em `main`.
  - rollout executado com `npm run deploy:dev`.
  - health publico validado (`https://dev.automaniaai.com.br/api/health` = `200`).
- Repo e ambientes (2026-02-27):
  - GitHub oficial: https://github.com/lucasricardolebre1984/SaaS (deploy/CI; sem branches sandbox).
  - Ubuntu AWS dev: app em `/srv/SaaS`, Evolution em `/srv/evolution` (documentado em AGENTS.md e RUNBOOK-aws-deploy-dev.md).
  - Script de diagnóstico Evolution: `tools/evolution-aws-check.sh` (SAAS_ROOT default `/srv/SaaS`).
- Evolution no Ubuntu (2026-02-27): configurado via SSH — Evolution em `0.0.0.0:8080`; `/srv/SaaS/.env` com `EVOLUTION_HTTP_BASE_URL=http://127.0.0.1:8080`; nginx com timeouts 30s; Evolution `.env` com `SERVER_URL=https://dev.automaniaai.com.br/evolution-api`, `CONFIG_SESSION_PHONE_VERSION=2.3000.1033703022`; nginx `location /evolution-api/` proxy para 8080; Evolution acessível em `https://dev.automaniaai.com.br/evolution-api/`.

### 3.5 Baseline Personas e runtime-config (2026-02-28)

- **Persona 1 (Owner Concierge)** e **Persona 2 (WhatsApp)** já existem no banco/runtime; campos de prompt no **menu 06 Configurações** persistem por tenant.
- **Endpoints obrigatórios:** `GET` e `POST /v1/owner-concierge/runtime-config` — funcionam; config inclui `personas.owner_concierge_prompt` e `personas.whatsapp_agent_prompt`; persistência via `tenantRuntimeConfigStore`.
- **API natural:** modelo padrão backend `gpt-5.1`; prompts opcionais (vazios = baseline neutro; sem prompt rage).
- **Documento auditável:** `.specs/project/BASELINE-PERSONAS-RUNTIME-CONFIG.md` — referência única para rollback e rastreabilidade.
- **Slice CRM modern inbox:** feature `crm-modern-inbox-2026-slice` aprovada; spec/design/tasks em `.specs/features/crm-modern-inbox-2026-slice/`.
- **UAT Evolution AWS dev (2026-02-28):** deploy 87435e6 em `/srv/SaaS`; `evolution-aws-check.sh` via SSH: Evolution 200 OK, instancia `tenant_automania` state `open`; health publico 200. Evidencias em worklog/costlog/STATE/PROXIMO-PASSO.

---

## 4. Skills em uso (prova e rastreabilidade)

O agente deve **citar o skill que esta usando** antes de aplica-lo. Catalogo: `.specs/project/SKILLS-CATALOG.md`.

- **Project skills (MVP):** project-context-loader, saas-standard-architect, contract-first-migrator, metrics-discipline. Fonte: `skills/(project)/`; instalacao: `npm run skills:install` ou `npm run skills:install:cursor`.
- **Skills globais (~37):** ver SKILLS-CATALOG.md.

---

## 5. Indice de documentos de spec

| Documento | Proposito |
|-----------|-----------|
| CONTEXT.md | Missao, dual-concierge, memoria e sessao. |
| PROJECT.md | Visao, objetivos. |
| ROADMAP.md | Milestones. |
| STATE.md | Decisoes, fase ativa, proximo passo. |
| STATUS-ATUAL.md | Este arquivo. |
| SKILLS-CATALOG.md | Catalogo de skills. |
| GATES.md | Portas de qualidade. |
| CHECKUP-DOCS.md | Checkup dos docs. |
| METRICS.md | worklog, costlog. |
| RUNBOOK-aws-deploy-dev.md | Deploy dev AWS + DNS + reverse proxy; sec. 7.1 verify/backup/update no Ubuntu + checklist CRM. |
| tools/ubuntu-verify-backup-update.sh | Script para rodar no servidor: verificar, backup, git pull, npm ci, restart, checklist CRM. |
| BASELINE-PERSONAS-RUNTIME-CONFIG.md | Persona 1/2, prompts menu 06, endpoints runtime-config, rollback (auditável). |
| RESEARCH-CONTINUOUS-LEARNING-CRM-2026.md | Pesquisa aprendizado continuo. |
| features/*/spec.md, design.md, tasks.md | Por feature. |

---

## 6. Gate seguinte do plano

- **Slice ativo:** `crm-krayin-reference-modernization-slice`.
- **Gate seguinte:** `G5`, semantica operacional do erro outbound no CRM (`crm:conversations:send`).
- **Objetivo imediato:** diferenciar com clareza falha de provider externo versus falha do produto, preservando rastreabilidade tenant/correlation.
- **Gate principal:** manter `preprod:validate` e smoke remoto verdes enquanto o endpoint de envio passa a devolver estado operacional mais claro.
- **Referencia:** `.specs/project/PLANO-GATES-AUDITORIA-SAAS-2026-03-05.md`.

## Update 2026-03-05 (T8 fechado + alinhamento local/git/aws)
- T8 efetivamente fechado em dev AWS:
  - smoke remoto final em `https://dev.automaniaai.com.br/api` com `PASS=25`, `WARN=1`, `FAIL=0`;
  - fluxo `owner interaction -> inbound webhook -> conversation -> ai suggest -> ai qualify -> ai execute update stage` validado ponta-a-ponta.
- Repositorio e ambientes alinhados:
  - local `main` limpo;
  - GitHub `origin/main` em `b11bbe1`;
  - Ubuntu `/srv/SaaS` em `b11bbe1`, `saas.service active`.
- Hotfix funcional publicado:
  - Owner embed do CRM com scroll restaurado;
  - paineis internos do CRM com overflow corrigido no modulo 02.
- Pendencia operacional residual:
  - `crm:conversations:send` continua `WARN` no smoke sintetico quando o provider outbound responde `502`; nao bloqueia o gate geral do SaaS.

## Update 2026-03-06 (G6 local fechado)
- `tenant_runtime_config` passou a suportar backend Postgres no runtime:
  - selecao por `ORCHESTRATION_STORE_BACKEND`;
  - tabela `tenant_runtime_configs` adicionada ao baseline SQL;
  - backfill do arquivo legado para banco no bootstrap Postgres.
- Evidencia executada localmente:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run smoke:postgres`
  - `npm run preprod:validate -- -SkipOperationalDrills`
- Resultado:
  - smoke Postgres passou com `tenant_runtime_configs=1`;
  - gate integrado permaneceu verde e o smoke remoto AWS seguiu `PASS=25`, `WARN=1`, `FAIL=0`.
  - apos deploy do commit `73e9ef8`, o health remoto passou a mostrar `tenant_runtime_config.backend = postgres`.

## Update 2026-03-06 (G4 hardening de health)
- `/health` publico foi reduzido para um resumo operacional minimo:
  - `status`
  - `service`
  - `version`
  - `backend_summary`
  - `owner_response`
  - `owner_memory`
- `/internal/health` passou a concentrar os detalhes de paths/storage e ficou restrito a loopback.
- Validacao:
  - `npx nx run app-platform-api:test`
  - `npm run preprod:validate -- -SkipOperationalDrills`
  - deploy dev do commit `163f04f`
  - smoke remoto pos-deploy: `PASS=26`, `WARN=0`, `FAIL=0`

## Update 2026-03-06 (G2 build real da API no Nx)
- `app-platform-api:build` deixou de ser placeholder e passou a gerar artefato executavel em `dist/apps/platform-api`.
- O build agora:
  - compila `app-owner-console` e `app-crm-console`;
  - empacota `apps/platform-api`;
  - inclui `libs` consumidas em runtime para schemas e workflows.
- Smoke dedicado do artefato foi adicionado:
  - `tools/smoke-platform-api-build.ps1`
  - valida subida direta do pacote em `dist/apps/platform-api` com `/health`, `/owner/` e `/crm/`.
- Evidencia executada:
  - `npx nx run app-platform-api:build`
  - `pwsh -NoProfile -ExecutionPolicy Bypass -File .\tools\smoke-platform-api-build.ps1`
  - `npx nx run app-platform-api:test`
  - `npm run preprod:validate -- -SkipOperationalDrills`

---

## 7. Higiene de repositorio (2026-02-27)

- PR de bootstrap AWS mergeado em `main`: `#3`.
- Branches remotas antigas removidas.
- Estado remoto atual: somente `origin/main` (branches antigas removidas).
- Fluxo operacional atual aprovado: codar/validar local -> `git push origin main` -> `npm run deploy:dev` (pull/restart no Ubuntu).
- Branch protection reaplicada na `main` (status check + review + enforce admins).
- Repo SaaS no GitHub e caminhos Ubuntu documentados em AGENTS.md (seção "Repository and Environments"); runbook e script Evolution alinhados.

## Update 2026-03-01 (Persona 2 AI CRM)
- Implementados endpoints: POST /v1/crm/conversations/:id/ai/suggest-reply, .../ai/qualify, .../ai/execute com policy tenant (suggest_only|assist_execute) e idempotencia por client_request_id.
- Runtime-config estendido com xecution.whatsapp_ai_enabled, xecution.whatsapp_ai_mode, xecution.whatsapp_ai_min_confidence e sincronizado no menu 06.
- CRM UI atualizado com botoes de IA (sugerir, qualificar, executar) e fluxo de execucao na thread.
- Gates validados: pp-platform-api:test, pp-crm-console:build, pp-owner-console:build, contract-tests:contract-checks.

## Update 2026-03-02 (Planta de Endpoints)
- Publicado mapeamento rastreavel completo em `docs/PLANTA-ENDPOINTS-SAAS.md`.
- Conteudo inclui:
  - inventario canonico de endpoints backend (publicos + internos);
  - matriz de botoes Owner/CRM para endpoint alvo;
  - gaps operacionais que explicam "botao nao funciona" (api base, validacao de payload, fila vs persistencia).
- Uso recomendado para agentes: validar sempre rota backend em `app.mjs` antes de alterar UI e registrar evidencia em `worklog.csv`/`costlog.csv`.

## Update 2026-03-02 (Guardrails de Execucao IA no Owner)
- `POST /v1/owner-concierge/interaction` agora aplica bloqueio de claim de conclusao sem prova de persistencia.
- Quando detectar texto de conclusao sem recibo real, o runtime:
  - reescreve a resposta para estado operacional correto (nao concluido);
  - emite evento auditavel `owner.response.claim.blocked`;
  - retorna `execution_receipts` com trilha de `owner.command.persisted`, `module.task.queued` e `assistant.claim.blocked` (quando aplicavel).
- Contratos atualizados:
  - `libs/core/orchestration-contracts/schemas/events.schema.json`
  - `libs/mod-01-owner-concierge/contracts/multimodal-api.schema.json`
- Validacao verde:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npx nx run app-owner-console:build`
  - `npx nx run app-crm-console:build`

## Update 2026-03-02 (Smoke executavel de endpoints)
- Novo script auditavel: `tools/smoke-saas-endpoints.ps1`.
- Objetivo: validar endpoint-a-endpoint o que os botoes de Owner/CRM/Clientes/Agenda/Cobranca chamam no backend real.
- Run validado em dev AWS:
  - `powershell -ExecutionPolicy Bypass -File tools/smoke-saas-endpoints.ps1 -BaseUrl https://dev.automaniaai.com.br/api -TenantId tenant_automania`
  - report: `tools/reports/saas-endpoint-smoke-20260302-120836.json`
  - resultado: `PASS=25`, `WARN=1`, `FAIL=0`
- Observacao do WARN:
  - `POST /v1/crm/conversations/:id/send` retornou `502` no smoke com numero sintetico de teste; endpoint respondeu e persistiu trilha, falha ficou no provider de envio (esperado em numero nao real).

## Update 2026-03-02 (Gate permanente + alinhamento de contexto)
- `tools/preprod-validate.ps1` agora inclui gate `saas-endpoint-smoke` por padrao.
- Parametros de contingencia adicionados:
  - `-SkipSaasEndpointSmoke`
  - `-SaasEndpointSmokeBaseUrl`
  - `-SaasEndpointSmokeTenantId`
- Drift documental resolvido: prioridade ativa unificada em `milestone-5-runtime-stability-hotfix-slice` nos docs centrais.
- `crm-modern-inbox-2026-slice` fechado em `tasks.md` com T1/T7 concluídos e evidências vinculadas.
- Validacao executada:
  - `npm run preprod:validate -- -SkipSmokePostgres -SkipOperationalDrills`
  - reports: `tools/reports/preprod-validate-20260302-165103.log` e `tools/reports/saas-endpoint-smoke-20260302-165147.json`

## Update 2026-03-02 (Encerramento M5B + transicao)
- Checklist de saida fechado com `GO`:
  - `.specs/project/MILESTONE-5-RUNTIME-STABILITY-EXIT-CHECKLIST.md`
- ROADMAP atualizado para `Milestone 5 (completed)`.
- Proximo foco formalizado em `PROXIMO-PASSO.md`:
  - `crm-krayin-reference-modernization-slice` em fase `Specify/Approval`.

## Update 2026-03-02 (Krayin gap matrix T2 concluido)
- `spec/design/tasks` do slice `crm-krayin-reference-modernization-slice` promovidos para `Approved`.
- Matriz de gaps publicada com backlog priorizado P0/P1/P2:
  - `.specs/features/crm-krayin-reference-modernization-slice/gap-matrix.md`
- Evidencia foi cruzada entre:
  - rotas reais do clone Krayin (`packages/Webkul/*/Routes/*`);
  - endpoint map canonico (`docs/PLANTA-ENDPOINTS-SAAS.md`);
  - runtime/API/UI do SaaS (`apps/platform-api/src/app.mjs`, `apps/crm-console/src/app.js`).
- Proximo passo ativo formalizado: T3 contracts CRM core (Implement + Validate).

## Update 2026-03-02 (T3 contracts CRM core concluido)
- Contratos JSON adicionados em `libs/mod-02-whatsapp-crm/contracts/` para:
  - `accounts`: create/list/update
  - `contacts`: create/list/update
  - `deals`: create/list/update
  - `activities`: create/list
  - `tasks`: create/list
  - `views`: create/list

## Update 2026-03-03 (T7 runtime controls modulo 06)
- T7 concluido no slice `crm-krayin-reference-modernization-slice`:
  - runtime-config tenant-scoped estendido com bloco `crm.pipeline` e `crm.automation`;
  - menu 06 no Owner recebeu controles de pipeline/stages e automacao stage-followup;
  - CRM console passou a consumir runtime-config por tenant para renderizar stages/filtros/kanban dinamicos;
  - backend aplica:
    - stage default por tenant no create de lead;
    - bloqueio de stage desabilitado por tenant em leads/deals;
    - automacao de follow-up por stage em transicoes manual/IA.
- Evidencia tecnica:
  - `apps/platform-api/src/app.mjs`
  - `apps/platform-api/src/tenant-runtime-config-store.mjs`
  - `apps/owner-console/src/index.html`
  - `apps/owner-console/src/app.js`
  - `apps/crm-console/src/app.js`
  - `apps/platform-api/src/app.test.mjs` (teste novo de runtime controls T7).
- Gates verdes:
  - `npx nx run app-platform-api:test`
  - `npx nx run app-owner-console:build`
  - `npx nx run app-crm-console:build`
  - `npx nx run contract-tests:contract-checks`
- Arquivo de exemplos validos publicado:
  - `libs/mod-02-whatsapp-crm/contracts/crm-core-contract-examples.json`
- Gate executado e aprovado:
  - `npx nx run contract-tests:contract-checks`
- Proximo passo ativo formalizado: T4 migracoes CRM core.

## Update 2026-03-02 (T4 migracoes CRM core concluido)
- Baseline SQL de runtime Postgres expandido com tabelas CRM core:
  - `crm_accounts`, `crm_contacts`, `crm_deals`, `crm_activities`, `crm_tasks`, `crm_views`
  - arquivo: `apps/platform-api/sql/orchestration-postgres.sql`
- Mapa de dados atualizado para refletir novas entidades:
  - `libs/core/data-model/table-map.json`
- Smoke Postgres atualizado para aplicar SQL baseline e validar CRUD basico real:
  - arquivo: `tools/smoke-postgres-orchestration.ps1`
  - comando executado: `powershell -ExecutionPolicy Bypass -File tools/smoke-postgres-orchestration.ps1`
  - resultado: `Postgres smoke passed` com contagens `crm_deals=1`, `crm_activities=1`, `crm_tasks=1`.
- Gates de validacao apos T4:
  - `npx nx run app-platform-api:test` (`62/62` pass)
  - `npx nx run contract-tests:contract-checks`
- Proximo passo ativo formalizado: T5 APIs backend CRM enterprise MVP.

## Update 2026-03-02 (T5 APIs CRM core concluido)
- APIs CRM core implementadas em `apps/platform-api/src/app.mjs`:
  - `POST/PATCH/GET /v1/crm/accounts`
  - `POST/PATCH/GET /v1/crm/contacts`
  - `POST/PATCH/GET /v1/crm/deals`
  - `POST/GET /v1/crm/activities`
  - `POST/GET /v1/crm/tasks`
  - `POST/GET /v1/crm/views`
- Store dedicado CRM core adicionado com backend `file+postgres`:
  - `apps/platform-api/src/crm-core-store.mjs`
  - `apps/platform-api/src/crm-core-store-file.mjs`
  - `apps/platform-api/src/crm-core-store-postgres.mjs`
- Trilha auditavel expandida em `libs/core/orchestration-contracts/schemas/events.schema.json`:
  - `crm.account.{created,updated}`
  - `crm.contact.{created,updated}`
  - `crm.deal.{created,updated,stage.changed}`
  - `crm.activity.created`
  - `crm.task.created`
  - `crm.view.created`
- Teste de fluxo fim-a-fim T5 adicionado:
  - `T5 CRM core APIs support deal -> activity -> stage update flow with audit trace` em `apps/platform-api/src/app.test.mjs`
- Gates executados e aprovados:
  - `npx nx run app-platform-api:test` (`63/63` pass)
  - `npx nx run contract-tests:contract-checks`
  - `npm run preprod:validate -- -SkipSmokePostgres -SkipOperationalDrills`
- Proximo passo ativo formalizado: T6 UI CRM enterprise (inbox + pipeline + detail panel) consumindo endpoints T5.

## Update 2026-03-04 (T8 validation + UAT sintetico)
- T8 movido para `in_progress` em `.specs/features/crm-krayin-reference-modernization-slice/tasks.md`.
- Gates de validacao executados e verdes:
  - `npx nx run app-platform-api:test` (`64/64` pass)
  - `npx nx run contract-tests:contract-checks`
  - `npx nx run app-owner-console:build`
  - `npx nx run app-crm-console:build`
- Gate integrado executado com sucesso:
  - `npm run preprod:validate -- -SkipSmokePostgres -SkipOperationalDrills`
  - report: `tools/reports/preprod-validate-20260304-042452.log`
- Smoke endpoint-a-endpoint em dev AWS:
  - report: `tools/reports/saas-endpoint-smoke-20260304-042537.json`
  - resultado: `PASS=25`, `WARN=1`, `FAIL=0`
  - fluxo coberto: inbound webhook -> conversation -> AI qualify -> AI execute update stage.
- Nota operacional:
  - ocorreu uma falha transiente anterior (`504` em `provider:evolution/webhook`) no report `tools/reports/saas-endpoint-smoke-20260304-042142.json`; rerun subsequente aprovou sem alteracao de codigo.
- Pendencia para fechar T8 como `completed`:
  - UAT manual com WhatsApp real (numero humano) para evidenciar inbound autentico + entrega de resposta pelo provider.

## Update 2026-03-04 (T8 UAT em thread real)
- UAT executado em conversa real do tenant dev com evidencias auditaveis:
  - report: `tools/reports/t8-uat-real-20260304-053230.json`
  - inbound real detectado + historico outbound provider (`delivery_state=sent`)
  - transicao de stage em thread real: `qualified -> proposal` via endpoint `POST /v1/crm/conversations/:id/ai/execute` (`action=update_stage`)
- Runtime-config CRM automacao aplicado no dev via API:
  - `stage_followup_enabled=true`
  - `stage_followup_stages=[qualified,proposal]`
  - `stage_followup_delay_minutes=5`
- Resultado observado no dev:
  - response trouxe `execute_automation=null`
  - `followups_for_lead=0`
- Implicacao:
  - T8 permanece `in_progress` ate confirmar paridade de deploy/runtime do bloco `crm.automation` em dev AWS e evidenciar follow-up automatico agendado.

## Update 2026-03-04 (Deploy dev + checagem de paridade)
- Deploy dev executado:
  - comando: `npm run deploy:dev -- -SkipNpmCi`
  - branch/commit aplicado: `main` em `4a6c3af`
  - health publico: `https://dev.automaniaai.com.br/api/health` (`ok`)
- Resultado de paridade no UAT:
  - runtime remoto ainda sem comportamento esperado para `crm.automation` no fluxo real (`execute_automation=null`, `followups_for_lead=0`).
- Consequencia operacional:
  - fechamento de T8 permanece bloqueado ate publicar/deploy das alteracoes locais pendentes que completam a trilha de automacao de follow-up no dev AWS.


## Update 2026-03-04 (T8 paridade crm.automation fechada)
- Deploy dev executado com commit `11a5243` (runtime controls + AI followup automation no backend).
- UAT focado em dev confirmou no endpoint `POST /v1/crm/conversations/:id/ai/execute` (action=`update_stage`):
  - `automation.status=scheduled`;
  - `followups_for_lead=1`.
- Evidencias:
  - `tools/reports/t8-uat-followup-20260304-083425.json`
  - `tools/reports/saas-endpoint-smoke-20260304-083431.json` (`PASS=25`, `WARN=1`, `FAIL=0`)
