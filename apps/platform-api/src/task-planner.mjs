import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultPolicyPath = path.resolve(__dirname, '..', 'config', 'task-routing.policy.json');

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function assertValidRoute(route, contextName) {
  if (!route || typeof route !== 'object') {
    throw new Error(`Invalid route object in ${contextName}`);
  }
  if (!isNonEmptyString(route.target_module)) {
    throw new Error(`Missing route.target_module in ${contextName}`);
  }
  if (!isNonEmptyString(route.task_type)) {
    throw new Error(`Missing route.task_type in ${contextName}`);
  }
  if (!['low', 'normal', 'high'].includes(route.priority)) {
    throw new Error(`Invalid route.priority in ${contextName}`);
  }
  if (typeof route.simulate_failure !== 'boolean') {
    throw new Error(`Invalid route.simulate_failure in ${contextName}`);
  }
}

function assertValidPolicy(policy) {
  if (!policy || typeof policy !== 'object') {
    throw new Error('Task routing policy must be an object');
  }
  assertValidRoute(policy.default_route, 'default_route');

  if (!Array.isArray(policy.rules)) {
    throw new Error('Task routing policy rules must be an array');
  }

  for (const rule of policy.rules) {
    if (!isNonEmptyString(rule?.id)) {
      throw new Error('Each task routing rule must define id');
    }
    if (!Array.isArray(rule?.keywords) || rule.keywords.length === 0) {
      throw new Error(`Rule ${rule.id} must define at least one keyword`);
    }
    for (const keyword of rule.keywords) {
      if (!isNonEmptyString(keyword)) {
        throw new Error(`Rule ${rule.id} contains invalid keyword`);
      }
    }
    assertValidRoute(rule.route, `rule:${rule.id}`);
  }
}

function normalizeText(value) {
  return String(value ?? '').toLowerCase();
}

function routeFromRule(rule) {
  return {
    target_module: rule.route.target_module,
    task_type: rule.route.task_type,
    priority: rule.route.priority,
    simulate_failure: rule.route.simulate_failure,
    rule_id: rule.id
  };
}

export function createTaskPlanner(options = {}) {
  const policyPath = options.policyPath
    ? path.resolve(options.policyPath)
    : defaultPolicyPath;
  const policy = readJsonFile(policyPath);
  assertValidPolicy(policy);

  return {
    policyPath,
    plan(request) {
      if (!request || request.operation !== 'send_message') {
        return null;
      }

      const text = normalizeText(request.payload?.text);
      for (const rule of policy.rules) {
        const matched = rule.keywords.some((keyword) => text.includes(keyword.toLowerCase()));
        if (matched) {
          return routeFromRule(rule);
        }
      }

      return {
        target_module: policy.default_route.target_module,
        task_type: policy.default_route.task_type,
        priority: policy.default_route.priority,
        simulate_failure: policy.default_route.simulate_failure,
        rule_id: 'default_route'
      };
    }
  };
}
