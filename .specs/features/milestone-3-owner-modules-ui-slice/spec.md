# Spec - milestone-3-owner-modules-ui-slice

Status: Approved
Date: 2026-02-25

## Objective
Implementar UI real no Owner Console para modulos 03 (Clientes), 04 (Agenda) e 05 (Faturamento/Cobranca), removendo o placeholder e ligando aos endpoints ja existentes.

## Scope
- Substituir workspace placeholder por telas funcionais de modulos 03/04/05.
- Integrar formularios e listagens com API runtime.
- Preservar modulo 01 (chat owner) e modulo 06 (configuracoes) sem regressao.

## Functional Requirements
1. Modulo 03 deve permitir criar cliente e listar clientes por tenant.
2. Modulo 04 deve permitir criar appointment, atualizar appointment, criar reminder e listar reminders.
3. Modulo 05 deve permitir criar charge, atualizar charge, solicitar collection, registrar payment e listar charges.
4. Operacoes devem usar `tenant_id` e `api_base_url` da configuracao ativa.
5. Feedback de sucesso/erro deve ser exibido no painel do modulo e no chat quando relevante.

## Non-Functional Requirements
- Fluxo totalmente client-side sem dependencias externas novas.
- UI responsiva para desktop e mobile.
- Falhas de API devem ser tratadas sem quebrar navegacao global.

## Acceptance Criteria
- Modulos 03/04/05 sem placeholder e com operacoes funcionais basicas.
- `npx nx run app-owner-console:build` em verde.
- `npm run preprod:validate -- -SkipSmokePostgres` em verde.
