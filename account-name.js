// Stable identifier for name-based accounts; passwords remain in Firebase Auth.
export const NAME_ACCOUNT_DOMAIN = 'nome.januturismo.invalid';

export function normalizeAccountName(value) {
  const name = String(value || '').normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('pt-BR');
  if (name.length < 2 || name.length > 80 || /[@\p{Cc}\p{Cf}]/u.test(name)) {
    throw new Error('Escolha um nome de acesso de 2 a 80 caracteres, sem @.');
  }
  return name;
}

export async function nameAccountEmail(value) {
  const bytes = new TextEncoder().encode(normalizeAccountName(value));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return `${Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')}@${NAME_ACCOUNT_DOMAIN}`;
}

export function isNameAccount(user) {
  return String(user?.email || '').endsWith(`@${NAME_ACCOUNT_DOMAIN}`);
}

export function accountLabel(user) {
  return isNameAccount(user) ? user.displayName || 'Sua conta' : user?.email || user?.displayName || 'Sua conta';
}
