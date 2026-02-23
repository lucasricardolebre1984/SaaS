# METRICS

Last update: 2026-02-22

## Metric Operating Model
Every metric must have:
- Name
- Formula
- Source
- Owner
- Review cadence
- Target

## A. Delivery and Flow (DORA + execution)
1. Deployment Frequency
- Formula: deployments to production per day/week
- Source: CI/CD logs
- Target initial: >= 1 per week (when production starts)

2. Lead Time for Changes
- Formula: production_time - first_commit_time
- Target initial: < 3 days median

3. Change Failure Rate
- Formula: failed_deployments / total_deployments
- Target initial: < 15%

4. Time to Restore Service (MTTR)
- Formula: incident_resolved_at - incident_started_at
- Target initial: < 2 hours

5. Cycle Time (feature)
- Formula: done_time - task_start_time
- Target initial: trend down each month

## B. Quality and Reliability
6. Test Pass Rate
- Formula: passed_tests / total_tests
- Target: > 98%

7. Escaped Defects
- Formula: prod_bugs / release
- Target: <= 1 critical per release

8. Availability (SLO)
- Formula: uptime_minutes / total_minutes
- Target: >= 99.5% initially

9. API p95 Latency
- Formula: p95 response time per endpoint
- Target: set per endpoint class

## C. Financial (FinOps + SaaS)
10. Total Cloud Cost (monthly)
- Formula: sum(all cloud invoices)

11. Cost per Environment
- Formula: monthly_cost_env / env

12. Cost per Active Tenant
- Formula: monthly_cloud_cost / active_tenants

13. Cost per Paying Customer
- Formula: monthly_cloud_cost / paying_customers

14. AI Cost per Feature
- Formula: ai_token_cost_for_feature / delivered_feature

15. Gross Margin Proxy
- Formula: (revenue - infra_cost - ai_cost) / revenue

## D. Team Productivity (Human + AI)
16. Human Focus Hours (daily)
- Formula: sum(session_end - session_start)

17. AI Coding Hours (daily)
- Formula: sum(agent_active_windows)

18. Automation Rate
- Formula: automated_tasks / total_tasks

19. Rework Rate
- Formula: reopened_tasks / closed_tasks

## Tracking Files
- .specs/project/worklog.csv
- .specs/project/costlog.csv

## CSV Templates

worklog.csv columns:
- date
- start_time
- end_time
- duration_hours
- phase
- feature
- task_id
- actor (human|ai|pair)
- status
- notes

costlog.csv columns:
- date
- provider
- service
- environment
- amount_brl
- amount_usd
- category (infra|ai|tooling|other)
- reference

## Cadence
- Daily: worklog update
- Weekly: delivery + quality review
- Monthly: financial and unit economics review

## Wiring Artifacts (SaaS Standard v1)
- Per-module KPI map:
  - `libs/core/audit-metrics/kpi-map.json`
- AI/provider cost map:
  - `libs/core/audit-metrics/ai-provider-cost-map.json`

Rule:
- Every map entry must include `metrics_formula_ref` matching this file.
