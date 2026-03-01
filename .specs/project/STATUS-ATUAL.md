# Status Atual — Fabio SaaS (Modelo Universal)

**Documento:** STATUS-ATUAL  
**Ultima atualizacao:** 2026-03-01 (rastreabilidade e auditoria: data/hora em decisoes e artefatos)  
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

## 6. Proximo passo natural

- **Slice ativo:** `milestone-5-runtime-stability-hotfix-slice`.
- **Objetivo imediato:** fechar UAT real de OpenAI voz/whisper e Evolution QR no ambiente AWS dev.
- **Gate principal:** `npx nx run app-platform-api:test` + `npx nx run app-crm-console:build` + `npx nx run app-owner-console:build` + validacao manual em `dev.automaniaai.com.br`.
- **Runbook:** `apps/platform-api/RUNBOOK-aws-deploy-dev.md`.

---

## 7. Higiene de repositorio (2026-02-27)

- PR de bootstrap AWS mergeado em `main`: `#3`.
- Branches remotas antigas removidas.
- Estado remoto atual: somente `origin/main` (branches antigas removidas).
- Fluxo operacional atual aprovado: codar/validar local -> `git push origin main` -> `npm run deploy:dev` (pull/restart no Ubuntu).
- Branch protection reaplicada na `main` (status check + review + enforce admins).
- Repo SaaS no GitHub e caminhos Ubuntu documentados em AGENTS.md (seção "Repository and Environments"); runbook e script Evolution alinhados.
