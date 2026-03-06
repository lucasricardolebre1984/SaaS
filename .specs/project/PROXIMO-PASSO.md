# Proximo passo do SaaS matriz

**Foco:** estabilidade operacional com rastreabilidade 100% (botao -> endpoint -> evidencia).

**Ultima atualizacao:** 2026-03-06

---

## Eixo memoria/contexto/aprendizado

- **Status:** fechado no produto.
- Short + medium + long + promocao medium->long implementados e auditados.
- Nenhum passo pendente neste eixo.

---

## Uso correto deste documento

**Este arquivo e referencia de contexto/servidor e nao deve ser usado como fila viva de execucao do agente.**

Fonte ativa de execucao:
- plano de gates: `.specs/project/PLANO-GATES-AUDITORIA-SAAS-2026-03-05.md`
- feature ativa: `.specs/features/crm-krayin-reference-modernization-slice/tasks.md`

Pre-condicoes (ja cumpridas):
1. Slice de estabilidade M5B encerrado com `GO`.
2. Gate permanente de regressao de botoes/endpoints ativo no `preprod:validate`.
3. AWS dev com runtime estavel e evidencias auditaveis.

Passos concluidos em 2026-03-02:
1. `crm-krayin-reference-modernization-slice` promovido para prioridade ativa.
2. `spec/design/tasks` aprovados formalmente.
3. T2 concluido com matriz auditavel:
   - `.specs/features/crm-krayin-reference-modernization-slice/gap-matrix.md`
4. T3 concluido com contratos CRM core + exemplos validos:
   - `libs/mod-02-whatsapp-crm/contracts/{account,contact,deal,activity,task,view}-*.schema.json`
   - `libs/mod-02-whatsapp-crm/contracts/crm-core-contract-examples.json`
   - gate verde: `npx nx run contract-tests:contract-checks`
5. T4 concluido com migracoes CRM core + smoke CRUD Postgres:
   - tabelas adicionadas em `apps/platform-api/sql/orchestration-postgres.sql`
   - smoke validado: `powershell -ExecutionPolicy Bypass -File tools/smoke-postgres-orchestration.ps1`
   - resultado: `Postgres smoke passed` com `crm_deals=1`, `crm_activities=1`, `crm_tasks=1`
6. T5 concluido com APIs CRM core + eventos auditaveis:
   - endpoints `accounts/contacts/deals/activities/tasks/views` em `apps/platform-api/src/app.mjs`
   - store core `file+postgres` em `apps/platform-api/src/crm-core-store-*.mjs`
   - evento `crm.deal.stage.changed` e familia `crm.account/contact/deal/activity/task/view.*` em `events.schema.json`
   - testes/gates verdes:
     - `npx nx run app-platform-api:test` (`63/63`)
     - `npx nx run contract-tests:contract-checks`
     - `npm run preprod:validate -- -SkipSmokePostgres -SkipOperationalDrills`

Passos concluidos em 2026-03-03:
1. T7 concluido com runtime controls tenant-scoped no modulo 06:
   - `crm.pipeline.stages`, `crm.pipeline.default_stage`
   - `crm.automation.stage_followup_*`
2. Backend passou a aplicar regras de pipeline por tenant em leads/deals:
   - stage default no create de lead
   - bloqueio de stage desabilitado
   - follow-up automatico por stage (manual e IA)
3. CRM console passou a consumir runtime-config por tenant para renderizar stages/filtros/kanban dinamicos.
4. Gates de T7 validados:
   - `npx nx run app-platform-api:test`
   - `npx nx run app-owner-console:build`
    - `npx nx run app-crm-console:build`
    - `npx nx run contract-tests:contract-checks`

Passos concluidos em 2026-03-04:
1. Validacao tecnica de T8 executada localmente:
   - `npx nx run app-platform-api:test` (`64/64` pass)
   - `npx nx run contract-tests:contract-checks`
   - `npx nx run app-owner-console:build`
   - `npx nx run app-crm-console:build`
2. Gate integrado executado com sucesso:
   - `npm run preprod:validate -- -SkipSmokePostgres -SkipOperationalDrills`
   - reports:
     - `tools/reports/preprod-validate-20260304-042452.log`
     - `tools/reports/preprod-validate-20260304-045933.log`
3. Smoke endpoint-a-endpoint executado em dev AWS:
   - report: `tools/reports/saas-endpoint-smoke-20260304-042537.json`
   - resultado: `PASS=25`, `WARN=1`, `FAIL=0`
4. Fluxo de UAT sintetico validado via smoke:
   - inbound webhook -> conversa -> AI qualify -> AI execute update stage.
5. UAT em thread real executado no tenant dev:
   - report: `tools/reports/t8-uat-real-20260304-053230.json`
   - evidencia: inbound real + historico outbound provider + transicao de stage `qualified -> proposal`.

Passos concluidos em 2026-03-05:
1. T8 (validation + UAT) fechado em dev AWS:
   - `POST /v1/crm/conversations/:id/ai/execute` (`update_stage`) retorna `automation.status=scheduled`;
   - evidencia de follow-up criada: `followups_for_lead=1`;
   - smoke final dev: `PASS=25`, `WARN=1`, `FAIL=0`.
2. Repositorio, GitHub e AWS dev alinhados no commit `b11bbe1`:
   - local `main` limpo;
   - GitHub `origin/main` em `b11bbe1`;
   - Ubuntu `/srv/SaaS` em `b11bbe1`, `saas.service` ativo.
3. Correcao de UX aplicada no modulo 02 embutido no Owner:
   - scroll do CRM restaurado no embed;
   - overflow interno dos paineis do CRM corrigido.

Observacao operacional:
1. T8 esta fechado em dev AWS.
2. Local, GitHub e AWS dev estao alinhados em `b11bbe1`.
3. A continuidade deve seguir a ordem do plano de gates, sem duplicar backlog aqui.

---

## Resumo (leigo)

O ciclo de estabilidade foi fechado. Agora o trabalho passa para evolucao de CRM enterprise (referencia Krayin-like), mantendo a base tecnica atual e executando por fatias com gate de aprovacao.

---

*Feature ativa: `crm-krayin-reference-modernization-slice` (fase: Implement + Validate).*
