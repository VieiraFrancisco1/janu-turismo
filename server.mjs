import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve(process.cwd(), 'dist');
const port = Number(process.env.PORT || 5173);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (file !== root && !file.startsWith(root + sep)) {
    response.writeHead(403).end('Acesso negado');
    return;
  }
  try {
    if (!(await stat(file)).isFile()) throw new Error('Não é arquivo');
    const bytes = await readFile(file);
    response.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' }).end(bytes);
  } catch {
    response.writeHead(404).end('Arquivo não encontrado');
  }
}).listen(port, () => console.log(`Janu Turismo: http://localhost:${port}`));
