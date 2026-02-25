import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..', '..');

const port = Number(process.env.PORT ?? 4001);
const host = process.env.HOST ?? '127.0.0.1';
const serveUnifiedUi = String(process.env.SERVE_UNIFIED_UI ?? '1') !== '0';

const ownerRoot = path.join(repoRoot, 'apps', 'owner-console', 'src');
const crmRoot = path.join(repoRoot, 'apps', 'crm-console', 'src');

const app = createApp();

function parseCorsAllowOrigins(value) {
  const raw = String(value ?? '*').trim();
  if (raw.length === 0 || raw === '*') return ['*'];
  return raw.split(',').map((item) => item.trim()).filter((item) => item.length > 0);
}

function resolveCorsOrigin(originHeader, allowOrigins) {
  if (allowOrigins.includes('*')) return '*';
  if (!originHeader) return null;
  const normalized = String(originHeader).trim();
  if (allowOrigins.includes(normalized)) return normalized;
  return null;
}

function applyCorsHeaders(req, res) {
  const allowOrigins = parseCorsAllowOrigins(process.env.CORS_ALLOW_ORIGINS ?? '*');
  const allowMethods = String(process.env.CORS_ALLOW_METHODS ?? 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  const allowHeaders = String(
    process.env.CORS_ALLOW_HEADERS ?? 'content-type,authorization,x-requested-with'
  );
  const maxAge = String(process.env.CORS_MAX_AGE ?? '86400');
  const corsOrigin = resolveCorsOrigin(req.headers.origin, allowOrigins);
  if (!corsOrigin) return;

  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', allowMethods);
  res.setHeader('Access-Control-Allow-Headers', allowHeaders);
  res.setHeader('Access-Control-Max-Age', maxAge);
  if (corsOrigin !== '*') {
    res.setHeader('Vary', 'Origin');
  }
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

function isApiPath(pathname) {
  return (
    pathname === '/health' ||
    pathname.startsWith('/v1/') ||
    pathname.startsWith('/internal/') ||
    pathname.startsWith('/provider/')
  );
}

async function serveStaticFromPrefix(res, rootDir, pathname, prefix) {
  const relative = pathname.startsWith(prefix)
    ? pathname.slice(prefix.length)
    : pathname;
  const cleanRelative = relative.replace(/^\/+/, '');
  let filePath = path.join(rootDir, cleanRelative);
  let normalized = path.normalize(filePath);

  if (!normalized.startsWith(rootDir)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('forbidden');
    return;
  }

  let stat = null;
  try {
    stat = await fs.stat(normalized);
  } catch {
    stat = null;
  }

  if (stat?.isDirectory()) {
    filePath = path.join(normalized, 'index.html');
  } else if (!stat) {
    filePath = path.join(rootDir, 'index.html');
  } else {
    filePath = normalized;
  }

  normalized = path.normalize(filePath);
  if (!normalized.startsWith(rootDir)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('forbidden');
    return;
  }

  const body = await fs.readFile(normalized);
  res.writeHead(200, {
    'content-type': contentTypeFor(normalized),
    'cache-control': 'no-store'
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  applyCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsed = new URL(req.url ?? '/', 'http://localhost');
  const pathname = parsed.pathname;

  if (pathname.startsWith('/api/')) {
    req.url = `${pathname.slice('/api'.length)}${parsed.search}`;
    app(req, res);
    return;
  }

  if (isApiPath(pathname)) {
    app(req, res);
    return;
  }

  if (serveUnifiedUi) {
    if (pathname === '/' || pathname === '') {
      res.writeHead(302, { location: '/owner/' });
      res.end();
      return;
    }

    if (pathname === '/owner') {
      res.writeHead(302, { location: '/owner/' });
      res.end();
      return;
    }

    if (pathname.startsWith('/owner/')) {
      await serveStaticFromPrefix(res, ownerRoot, pathname, '/owner/');
      return;
    }

    if (pathname === '/crm') {
      res.writeHead(302, { location: '/crm/' });
      res.end();
      return;
    }

    if (pathname.startsWith('/crm/')) {
      await serveStaticFromPrefix(res, crmRoot, pathname, '/crm/');
      return;
    }

    res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'not_found' }));
    return;
  }

  app(req, res);
});

server.listen(port, host, () => {
  console.log(`app-platform-api listening on http://${host}:${port}`);
  if (serveUnifiedUi) {
    console.log(`owner-console available at http://${host}:${port}/owner/`);
    console.log(`crm-console available at http://${host}:${port}/crm/`);
  }
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
      if (typeof app.crmAutomationStore?.close === 'function') {
        await app.crmAutomationStore.close();
      }
      if (typeof app.ownerMemoryStore?.close === 'function') {
        await app.ownerMemoryStore.close();
      }
      if (typeof app.ownerMemoryMaintenanceStore?.close === 'function') {
        await app.ownerMemoryMaintenanceStore.close();
      }
    } finally {
      console.log(`app-platform-api stopped (${signal})`);
      process.exit(0);
    }
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
