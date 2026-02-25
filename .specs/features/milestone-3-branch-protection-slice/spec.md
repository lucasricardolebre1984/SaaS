# Spec - milestone-3-branch-protection-slice

Status: Approved
Date: 2026-02-25

## Objective
Aplicar branch protection institucional no `main` para impedir merge sem gate técnico aprovado.

## Scope
- Automatizar aplicação de proteção do branch `main`.
- Exigir check de CI (`Preprod Validate`) como status obrigatório.
- Exigir PR com aprovação mínima.

## Functional Requirements
1. Bloquear push direto no `main` sem PR.
2. Exigir pelo menos 1 aprovação de review para merge.
3. Exigir check `Preprod Validate` aprovado.
4. Habilitar rebase linear policy (`required_linear_history`).
5. Manter admins também sob enforcement.

## Non-Functional Requirements
- Processo reproduzível via script versionado.
- Resultado auditável via documento de governança.

## Acceptance Criteria
- Script de branch protection publicado em `tools/`.
- Proteção aplicada no repositório `lucasricardolebre1984/fabio`.
- Evidência registrada em `.specs/project/`.
