import { createFileBillingStore } from './billing-store-file.mjs';
import { createPostgresBillingStore } from './billing-store-postgres.mjs';

export function createBillingStore(options = {}) {
  const backend = (
    options.backend ??
    process.env.ORCHESTRATION_STORE_BACKEND ??
    'file'
  ).toLowerCase();

  if (backend === 'postgres') {
    return createPostgresBillingStore(options);
  }

  if (backend === 'file') {
    return createFileBillingStore(options);
  }

  throw new Error(
    `Unsupported billing store backend: ${backend}. Use "file" or "postgres".`
  );
}
