import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { PASSEIOS_SEED, adaptarPasseioParaApp } from './catalogo.js';

const SITE_URL = 'https://janu-turismo.vercel.app';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

await rm('dist', { recursive: true, force: true });
await mkdir('dist/assets', { recursive: true });
for (const file of ['index.html', 'styles.css', 'politica-reservas.html', 'politica-cancelamento.html']) await cp(file, `dist/${file}`);
for (const asset of ['logo-janu.png', 'guaramiranga.webp', 'sitio-do-bosco.webp', 'jericoacoara.webp', 'lagoa-do-paraiso.webp', 'lagoinha.webp']) await cp(`assets/${asset}`, `dist/assets/${asset}`);

for (const rawTrip of PASSEIOS_SEED.filter(item => item.publicado !== false && item.status !== 'encerrado')) {
  const trip = adaptarPasseioParaApp(rawTrip);
  const pageDir = `dist/passeio/${trip.id}`;
  await mkdir(pageDir, { recursive: true });

  const imagePath = String(trip.image || './assets/logo-janu.png').replace(/^\.\//, '/');
  const imageUrl = `${SITE_URL}${imagePath}`;
  const pageUrl = `${SITE_URL}/passeio/${encodeURIComponent(trip.id)}/`;
  const appUrl = `${SITE_URL}/#/viagem/${encodeURIComponent(trip.id)}`;
  const description = `${trip.subtitle ? trip.subtitle + '. ' : ''}${trip.date}. A partir de ${money(trip.price)} por pessoa. Reserve com a Janu Turismo.`;

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${pageUrl}" />
  <meta property="og:locale" content="pt_BR" />
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="Janu Turismo" />
  <meta property="og:title" content="${escapeHtml(trip.title)} | Janu Turismo" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="product:price:amount" content="${Number(trip.price || 0).toFixed(2)}" />
  <meta property="product:price:currency" content="BRL" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(trip.title)} | Janu Turismo" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${imageUrl}" />
  <title>${escapeHtml(trip.title)} | Janu Turismo</title>
  <script>location.replace(${JSON.stringify(appUrl)});</script>
</head>
<body>
  <p><a href="${appUrl}">Abrir ${escapeHtml(trip.title)} no site da Janu Turismo</a></p>
</body>
</html>`;
  await writeFile(`${pageDir}/index.html`, html, 'utf8');
}

await build({ entryPoints: ['app.js'], outfile: 'dist/app.js', bundle: true, format: 'esm', target: 'es2022', minify: true, sourcemap: false });
console.log('Site pronto em dist/');
