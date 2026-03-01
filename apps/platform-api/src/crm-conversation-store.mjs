import { createFileCrmConversationStore } from './crm-conversation-store-file.mjs';
import { createPostgresCrmConversationStore } from './crm-conversation-store-postgres.mjs';

export function createCrmConversationStore(options = {}) {
  const backend = (
    options.backend ??
    process.env.ORCHESTRATION_STORE_BACKEND ??
    'file'
  ).toLowerCase();

  if (backend === 'postgres') {
    return createPostgresCrmConversationStore(options);
  }

  if (backend === 'file') {
    return createFileCrmConversationStore(options);
  }

  throw new Error(
    `Unsupported crm conversation store backend: ${backend}. Use "file" or "postgres".`
  );
}
