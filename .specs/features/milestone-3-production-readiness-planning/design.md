# Design - milestone-3-production-readiness-planning

Status: Approved
Date: 2026-02-25

## Architecture Plan
1. **Release topology**
   - Ambientes: `local -> hml -> prod`.
   - Estratégia: `progressive rollout` com janela curta de rollback.
2. **Operational control plane**
   - Health checks por módulo.
   - Readiness checks por dependência crítica (DB, fila, provider).
   - Feature flags para desligamento controlado de fluxos críticos.
3. **Observability baseline**
   - Logs estruturados por `tenant_id`, `correlation_id`, `module`.
   - Métricas por endpoint/worker.
   - Alertas mínimos para latência, erro e backlog.
4. **Security and config**
   - Segredos fora de `localStorage` para ambientes reais.
   - Política de rotação e revogação.
   - Checklist de configuração por ambiente.
5. **Runbooks**
   - Deploy.
   - Rollback.
   - Incident triage.
   - Provider outage fallback.

## Deliverables
- `apps/platform-api/RUNBOOK-production-readiness.md` (novo).
- Checklist de pré-produção em `.specs/project/`.
- Matriz de SLO/alerts por módulo.
- Plano de testes operacionais (rollback drill e failover drill).

## Validation Strategy
- Gate de qualidade existente preservado:
  - `npx nx run app-platform-api:test`
  - `npx nx run contract-tests:contract-checks`
  - `npm run smoke:postgres`
- Gate novo (planejado):
  - `preprod-checklist:validate` (a definir no próximo slice).
