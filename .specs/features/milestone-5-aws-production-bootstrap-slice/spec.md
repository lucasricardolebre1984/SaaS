# Spec - milestone-5-aws-production-bootstrap-slice

Status: Approved
Date: 2026-02-26

## Objective
Executar o bootstrap de producao do SaaS matriz (`fabio`) em AWS com banco gerenciado, gates auditaveis e runbook operacional para dominio `dev.automaniaai.com`.

## Scope
- Consolidar estrategia de deploy do SaaS matriz (single deploy multi-tenant).
- Definir baseline tecnico para AWS (API/Owner/CRM + Postgres + observabilidade).
- Publicar gate executavel de readiness para deploy.
- Publicar runbook de deploy para ambiente `dev` com DNS Hostinger.
- Atualizar contexto institucional (CONTEXT/PROJECT/ROADMAP/STATE/PROXIMO-PASSO/AGENTS/README).

## Functional Requirements
1. Deve existir um comando unico para readiness de deploy AWS com relatorio rastreavel.
2. O gate deve validar ao menos:
   - testes runtime
   - contract checks
   - build owner/crm
   - smoke postgres
   - precondicoes de configuracao AWS/dev.
3. A documentacao deve definir claramente:
   - onde roda o backend
   - onde roda Evolution
   - onde persiste banco
   - como apontar `dev.automaniaai.com`.
4. O modelo operacional deve ser multi-tenant (tenant por cliente) no mesmo deploy base.

## Non-Functional Requirements
- Tudo auditavel por data/hora e artefatos em `.specs/project/*` e `tools/reports/*`.
- Sem introduzir dependencia de fabio2.
- Mudancas reversiveis e compatveis com gates atuais Nx/CI.

## Out Of Scope
- Go-live em producao final (`prod`) nesta etapa.
- Provisionamento automatico completo de infraestrutura AWS via IaC.
- Migração de dados de clientes reais.

## Acceptance Criteria
- `spec/design/tasks` publicados e coerentes.
- Novo gate `deploy:aws:readiness` executavel e documentado.
- Contexto raiz atualizado para eixo de deploy AWS.
- Gates Nx e preprod validados com evidencias locais.
