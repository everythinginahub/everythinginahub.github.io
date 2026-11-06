// The publishable (or legacy anon) key is designed for browser use. Access is
// restricted in the database by the policies in supabase/setup.sql.
export function validateConfig(config) {
  const url = (config?.url || '').trim().replace(/\/$/, '');
  const key = (config?.publishableKey || '').trim();
  if (!url && !key) return { configured: false, error: '' };
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) return { configured: false, error: 'Invalid Supabase project URL.' };
  if (!key || key.startsWith('sb_secret_') || (!key.startsWith('sb_publishable_') && !key.startsWith('eyJ'))) return { configured: false, error: 'Use a publishable or legacy anon key, not a secret key.' };
  // Legacy JWT keys contain a role. Refuse known service-role keys even if pasted accidentally.
  if (key.startsWith('eyJ')) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role !== 'anon') return { configured: false, error: 'Use the anon key, not a service-role key.' };
    } catch { return { configured: false, error: 'Invalid legacy anon key.' }; }
  }
  return { configured: true, url, key };
}
export function createAccountBackend(client) {
  const check = result => { if (result.error) throw result.error; return result.data; };
  return {
    async session() { return check(await client.auth.getSession()).session?.user || null; },
    async signIn(email, password) { return check(await client.auth.signInWithPassword({ email, password })).user; },
    async signUp(name, email, password, redirectTo) {
      return check(await client.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: redirectTo } }));
    },
    async signOut() { check(await client.auth.signOut()); },
    async load(userId) {
      const data = check(await client.from('revision_progress').select('progress').eq('user_id', userId).maybeSingle());
      return data?.progress ?? null;
    },
    async save(userId, progress) {
      check(await client.from('revision_progress').upsert({ user_id: userId, progress }, { onConflict: 'user_id' }));
    }
  };
}
