# ROADMAP

Last update: 2026-02-26

## Milestone 0 - Institutional Foundation (completed)
Objective: Create governance, architecture baseline, and metrics operating system.

Features:
- foundation-monorepo-bootstrap
- saas-standard-v1
- agent-skills-cli-mvp
- dual-concierge-core-standard
- engineering-metrics-platform
- module-decomposition-plan
- runtime-dual-concierge-slice

Exit criteria:
- Foundation specs approved
- Nx workspace baseline running locally
- Quality gates documented

Status update:
- Exit criteria achieved (contracts + runtime skeleton + contract-check gate).
- Ready to execute Milestone 1 implementation slices.

## Milestone 1 - Core Platform Migration (completed)
Objective: Bring core domains from fabio2 into modular architecture.

Target domains:
- mod-01-owner-concierge
- mod-02-whatsapp-crm
- mod-03-clientes
- mod-04-agenda
- mod-05-faturamento-cobranca
- contratos

Exit criteria:
- Domain boundaries respected
- CI quality gates stable
- No regression in key user flows

Status update:
- Exit checklist closed in `.specs/project/MILESTONE-1-EXIT-CHECKLIST.md`.
- Ready to start Milestone 2 implementation stream.

## Milestone 2 - Shared SaaS Template (completed)
Objective: Make this repository reusable as SaaS starter kit.

Deliverables:
- design system and layout shell
- configurable brand/palette tokens
- generator/playbook for spinning up new SaaS

Exit criteria:
- New SaaS skeleton created in less than 1 day
- Shared modules reused with minimal overrides

Status update:
- UI shell slice completed (`milestone-2-ui-shell-slice`).
- Template generator slice completed (`milestone-2-template-generator-slice`).
- Owner settings/multimodal slice implemented with persona 1/2 prompt contract propagation (`milestone-2-owner-settings-multimodal-slice`).
- Milestone 2 exit checklist closed with explicit GO decision:
  - `.specs/project/MILESTONE-2-EXIT-CHECKLIST.md`

## Milestone 3 - Production Readiness (completed)
Objective: Enable controlled deploy with observability and rollback.

Deliverables:
- release strategy
- aws runbook
- incident and rollback procedures
- cost and reliability dashboards

Exit criteria:
- pre-production checklist pass
- canary deployment validated
- rollback tested

Status update:
- Planning baseline completed com artifacts:
  - `.specs/project/PREPROD-BASELINE-CHECKLIST.md`
  - `apps/platform-api/RUNBOOK-production-readiness.md`
  - `.specs/project/OBSERVABILITY-BASELINE-M3.md`
  - `.specs/project/SECRETS-HARDENING-PLAN-M3.md`
- First execution slice completed:
  - `milestone-3-operational-hardening-slice`
  - executable gate command: `npm run preprod:validate`
- CI integration slice completed:
  - `milestone-3-ci-preprod-gate-slice`
  - runtime workflow runs unified gate and publishes report artifact
- Branch protection slice completed:
  - automation published (`tools/enforce-branch-protection.ps1`)
  - enforcement completed on `main` with required check `Preprod Validate`
- Release/rollback drill slice completed:
  - `milestone-3-release-rollback-drill-slice`
  - commands published:
    - `npm run release:dry-run`
    - `npm run rollback:drill`
  - unified gate now executes operational drill checks with report artifacts
- Milestone 3 exit checklist closed com decisao GO:
  - `.specs/project/MILESTONE-3-EXIT-CHECKLIST.md`

## Milestone 4 - Next Cycle Definition (in progress)
Objective: Define the next implementation stream after Milestone 3 readiness closure.

Deliverables:
- first post-M3 feature slice opened in `.specs/features/*`
- spec/design/tasks approved before implementation
- STATE and AGENTS aligned to the new active feature

Exit criteria:
- next feature has approved `spec.md`, `design.md`, and `tasks.md`
- implementation can start without scope ambiguity

