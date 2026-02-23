import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const workflowsPath = path.join(
  repoRoot,
  'libs',
  'mod-02-whatsapp-crm',
  'domain',
  'workflows.json'
);

function readWorkflows() {
  const raw = fs.readFileSync(workflowsPath, 'utf8');
  return JSON.parse(raw);
}

const model = readWorkflows();
const campaign = model?.workflows?.campaign ?? { states: [], transitions: [] };

export const CAMPAIGN_STATES = campaign.states;
const CAMPAIGN_STAGE_SET = new Set(campaign.states);

const transitionsByPair = new Map();
for (const transition of campaign.transitions ?? []) {
  transitionsByPair.set(`${transition.from}=>${transition.to}`, transition);
}

export function isKnownCampaignState(state) {
  return CAMPAIGN_STAGE_SET.has(state);
}

export function validateCampaignStateTransition(currentState, nextState, trigger) {
  if (!isKnownCampaignState(currentState)) {
    return { ok: false, code: 'unknown_current_state' };
  }
  if (!isKnownCampaignState(nextState)) {
    return { ok: false, code: 'unknown_next_state' };
  }
  if (currentState === nextState) {
    return { ok: true, changed: false };
  }

  const transition = transitionsByPair.get(`${currentState}=>${nextState}`);
  if (!transition) {
    return { ok: false, code: 'transition_not_allowed' };
  }

  if (typeof trigger !== 'string' || trigger.trim().length < 3) {
    return { ok: false, code: 'missing_trigger' };
  }
  if (transition.trigger !== trigger) {
    return { ok: false, code: 'trigger_mismatch', expected_trigger: transition.trigger };
  }

  return { ok: true, changed: true };
}
