# Observability Baseline - Milestone 3

Date: 2026-02-25  
Status: Baseline published (planning)

## Global Principles
1. Todo log operacional deve conter: `tenant_id`, `correlation_id`, `module`, `event_name` (quando existir).
2. Métricas devem separar sucesso, erro e latência.
3. Alertas com severidade:
   - `P1`: indisponibilidade / perda de fluxo crítico
   - `P2`: degradação alta
   - `P3`: degradação moderada

## Module Baseline (SLI/SLO/Alerts/Owner)

### mod-01-owner-concierge
- SLI:
  - taxa de sucesso `POST /v1/owner-concierge/interaction`
  - p95 de latência de interação
- SLO inicial:
  - sucesso >= 99.0%
  - p95 <= 1200ms
- Alertas:
  - P1 se sucesso < 95% por 5 min
  - P2 se p95 > 2000ms por 10 min
- Owner: Plataforma IA

### mod-02-whatsapp-crm
- SLI:
  - taxa de sucesso de dispatch (follow-up e collections)
  - backlog pendente de fila de envio
- SLO inicial:
  - sucesso >= 98.0%
  - backlog <= limite operacional definido por janela
- Alertas:
  - P1 se dispatch crítico falhar em sequência acima de limite
  - P2 se backlog crescer continuamente por 15 min
- Owner: CRM/WhatsApp

### mod-03-clientes
- SLI:
  - taxa de sucesso em criação/atualização de cliente
  - taxa de idempotência correta por `external_key`
- SLO inicial:
  - sucesso >= 99.5%
  - conflitos de idempotência indevidos = 0
- Alertas:
  - P2 para erro persistente em create/upsert
- Owner: Dados de Clientes

### mod-04-agenda
- SLI:
  - taxa de sucesso criação/atualização de appointment/reminder
  - taxa de envio de lembrete no horário esperado
- SLO inicial:
  - sucesso >= 99.0%
  - atraso máximo de reminder dentro da janela operacional
- Alertas:
  - P2 para falha recorrente de lembrete
- Owner: Agenda

### mod-05-faturamento-cobranca
- SLI:
  - taxa de sucesso em criação de cobrança/pagamento
  - taxa de dispatch de cobrança
- SLO inicial:
  - sucesso >= 99.0%
  - falha de dispatch crítico < 1%
- Alertas:
  - P1 para falha de cobrança crítica
  - P2 para aumento anormal de erro de pagamento
- Owner: Billing/Cobrança

## Dashboards mínimos (pré-prod)
1. Runtime API health + p95 + error rate.
2. Queue depth e throughput de workers.
3. Dispatch success/failure por módulo.
4. Custos estimados de API por módulo (owner console).

## Evidence and Governance
- Base de KPI e custo:
  - `libs/core/audit-metrics/kpi-map.json`
  - `libs/core/audit-metrics/ai-provider-cost-map.json`
- Registro de estado:
  - `.specs/project/STATE.md`
