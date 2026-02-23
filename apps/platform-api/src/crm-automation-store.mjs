import { createFileCrmAutomationStore } from './crm-automation-store-file.mjs';
import { createPostgresCrmAutomationStore } from './crm-automation-store-postgres.mjs';

export function createCrmAutomationStore(options = {}) {
  const backend = (
    options.backend ??
    process.env.ORCHESTRATION_STORE_BACKEND ??
    'file'
  ).toLowerCase();

  if (backend === 'postgres') {
    return createPostgresCrmAutomationStore(options);
  }

  if (backend === 'file') {
    return createFileCrmAutomationStore(options);
  }

  throw new Error(
    `Unsupported crm automation store backend: ${backend}. Use "file" or "postgres".`
  );
}