Status update:
- kickoff started:
  - feature implemented and validated:
    - `milestone-4-mod-01-owner-ai-runtime-slice`
    - owner response runtime provider (`auto/openai/local/off`) integrated in module 01
    - contract enrichment for `assistant_output`
  - feature implemented and validated:
    - `milestone-4-mod-01-layout-voice-polish-slice`
    - owner chat layout optimized for space usage and composer ergonomics
    - continuous browser voice loop integrated with auto speech dispatch
    - avatar stage framing corrected for immersive mode without oversized crop
    - gates passed (`app-platform-api:test`, `contract-checks`, `preprod:validate -- -SkipSmokePostgres`)
  - feature implemented and validated:
    - `milestone-4-mod-01-avatar-fullscreen-slice`
    - approved avatar asset (`AvatarSaaS.mov`) converted to web and integrated in module 01
    - continuous mode now runs fullscreen with only transparent `Voltar` action visible
    - browser source fallback enabled (`webm` preferred, `mp4` fallback)
    - gate passed (`app-owner-console:build`)
  - hotfix slice implemented and validated:
    - `milestone-4-mod-01-avatar-attachments-hotfix-slice`
    - fixed black avatar playback with compatibility-first source and replay fallback
    - fixed real image/file reading path by forwarding inline attachments to OpenAI provider
    - gates passed (`app-owner-console:build`, `app-platform-api:test`, `contract-checks`)
  - feature implemented and validated:
    - `milestone-4-mod-01-continuous-voice-output-slice`
    - module 01 continuous mode now emits assistant voice output via OpenAI TTS endpoint
    - recognition pause/resume around playback added to avoid self-capture loop
    - gates passed (`app-platform-api:test`, `app-owner-console:build`)
  - next feature opened in Specify:
    - `milestone-4-mod-01-tool-execution-policy-slice`
    - status: implemented and validated
    - planner/runtime now enforce `allow|deny|confirm_required` before queue dispatch
    - interaction contract includes `policy_decision` metadata
  - feature implemented and validated:
    - `milestone-4-mod-01-confirmation-workflow-slice`
    - `confirm_required` now creates pending confirmation with explicit `confirmation_id`
    - endpoint `POST /v1/owner-concierge/interaction-confirmations` resolves `approve|reject`
    - approval path enqueues `module.task.create` preserving original correlation trace
    - orchestration contracts expanded with confirmation lifecycle events
    - gates passed (`app-platform-api:test`, `contract-checks`, `preprod:validate -- -SkipSmokePostgres`)
  - feature implemented and validated:
    - `milestone-4-mod-01-confirmation-queue-safeguards-slice`
    - safeguards added for confirmation queue: tenant pending limit + TTL expiration on resolution
    - queue endpoint added:
      - `GET /v1/owner-concierge/interaction-confirmations`
    - runtime health now publishes confirmation runtime config (`max_pending_per_tenant`, `ttl_seconds`)
    - gates passed (`app-platform-api:test`, `contract-checks`, `preprod:validate -- -SkipSmokePostgres`)
  - feature implemented and validated:
    - `milestone-4-owner-console-approval-queue-ui-slice`
    - module 01 owner console now has operational approvals queue panel with filter + action buttons
    - UI integrated with endpoints:
      - `GET /v1/owner-concierge/interaction-confirmations`
      - `POST /v1/owner-concierge/interaction-confirmations`
    - chat flow auto-refreshes queue when `confirm_required` returns pending confirmation
    - gates passed (`app-owner-console:build`, `app-platform-api:test`, `preprod:validate -- -SkipSmokePostgres`)
  - feature implemented and validated:
    - `milestone-4-runtime-config-coupling-slice`
    - module 06 settings now sync tenant OpenAI/persona runtime config to backend via:
      - `POST /v1/owner-concierge/runtime-config`
      - `GET /v1/owner-concierge/runtime-config`
    - owner interaction now applies tenant runtime config:
      - tenant-scoped OpenAI key/model
      - tenant persona fallback
      - optional confirmation disable (`confirm_required` -> `allow`)
    - gates passed (`app-platform-api:test`, `contract-checks`, `app-owner-console:build`, `app-crm-console:build`)
  - feature implemented and validated:
    - `milestone-4-mod-01-openai-strict-provider-slice`
    - tenant runtime OpenAI key now enforces strict provider mode (`openai`) with explicit `owner_response_provider_error` on upstream failure
    - owner console topbar now exposes last assistant provider (`openai|local|none|error`) with model/fallback telemetry
    - runtime config store default now isolates by app storage root (no cross-session global leakage)
    - gates passed (`app-platform-api:test`, `app-owner-console:build`)
  - feature implemented and validated:
    - `milestone-4-mod-01-chat-clean-voice-continuous-slice`
    - module 01 now supports direct audio pipeline (record -> transcribe -> auto-send) via tenant OpenAI endpoint:
      - `POST /v1/owner-concierge/audio/transcribe`
    - chat stream cleaned from internal status/provider/task noise for operator UX parity
    - continuous mode now activates avatar-first layout with immersive stage
    - defaults updated to gpt-5.1 baseline in owner/runtime config
    - gates passed (`app-platform-api:test`, `app-owner-console:build`)
  - context lock approved for next slice:
    - canonical dual-concierge model promoted to root context (`CONTEXT.md`)
    - mandatory continuous learning target (short/medium/long memory tiers) with strict session boundaries
  - feature implemented and validated:
    - `milestone-4-dual-concierge-memory-orchestrator-slice`
    - short memory store + recall + append turn (M4D-008), episode event memory.episode.created every N turns (M4D-009a/b), unified recall short + operational_context + retrieved_context (M4D-010), crm.delegation.sent/failed in worker drain for mod-02 (M4D-011/012)
    - M4D-009c (persist episode in medium store) left for future
    - gates passed: `app-platform-api:test`, `contract-checks`
  - next slice opened in Specify: milestone-4-episode-recall-slice (episode context in recall for Persona 1)
  - feature implemented and validated: milestone-4-episode-recall-slice (M4E-001a..d episode_context in recall; provider instructions + system message; gates passed)
  - feature implemented: milestone-4-long-memory-promotion-slice (promocao episodio -> memoria longa; evento memory.promoted.from_episode; PROXIMO-PASSO: memoria/contexto/aprendizado fechados no produto)

## Milestone 5 - AWS Deployment Bootstrap (in progress)
Objective: Put the matrix SaaS in AWS dev with production-grade persistence and operational gates.

Deliverables:
- AWS dev deploy runbook for `dev.automaniaai.com`
- deploy readiness gate with report artifacts
- env baseline for postgres + providers
- context lock updates across project docs

Exit criteria:
- `deploy:aws:readiness` green with report artifact
- runtime in AWS dev uses `postgres` backend
- DNS and reverse proxy flow documented and validated

Status update:
- first execution slice opened:
  - `milestone-5-aws-production-bootstrap-slice`
  - scope: context lock + readiness gate + runbook + governance checkpoint
  - validation target: Nx gates + preprod + deploy readiness report
- slice implemented and validated:
  - `deploy:aws:readiness` command published and executed
  - runbook `RUNBOOK-aws-deploy-dev.md` + `.env.aws.example` published
  - readiness gate passed with `-SkipSmokePostgres` in local machine (Docker indisponivel)

## Parking Lot (do not execute now)
- Multi-brand color palette system for each SaaS
- Advanced AI cost optimization per provider/model
- Cross-product analytics layer
