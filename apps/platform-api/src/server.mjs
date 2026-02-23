import http from 'node:http';
import { createApp } from './app.mjs';

const port = Number(process.env.PORT ?? 4300);
const host = process.env.HOST ?? '127.0.0.1';

const server = http.createServer(createApp());
server.listen(port, host, () => {
  // Keep startup output concise and machine-parseable for scripts.
  console.log(`app-platform-api listening on http://${host}:${port}`);
});
