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

// Phone-like identifiers use only digits so "(88) 8873-7924", "88 8873-7924"
// and "8888737924" resolve to the same Firebase Auth account.
export function normalizeLoginIdentifier(value) {
  const raw = String(value || '').trim();
  if (raw.includes('@')) return raw.toLowerCase();
  const phone = raw.replace(/\D/g, '');
  if (phone.length >= 10 && phone.length <= 11) return phone;
  return raw;
}

export async function loginIdentifierEmail(value) {
  const normalized = normalizeLoginIdentifier(value);
  return normalized.includes('@') ? normalized : nameAccountEmail(normalized);
}
