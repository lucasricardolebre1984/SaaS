import { createFileOwnerMemoryMaintenanceStore } from './owner-memory-maintenance-store-file.mjs';
import { createPostgresOwnerMemoryMaintenanceStore } from './owner-memory-maintenance-store-postgres.mjs';

export function createOwnerMemoryMaintenanceStore(options = {}) {
  const backend = (
    options.backend ??
    process.env.ORCHESTRATION_STORE_BACKEND ??
    'file'
  ).toLowerCase();

  if (backend === 'postgres') {
    return createPostgresOwnerMemoryMaintenanceStore(options);
  }

  if (backend === 'file') {
    return createFileOwnerMemoryMaintenanceStore(options);
  }

  throw new Error(
    `Unsupported owner memory maintenance store backend: ${backend}. Use "file" or "postgres".`
  );
}
