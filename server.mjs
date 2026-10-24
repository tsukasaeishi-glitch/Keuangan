import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApi } from './lib/api-handler.mjs';
import { LocalStore } from './lib/local-store.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'public');
const store = new LocalStore(path.join(root, 'data', 'db.json'));
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
};

async function readRequestBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 5_000_000) throw Object.assign(new Error('Data terlalu besar.'), { status: 413 });
  }
  return raw;
}
function sendResponse(res, response) {
  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  if (response.body) response.arrayBuffer().then(buffer => res.end(Buffer.from(buffer)));
  else res.end();
}

const server = createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (requestUrl.pathname.startsWith('/api/')) {
      const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readRequestBody(req);
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') headers.set(key, value);
        else if (Array.isArray(value)) headers.set(key, value.join(', '));
      }
      const request = new Request(requestUrl, { method: req.method, headers, ...(body === undefined ? {} : { body }) });
      return sendResponse(res, await handleApi(request, store));
    }

    let decoded;
    try { decoded = decodeURIComponent(requestUrl.pathname); }
    catch { res.writeHead(400); return res.end('Bad request'); }
    const filePath = path.resolve(publicDir, `.${decoded === '/' ? '/index.html' : decoded}`);
    if (filePath !== path.join(publicDir, 'index.html') && !filePath.startsWith(publicDir + path.sep)) {
      res.writeHead(403); return res.end('Forbidden');
    }
    const content = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(content);
  } catch (cause) {
    if (!res.headersSent) {
      res.writeHead(cause.status || 404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(cause.status ? cause.message : 'Halaman tidak ditemukan.');
    }
  }
});

server.listen(port, host, () => console.log(`FinZ siap di http://${host}:${port}`));
