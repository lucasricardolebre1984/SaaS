# Plano de Gates - Auditoria Geral SaaS

Data: 2026-03-05
Autor: agent codex
Escopo: repo local `C:\projetos\SaaS`, GitHub `origin/main`, AWS dev `/srv/SaaS`, monorepo Nx, runtime unificado SaaS.
Objetivo: consolidar um plano rastreavel de gates para estabilizacao, fechamento de riscos e governanca operacional sem drift de contexto.

## 1. Prova de contexto e conformidade do agente

### 1.1 Contexto carregado

Ordem efetivamente carregada nesta auditoria:
1. `.specs/project/CONTEXT.md`
2. `.specs/project/PROJECT.md`
3. `.specs/project/ROADMAP.md`
4. `.specs/project/STATE.md`
5. `.specs/project/PROXIMO-PASSO.md`
6. `.specs/project/STATUS-ATUAL.md`
7. `.specs/features/crm-krayin-reference-modernization-slice/{spec,design,tasks}.md`
8. `.specs/project/GATES.md`
9. `.specs/project/MODULES_STANDARD.md`
10. `AGENTS.md`

Skills citados e aplicados:
- `project-context-loader`
- `saas-standard-architect`
- `nx-workspace`
- `metrics-discipline`

### 1.2 FOCO e anti-pollution

- Fase ativa mantida: `Implement + Validate`
- Feature ativa mantida: `crm-krayin-reference-modernization-slice`
- Este documento nao muda escopo de produto; ele consolida gates, riscos e ordem de fechamento.

## 2. Snapshot validado nesta data

### 2.1 Estado confirmado

- Git local: `main`
- `origin/main`: `a061464`
- AWS dev em `/srv/SaaS`: `main` no commit `11a5243`
- Servico remoto: `saas.service = active`
- Health publico: `https://dev.automaniaai.com.br/api/health = ok`
- Runtime local unificado: `/owner/`, `/crm/` e `/health` responderam `200`

### 2.2 Evidencias executadas nesta auditoria

- `npx nx run app-platform-api:test` -> `65/65` pass
- `npx nx run contract-tests:contract-checks` -> verde
- `npx nx run app-owner-console:build` -> verde
- `npx nx run app-crm-console:build` -> verde
- `npm run preprod:validate -- -SkipSmokePostgres -SkipOperationalDrills` -> verde
- `pwsh -File tools/smoke-saas-endpoints.ps1 -BaseUrl https://dev.automaniaai.com.br/api -TenantId tenant_automania` -> `PASS=25 WARN=1 FAIL=0`
- SSH read-only no AWS -> branch, commit, status do servico e health interno confirmados

### 2.3 Limitacao observada

- `npm run smoke:postgres` nao foi executavel no host local desta auditoria porque o Docker daemon local nao estava disponivel.

## 3. Gate Matrix (fonte unica)

## G0 - Contexto, agente e governanca

Status: PASS
Objetivo: garantir que o agente opera com contexto completo, skill proof e sem drift de fase.
Topicos:
- ordem obrigatoria de contexto
- prova de skills
- foco na feature/fase ativa
- metrica obrigatoria (`worklog.csv`, `costlog.csv`)
Evidencias:
- `AGENTS.md`
- `.specs/project/STATE.md`
- `.specs/project/PROXIMO-PASSO.md`
- `tools/reports/skills-audit-20260305-193135.json`
Criterio de saida:
- contexto carregado na ordem correta
- skill proof citado antes do uso
- nenhuma troca de fase sem checklist

## G1 - Integridade de repositorio e paridade Git

Status: WARN
Objetivo: garantir que local, origin e AWS nao gerem falsa sensacao de paridade.
Topicos:
- branch e remote corretos
- worktree local conhecido
- diferenca entre commit local/origin e commit publicado no AWS
- rastreabilidade do que e doc-only versus runtime-impacting
Evidencias:
- `git status --short --branch`
- `git remote -v`
- `git rev-parse --short HEAD`
- SSH AWS: `/srv/SaaS` em `11a5243`
Achado:
- AWS dev nao esta no mesmo commit do `origin/main`; a diferenca atual e documental, mas a assimetria precisa continuar explicita.
Criterio de saida:
- deploy notes sempre registram commit local/origin/remoto
- diferenca entre remoto e local nunca fica implicita
Acao:
- manter checklist de deploy com commit local + commit remoto + health + smoke no mesmo artefato

## G2 - Workspace Nx e artefatos executaveis

