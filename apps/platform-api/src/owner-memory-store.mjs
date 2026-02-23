import { createFileOwnerMemoryStore } from './owner-memory-store-file.mjs';
import { createPostgresOwnerMemoryStore } from './owner-memory-store-postgres.mjs';

export function createOwnerMemoryStore(options = {}) {
  const backend = (
    options.backend ??
    process.env.ORCHESTRATION_STORE_BACKEND ??
    'file'
  ).toLowerCase();

  if (backend === 'postgres') {
    return createPostgresOwnerMemoryStore(options);
  }

  if (backend === 'file') {
    return createFileOwnerMemoryStore(options);
  }

  throw new Error(
    `Unsupported owner memory store backend: ${backend}. Use "file" or "postgres".`
  );
}
