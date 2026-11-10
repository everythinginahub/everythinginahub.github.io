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
  const usernameRequest = async body => { const result=await client.functions.invoke('username-auth',{body}); if(result.error){let message='Account service is unavailable. Please try again.';try{const data=await result.error.context?.json();if(data?.error)message=data.error;}catch{}throw new Error(message);}return result.data; };
  return {
    async session() { return check(await client.auth.getSession()).session?.user || null; },
    async signIn(email, password) { return check(await client.auth.signInWithPassword({ email, password })).user; },
    async usernameSignIn(username, password) { const email=username.includes('@')?username:(await usernameRequest({action:'resolve',username})).email; return check(await client.auth.signInWithPassword({email,password})).user; },
    async usernameSignUp(username,password) { return usernameRequest({action:'signup',username,password}); },
    async recoverUsername(username,code,password) { try{return await usernameRequest({action:'recover',username,code,password});}catch(err){throw new Error((err.message||'Recovery failed.')+' If the request failed after starting, the code may have been used; try signing in or use a different code.');} },
    async createRecoveryCodes() { return usernameRequest({action:'codes'}); },
    async signUp(name, email, password, redirectTo, subjects = []) {
      return check(await client.auth.signUp({ email, password, options: { data: { name, nickname: name, subjects }, emailRedirectTo: redirectTo } }));
    },
    async resendConfirmation(email,redirectTo) { check(await client.auth.resend({type:'signup',email,options:{emailRedirectTo:redirectTo}})); },
    async signOut() { check(await client.auth.signOut({scope:'local'})); },
    async getNickname() { return check(await client.rpc('community_nickname_get',{})); },
    async setNickname(nickname) { return check(await client.rpc('community_nickname_set',{p_nickname:nickname})); },
    async listSets(userId) {
      const columns='id,owner_id,title,subject,description,is_public,cards,created_at';
      const [own,shared] = await Promise.all([
        client.from('flashcard_sets').select(columns).eq('owner_id',userId).order('created_at',{ascending:false}).limit(100),
        client.from('flashcard_sets').select(columns).eq('is_public',true).order('created_at',{ascending:false}).limit(100)
      ]);
      return [...new Map([...(check(own)||[]),...(check(shared)||[])].map(row=>[row.id,row])).values()];
    },
    async createSet(set) { return check(await client.from('flashcard_sets').insert(set).select('id,owner_id,title,subject,description,is_public,cards,created_at').single()); },
    async deleteSet(id) { check(await client.from('flashcard_sets').delete().eq('id',id)); },
    async setVisibility(id,isPublic) { check(await client.from('flashcard_sets').update({is_public:isPublic}).eq('id',id)); },
    async load(userId) {
      const data = check(await client.from('revision_progress').select('progress').eq('user_id', userId).maybeSingle());
      return data?.progress ?? null;
    },
    async save(userId, progress) {
      check(await client.from('revision_progress').upsert({ user_id: userId, progress }, { onConflict: 'user_id' }));
    }
  };
}