Status: WARN
Objetivo: garantir que o monorepo e reproduzivel nao apenas por `serve`, mas tambem por build auditavel.
Topicos:
- apps e libs descobriveis via Nx
- targets build/test/serve claros
- artefato real da API
Evidencias:
- `npx nx show projects`
- `npx nx show project app-platform-api --json`
- `npx nx show project app-owner-console --json`
- `npx nx show project app-crm-console --json`
Achado:
- `app-platform-api:build` ainda e placeholder e nao gera artefato real.
Arquivos:
- `apps/platform-api/project.json`
Criterio de saida:
- build real da API com output versionavel ou empacotavel
- pipeline de deploy nao depender apenas de codigo fonte cru no servidor
Prioridade: P1

## G3 - Contratos, schemas e tenant packs

Status: PASS
Objetivo: manter o SaaS contract-first e auditavel.
Topicos:
- JSON Schema core e de modulos
- tenant sample pack valido
- regressao de contratos executavel
Evidencias:
- `npx nx run contract-tests:contract-checks`
- `npm run tenant:validate`
- `tools/run-contract-checks.ps1`
Criterio de saida:
- contratos verdes
- tenant sample pack valido
- nenhuma alteracao estrutural sem contrato correspondente

## G4 - Runtime core API e orchestration

Status: PASS
Objetivo: garantir funcionamento de API, orchestration, memoria, agenda, clientes e billing.
Topicos:
- health
- owner interaction
- execution receipts
- customer, agenda e billing flows
- memory/context stack
Evidencias:
- `npx nx run app-platform-api:test`
- `npm run preprod:validate -- -SkipSmokePostgres -SkipOperationalDrills`
- `http://127.0.0.1:4001/health`
Achado:
- o runtime funciona, mas o endpoint `/health` expõe detalhes internos excessivos.
Checkpoint 2026-03-06:
- `/health` reduzido para resumo publico minimo (`status`, `service`, `version`, `backend_summary`, `owner_response`, `owner_memory`);
- `/internal/health` criado para metadados detalhados e restrito a loopback;
- validacao local concluida com:
  - `npx nx run app-platform-api:test`
  - `npm run preprod:validate -- -SkipOperationalDrills`
Arquivos:
- `apps/platform-api/src/app.mjs`
- `apps/platform-api/src/app.test.mjs`
Criterio de saida:
- manter resposta `ok`
- reduzir exposicao publica a metadados minimos
Prioridade: P1

## G5 - CRM enterprise e provider WhatsApp

Status: PASS com ressalva
Objetivo: garantir o fluxo real do modulo 02 e a trilha P1 -> P2 -> provider.
Topicos:
- inbound webhook
- conversations/thread
- AI suggest/qualify/execute
- QR/connectividade Evolution
- follow-up automation
Evidencias:
- `tools/reports/saas-endpoint-smoke-20260305-193642.json`
- `tools/reports/t8-uat-followup-20260304-083425.json`
- `tools/reports/saas-endpoint-smoke-20260305-193642.json`
Achados:
- fluxo enterprise principal funciona e a automacao T8 foi provada com `automation.status=scheduled` e `followups_for_lead=1`
- envio outbound `crm:conversations:send` segue com warning recorrente (`502`) quando o provider falha, embora a persistencia local do endpoint esteja correta
Criterio de saida:
- manter `PASS` no smoke
- diferenciar erro do provider externo de erro do produto
- reduzir o warning recorrente para um estado operacional mais claro
Prioridade: P1

## G6 - Persistencia multi-tenant e control plane

