# Tasks - agent-skills-institutional-runtime

Status: Draft
Date: 2026-03-06

## FOCO
Transformar o sistema de agent skills de MVP auditado em runtime institucional deterministico.

## T0) Auditoria do estado atual
- Status: pending
- Levantar:
  - o que existe no repo;
  - o que existe apenas no home do agente;
  - onde ha divergencia entre Codex e Cursor;
  - o que e catalogo e o que e runtime real.
- Aceite:
  - matriz atual `repo x agente x trigger x evidencia`.

## T1) Manifesto v2
- Status: pending
- Evoluir `tools/skills.json` para modelo operacional.
- Incluir:
  - perfis;
  - triggers;
  - prioridades;
  - conflitos;
  - proof phrases;
  - agent targets.
- Aceite:
  - manifesto v2 validado em auditoria local.

## T2) Instalador institucional unificado
- Status: pending
- Garantir instalacao consistente para `codex` e `cursor`.
- Diferenciar:
  - project skills obrigatorias;
  - skills globais homologadas;
  - opcionais.
- Aceite:
  - um comando de install/audit por agente com evidencias.

## T3) Router de ativacao
- Status: pending
- Criar camada de resolucao de skills por contexto/tarefa.
- Regras:
  - nao ativar tudo;
  - ativar conjunto minimo suficiente;
  - anunciar skill antes de uso;
  - falhar quando skill obrigatoria faltar.
- Aceite:
  - router documentado e exercitado por casos de teste.

## T4) Smoke institucional de skills
- Status: pending
- Cobrir pelo menos:
  - context loader;
  - Nx workspace/task;
  - docs;
  - metrics;
  - AWS;
  - review.
- Aceite:
  - report de smoke com pass/fail por trigger.

## T5) Manual operacional
- Status: pending
- Escrever manual para:
  - projeto novo;
  - projeto existente;
  - portfolio grande.
- Aceite:
  - manual publicado e referenciado no README.

## T6) Hardening do bootstrap
- Status: pending
- Endurecer `start-day` para:
  - detectar agente errado;
  - falhar em falta critica;
  - emitir evidence report padrao.
- Aceite:
  - bootstrap endurecido sem regressao do fluxo diario.

## T7) Template institucional reutilizavel
- Status: pending
- Empacotar a estrutura minima para replicacao em novos repos:
  - `AGENTS.md`
  - manifesto
  - installer
  - audit
  - manual
- Aceite:
  - projeto novo consegue adotar o sistema sem engenharia manual dispersa.
