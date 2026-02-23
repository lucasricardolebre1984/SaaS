import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const transitionsPath = path.join(
  repoRoot,
  'libs',
  'mod-02-whatsapp-crm',
  'domain',
  'lead-funnel.transitions.json'
);

function readTransitions() {
  const raw = fs.readFileSync(transitionsPath, 'utf8');
  const parsed = JSON.parse(raw);
  return parsed;
}

const model = readTransitions();

export const LEAD_STAGES = model.states;
const STAGE_SET = new Set(model.states);

const transitionsByPair = new Map();
for (const transition of model.transitions) {
  transitionsByPair.set(`${transition.from}=>${transition.to}`, transition);
}

export function isKnownLeadStage(stage) {
  return STAGE_SET.has(stage);
}

export function normalizeLeadStageForPublicEvent(stage) {
  const mapping = model.normalization_for_public_events?.['crm.lead.created.stage'] ?? {};
  return mapping[stage] ?? stage;
}

export function validateLeadStageTransition(currentStage, nextStage, trigger, reasonCode) {
  if (!isKnownLeadStage(currentStage)) {
    return { ok: false, code: 'unknown_current_stage' };
  }
  if (!isKnownLeadStage(nextStage)) {
    return { ok: false, code: 'unknown_next_stage' };
  }
  if (currentStage === nextStage) {
    return { ok: true };
  }

  const transition = transitionsByPair.get(`${currentStage}=>${nextStage}`);
  if (!transition) {
    return { ok: false, code: 'transition_not_allowed' };
  }

  if (typeof trigger !== 'string' || trigger.length < 3) {
    return { ok: false, code: 'missing_trigger' };
  }
  if (transition.trigger !== trigger) {
    return { ok: false, code: 'trigger_mismatch', expected_trigger: transition.trigger };
  }

  if (transition.requires_reason_code === true) {
    if (typeof reasonCode !== 'string' || reasonCode.trim().length < 3) {
      return { ok: false, code: 'reason_code_required' };
    }
  }

  return { ok: true };
}
