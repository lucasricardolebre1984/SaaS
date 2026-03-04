# Auditoria Geral SaaS - Nx + Skills

Data: 2026-03-04  
Escopo: monorepo Nx, bootstrap de contexto, governanca de skills (project + globais 37+), rastreabilidade operacional.

## Findings

1. Critical - bootstrap de contexto incompleto no start-day.
- Evidencia anterior: `tools/start-day.ps1` carregava apenas `CONTEXT/PROJECT/ROADMAP/STATE`.
- Impacto: perda de contexto operacional (faltava `PROXIMO-PASSO` e `STATUS-ATUAL`).
- Correcao aplicada: `tools/start-day.ps1` agora inclui os dois arquivos obrigatorios.

2. High - nao havia manifesto machine-readable de skills.
- Evidencia anterior: repositorio possuia catalogo textual (`SKILLS-CATALOG.md`), sem arquivo JSON de comparacao automatica.
- Impacto: sem prova automatica de coverage das 37+ skills e sem baseline auditavel por script.
- Correcao aplicada: novo `tools/skills.json`.

3. High - sem auditoria automatica de skills no fluxo diario.
- Evidencia anterior: `start-day.ps1` instalava skills de projeto, mas nao auditava coverage local.
- Impacto: drift entre "skills esperadas" e "skills realmente instaladas" no agente.
- Correcao aplicada:
- novo `tools/skills-audit.ps1`
- novo comando `npm run skills:audit`
- `start-day.ps1` executa snapshot de skills audit automaticamente.

4. Medium - governanca documentada, mas sem amarracao operacional explicita no runbook.
- Evidencia anterior: runbook descrevia install/start/end, sem opcao de auditoria.
- Correcao aplicada: RUNBOOK atualizado com "Option F - Skills audit".

## Validation Evidence

- Manifesto novo: `tools/skills.json`
- Script novo: `tools/skills-audit.ps1`
- Script diario atualizado: `tools/start-day.ps1`
- Script npm novo: `package.json` (`skills:audit`)
- Catalogo atualizado: `.specs/project/SKILLS-CATALOG.md`
- Runbook atualizado: `.specs/features/agent-skills-cli-mvp/RUNBOOK.md`

## Update - Persona Boundary + Buttons/Endpoints (07:52)

5. Critical - vazamento de Persona 2 no chat do Owner (Persona 1).
- Evidencia: owner console montava `persona_overrides` com `owner_concierge_prompt` + `whatsapp_agent_prompt` no mesmo payload.
- Evidencia: owner response provider adicionava `WhatsApp agent guidance` nas instrucoes do modelo para o chat do Owner.
- Correcao aplicada:
  - `apps/owner-console/src/app.js`: `buildPersonaOverridesFromConfig()` agora envia apenas `owner_concierge_prompt` para interacao do owner.
  - `apps/platform-api/src/owner-response-provider.mjs`: removida injecao de `whatsapp_agent_prompt` nas instrucoes (`responses` e `chat/completions`).
  - teste de regressao adicionado: `apps/platform-api/src/app.test.mjs` (`ignores whatsapp persona prompt in owner ai instructions`).

6. Auditoria geral de botoes/acoes (owner+crm+modulos) executada.
- Comando: `tools/smoke-saas-endpoints.ps1 -BaseUrl https://dev.automaniaai.com.br/api -TenantId tenant_automania`
- Resultado: `PASS=25 WARN=1 FAIL=0` (warn esperado em envio provider externo com persistencia confirmada).
- Prova: `tools/reports/saas-endpoint-smoke-20260304-074936.json`.
- Prova pos-deploy (commit `a40a83f`): `tools/reports/saas-endpoint-smoke-20260304-075555.json` com `PASS=25 WARN=1 FAIL=0`.

7. Prova de carregamento/coverage de skills (37+).
- Comando: `npm run skills:audit`
- Resultado: `Installed skills: 48`, `Global expected: 42`, `minimum: 37`, status `OK`.
- Prova: `tools/reports/skills-audit-20260304-075049.json`.

## Update - T8 Runtime Parity Closed Loop (08:36)

8. Critical - paridade de `crm.automation` no dev estava incompleta.
- Evidencia anterior em dev: `ai/execute update_stage` retornava sem bloco `automation`, gerando `execute_automation=null` no UAT real.
- Causa confirmada: `main` deployado ainda sem pacote local de runtime controls/automation no backend (`app.mjs` + `tenant-runtime-config-store.mjs`).
- Correcao publicada:
  - commit `11a5243` (`feat(crm): enforce tenant runtime pipeline and ai followup automation`)
  - deploy dev executado com health publico `ok`.

9. Prova funcional de fechamento do ponto T8 (follow-up automatico).
- UAT focado no dev:
  - webhook inbound real de thread CRM
  - `POST /v1/crm/conversations/:id/ai/execute` com `action=update_stage` para `proposal`
  - retorno agora inclui `automation.status=scheduled`
  - `followups_for_lead=1`
- Prova: `tools/reports/t8-uat-followup-20260304-083425.json`.

10. Regressao endpoint/botoes apos publicacao do fix.
- Smoke pos-deploy: `PASS=25 WARN=1 FAIL=0`.
- Prova: `tools/reports/saas-endpoint-smoke-20260304-083431.json`.

## Result Snapshot (local codex)

- Path auditado: `%USERPROFILE%\.codex\skills`
- Skills instaladas detectadas: 40+
- Threshold global definido: `>= 37`
- Policy de prova ativa: skill deve ser citada antes de uso.

## Next Controls (recommended)

1. Executar `npm run init:day` com `-FailOnMissingProjectSkills` nos ambientes de agente.
2. Publicar o report JSON de `skills-audit` em artefato CI interno (se houver pipeline para governanca).
3. Revisar trimestralmente `tools/skills.json` vs `SKILLS-CATALOG.md` para evitar drift.
