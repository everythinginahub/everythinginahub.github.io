import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createUsernameHandler} from '../supabase/functions/username-auth/handler.js';

function harness(){
 const users=new Map([['shay',{id:'owner',email:'owner@example.test'}]]),codes=new Map(),passwords=new Map();let sequence=0;
 const deps={cryptoProvider:webcrypto,reserve:async()=>true,authenticate:async token=>token==='Bearer valid'?{id:'owner'}:null,
  resolve:async name=>users.get(name)||null,
  register:async(name,password,hashes)=>{if(users.has(name))return false;const id=String(++sequence);users.set(name,{id,email:`${id}@accounts.invalid`});passwords.set(id,password);codes.set(id,new Set(hashes));return true;},
  replace:async(id,hashes)=>codes.set(id,new Set(hashes)),consume:async(id,hash)=>codes.get(id)?.delete(hash)||false,changePassword:async(id,password)=>passwords.set(id,password)};
 const handler=createUsernameHandler(deps),call=async(data,auth)=>{const r=await handler(new Request('https://example.test/',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:auth}:{})},body:JSON.stringify(data)}));return {status:r.status,body:await r.json(),headers:r.headers};};return {deps,call,passwords};
}
test('signup enforces policy, uniqueness and returns private recovery codes',async()=>{
 const {call}=harness();for(const name of ['Shay','s_h_a_y','ADMIN'])assert.equal((await call({action:'signup',username:name,password:'password123'})).status,400);
 assert.equal((await call({action:'signup',username:'alice',password:'short'})).status,400);
 const signup=await call({action:'signup',username:'Alice',password:'password123'});assert.equal(signup.status,200);assert.equal(signup.body.codes.length,5);assert.match(signup.headers.get('cache-control'),/no-store/);
 assert.equal((await call({action:'signup',username:'ALICE',password:'password123'})).status,409);
 assert.equal((await call({action:'resolve',username:'aLiCe'})).body.email,'1@accounts.invalid');
 assert.equal((await call({action:'resolve',username:'Shay'})).body.email,'owner@example.test');
});
test('recovery codes are single-use, account-bound and code issuance requires authentication',async()=>{
 const {call,passwords}=harness();const one=(await call({action:'signup',username:'alice',password:'password123'})).body.codes;
 await call({action:'signup',username:'bobby',password:'password123'});
 assert.equal((await call({action:'recover',username:'bobby',code:one[0],password:'new-password'})).status,400);
 assert.equal((await call({action:'recover',username:'alice',code:one[0],password:'new-password'})).status,200);assert.equal(passwords.get('1'),'new-password');
 assert.equal((await call({action:'recover',username:'alice',code:one[0],password:'different-password'})).status,400);
 assert.equal((await call({action:'codes'})).status,401);assert.equal((await call({action:'codes'},'Bearer valid')).body.codes.length,5);
});
test('rate limits and failures do not expose secrets, and recovery failure consumes code',async()=>{
 const h=harness();h.deps.reserve=async()=>false; // handler captures original callback; test separate instance
 const limited=createUsernameHandler({...h.deps});const r=await limited(new Request('https://example.test',{method:'POST',body:JSON.stringify({action:'signup',username:'alice',password:'secret-password'})}));assert.equal(r.status,429);assert.doesNotMatch(await r.text(),/secret-password/);
 const h2=harness();const codes=(await h2.call({action:'signup',username:'alice',password:'password123'})).body.codes;
 h2.deps.changePassword=async()=>{throw Error('secret internal details');};
 const failing=createUsernameHandler({...h2.deps});const request=()=>new Request('https://example.test',{method:'POST',body:JSON.stringify({action:'recover',username:'alice',password:'new-password',code:codes[0]})});const failure=await failing(request());assert.equal(failure.status,503);assert.doesNotMatch(await failure.text(),/secret internal details/);assert.equal((await failing(request())).status,400);
});
