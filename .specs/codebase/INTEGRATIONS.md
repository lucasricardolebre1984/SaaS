# INTEGRATIONS

Source: fabio2

## Internal integrations
- Frontend calls backend API via NEXT_PUBLIC_API_URL.
- Backend integrates with postgres, redis, storage paths, and COFRE memory model.

## External integrations
1. Evolution API (WhatsApp)
- URL and API key configured by env vars.
- Webhook and outbound processing handled in backend services.

2. OpenAI
- API key, model, embedding, tts, and vision settings in backend config.

3. MiniMax
- Voice/TTS settings in backend config.

4. Google Calendar
- OAuth and callback routes configured in backend.

5. Optional storage on AWS S3
- Config keys present for storage mode switch.

## Security and secrets posture
- Env-variable driven config exists.
- Legacy docs still show dev defaults; production hardening must enforce secret rotation.

## Integration risks
- Provider drift if env naming differs across environments.
- Webhook reliability and retry strategy needs explicit SLOs.
- AI provider cost can grow without per-feature accounting.

## Controls to add in fabio
- Integration contract tests per provider.
- Health checks and alerting per critical integration.
- Cost and failure metrics by provider/service.
