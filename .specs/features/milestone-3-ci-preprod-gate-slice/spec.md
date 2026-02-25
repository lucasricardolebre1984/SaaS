# Spec - milestone-3-ci-preprod-gate-slice

Status: Approved
Date: 2026-02-25

## Objective
Integrar o gate `preprod:validate` ao pipeline CI para bloquear merges com regressões operacionais.

## Scope
- Atualizar workflow runtime para executar `npm run preprod:validate`.
- Publicar evidência de relatório de gate como artifact de CI.
- Manter workflow manual (`workflow_dispatch`) disponível.

## Functional Requirements
1. CI deve falhar se qualquer etapa de `preprod:validate` falhar.
2. CI deve anexar relatório `tools/reports/preprod-validate-*.log` como artifact.
3. Execução deve ocorrer em `push` e `pull_request` para `main`.

## Non-Functional Requirements
- Sem duplicar comandos já cobertos pelo gate unificado.
- Sem quebrar compatibilidade do workflow atual.

## Acceptance Criteria
- Workflow atualizado com job único de gate unificado.
- Artifact do relatório disponível ao final da execução.
