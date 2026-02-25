# CONTEXT

Project: fabio
Date: 2026-02-24
Status: Milestone 2 implementation active

## Mission
Create a reusable SaaS operating system for Automania AI with strict phase workflow, modular architecture, and measurable outcomes (delivery, quality, reliability, and cost).

## Approved Product Identity (SaaS Standard v1)
Fixed menu and modules:
1. Chat com IA (Module 01 - Owner Concierge)
2. CRM WhatsApp (Module 02)
3. Clientes (Module 03)
4. Agenda (Module 04)
5. Faturamento/Cobranca (Module 05)

## Architecture Direction
- Nx monorepo baseline
- Contract-first module integration
- Tenant-specific persona packs (core remains neutral)
- RAG + semantic memory with auditable promotion pipeline

## Legacy Position
Source system `fabio2` is behavior reference only.
No direct copy of mixed orchestration/persona/runtime code.
Only approved imported legacy assets: `contratos/`.

## AI Baseline
- Default neutral assistant behavior
- Intended default model: gpt-5.1-mini (if available)
- Multimodal support in Module 01 (text/audio/image/file + continuous chat avatar mode)
- Tenant personas are optional runtime overlays (persona 1 owner concierge, persona 2 whatsapp agent)

## Operational Discipline
- Phases: Specify -> Design -> Tasks -> Implement+Validate
- Anti-pollution protocol active
- Metrics tracking in worklog/costlog

## Immediate Goal
Close `milestone-2-owner-settings-multimodal-slice` with persona settings contract propagation and clean checkpoint (commit + gates), then proceed to Milestone 2 exit evaluation.
