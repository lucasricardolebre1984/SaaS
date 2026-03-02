# PLANTA ENDPOINTS SAAS (RASTREAVEL)

Data: 2026-03-02  
Repo: `C:\projetos\fabio`  
Branch: `main`  
Fonte de verdade de runtime: `apps/platform-api/src/app.mjs`

## 1) Escopo do produto (modulos 01..06)
- 01 Chat IA (Owner Concierge)
- 02 CRM WhatsApp
- 03 Clientes
- 04 Agenda
- 05 Cobranca
- 06 Configuracoes

## 2) Inventario canonico de endpoints (backend)

### 2.1 Publicos (usados por UI SaaS)
- `GET /health`
- `GET /v1/owner-concierge/runtime-config`
- `POST /v1/owner-concierge/runtime-config`
- `POST /v1/owner-concierge/audio/transcribe`
- `POST /v1/owner-concierge/audio/speech`
- `POST /v1/owner-concierge/interaction`
- `GET /v1/owner-concierge/interaction-confirmations`
- `POST /v1/owner-concierge/interaction-confirmations`
- `GET /v1/owner-concierge/sessions`
- `GET /v1/owner-concierge/session-turns`
- `POST /v1/owner-concierge/memory/entries`
- `GET /v1/owner-concierge/memory/entries`
- `POST /v1/owner-concierge/context/promotions`
- `GET /v1/owner-concierge/context/summary`
- `POST /v1/owner-concierge/context/retrieve`
- `POST /v1/customers`
- `GET /v1/customers`
- `GET /v1/customers/:customer_id`
- `POST /v1/agenda/appointments`
- `PATCH /v1/agenda/appointments/:appointment_id`
- `POST /v1/agenda/reminders`
- `GET /v1/agenda/reminders`
- `POST /v1/billing/charges`
- `PATCH /v1/billing/charges/:charge_id`
- `POST /v1/billing/charges/:charge_id/collection-request`
- `POST /v1/billing/payments`
- `GET /v1/billing/charges`
- `POST /v1/crm/leads`
- `PATCH /v1/crm/leads/:lead_id/stage`
- `GET /v1/crm/leads`
- `GET /v1/crm/conversations`
- `GET /v1/crm/conversations/:conversation_id/messages`
- `POST /v1/crm/conversations/:conversation_id/read`
- `POST /v1/crm/conversations/:conversation_id/send`
- `POST /v1/crm/conversations/:conversation_id/ai/suggest-reply`
- `POST /v1/crm/conversations/:conversation_id/ai/qualify`
- `POST /v1/crm/conversations/:conversation_id/ai/execute`
- `POST /v1/crm/campaigns`
- `PATCH /v1/crm/campaigns/:campaign_id/state`
- `GET /v1/crm/campaigns`
- `POST /v1/crm/followups`
- `GET /v1/crm/followups`
- `POST /provider/evolution/webhook`
- `POST /provider/evolution/outbound/validate`
- `GET /v1/whatsapp/evolution/qr`

### 2.2 Internos (operacao/worker/maintenance)
- `GET /internal/orchestration/commands`
- `GET /internal/orchestration/events`
- `GET /internal/orchestration/trace`
- `GET /internal/orchestration/module-task-queue`
- `POST /internal/worker/module-tasks/drain`
- `POST /internal/worker/crm-collections/drain`
- `POST /internal/worker/crm-followups/drain`
- `POST /internal/maintenance/owner-memory/reembed`
- `POST /internal/maintenance/owner-memory/reembed/schedules`
- `POST /internal/maintenance/owner-memory/reembed/schedules/pause`
- `POST /internal/maintenance/owner-memory/reembed/schedules/resume`
- `GET /internal/maintenance/owner-memory/reembed/schedules`
- `GET /internal/maintenance/owner-memory/reembed/runs`
- `POST /internal/maintenance/owner-memory/reembed/schedules/run-due`

## 3) Matriz Owner Console (botao -> endpoint)

### 3.1 Modulo 01
- `healthBtn` -> `GET /health`
- `chatSendBtn` (`chatForm`) -> `POST /v1/owner-concierge/interaction`
- `audioRecordBtn` -> `POST /v1/owner-concierge/audio/transcribe` -> `POST /v1/owner-concierge/interaction`
- `continuousBtn` -> `POST /v1/owner-concierge/interaction` (operation `toggle_continuous_mode`)
- `recoverSessionBtn` -> `GET /v1/owner-concierge/sessions` + `GET /v1/owner-concierge/session-turns`
- `confirmationsRefreshBtn` -> `GET /v1/owner-concierge/interaction-confirmations`
- aprovar/rejeitar confirmacao -> `POST /v1/owner-concierge/interaction-confirmations`

### 3.2 Modulo 03
- `customersRefreshBtn` -> `GET /v1/customers`
- `customerCreateForm` -> `POST /v1/customers`
- `customerDetailBtn` -> `GET /v1/customers/:customer_id`

