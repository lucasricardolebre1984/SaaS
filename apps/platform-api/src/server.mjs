import http from 'node:http';
import { createApp } from './app.mjs';

const port = Number(process.env.PORT ?? 4300);
const host = process.env.HOST ?? '127.0.0.1';

const app = createApp();
const server = http.createServer(app);
server.listen(port, host, () => {
  // Keep startup output concise and machine-parseable for scripts.
  console.log(`app-platform-api listening on http://${host}:${port}`);
});

async function gracefulShutdown(signal) {
  server.close(async () => {
    try {
      if (typeof app.store?.close === 'function') {
        await app.store.close();
      }
      if (typeof app.customerStore?.close === 'function') {
        await app.customerStore.close();
      }
      if (typeof app.agendaStore?.close === 'function') {
        await app.agendaStore.close();
      }
      if (typeof app.billingStore?.close === 'function') {
        await app.billingStore.close();
      }
      if (typeof app.leadStore?.close === 'function') {
        await app.leadStore.close();
      }
      if (typeof app.ownerMemoryStore?.close === 'function') {
        await app.ownerMemoryStore.close();
      }
    } finally {
      console.log(`app-platform-api stopped (${signal})`);
      process.exit(0);
    }
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
