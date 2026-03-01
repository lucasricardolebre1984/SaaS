# Tasks - crm-krayin-reference-modernization-slice

Status: Draft
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
- Status: pending
- Entregar comparativo funcional:
  - disponivel no SaaS atual,
  - faltante critico,
  - opcional.
- Aceite: backlog priorizado por impacto e dependencia.

## T3) Contracts (deals/contacts/activities/tasks/views)
- Status: pending
- Criar schemas JSON + exemplos validos.
- Atualizar checks de contratos.
- Aceite: `contract-tests:contract-checks` verde.

## T4) Data model migrations
- Status: pending
- Criar tabelas novas de CRM core com indices por tenant e timeline.
- Aceite: smoke Postgres para CRUD basico de deal + activity + task.

## T5) Backend APIs (MVP enterprise)
- Status: pending
- Implementar endpoints de deals/contacts/activities/tasks/views.
- Integrar com eventos auditaveis.
- Aceite: testes de API cobrindo fluxo deal->activity->stage update.

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
