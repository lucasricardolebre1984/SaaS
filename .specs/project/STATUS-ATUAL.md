# Status Atual — Fabio SaaS (Modelo Universal)

**Documento:** STATUS-ATUAL  
**Ultima atualizacao:** 2026-02-26 (rastreabilidade e auditoria: data/hora em decisoes e artefatos)  
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

## 3. Status por area (2026-02-26)

### 3.1 Modulos e produto

| Area | Status | Observacao |
|------|--------|------------|
| Modulos 01..06 | Implementados (UI + API) | Menu fixo; M06 configuracoes com sync backend por tenant. |
| Persona 1 (Owner Concierge) | Operacional | Responde com dados ao vivo (clientes, agenda, leads, cobrancas) via `operational_context` injetado por turno. |
| Persona 2 (WhatsApp CRM) | Contratos e runtime parcial | Comando `crm.whatsapp.send` e eventos `crm.delegation.sent`/`failed` publicados; worker que emite eventos ainda nao integrado. |
| Dual-concierge loop P1->P2->P1 | Especificado, nao fechado | Design e tasks no slice `milestone-4-dual-concierge-memory-orchestrator-slice`. |

### 3.2 Memoria e aprendizado continuo

| Camada | Spec (CONTEXT) | Implementado | Pendente |
|--------|----------------|--------------|----------|
| **Long** | Conhecimento promovido, auditavel | Sim: owner memory entries, context promotion, retrieval. | — |
| **Medium** | Episodios operacionais | Parcial: estruturas existem; auto-promocao short->medium nao. | M4D-009 (promocao, evento episode). |
| **Short** | Contexto de sessao ativa | Parcial: `session_id` aceito; dados ao vivo por turno (`operational_context`). | M4D-008: persistir turno por (tenant_id, session_id); recall antes da resposta. |
| **Recall (RAG)** | Antes de cada resposta | Parcial: so `operational_context` (listagens). | M4D-010: combinar short + retrieval (medium/long) antes de gerar resposta. |
| **Auditoria** | Trace em todos os fluxos | Sim: correlation_id, trace_id, eventos persistidos. | Garantir que eventos de memoria tenham timestamp e tenant/session. |

### 3.3 Aprendizado infinito (evolucao por proprietario)

- **Objetivo:** A IA evolui conforme cada proprietario de SaaS conduz o uso.
- **Ja existente:** Memoria longa por tenant; retrieval por tenant; runtime config por tenant.
- **Para fechar o ciclo:** (1) Auto-capture de turno em short. (2) Promocao short->medium->long auditavel. (3) Recall sistematico antes de cada resposta do Persona 1. (4) Sem vazamento entre tenants; restore/resume por sessao.
- **Referencia:** `.specs/project/RESEARCH-CONTINUOUS-LEARNING-CRM-2026.md` e slice dual-concierge.

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
| RESEARCH-CONTINUOUS-LEARNING-CRM-2026.md | Pesquisa aprendizado continuo. |
| features/*/spec.md, design.md, tasks.md | Por feature. |

---

## 6. Proximo passo natural

- **Slice:** milestone-4-dual-concierge-memory-orchestrator-slice.
- **Implementar:** M4D-011/012 (worker delegacao) e M4D-008/009/010 (short memory, promocao, recall).
- **Spec do fluxo:** MEMORY-CONTEXT-LEARNING-FLOW.md.
