import { createClient } from 'npm:@supabase/supabase-js@2';
import { createUsernameHandler } from './handler.js';
const url=Deno.env.get('SUPABASE_URL')||'';
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const check=(result:any)=>{if(result.error)throw result.error;return result.data;};
Deno.serve(createUsernameHandler({
 configured:!!(url&&serviceKey),
 reserve:async(action:string)=>check(await admin.rpc('account_auth_reserve',{p_action:action})),
 resolve:async(username:string)=>{const rows=check(await admin.rpc('account_username_resolve',{p_username:username}));return rows?.[0]?{id:rows[0].user_id,email:rows[0].login_email}:null;},
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
