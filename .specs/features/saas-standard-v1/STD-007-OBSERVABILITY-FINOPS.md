# STD-007 - Observability and Financial Metrics Wiring Plan

Status: Completed  
Date: 2026-02-23

## Objective
Define:
- per-module KPI map
- AI/provider cost map
- explicit linkage to formulas in `.specs/project/METRICS.md`

## Artifacts
- KPI map:
  - `libs/core/audit-metrics/kpi-map.json`
- AI/provider cost map:
  - `libs/core/audit-metrics/ai-provider-cost-map.json`

## Formula Linkage Rule
Each KPI/cost metric must include:
- `metrics_formula_ref.id` (number in METRICS.md)
- `metrics_formula_ref.name`
- `metrics_formula_ref.formula_text`

## Coverage Summary
- Module KPI coverage:
  - mod-01-owner-concierge
  - mod-02-whatsapp-crm
  - mod-03-clientes
  - mod-04-agenda
  - mod-05-faturamento-cobranca
  - core
- Cost coverage:
  - provider-level (OpenAI and future providers)
  - service-level (tokens, audio, image, embedding, tooling, infra)
  - module allocation dimensions

## Next Usage
- Implement collectors and ETL jobs that populate:
  - `ai_usage_metrics`
  - `provider_cost_entries`
  - `kpi_daily_snapshots`
- Build dashboards using these map files as canonical metric dictionary.
