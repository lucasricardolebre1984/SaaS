import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      args[key] = 'true';
      continue;
    }
    args[key] = value;
    i += 1;
  }
  return args;
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.js' || ext === '.mjs') return 'application/javascript; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webm') return 'video/webm';
  if (ext === '.mp4') return 'video/mp4';
  return 'application/octet-stream';
}

const args = parseArgs(process.argv);
const root = path.resolve(args.root ?? '.');
const host = args.host ?? '127.0.0.1';
const port = Number(args.port ?? 4400);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const rawPath = decodeURIComponent(url.pathname);
    const safePath = rawPath.replace(/^\/+/, '');
    let filePath = path.join(root, safePath);

    const normalized = path.normalize(filePath);
    if (!normalized.startsWith(root)) {
      res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('forbidden');
      return;
    }

    let stat;
    try {
      stat = await fs.stat(normalized);
    } catch {
      stat = null;
    }

    if (stat?.isDirectory()) {
      filePath = path.join(normalized, 'index.html');
    } else if (!stat) {
      filePath = path.join(root, 'index.html');
    } else {
      filePath = normalized;
    }

    const body = await fs.readFile(filePath);
    res.writeHead(200, {
      'content-type': contentTypeFor(filePath),
      'cache-control': 'no-store'
    });
    res.end(body);
  } catch (error) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`server_error: ${String(error.message ?? error)}`);
  }
});

server.listen(port, host, () => {
  console.log(`static app server listening on http://${host}:${port} (root=${root})`);
});
