# Tasks - milestone-3-production-readiness-planning

Status: Completed
Date: 2026-02-25

## M3P-001 - Publicar baseline de pré-produção
- Status: completed
- Output:
  - checklist formal de pré-produção
  - critérios GO/NO-GO
- Evidence:
  - `.specs/project/PREPROD-BASELINE-CHECKLIST.md`

## M3P-002 - Publicar runbook operacional unificado
- Status: completed
- Output:
  - deploy + rollback
  - incident response
  - fallback de providers
- Evidence:
  - `apps/platform-api/RUNBOOK-production-readiness.md`

## M3P-003 - Definir observabilidade mínima por módulo
- Status: completed
- Output:
  - SLIs/SLOs
  - alertas por severidade
  - owners operacionais
- Evidence:
  - `.specs/project/OBSERVABILITY-BASELINE-M3.md`

## M3P-004 - Definir plano de hardening de segredos/configuração
- Status: completed
- Output:
  - política por ambiente
  - rotação/revogação
  - critérios de auditoria
- Evidence:
  - `.specs/project/SECRETS-HARDENING-PLAN-M3.md`

## M3P-005 - Fechar checkpoint de governança do planning
- Status: completed
- Output:
  - atualização de `STATE`, `worklog`, `costlog`
  - decisão de entrada em implementação Milestone 3
- Evidence:
  - `.specs/project/STATE.md`
  - `.specs/project/worklog.csv`
  - `.specs/project/costlog.csv`
