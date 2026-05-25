import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve('tests/component-screenshots');
const port = Number(process.env.PORT || 4177);

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml']
]);

/**
 * Минимальный static server нужен только для Playwright screenshot-тестов.
 * Не используем внешние зависимости: harness полностью локальный и не требует dev-server.
 */
createServer((request, response) => {
  const url = new URL(request.url || '/', `http://127.0.0.1:${port}`);
  const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = resolve(join(root, normalize(decodeURIComponent(requestedPath))));

  if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  response.writeHead(200, { 'content-type': contentTypes.get(extname(filePath)) || 'application/octet-stream' });
  createReadStream(filePath).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`component screenshot harness: http://127.0.0.1:${port}`);
});
