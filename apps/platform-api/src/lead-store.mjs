import { createFileLeadStore } from './lead-store-file.mjs';
import { createPostgresLeadStore } from './lead-store-postgres.mjs';

export function createLeadStore(options = {}) {
  const backend = (
    options.backend ??
    process.env.ORCHESTRATION_STORE_BACKEND ??
    'file'
  ).toLowerCase();

  if (backend === 'postgres') {
    return createPostgresLeadStore(options);
  }

  if (backend === 'file') {
    return createFileLeadStore(options);
  }

  throw new Error(
    `Unsupported lead store backend: ${backend}. Use "file" or "postgres".`
  );
}
