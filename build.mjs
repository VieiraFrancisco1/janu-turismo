import { cp, mkdir, rm } from 'node:fs/promises';
import { build } from 'esbuild';

await rm('dist', { recursive: true, force: true });
await mkdir('dist/assets', { recursive: true });
for (const file of ['index.html', 'styles.css', 'politica-reservas.html', 'politica-cancelamento.html']) await cp(file, `dist/${file}`);
for (const asset of ['logo-janu.png', 'guaramiranga.webp', 'sitio-do-bosco.webp', 'jericoacoara.webp', 'lagoa-do-paraiso.webp', 'lagoinha.webp']) await cp(`assets/${asset}`, `dist/assets/${asset}`);
await build({ entryPoints: ['app.js'], outfile: 'dist/app.js', bundle: true, format: 'esm', target: 'es2022', minify: true, sourcemap: false });
console.log('Site pronto em dist/');
