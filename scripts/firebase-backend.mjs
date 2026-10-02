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
async function api(url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token.access_token}` } });
  if (!res.ok) throw new Error(`Consulta do backend falhou (${res.status}): ${new URL(url).pathname}`);
  return res.json();
}
const release = await api(`https://firebaserules.googleapis.com/v1/projects/${project}/releases/cloud.firestore`);
const ruleset = await api(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`);
const source = ruleset.source.files.map(file => file.content).join('\n');
// Somente código de regras; nunca imprime credenciais, usuários ou reservas.
console.log('REGRAS_ATIVAS_INICIO\n' + source + '\nREGRAS_ATIVAS_FIM');
