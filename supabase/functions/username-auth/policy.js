// Username policy for the proposed username-auth service. The database also
// enforces these rules; this module must never be the authority on its own.
const usernamePattern = /^[A-Za-z][A-Za-z0-9_]{1,23}$/;
const ownerLike = /(shay|shai|shae|shea|shey|owner|admin|moderator|moderation|staf|founder|creator|developer|suport|oficial)/;
const reservedExact = new Set(['mod','themod','dev','bos','ceo']);

export function normalizeUsername(value) {
  if (typeof value !== 'string') return null;
  const username = value.trim();
  return usernamePattern.test(username) ? username.toLowerCase() : null;
}

export function isRestrictedUsername(value) {
  const normalized = normalizeUsername(value);
  if (!normalized) return true;
  const compact = normalized.replace(/[^a-z0-9]/g, '').replace(/[0134578]/g, char => ({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','8':'b'})[char]).replace(/(.)\1+/g, '$1');
  return ownerLike.test(compact) || reservedExact.has(compact);
}

// Do not use JS character count here: Supabase hashes with bcrypt, which has
// a 72-byte input limit. Never silently truncate a password.
export function isValidNewPassword(value) {
  return typeof value === 'string' && [...value].length >= 8 && new TextEncoder().encode(value).length <= 72;
}
