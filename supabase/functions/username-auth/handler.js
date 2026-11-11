import {normalizeUsername,isRestrictedUsername,isValidNewPassword} from './policy.js';
import {generateRecoveryCodes,normalizeRecoveryCode,hashRecoveryCode} from './recovery.js';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
async function readBody(req){
 const reader=req.body?.getReader();if(!reader)throw Error();let n=0;const chunks=[];
 for(;;){const x=await reader.read();if(x.done)break;n+=x.value.byteLength;if(n>4096){await reader.cancel();throw Error();}chunks.push(x.value);}
 const bytes=new Uint8Array(n);let i=0;for(const chunk of chunks){bytes.set(chunk,i);i+=chunk.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
export function createUsernameHandler({reserve,register,resolve,login,consume,replace,changePassword,authenticate,cryptoProvider=globalThis.crypto,configured=true,loginConfigured=true}){
 return async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply(405,{error:'Method not allowed.'});
  if(!configured)return reply(503,{error:'Account service is unavailable.'});
  let body;try{body=await readBody(req);}catch{return reply(400,{error:'Invalid request.'});}
  const action=body?.action;if(!['signup','login','recover','codes'].includes(action))return reply(400,{error:'Invalid request.'});
  try{
   if(action==='login'){
    if(!loginConfigured)return reply(503,{error:'Account service is unavailable.'});
    const username=normalizeUsername(body.username);
    if(!username||typeof body.password!=='string')return reply(400,{error:'Could not sign in. Check your username and password.'});
    // Use the normalized username before lookup: known and unknown names receive
    // the same isolated bucket and lookup traffic is limited before it reaches Postgres.
    if(!await reserve('login',`username:${username}`))return reply(429,{error:'Too many requests. Please try again later.'});
    const account=await resolve(username);
    const session=account?await login(username,body.password,account):null;
    if(!session?.access_token||!session?.refresh_token)return reply(400,{error:'Could not sign in. Check your username and password.'});
    // Never return the account's internal login email to an unauthenticated caller.
    return reply(200,{session:{access_token:session.access_token,refresh_token:session.refresh_token}});
   }
   if(action==='codes'){
    const user=await authenticate(req.headers.get('authorization')||'');if(!user?.id)return reply(401,{error:'Sign in first.'});
    if(!await reserve('codes',user.id))return reply(429,{error:'Too many requests. Please try again later.'});
    const codes=generateRecoveryCodes(cryptoProvider);const hashes=await Promise.all(codes.map(c=>hashRecoveryCode(cryptoProvider,c)));
    await replace(user.id,hashes);return reply(200,{codes});
   }
   const username=normalizeUsername(body.username);if(!username)return reply(400,{error:'Use 2–24 letters, digits or underscores, starting with a letter.'});
   if(action==='signup'){
    if(isRestrictedUsername(username))return reply(400,{error:'That username is reserved.'});
    if(!isValidNewPassword(body.password))return reply(400,{error:'Choose a password of at least 8 characters and at most 72 bytes.'});
    if(!await reserve('signup','global'))return reply(429,{error:'Too many requests. Please try again later.'});
    const codes=generateRecoveryCodes(cryptoProvider);const hashes=await Promise.all(codes.map(c=>hashRecoveryCode(cryptoProvider,c)));
    const result=await register(username,body.password,hashes);
    if(!result)return reply(409,{error:'That username is unavailable.'});
    return reply(200,{codes});
   }
   if(!isValidNewPassword(body.password)||!normalizeRecoveryCode(body.code))return reply(400,{error:'Check your recovery code and use a password of at least 8 characters and at most 72 bytes.'});
   if(!await reserve('recover',`username:${username}`))return reply(429,{error:'Too many requests. Please try again later.'});
   const account=await resolve(username);
   const hash=await hashRecoveryCode(cryptoProvider,body.code);
   if(!account?.id||!await consume(account.id,hash))return reply(400,{error:'Could not recover this account. Check the username and recovery code.'});
   try{await changePassword(account.id,body.password);}catch{return reply(503,{error:'Recovery could not be completed. The code may have been used; try a different unused code.'});}
   return reply(200,{ok:true});
  }catch{return reply(503,{error:'Account service is unavailable. Please try again later.'});}
 };
}
