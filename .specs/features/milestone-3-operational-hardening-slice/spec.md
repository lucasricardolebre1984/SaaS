# Spec - milestone-3-operational-hardening-slice

Status: Approved
Date: 2026-02-25

## Objective
Executar hardening operacional com gates automatizados de pré-produção para reduzir erro manual na decisão GO/NO-GO.

## Scope
- Criar comando único `preprod:validate` para executar checklist técnico obrigatório.
- Gerar evidência local com timestamp dos resultados.
- Alinhar runbooks e governança ao novo gate executável.

## Functional Requirements
1. Disponibilizar script operacional para validar:
   - runtime tests
   - contract checks
   - tenant validation
   - build owner/crm consoles
   - smoke postgres
2. Falha em qualquer etapa deve encerrar com código diferente de zero.
3. Resultado deve registrar timestamp e status por etapa.

## Non-Functional Requirements
- Script deve ser executável em Windows (PowerShell).
- Saída deve ser auditável e simples de ler.
- Não alterar contratos de domínio nesta entrega.

## Out Of Scope
- Deploy real em produção.
- Integração com pipeline CI externo neste slice.

## Acceptance Criteria
- `npm run preprod:validate` disponível e funcional.
- Evidência de execução registrada em arquivo local.
- Governança atualizada (`STATE`, `worklog`, `costlog`).
