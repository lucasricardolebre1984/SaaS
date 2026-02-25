# Production Readiness Runbook

Date: 2026-02-25  
Status: Planning baseline (no production deploy executed)
Scope: `app-platform-api` + módulos SaaS padrão

## 1. Deploy Flow (controlled)

### 1.1 Pre-deploy gate (mandatory)
Execute in `C:\projetos\fabio`:

```powershell
npx nx run app-platform-api:test
npx nx run contract-tests:contract-checks
npm run tenant:validate
npx nx run app-owner-console:build
npx nx run app-crm-console:build
npm run smoke:postgres
```

Any failure = block deploy.

### 1.2 Release window checklist
1. Confirm latest `main` commit hash.
2. Confirm on-call owner available.
3. Confirm rollback window and communication channel.
4. Freeze non-critical changes until post-release validation.

### 1.3 Post-deploy validation (hml/prod)
1. `GET /health` returns `status=ok`.
2. Create owner interaction and verify accepted command path.
3. Verify one trace by `correlation_id`.
4. Verify queue drain and no stuck growth.
5. Validate one CRM and one billing critical flow.

## 2. Rollback Flow (mandatory)

### 2.1 Trigger conditions
- Health degraded after release.
- Error rate above agreed threshold.
- Critical flow broken (owner interaction, billing collection, CRM follow-up).

### 2.2 Immediate rollback actions
1. Revert to previous stable release artifact.
2. Switch runtime backend as needed using:
   - `apps/platform-api/RUNBOOK-backend-switch.md`
3. Re-run minimal validation:
   - `GET /health`
   - owner interaction + trace check
4. Record incident and timeline in governance logs.

## 3. Incident Response

### 3.1 Severity model
- `SEV-1`: service unavailable / billing critical outage
- `SEV-2`: major degradation with workaround
- `SEV-3`: partial feature degradation

### 3.2 Response sequence
1. Detect and classify severity.
2. Assign incident commander.
3. Stabilize service (rollback or feature flag off).
4. Preserve evidence (`correlation_id`, logs, failing payload class).
5. Publish post-incident summary and corrective actions.

## 4. Provider Fallback (OpenAI / Evolution / Google)

### 4.1 OpenAI degradation
1. Keep service online using neutral baseline behavior.
2. Disable optional multimodal features if required.
3. Preserve memory/context pipeline integrity.

### 4.2 Evolution/WhatsApp degradation
1. Pause WhatsApp dispatch operations.
2. Keep lead/campaign/follow-up records in pending state.
3. Resume dispatch after provider recovery with controlled drain.

### 4.3 Calendar provider degradation
1. Keep reminders internally queued.
2. Avoid data loss: do not drop appointment/reminder records.
3. Retry once provider recovers.

## 5. Operational Ownership (baseline)
- Release owner: Engineering lead
- Runtime/API owner: Platform API owner
- CRM/WhatsApp owner: Module 02 owner
- Billing owner: Module 05 owner
- Incident commander: designated on-call for change window

## 6. Audit Artifacts
- `.specs/project/STATE.md`
- `.specs/project/worklog.csv`
- `.specs/project/costlog.csv`
- `.specs/project/PREPROD-BASELINE-CHECKLIST.md`
