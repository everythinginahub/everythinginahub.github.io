import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { createUsernameHandler } from './handler.js';
const url=Deno.env.get('SUPABASE_URL')||'';
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const anonKey=Deno.env.get('SUPABASE_ANON_KEY')||Deno.env.get('SUPABASE_PUBLISHABLE_KEY')||'';
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const admin=url&&serviceKey?createClient(url,serviceKey,options):null;
const auth=url&&anonKey?createClient(url,anonKey,options):null;
const check=(result:any)=>{if(result.error)throw result.error;return result.data;};
Deno.serve(createUsernameHandler({
 configured:!!admin,
 loginConfigured:!!auth,
 reserve:async(action:string,subject:string)=>check(await admin!.rpc('account_auth_reserve',{p_action:action,p_subject:subject})),
 resolve:async(username:string)=>{const rows=check(await admin!.rpc('account_username_resolve',{p_username:username}));return rows?.[0]?{id:rows[0].user_id,email:rows[0].login_email}:null;},
 login:async(_username:string,password:string,account:any)=>{
  if(!account?.email||!auth)return null;
  const {data,error}=await auth.auth.signInWithPassword({email:account.email,password});
  if(error||!data.session)return null;
  return {access_token:data.session.access_token,refresh_token:data.session.refresh_token};
 },

 authenticate:async(header:string)=>{const match=/^Bearer\s+(.+)$/i.exec(header);if(!match)return null;const {data,error}=await admin.auth.getUser(match[1]);return error?null:data.user;},
 replace:async(id:string,hashes:string[])=>check(await admin.rpc('account_recovery_replace',{p_user_id:id,p_hashes:hashes})),
 consume:async(id:string,hash:string)=>check(await admin.rpc('account_recovery_consume',{p_user_id:id,p_hash:hash})),
 changePassword:async(id:string,password:string)=>check(await admin.auth.admin.updateUserById(id,{password})),
 register:async(username:string,password:string,hashes:string[])=>{
  const email=`${crypto.randomUUID()}@accounts.invalid`;
  const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name:username,nickname:username,subjects:[]}});
  if(error||!data.user)throw Error('Unable to create account');
  const id=data.user.id;
  const result=await admin.rpc('account_username_finalize',{p_user_id:id,p_username:username,p_hashes:hashes});
  if(result.error){await admin.auth.admin.deleteUser(id);if(result.error.code==='23505')return false;throw Error('Unable to finish registration');}
  return true;
 }
}));
