import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultPolicyPath = path.resolve(__dirname, '..', 'config', 'task-routing.policy.json');
const defaultExecutionPolicyPath = path.resolve(
  __dirname,
  '..',
  'config',
  'owner-tool-execution-policy.json'
);

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

function isValidDecision(value) {
  return value === 'allow' || value === 'deny' || value === 'confirm_required';
}

function assertValidDecisionRule(rule, contextName) {
  if (!rule || typeof rule !== 'object') {
    throw new Error(`Invalid decision rule in ${contextName}`);
  }
  if (!isNonEmptyString(rule.rule_id)) {
    throw new Error(`Missing rule_id in ${contextName}`);
  }
  if (!isNonEmptyString(rule.task_type)) {
    throw new Error(`Missing task_type in ${contextName}`);
  }
  if (!isNonEmptyString(rule.target_module)) {
    throw new Error(`Missing target_module in ${contextName}`);
  }
  if (!isValidDecision(rule.decision)) {
    throw new Error(`Invalid decision in ${contextName}`);
  }
  if (typeof rule.requires_confirmation !== 'boolean') {
    throw new Error(`Invalid requires_confirmation in ${contextName}`);
  }
  if (!isNonEmptyString(rule.reason_code)) {
    throw new Error(`Missing reason_code in ${contextName}`);
  }
}

function assertValidExecutionPolicy(policy) {
  if (!policy || typeof policy !== 'object') {
    throw new Error('Task execution policy must be an object');
  }
  const fallback = policy.default_decision;
  if (!fallback || typeof fallback !== 'object') {
    throw new Error('Task execution policy must define default_decision');
  }
  if (!isValidDecision(fallback.decision)) {
    throw new Error('Invalid default_decision.decision in task execution policy');
  }
  if (typeof fallback.requires_confirmation !== 'boolean') {
    throw new Error('Invalid default_decision.requires_confirmation in task execution policy');
  }
  if (!isNonEmptyString(fallback.reason_code)) {
    throw new Error('Missing default_decision.reason_code in task execution policy');
  }

  if (!Array.isArray(policy.rules)) {
    throw new Error('Task execution policy rules must be an array');
  }
  for (const rule of policy.rules) {
    assertValidDecisionRule(rule, `execution_rule:${rule?.rule_id ?? 'unknown'}`);
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

function policyDecisionFromRule(rule) {
  return {
    policy_rule_id: rule.rule_id,
    execution_decision: rule.decision,
    requires_confirmation: rule.requires_confirmation,
    policy_reason_code: rule.reason_code
  };
}

function policyDecisionFromDefault(policy) {
  return {
    policy_rule_id: 'default_decision',
    execution_decision: policy.default_decision.decision,
    requires_confirmation: policy.default_decision.requires_confirmation,
    policy_reason_code: policy.default_decision.reason_code
  };
}

function resolvePolicyDecision(route, executionPolicy) {
  for (const rule of executionPolicy.rules) {
    if (rule.task_type === route.task_type && rule.target_module === route.target_module) {
      return policyDecisionFromRule(rule);
    }
  }
  return policyDecisionFromDefault(executionPolicy);
}

export function createTaskPlanner(options = {}) {
  const policyPath = options.policyPath
    ? path.resolve(options.policyPath)
    : defaultPolicyPath;
  const executionPolicyPath = options.executionPolicyPath
    ? path.resolve(options.executionPolicyPath)
    : defaultExecutionPolicyPath;
  const policy = readJsonFile(policyPath);
  const executionPolicy = readJsonFile(executionPolicyPath);
  assertValidPolicy(policy);
  assertValidExecutionPolicy(executionPolicy);

  return {
    policyPath,
    executionPolicyPath,
    plan(request) {
      if (!request || request.operation !== 'send_message') {
        return null;
      }

      const text = normalizeText(request.payload?.text);
      for (const rule of policy.rules) {
        const matched = rule.keywords.some((keyword) => text.includes(keyword.toLowerCase()));
        if (matched) {
          const route = routeFromRule(rule);
          return {
            ...route,
            ...resolvePolicyDecision(route, executionPolicy)
          };
        }
      }

      const defaultRoute = {
        target_module: policy.default_route.target_module,
        task_type: policy.default_route.task_type,
        priority: policy.default_route.priority,
        simulate_failure: policy.default_route.simulate_failure,
        rule_id: 'default_route'
      };
      return {
        ...defaultRoute,
        ...resolvePolicyDecision(defaultRoute, executionPolicy)
      };
    }
  };
}
