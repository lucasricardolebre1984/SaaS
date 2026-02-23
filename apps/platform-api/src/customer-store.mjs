import { createFileCustomerStore } from './customer-store-file.mjs';
import { createPostgresCustomerStore } from './customer-store-postgres.mjs';

export function createCustomerStore(options = {}) {
  const backend = (
    options.backend ??
    process.env.ORCHESTRATION_STORE_BACKEND ??
    'file'
  ).toLowerCase();

  if (backend === 'postgres') {
    return createPostgresCustomerStore(options);
  }

  if (backend === 'file') {
    return createFileCustomerStore(options);
  }

  throw new Error(
    `Unsupported customer store backend: ${backend}. Use "file" or "postgres".`
  );
}
