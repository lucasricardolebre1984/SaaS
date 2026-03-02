import { createFileCrmCoreStore } from './crm-core-store-file.mjs';
import { createPostgresCrmCoreStore } from './crm-core-store-postgres.mjs';

export function createCrmCoreStore(options = {}) {
  const backend = (
    options.backend ??
    process.env.ORCHESTRATION_STORE_BACKEND ??
    'file'
  ).toLowerCase();

  if (backend === 'postgres') {
    return createPostgresCrmCoreStore(options);
  }

  if (backend === 'file') {
    return createFileCrmCoreStore(options);
  }

  throw new Error(`Unsupported CRM core store backend: ${backend}. Use "file" or "postgres".`);
}
