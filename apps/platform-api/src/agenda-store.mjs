import { createFileAgendaStore } from './agenda-store-file.mjs';
import { createPostgresAgendaStore } from './agenda-store-postgres.mjs';

export function createAgendaStore(options = {}) {
  const backend = (
    options.backend ??
    process.env.ORCHESTRATION_STORE_BACKEND ??
    'file'
  ).toLowerCase();

  if (backend === 'postgres') {
    return createPostgresAgendaStore(options);
  }

  if (backend === 'file') {
    return createFileAgendaStore(options);
  }

  throw new Error(
    `Unsupported agenda store backend: ${backend}. Use "file" or "postgres".`
  );
}
