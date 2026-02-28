# Baseline: Persona 1, Persona 2 e prompts do menu (runtime-config)

**Documento:** BASELINE-PERSONAS-RUNTIME-CONFIG  
**Criado:** 2026-02-28  
**Objetivo:** Fonte única auditável do que já existe no banco/runtime: IA orquestradora (Persona 1), Persona 2, campos de prompt no menu 06, endpoints de persistência, modelo padrão (API natural). Rollback explícito.

---

## 1. O que já está implementado

### 1.1 Persona 1 (Owner Concierge – IA orquestradora)
- **Papel (CONTEXT.md):** orquestrador principal; entende módulos 01..06; traduz intenção do dono em ações (clientes, agenda, cobrança, CRM).
- **Runtime:** Resposta via `POST /v1/owner-concierge/interaction` com `operational_context` injetado por turno (leads, clientes, agenda, cobranças).
- **Prompt configurável:** Campo no menu **06 Configurações** persiste `owner_concierge_prompt` por tenant. Se vazio, comportamento neutro (sem “prompt rage”); se preenchido, usado como override em cada interação.

### 1.2 Persona 2 (WhatsApp CRM)
- **Papel (CONTEXT.md):** especialista de execução WhatsApp/CRM; captura de leads, qualificação, follow-up; registra em contratos do SaaS.
- **Runtime:** Comando `crm.whatsapp.send`; eventos `crm.delegation.sent`/`failed`; worker drain integrado ao módulo 02.
- **Prompt configurável:** Campo no menu **06 Configurações** persiste `whatsapp_agent_prompt` por tenant. Propagado em `persona_overrides` quando o Owner delega tarefas ao módulo 02.

### 1.3 Menu 06 – Configurações
- **Acesso:** Item de menu "06 Configuracoes" no Owner Console; protegido por senha admin de sessão (slice atual: `191530`).
- **Campos de prompt:**
  - **Persona 1 (Owner Concierge):** `owner_concierge_prompt` — textarea no painel de configurações.
  - **Persona 2 (WhatsApp):** `whatsapp_agent_prompt` — textarea no painel de configurações.
- **Comportamento:** Ao clicar "Salvar Config", o front envia `POST /v1/owner-concierge/runtime-config` com `config.personas.{owner_concierge_prompt, whatsapp_agent_prompt}`. O backend persiste por `tenant_id` (file ou Postgres). Sem prompt rage: prompts vazios mantêm baseline neutro.

### 1.4 Endpoints de prompt (menu → backend)
| Método | Path | Função |
|--------|------|--------|
| `GET` | `/v1/owner-concierge/runtime-config?tenant_id=<id>` | Retorna config do tenant (inclui `personas.owner_concierge_prompt`, `personas.whatsapp_agent_prompt`). |
| `POST` | `/v1/owner-concierge/runtime-config` | Body: `{ request: { tenant_id, request_id, config } }`. Persiste e retorna resumo. `config.personas` é sanitizado e armazenado. |

- **Persistência:** `tenantRuntimeConfigStore` (file: `.runtime-data/tenant-runtime-config/` ou Postgres conforme `ORCHESTRATION_STORE_BACKEND`).
- **Validação:** `validateTenantRuntimeConfigRequest` + `sanitizeTenantRuntimeConfigInput` (trim, token único para API key; personas como string).

### 1.5 API natural – modelo padrão
- **Modelo padrão no backend:** `gpt-5.1` (fallback em `sanitizeTenantRuntimeConfigInput` quando `config.openai.model` vazio).
- **CONTEXT.md:** "Intended default model: gpt-5.1-mini (if available)". Uso de API natural (sem prompt rage): prompts opcionais; vazios = comportamento neutro.

---

## 2. Rastreabilidade e auditoria

- **Decisões:** Este baseline registra estado em 2026-02-28. Qualquer mudança em contratos ou comportamento deve ser refletida aqui e em STATE.md / STATUS-ATUAL.md com data/hora.
- **Logs:** Endpoints já em uso; eventos de orquestração possuem `correlation_id`, `trace_id`, `tenant_id`.
- **Rollback:** Alterações feitas apenas em código/docs; reverter com `git revert <commit>` ou restaurar arquivos a partir do commit anterior. Nenhuma migração destrutiva neste baseline.

---

## 3. Rollback (trabalho limpo e seguro)

- **Se precisar desfazer alterações de config em runtime:** Ajustar manualmente no menu 06 ou (se houver script) reaplicar valor anterior. Dados em file/Postgres não são alterados por este documento.
- **Se precisar desfazer commit de documentação:**  
  `git revert <hash> --no-edit` e `git push origin main`.  
  Manter ordem: local → GitHub → (se aplicável) AWS com pull/restart documentado.

---

## 4. Referências de código (prova)

- Backend personas + runtime-config: `apps/platform-api/src/app.mjs` (sanitizeTenantRuntimeConfigInput, GET/POST runtime-config, resolveTenantRuntimeConfig, createRuntimeConfigSummary).
- Contratos: `libs/mod-01-owner-concierge/contracts/multimodal-api.schema.json` (`persona_overrides.owner_concierge_prompt`, `whatsapp_agent_prompt`); `libs/core/orchestration-contracts/schemas/commands.schema.json` (idem).
- Owner Console menu 06 e prompts: `apps/owner-console/src/app.js` (mod-06-configuracoes, cfgPersona1PromptInput, cfgPersona2PromptInput, Salvar Config → POST runtime-config, preenchimento a partir de GET).
- Tenant pack (personas): `tenants/sample-tenant-001/personas/owner.json`, `whatsapp.json`; schemas em `libs/core/persona-registry/schemas/`.
