# CONTEXT

Project: fabio
Date: 2026-02-26
Status: AWS production bootstrap active

## Mission
Create a reusable SaaS operating system for Automania AI with strict phase workflow, modular architecture, and measurable outcomes (delivery, quality, reliability, and cost).

## Approved Product Identity (SaaS Standard v1)
Fixed menu and modules:
1. Chat com IA (Module 01 - Owner Concierge)
2. CRM WhatsApp (Module 02)
3. Clientes (Module 03)
4. Agenda (Module 04)
5. Faturamento/Cobranca (Module 05)
6. Configuracoes (Module 06 - tenant runtime control plane)

## Architecture Direction
- Nx monorepo baseline
- Contract-first module integration
- Tenant-specific persona packs (core remains neutral)
- RAG + semantic memory with auditable promotion pipeline

## UI Direction (institutional)
- Target visual baseline: enterprise CRM style (Krayin-like interaction model) with SaaS identity.
- Default template theme: dark/green with configurable tenant overrides in Module 06.
- Visual consistency required across all modules (01..06), preserving persona roles:
  - Persona 1: owner cockpit/orchestration view.
  - Persona 2: CRM WhatsApp execution/inbox/pipeline view.

## Legacy Position
Source system `fabio2` is behavior reference only.
No direct copy of mixed orchestration/persona/runtime code.
Only approved imported legacy assets: `contratos/`.

## AI Baseline
- Default neutral assistant behavior
- Intended default model: gpt-5.1-mini (if available)
- Multimodal support in Module 01 (text/audio/image/file + continuous chat avatar mode)
- Tenant personas are optional runtime overlays (persona 1 owner concierge, persona 2 whatsapp agent)
- Module 06 settings must be backend-coupled by tenant (no local-only runtime for OpenAI/persona execution).

## Canonical Dual-Concierge Model (Institutional Standard)
This repository defines a fixed SaaS standard model:

1. Persona 1 (`owner concierge`) is the primary orchestrator.
   - Role: trusted executive assistant ("Alfred" model) for the owner.
   - Must understand all SaaS modules (01..06) and answer operationally about each one.
   - Must translate owner intent into cross-module actions (clientes, agenda, cobranca, CRM).
2. Persona 2 (`whatsapp concierge`) is the execution specialist for WhatsApp/CRM.
   - Role: lead capture, qualification, follow-up, and operational customer communication.
   - Must register and update leads/clients in SaaS contracts (no side-only memory).
3. Persona-to-persona orchestration is mandatory.
   - Persona 1 issues delegated actions to Persona 2 for WhatsApp execution.
   - Persona 2 returns execution results/events that feed Persona 1 operational awareness.

## CRM Standard Flow (Target Reference)
- Capture -> Qualify -> Proposal -> Follow-up -> Won/Lost.
- Conversion continuity:
  - lead -> customer creation
  - customer -> agenda/reminder
  - customer/contract -> charge/payment/collection
- All transitions must be contract-first, auditable, and tenant-scoped.

## Memory and Session Standard (No-Context-Loss Goal)
- Mandatory memory tiers:
  - short memory: active session context
  - medium memory: episodic operational history
  - long memory: promoted durable knowledge
- Session control requirements:
  - strict tenant/session/channel scoping
  - deterministic restore/resume behavior
  - no cross-tenant leakage
- Continuous learning requirement:
  - owner interactions must feed memory capture and retrieval pipeline with audit trace.

## Operational Discipline
- Phases: Specify -> Design -> Tasks -> Implement+Validate
- Anti-pollution protocol active
- Metrics tracking in worklog/costlog

## Immediate Goal
Execute SaaS matrix deployment bootstrap for AWS dev environment:
- enable production-like runtime (`postgres` backend) as default target for remote deploy,
- lock operational path for `dev.automaniaai.com` with auditable gates,
- keep multi-tenant model (`tenant_id`) as the scaling unit for client onboarding.
