// Preparation only: codes must be stored as hashes and consumed atomically by
// a trusted server. These helpers do not implement an account-recovery flow.
const HEX = '0123456789ABCDEF';
export function generateRecoveryCodes(cryptoProvider, count = 5) {
  if (!cryptoProvider?.getRandomValues || !Number.isInteger(count) || count < 1 || count > 10) throw new Error('Invalid recovery code request.');
  return Array.from({length:count}, () => {
    const bytes = cryptoProvider.getRandomValues(new Uint8Array(16));
    const hex = Array.from(bytes, b => HEX[b >> 4] + HEX[b & 15]).join('');
    return hex.match(/.{8}/g).join('-');
  });
}
export function normalizeRecoveryCode(code) {
  if (typeof code !== 'string') return null;
  const text = code.trim();
  if (!/^(?:[A-Fa-f0-9]{32}|[A-Fa-f0-9]{8}(?:-[A-Fa-f0-9]{8}){3})$/.test(text)) return null;
  return text.replaceAll('-', '').toUpperCase();
}
export async function hashRecoveryCode(cryptoProvider, code) {
  const normalized = normalizeRecoveryCode(code);
  if (!normalized) throw new Error('Invalid recovery code.');
  const digest = await cryptoProvider.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
