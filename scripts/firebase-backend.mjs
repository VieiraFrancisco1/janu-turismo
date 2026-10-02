import fs from 'node:fs/promises';
import { createSign } from 'node:crypto';

const credentials = JSON.parse(await fs.readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
const project = credentials.project_id;
if (project !== 'janu-turismo-e747f') throw new Error('Projeto Firebase inesperado.');
const base64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const unsigned = `${base64({ alg: 'RS256', typ: 'JWT' })}.${base64({ iss: credentials.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
const signature = createSign('RSA-SHA256').update(unsigned).sign(credentials.private_key, 'base64url');
const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }) });
const token = await response.json();
if (!response.ok || !token.access_token) throw new Error(`Autenticação do backend falhou (${response.status}).`);
async function api(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' } });
  if (!res.ok) { const failure = await res.json().catch(() => ({})); throw new Error(`Operação do backend falhou (${res.status}): ${String(failure.error?.message || new URL(url).pathname).slice(0, 600)}`); }
  return res.json();
}
const release = await api(`https://firebaserules.googleapis.com/v1/projects/${project}/releases/cloud.firestore`);
const ruleset = await api(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`);
const source = ruleset.source.files.map(file => file.content).join('\n');
// Preserva exatamente a conta que já estava autorizada nas regras em produção.
const agencyMatch = source.match(/function\s+primaryAgency\(\)\s*\{\s*return\s+signed\(\)\s*&&\s*request\.auth\.uid\s*==\s*['"]([A-Za-z0-9_-]{10,128})['"]\s*;\s*\}/)
  || source.match(/function\s+agency\(\)\s*\{\s*return\s+signed\(\)\s*&&\s*request\.auth\.uid\s*==\s*['"]([A-Za-z0-9_-]{10,128})['"]\s*;\s*\}/);
if (!agencyMatch) throw new Error('A conta principal da agência precisa ser conferida antes de atualizar as regras. Nenhum acesso foi alterado.');
if (process.argv[2] === 'deploy-rules') {
  const content = await fs.readFile('firestore.rules', 'utf8');
  if (!content.includes(`request.auth.uid == '${agencyMatch[1]}'`) || content.includes('__ADMIN_UID__')) throw new Error('A conta principal da agência não corresponde às regras preparadas.');
  const created = await api(`https://firebaserules.googleapis.com/v1/projects/${project}/rulesets`, {
    method: 'POST', body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content }] } }),
  });
  await api(`https://firebaserules.googleapis.com/v1/projects/${project}/releases/cloud.firestore`, {
    method: 'PATCH', body: JSON.stringify({ release: { name: release.name, rulesetName: created.name }, updateMask: 'rulesetName' }),
  });
  console.log('Regras de reservas compiladas e publicadas pela API oficial do Firebase.');
  process.exit(0);
}
const template = await fs.readFile('firestore.rules.template', 'utf8');
await fs.writeFile('firestore.rules', template.replaceAll('__ADMIN_UID__', agencyMatch[1]));
console.log('Conta da agência preservada; regras de reservas preparadas.');

const { initializeApp, cert } = await import('firebase-admin/app');
const { getFirestore, Timestamp } = await import('firebase-admin/firestore');
const { PASSEIOS_SEED, adaptarPasseioParaApp } = await import('../catalogo.js');
const { prepareCatalog, bookingClosesAt } = await import('../booking-model.js');
initializeApp({ credential: cert(credentials), projectId: project });
const db = getFirestore();
let created = 0, migrated = 0;
for (const seed of PASSEIOS_SEED.map(adaptarPasseioParaApp)) {
  const ref = db.collection('trip_catalog').doc(seed.id);
  await db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) {
      const { id, ...fields } = prepareCatalog(seed);
      const clean = JSON.parse(JSON.stringify(fields));
      tx.create(ref, { ...clean, bookingClosesAt: Timestamp.fromDate(bookingClosesAt(seed)) });
      created++;
    } else {
      const existing = snapshot.data();
      // Atualiza apenas os campos de validação. Não troca preços, fotos ou textos da agência.
      const prepared = prepareCatalog(existing);
      tx.update(ref, { fareOptions: prepared.fareOptions, bookingClosesAt: Timestamp.fromDate(bookingClosesAt(existing)) });
      migrated++;
    }
  });
}
console.log(`Catálogo sincronizado: ${created} viagens iniciais, ${migrated} existentes preservadas. Capacidade real não alterada.`);
