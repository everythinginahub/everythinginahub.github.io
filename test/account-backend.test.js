import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAccountBackend, validateConfig } from '../public/account-backend.js';

test('configuration permits only public browser keys and hosted project URLs', () => {
  assert.equal(validateConfig({}).configured,false);
  assert.equal(validateConfig({url:'https://example.supabase.co',publishableKey:'sb_publishable_demo'}).configured,true);
  assert.equal(validateConfig({url:'https://example.supabase.co',publishableKey:'sb_secret_demo'}).configured,false);
  const jwt = role => 'eyJ.'+Buffer.from(JSON.stringify({role})).toString('base64url')+'.signature';
  assert.equal(validateConfig({url:'https://example.supabase.co',publishableKey:jwt('service_role')}).configured,false);
  assert.equal(validateConfig({url:'https://example.supabase.co',publishableKey:jwt('anon')}).configured,true);
  assert.equal(validateConfig({url:'http://example.supabase.co',publishableKey:'sb_publishable_demo'}).configured,false);
});
test('account client uses auth and user-scoped progress operations and surfaces errors', async () => {
  const calls=[];
  const client={auth:{
    getSession:async()=>({data:{session:{user:{id:'u1'}}}}),
    signInWithPassword:async input=>(calls.push(input),{data:{user:{id:'u1'}}}),
    signUp:async input=>(calls.push(input),{data:{session:null}}),
    signOut:async()=>({data:{}})
  },from: table=>({
    select: fields=>({eq:(field,value)=>({maybeSingle:async()=>(calls.push({table,fields,field,value}),{data:{progress:{done:true}}})})}),
    upsert:async(value,options)=>(calls.push({table,value,options}),{data:null})
  })};
  const api=createAccountBackend(client);
  assert.equal((await api.session()).id,'u1');
  assert.equal((await api.signIn('a@b.co','password')).id,'u1');
  assert.equal((await api.signUp('A','a@b.co','password','https://example.com/')).session,null);
  assert.equal((await api.load('u1')).done,true);
  await api.save('u1',{done:true});
  assert.deepEqual(calls.at(-1),{table:'revision_progress',value:{user_id:'u1',progress:{done:true}},options:{onConflict:'user_id'}});
  await api.signOut();
  client.auth.signInWithPassword=async()=>({error:new Error('bad login')});
  await assert.rejects(api.signIn('a@b.co','bad'),/bad login/);
});

test('bundled Supabase client sends auth and progress requests', async () => {
  const { createClient } = await import('../public/supabase-client.js');
  const requests=[];
  const account={id:'b9248376-5088-4298-889f-3227c6105a21',email:'test@example.com',user_metadata:{name:'Test'}};
  const fakeFetch=async (input,init={})=>{
    const url=String(input); requests.push({url,method:init.method,headers:new Headers(init.headers),body:init.body});
    if(url.includes('/auth/v1/token')) return new Response(JSON.stringify({access_token:'test-token',refresh_token:'refresh',expires_in:3600,token_type:'bearer',user:account}),{status:200,headers:{'content-type':'application/json'}});
    if(url.includes('/rest/v1/revision_progress') && init.method==='GET') return new Response(JSON.stringify([{progress:{completed:{biology:true}}}]),{status:200,headers:{'content-type':'application/json'}});
    if(url.includes('/rest/v1/revision_progress') && init.method==='POST') return new Response('',{status:201,headers:{'content-type':'application/json'}});
    throw new Error('Unexpected request: '+url);
  };
  const client=createClient('https://example.supabase.co','sb_publishable_test',{global:{fetch:fakeFetch},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const api=createAccountBackend(client);
  assert.equal((await api.signIn('test@example.com','password')).id,account.id);
  assert.equal((await api.load(account.id)).completed.biology,true);
  await api.save(account.id,{completed:{maths:true}});
  const post=requests.find(x=>x.url.includes('/rest/v1/')&&x.method==='POST');
  assert.equal(post.headers.get('authorization'),'Bearer test-token');
  assert.equal(JSON.parse(post.body).user_id,account.id);
});

test('nickname changes use account-scoped RPCs and signup records the chosen nickname',async()=>{
 const calls=[];const api=createAccountBackend({auth:{signUp:async data=>(calls.push(data),{data:{session:null}})},rpc:async(name,args)=>(calls.push({name,args}),{data:name==='community_nickname_get'?'Reader':'New Reader'})});
 await api.signUp('Reader','a@b.co','password','https://example.com/');assert.equal(calls[0].options.data.nickname,'Reader');assert.equal(await api.getNickname(),'Reader');assert.equal(await api.setNickname('New Reader'),'New Reader');assert.deepEqual(calls.at(-1),{name:'community_nickname_set',args:{p_nickname:'New Reader'}});
});

test('bundled client resolves usernames through the function and signs in without exposing a service key',async()=>{
 const {createClient}=await import('../public/supabase-client.js');const requests=[];const user={id:'test-user',email:'internal@accounts.invalid'};
 const fakeFetch=async(input,init={})=>{const url=String(input);requests.push({url,headers:new Headers(init.headers),body:init.body});if(url.includes('/functions/v1/username-auth'))return new Response(JSON.stringify({email:user.email}),{status:200,headers:{'content-type':'application/json'}});if(url.includes('/auth/v1/token'))return new Response(JSON.stringify({access_token:'token',refresh_token:'refresh',expires_in:3600,token_type:'bearer',user}),{status:200,headers:{'content-type':'application/json'}});throw Error('Unexpected request');};
 const client=createClient('https://example.supabase.co','sb_publishable_test',{global:{fetch:fakeFetch},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});const api=createAccountBackend(client);assert.equal((await api.usernameSignIn('alice','password123')).id,user.id);assert.equal(JSON.parse(requests[0].body).action,'resolve');assert.equal(JSON.parse(requests[1].body).email,user.email);assert.equal(requests[0].headers.get('apikey'),'sb_publishable_test');
});
