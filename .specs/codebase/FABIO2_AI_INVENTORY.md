# FABIO2 AI INVENTORY (Behavior Reference Only)

Date: 2026-02-22
Rule: behavior reference only, no blind code copy.

## Capabilities found in fabio2

### Text orchestration
- OpenAI chat flows via dedicated openai service
- Mixed use of chat completions and responses fallback logic

### Audio
- Audio transcription endpoint and service flow
- TTS endpoint and runtime provider checks
- Frontend supports mic capture + upload + continuous conversation handling

### Vision and image
- Vision analysis endpoint using image inputs
- Image generation support with prompt flow

### Retrieval / memory
- Embedding generation flow
- Vector storage using pgvector + cosine search
- Redis usage for memory/runtime support
- Fallback embedding mode for degraded operation

### WhatsApp + AI bridge
- Evolution webhook processing
- Audio transcription and image understanding on inbound WhatsApp messages
- AI-generated replies and outbound queue handling

## Risks observed
- High coupling around orchestration and runtime helper layers
- Persona/context behavior mixed with transport/webhook responsibilities
- Potential route and service overlap in AI + CRM responsibilities

## Migration guidance
- Keep only behavioral requirements.
- Redesign module boundaries before implementation.
- Enforce contract tests for every migrated AI capability.
