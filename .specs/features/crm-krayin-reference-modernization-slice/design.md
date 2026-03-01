# Design - crm-krayin-reference-modernization-slice

Status: Draft
Date: 2026-03-01

## 1) Architectural Position
- Base tecnica permanece no SaaS atual:
  - `apps/platform-api` (API),
  - `apps/crm-console` (UI),
  - contratos em `libs/mod-02-whatsapp-crm` e `libs/core/orchestration-contracts`.
- Krayin entra como benchmark de dominio/UX, nao como dependencia de runtime.

## 1.1) Reference Verification
- Link informado do owner redireciona para autenticacao (demo privada por sessao).
- Referencias publicas adotadas:
  - repositorio Krayin (dominio e estrutura),
  - documentacao Krayin (features e fluxos de CRM),
  - padrao visual alvo definido por equivalencia funcional (nao copia literal).

## 2) Capability Mapping (Krayin -> SaaS)
- `Lead` -> modulo 02 (leads/deals/pipeline/stage).
- `Contact` -> modulo 03 (contatos/clientes) com espelho operacional no modulo 02.
- `Activity` -> novo subdominio de timeline no modulo 02.
- `Automation` -> regras configuraveis em modulo 06 + executor no modulo 02.
- `Email/Quote/Product` -> fases futuras (contratos primeiro, UI depois).

## 3) Proposed CRM Domain Core (new entities)
- `crm_accounts`
- `crm_contacts`
- `crm_deals`
- `crm_deal_stages`
- `crm_activities`
- `crm_notes`
- `crm_tasks`
- `crm_tags` + vinculos

Observacao:
- Conversas/mensagens atuais (`crm_conversations`, `crm_messages`) seguem como camada de comunicacao omnichannel.
- Deals e activities passam a consumir eventos da inbox/thread.

## 4) UX Blueprint (target)
- Coluna esquerda: inbox/conversas e filtros.
- Centro: thread/timeline operacional.
- Direita: painel de deal/contato (stage, valor, proximas acoes, tarefas).
- View alternavel:
  - `Inbox`,
  - `Pipeline Kanban`,
  - `Tabela`.

## 4.1) SaaS-wide Shell (modules 01..06)
- Sidebar institucional unica (modulos 01..06).
- Topbar com contexto do modulo + acoes rapidas.
- Grid de conteudo com componentes reutilizaveis:
  - `kpi-card`,
  - `data-table`,
  - `kanban-board`,
  - `thread-panel`,
  - `detail-drawer`.

## 4.2) Theme System (dark/green)
- Criar design tokens globais (CSS variables) em biblioteca compartilhada:
  - `--bg-0`, `--bg-1`, `--bg-2` (dark scale),
  - `--accent-500` (green principal),
  - `--accent-300`, `--accent-700` (variante),
  - `--text-strong`, `--text-muted`,
  - `--border-subtle`, `--success`, `--warning`, `--danger`.
- Modo padrao do template SaaS: `dark-green`.
- Overrides por tenant no modulo 06:
  - trocar acento,
  - densidade de layout,
  - contraste/acessibilidade.

## 4.3) Persona-aware UI
- Persona 1 (modulo 01):
  - painel executivo com cards cross-modulo e chat central.
- Persona 2 (modulo 02):
  - inbox/thread + pipeline + acoes de qualificacao/execucao IA.
- Shared components garantem consistencia visual entre as duas personas.

## 5) API Contract Plan
- `GET/POST/PATCH /v1/crm/deals`
- `GET/POST/PATCH /v1/crm/contacts`
- `GET/POST /v1/crm/activities`
- `GET/POST /v1/crm/tasks`
- `GET/POST /v1/crm/views` (filtros salvos)

Todos com:
- `tenant_id` obrigatorio,
- `correlation_id/trace_id` nos eventos relevantes.

## 6) Rollout Strategy
1. Fase A: design system dark/green + shell compartilhado 01..06.
2. Fase B: contrato + dados + APIs de deals/activities.
3. Fase C: UI CRM enterprise (kanban/list/detail/thread).
4. Fase D: automacoes configuraveis no modulo 06.
5. Fase E: IA operacional sobre deals/activities (persona 2) sem prompt hardcoded.

## 7) Risks and Mitigations
- Risco: scope explosion.
  - Mitigacao: entrega em fatias pequenas com gate por fase.
- Risco: regressao no inbox atual.
  - Mitigacao: manter inbox como backbone e adicionar camadas laterais sem quebra.
- Risco: contaminacao de arquitetura externa.
  - Mitigacao: contrato-first e proibicao de importacao de runtime Laravel.
- Risco: tema dark reduzir legibilidade.
  - Mitigacao: tokens com contraste WCAG e presets testados em desktop/mobile.
