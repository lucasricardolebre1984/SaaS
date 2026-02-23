import { createFileOrchestrationStore } from './orchestration-store-file.mjs';
import { createPostgresOrchestrationStore } from './orchestration-store-postgres.mjs';

export function createOrchestrationStore(options = {}) {
  const backend = (
    options.backend ??
    process.env.ORCHESTRATION_STORE_BACKEND ??
    'file'
  ).toLowerCase();

  if (backend === 'postgres') {
    return createPostgresOrchestrationStore(options);
  }

  if (backend === 'file') {
    return createFileOrchestrationStore(options);
  }

  throw new Error(
    `Unsupported orchestration store backend: ${backend}. Use "file" or "postgres".`
  );
}