### 3.3 Modulo 04
- `appointmentCreateForm` -> `POST /v1/agenda/appointments`
- `appointmentUpdateForm` -> `PATCH /v1/agenda/appointments/:appointment_id`
- `reminderCreateForm` -> `POST /v1/agenda/reminders`
- `remindersRefreshBtn` -> `GET /v1/agenda/reminders`

### 3.4 Modulo 05
- `chargesRefreshBtn` -> `GET /v1/billing/charges`
- `chargeCreateForm` -> `POST /v1/billing/charges`
- `chargeUpdateForm` -> `PATCH /v1/billing/charges/:charge_id`
- `collectionRequestForm` -> `POST /v1/billing/charges/:charge_id/collection-request`
- `paymentCreateForm` -> `POST /v1/billing/payments`

### 3.5 Modulo 06
- `saveConfigBtn` -> `POST /v1/owner-concierge/runtime-config`
- carga inicial config -> `GET /v1/owner-concierge/runtime-config`

## 4) Matriz CRM Console (botao -> endpoint)

- `reloadBtn` -> `GET /v1/crm/conversations` + `GET /v1/crm/leads`
- clique em conversa -> `GET /v1/crm/conversations/:conversation_id/messages`
- leitura de conversa -> `POST /v1/crm/conversations/:conversation_id/read`
- `leadForm` -> `POST /v1/crm/leads`
- `threadSendForm` -> `POST /v1/crm/conversations/:conversation_id/send`
- `threadUpdateStageBtn` -> `PATCH /v1/crm/leads/:lead_id/stage`
- `threadAiSuggestBtn` -> `POST /v1/crm/conversations/:conversation_id/ai/suggest-reply`
- `threadQualifyBtn` -> `POST /v1/crm/conversations/:conversation_id/ai/qualify`
- `threadAiExecuteBtn` -> `POST /v1/crm/conversations/:conversation_id/ai/execute`
- `whatsappQrBtn` -> `GET /v1/whatsapp/evolution/qr` (com/sem `force_new=1`)

## 5) Gaps operacionais detectados (causa de “botao nao funciona”)

1. Configuracao de endpoint do browser
- Se `api_base_url`/`apiBase` estiver incorreto, todos botoes HTTP falham.
- Padrao esperado em runtime unificado: `https://<dominio>/api`.

2. Validacao de payload obrigatoria
- Muitos formulários falham por validacao (ex.: E.164 sem `+55...`, IDs vazios, datas invalidas).
- O botao clica, mas backend retorna `400` por regra de contrato.

3. Diferenca entre “enfileirado” e “persistido”
- Em `POST /v1/owner-concierge/interaction`, criar comando/task nao significa que entidade (cliente/agenda etc.) foi gravada.
- Sem comprovante de persistencia, a resposta da IA nao pode dizer “feito”.

4. Drift documental de fase/feature
- `AGENTS.md` e `PROXIMO-PASSO.md` apontam M5B.
- `STATE.md` aponta `crm-modern-inbox-2026-slice`.
- Esse drift gera execucao confusa para agentes.

## 6) Protocolo de auditoria para agentes (obrigatorio em toda sessao)

1. Carregar `AGENTS.md` + ordem `.specs/project/*`.
2. Validar branch e dirty state: `git status --short`.
3. Conferir endpoint alvo no backend (`app.mjs`) antes de mexer UI.
4. Conferir botão/função no frontend (`app.js`) e cruzar com endpoint.
5. Testar endpoint direto (curl/fetch) antes de concluir “funciona”.
6. Registrar evidência em `STATE.md`, `worklog.csv`, `costlog.csv`.

## 7) Comandos de auditoria rapida (reproducivel)

```powershell
# rotas backend
rg -n "if \\(method === '|path\\.startsWith\\('|path\\.match\\(/\\^/" apps/platform-api/src/app.mjs

# chamadas frontend
rg -n "fetch\\(|fetchJsonOrThrow\\(|/v1/|/provider/|/internal/" apps/owner-console/src/app.js apps/crm-console/src/app.js

# listeners de botoes/form
rg -n "addEventListener\\('click'|addEventListener\\('submit'" apps/owner-console/src/app.js apps/crm-console/src/app.js

# smoke executavel endpoint-a-endpoint (dev AWS)
powershell -ExecutionPolicy Bypass -File tools/smoke-saas-endpoints.ps1 -BaseUrl https://dev.automaniaai.com.br/api -TenantId tenant_automania
```

## 8) Estado desta auditoria (checkpoint)

- Endpoint map acima foi derivado do codigo atual do repo.
- Smoke auditavel executado em `2026-03-02` com script `tools/smoke-saas-endpoints.ps1`.
- Resultado do run mais recente (`tools/reports/saas-endpoint-smoke-20260302-120836.json`):
  - `PASS=25`
  - `WARN=1`
  - `FAIL=0`
- Unico `WARN` no fluxo `POST /v1/crm/conversations/:id/send`: endpoint e persistencia OK, provider Evolution retornou `502` no envio para numero de teste sintatico (comportamento esperado para smoke sem destinatario real).
