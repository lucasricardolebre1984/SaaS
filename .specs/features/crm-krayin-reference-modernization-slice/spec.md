# Spec - crm-krayin-reference-modernization-slice

Status: Draft
Date: 2026-03-01

## Objective
Elevar o modulo 02 para um CRM de nivel enterprise (UX e capacidade) usando o Krayin como referencia funcional/visual e estender a mesma linguagem visual para todo o SaaS (modulos 01..06), sem importar o runtime Laravel no SaaS Nx.

## Business Intent
- O CRM atual funciona, mas esta abaixo do nivel esperado para operacao comercial diaria.
- O produto SaaS precisa virar molde clonavel com CRM forte como diferencial.

## Critical Decision (MUDANCA CRITICA)
Nao clonar codigo do Krayin no repositorio SaaS.
Usar estrategia de referencia + mapeamento de capacidades + implementacao contract-first no stack atual (Node/Nx, multi-tenant, dual-concierge).

## Krayin Snapshot (evidence)
- Repositorio: `krayin/laravel-crm` (MIT).
- Stack: PHP 8.2 + Laravel 10 (monolito modular em `packages/Webkul/*`).
- Escopo observado: leads, contacts, activities, automation, email, quote, product, settings, webforms.

## Scope (Phase 1 this slice)
- Definir blueprint de CRM top para SaaS com:
  - pipeline visual (kanban + lista),
  - contas/contatos/leads/deals,
  - timeline de atividades (mensagem, nota, tarefa, ligacao),
  - inbox WhatsApp integrado ao funil,
  - filtros salvos e views.
- Definir padrao visual institucional dark/green:
  - tokens de cor, tipografia, estados e espacamento;
  - aplicacao uniforme em Owner Console e CRM;
  - extensao para os modulos 03, 04, 05 e 06.
- Definir layout padrao "enterprise CRM" para o SaaS inteiro:
  - sidebar fixa,
  - barra superior contextual,
  - area principal com cards/tabelas/kanban/thread.
- Contratos e modelo de dados para suportar esse blueprint.
- Plano incremental de implementacao em fatias (sem big-bang).

## Out of Scope
- Subir PHP/Laravel/Krayin em producao dentro deste SaaS.
- Copia direta de telas/controladores/rotas do Krayin.
- Troca completa de arquitetura atual.

## Requirements
1. Tudo tenant-scoped (`tenant_id`) e auditavel.
2. Compatibilidade com modelo dual-concierge (persona 1 orquestra, persona 2 executa CRM/WhatsApp).
3. Modulo 06 deve controlar os comportamentos de CRM por tenant.
4. Sem regressao no inbox/thread ja entregue em `crm-modern-inbox-2026-slice`.
5. Tema dark/green deve ser parametrizavel por tenant (base fixa + overrides permitidos no modulo 06).
6. Layout deve manter identidade do SaaS (branding "SaaS"), sem textos legados de tenant antigo.
7. Superficies de Persona 1 e Persona 2 devem manter papis distintos no mesmo padrao visual:
   - Persona 1: cockpit operacional cross-modulo.
   - Persona 2: operacao CRM/WhatsApp com thread, qualificação e execucao.

## Visual Acceptance (Krayin-like target)
1. CRM apresenta:
   - lista de leads/deals com filtros,
   - kanban por stage,
   - detalhe lateral com atividades.
2. SaaS inteiro apresenta:
   - shell unico dark/green,
   - navegacao consistente entre modulos,
   - responsividade desktop/mobile sem quebra de usabilidade.
3. Nao existe dependencia de servidor PHP/Laravel para renderizar UI/fluxos no produto final.

## Acceptance Criteria
1. Existe matriz de gaps Krayin x CRM SaaS com backlog priorizado.
2. Existem `spec/design/tasks` aprovaveis para execucao por fases.
3. Existe plano de rollout com rollback por fase e gates de validacao.
4. Existe especificacao de design tokens dark/green e mapeamento por modulo (01..06).
