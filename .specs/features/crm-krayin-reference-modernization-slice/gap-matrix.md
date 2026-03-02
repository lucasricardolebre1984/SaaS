# Gap Matrix - Krayin x SaaS CRM

Status: Approved (T2 completed)
Date: 2026-03-02
Feature: `crm-krayin-reference-modernization-slice`

## 1) Fontes auditadas (sem suposicao)
- Krayin (referencia):
  - `C:\Users\Lucas\AppData\Local\Temp\krayin-laravel-crm-cde876cf\packages\Webkul\Admin\src\Routes\Admin\leads-routes.php`
  - `C:\Users\Lucas\AppData\Local\Temp\krayin-laravel-crm-cde876cf\packages\Webkul\Admin\src\Routes\Admin\contacts-routes.php`
  - `C:\Users\Lucas\AppData\Local\Temp\krayin-laravel-crm-cde876cf\packages\Webkul\Admin\src\Routes\Admin\activities-routes.php`
  - `C:\Users\Lucas\AppData\Local\Temp\krayin-laravel-crm-cde876cf\packages\Webkul\Admin\src\Routes\Admin\mail-routes.php`
  - `C:\Users\Lucas\AppData\Local\Temp\krayin-laravel-crm-cde876cf\packages\Webkul\Admin\src\Routes\Admin\quote-routes.php`
  - `C:\Users\Lucas\AppData\Local\Temp\krayin-laravel-crm-cde876cf\packages\Webkul\Admin\src\Routes\Admin\products-routes.php`
  - `C:\Users\Lucas\AppData\Local\Temp\krayin-laravel-crm-cde876cf\packages\Webkul\WebForm\src\Routes\routes.php`
  - `C:\Users\Lucas\AppData\Local\Temp\krayin-laravel-crm-cde876cf\packages\Webkul\Admin\src\Routes\Admin\settings-routes.php`
- SaaS atual:
  - `docs/PLANTA-ENDPOINTS-SAAS.md`
  - `apps/platform-api/src/app.mjs`
  - `apps/crm-console/src/app.js`

## 2) Legenda de classificacao
- `Disponivel`: capacidade operacional com endpoint/fluxo persistente.
- `Parcial`: existe parte da capacidade, mas falta base enterprise (modelo/API/auditoria completa).
- `Ausente`: nao existe no SaaS atual.
- Prioridade:
  - `P0` critico para paridade de CRM enterprise.
  - `P1` alto impacto, pode entrar apos nucleo P0.
  - `P2` opcional/fase futura.

## 3) Matriz de gaps (Krayin x SaaS)