Status: PASS
Objetivo: garantir que o modulo 06 seja control plane robusto em ambiente real.
Topicos:
- persistencia tenant-scoped
- runtime-config
- segredos e overrides
- compatibilidade file/postgres
Evidencias:
- health remoto mostra `tenant_runtime_config.backend = file`
- `apps/platform-api/src/tenant-runtime-config-store.mjs`
Achado:
- o SaaS remoto usa Postgres para quase tudo, mas `tenant_runtime_config` continua em arquivo local.
Checkpoint 2026-03-06:
- implementado store Postgres para `tenant_runtime_config` com auto-migrate e backfill do arquivo legado;
- `apps/platform-api/sql/orchestration-postgres.sql` agora cria `tenant_runtime_configs`;
- validacao local concluida com:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run smoke:postgres`
  - `npm run preprod:validate -- -SkipOperationalDrills`
- publicacao concluida em `73e9ef8` com deploy dev realizado;
- health remoto confirmou `tenant_runtime_config.backend = postgres`;
- smoke remoto pos-deploy: `PASS=25`, `WARN=1`, `FAIL=0`.
Risco:
- consistencia fraca em multi-instancia
- backup/restore parcial
- control plane desalinhado do restante da plataforma
Criterio de saida:
- store Postgres para `tenant_runtime_config`
- migracao rastreavel do arquivo para banco
Prioridade: P0

## G7 - UX de produto e completude do molde SaaS

Status: WARN
Objetivo: garantir que o repositorio seja realmente reprodutor de SaaS, nao apenas base tecnica.
Topicos:
- shell visual compartilhado
- modulo 01 e 02 operacionais
- modulo 03, 04, 05 com UX final ou escopo explicitamente reduzido
- ausencia de placeholders enganosos
Evidencias:
- `apps/owner-console/src/index.html`
- `apps/owner-console/src/app.js`
- `apps/crm-console/src/app.js`
Achado:
- ha placeholder explicito para modulos ainda em evolucao; isso e aceitavel internamente, mas reduz prontidao do molde clonavel.
Checkpoint 2026-03-05:
- hardening aplicado no embed do Modulo 02 para restaurar rolagem do CRM dentro do Owner e scroll interno de paineis (`conversation-list`, `thread`, `detail-panel`);
- validacao local: builds `app-owner-console` + `app-crm-console` verdes e smoke unificado `/owner/` + `/crm/?embedded=1&view=pipeline` com `200`.
Criterio de saida:
- ou fechar UI principal de 03/04/05
- ou rotular docs/comercializacao como template parcial institucional
Prioridade: P1

## G8 - Baseline de modelo IA e alinhamento documental

Status: WARN
Objetivo: eliminar drift entre spec, backend e UI em defaults de IA.
Topicos:
- modelo default do owner/runtime
- baseline documentado
- compatibilidade real com provider
Evidencias:
- `.specs/project/CONTEXT.md`
- `apps/platform-api/src/tenant-runtime-config-store.mjs`
- `apps/owner-console/src/app.js`
Achado:
- spec diz `gpt-5.1-mini`; runtime/UI defaultam `gpt-5-mini`.
Criterio de saida:
- unificar default em spec + backend + UI + docs operacionais
Prioridade: P2

## 4. Plano de fechamento por prioridade

### P0 - Fechar agora

1. Migrar `tenant_runtime_config` para Postgres.
Gate alvo: G6
Saida minima:
- store Postgres novo
- migracao/backfill do arquivo
- teste cobrindo read/write por tenant
- health refletindo backend coerente

### P1 - Fechar antes de chamar de molde pronto

1. Reduzir exposicao do `/health` publico.
Gate alvo: G4
Saida minima:
- health publico com `status`, `service`, `version`, `backend_summary`
- health interno protegido para detalhes de paths

2. Implementar build real da API no Nx.
Gate alvo: G2
Saida minima:
- target `build` sem placeholder
- artefato executavel ou bundle
- ajuste no deploy/runbook se necessario

3. Tratar `crm:conversations:send` com semantica operacional melhor.
Gate alvo: G5
Saida minima:
- diferenciar persistencia ok + provider fail
- resposta e observabilidade mais claras
- smoke continua verde sem ambiguidade

4. Fechar ou rebaixar promessa de UX dos modulos 03/04/05.
Gate alvo: G7
Saida minima:
- UX funcional basica
ou
- docs/status declarando explicitamente template parcial

### P2 - Fechar em alinhamento de governanca

1. Unificar baseline de modelo OpenAI.
Gate alvo: G8
Saida minima:
- um unico default documentado
- UI/backend/tests coerentes

2. Consolidar artefato unico de deploy parity.
Gate alvo: G1
Saida minima:
- doc/report com commit local, origin, remoto, health e smoke

## 5. Ordem recomendada de execucao

1. G6 - persistencia do control plane
2. G4 - hardening do `/health`
3. G2 - build real da API
4. G5 - outbound provider semantics
5. G7 - completude do molde UX
6. G8 - alinhamento fino de baseline IA
7. G1 - consolidacao de parity report como rotina padrao

## 6. Definicao operacional de "SaaS funcional" nesta data

Classificacao:
- Base tecnica: funcional
- Monorepo Nx: funcional
- Runtime local unificado: funcional
- Runtime AWS dev: funcional
- CRM enterprise principal: funcional com evidencia
- Molde SaaS pronto para clonagem comercial sem ressalvas: ainda nao

Racional:
- o produto ja demonstra stack, governanca, contrato, runtime e UAT reais;
- porem ainda ha lacunas de control plane, health hardening, build industrial da API e completude de UX.

## 7. Evidencias canonicas desta auditoria

- `.specs/project/AUDITORIA-GERAL-SAAS-2026-03-04.md`
- `tools/reports/skills-audit-20260305-193135.json`
- `tools/reports/saas-endpoint-smoke-20260305-193642.json`
- `tools/reports/t8-uat-followup-20260304-083425.json`
- `tools/reports/preprod-validate-20260305-193602.log`

## 8. Decisao recomendada

Decisao: GO CONTROLADO

Significado:
- continuar usando o repositorio como base institucional do SaaS;
- nao declarar "molde pronto" sem antes fechar G6 e pelo menos os P1 de G2/G4/G5;
- manter T8 e o slice atual como evidencia forte de maturidade do modulo 02.