| ID | Capacidade de referencia (Krayin) | Evidencia Krayin | Estado SaaS (2026-03-02) | Evidencia SaaS | Gap | Prioridade |
|---|---|---|---|---|---|---|
| K01 | Leads com CRUD amplo, busca, mass actions e kanban | `leads-routes.php` (`create/edit/update/search/mass-update/mass-destroy/kanban`) | Parcial | `app.mjs` (`POST/GET /v1/crm/leads`, `PATCH /v1/crm/leads/:id/stage` em ~L4255, L4321, L4374) + kanban/dnd `app.js` (~L641-L760) | Falta CRUD completo de lead (edit/delete), busca server-side e operacoes em lote | P0 |
| K02 | Contatos (pessoas) e organizacoes com ciclo completo | `contacts-routes.php` (`persons` + `organizations`) | Parcial | Modulo 03 tem `POST/GET/DETAIL /v1/customers` (mapeado em `docs/PLANTA-ENDPOINTS-SAAS.md`) | Falta separar `accounts/organizations` e `contacts/persons` com vinculo nativo ao CRM | P0 |
| K03 | Oportunidades/deals como entidade principal de pipeline | `leads-routes.php` + fluxo de `view/{id}` e stage | Ausente | Nao existe `/v1/crm/deals` | Pipeline hoje e centrado em `lead.stage`; falta entidade de deal com valor, owner, forecast | P0 |
| K04 | Timeline de atividades unificada (crm activity hub) | `activities-routes.php` | Parcial | Conversas/mensagens existem (`/v1/crm/conversations*` ~L4397-L4512); followups separados (`/v1/crm/followups` ~L4155-L4229) | Falta entidade unica `crm_activities` para chamadas, notas, tarefas e anexos na mesma trilha | P0 |
| K05 | Tarefas de follow-up persistidas no backend | `activities-routes.php` + atividades por contato/lead | Parcial | Tarefas no detalhe do CRM estao em `localStorage` (`TASKS_KEY_PREFIX`, `tasksByLead` em `app.js` ~L114, L246, L454) | Falta API/tabela de tasks tenant-scoped com auditoria | P0 |
| K06 | Views/filtros salvos de forma compartilhavel | Datagrids e filtros no admin Krayin | Parcial | Views salvas em `localStorage` (`SAVED_VIEW_KEY_PREFIX` em `app.js` ~L114, L227, L557) | Falta endpoint `/v1/crm/views` e persistencia por tenant/usuario | P1 |
| K07 | Kanban enterprise completo de pipeline | `leads-routes.php` (`kanban/look-up`) | Parcial | Kanban com drag-and-drop pronto em `app.js` (~L641-L760) | Falta persistir preferencias/colunas/regras e integrar com deals reais (nao so lead.stage) | P1 |
| K08 | Operacao IA sobre thread/qualificacao | (na referencia ocorre por extensoes/workflows) | Disponivel (MVP) | `/ai/suggest-reply`, `/ai/qualify`, `/ai/execute` em `app.mjs` (~L4584, L4689, L4811) | Falta governanca por playbook de deal/activity e explainability por acao | P1 |
| K09 | Workflows/automacoes configuraveis | `settings-routes.php` (`workflows`, `webhooks`, `pipelines`, `sources`) | Parcial | Campanhas/followups existem (`/v1/crm/campaigns`, `/v1/crm/followups`) | Falta motor de regras de pipeline no modulo 06 (gatilhos por stage/SLA) | P1 |
| K10 | Mail inbox + inbound parsing | `mail-routes.php` (`inbound-parse`) | Ausente | Nao existe `/v1/crm/mail*` | Omnichannel incompleto sem email | P2 |
| K11 | Quotes | `quote-routes.php` | Ausente | Nao existe `/v1/crm/quotes*` (modulo 05 atual e cobranca/charges) | Falta objeto comercial de proposta/orcamento ligado ao deal | P2 |
| K12 | Catalogo de produtos para proposta | `products-routes.php` | Ausente | Nao existe `/v1/crm/products*` | Falta composicao de proposta baseada em produtos | P2 |
| K13 | Captura por webform | `WebForm/src/Routes/routes.php` | Ausente | Nao existe `/v1/crm/webforms*` | Falta entrada automatica de leads por formulario embedavel | P2 |
| K14 | Configuracao de pipeline/stages no painel | `settings-routes.php` (`pipelines`) | Parcial | Stage existe no CRM, mas sem CRUD dedicado de pipelines via modulo 06 | Falta controle formal de funis/stages por tenant no backend | P0 |
| K15 | Dashboard executivo comercial | Dashboard/admin Krayin + datagrids | Parcial | KPIs + barras stage/canal no CRM (`app.js` ~L789-L809) | Falta metricas de conversao, win-rate, aging, forecast e SLA | P1 |
| K16 | Auditoria operacional por endpoint/trace | (Krayin nao e foco principal aqui) | Disponivel (forte) | `docs/PLANTA-ENDPOINTS-SAAS.md`, smoke endpoint, receipts em owner interaction | Manter como requisito transversal nas novas APIs (nao regredir) | P0 |

## 4) Backlog priorizado por impacto/dependencia (aceite T2)

### Bloco P0 (critico)
1. `B-P0-01` - Contratos CRM core (`deals`, `contacts`, `accounts`, `activities`, `tasks`, `views`) + exemplos.
Dependencia: nenhuma (abre trilha contract-first).  
Mapeia: `T3`.

2. `B-P0-02` - Migracoes Postgres CRM core (`crm_deals`, `crm_contacts`, `crm_accounts`, `crm_activities`, `crm_tasks`, `crm_views`) com indices por `tenant_id`.
Dependencia: `B-P0-01`.  
Mapeia: `T4`.

3. `B-P0-03` - APIs backend CRUD minimo enterprise para deals/contacts/activities/tasks/views.
Dependencia: `B-P0-02`.  
Mapeia: `T5`.

4. `B-P0-04` - Trocar persistencia local do CRM (tasks/views) por backend tenant-scoped.
Dependencia: `B-P0-03`.  
Mapeia: `T6`.

5. `B-P0-05` - Pipeline configuravel por tenant no modulo 06 (CRUD de stages/funis).
Dependencia: `B-P0-03`.  
Mapeia: `T7`.

### Bloco P1 (alto impacto)
1. `B-P1-01` - Busca server-side, filtros salvos compartilhaveis, operacoes em lote de leads/deals.
2. `B-P1-02` - Workflows de automacao por stage/SLA integrados ao modulo 06.
3. `B-P1-03` - Dashboard comercial (conversao, aging, win-rate, forecast).
4. `B-P1-04` - Hardening de IA operacional com playbooks por etapa do deal.

### Bloco P2 (futuro planejado)
1. `B-P2-01` - Omnichannel email (inbound parse).
2. `B-P2-02` - Quotes e products no CRM.
3. `B-P2-03` - Webforms para captura automatica de leads.

## 5) Resultado do T2
- Matriz comparativa concluida com classificacao `Disponivel/Parcial/Ausente`.
- Backlog priorizado por `P0/P1/P2` com dependencia explicita.
- Pronto para iniciar T3 (contracts CRM core) sem ambiguidade.
