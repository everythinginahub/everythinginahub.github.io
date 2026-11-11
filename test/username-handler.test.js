import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createUsernameHandler} from '../supabase/functions/username-auth/handler.js';

function requestHandler(handler){
 return async(data,auth)=>{const r=await handler(new Request('https://example.test/',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:auth}:{})},body:JSON.stringify(data)}));return {status:r.status,body:await r.json(),headers:r.headers};};
}
function harness(reserve=async()=>true){
 const users=new Map([['shay',{id:'owner',email:'owner@example.test'}]]),codes=new Map(),passwords=new Map([['owner','owner-password']]);let sequence=0;
 const deps={cryptoProvider:webcrypto,reserve,authenticate:async token=>token==='Bearer valid'?{id:'owner'}:null,
  resolve:async name=>users.get(name)||null,
  login:async(name,password,account)=>{const user=account||users.get(name);if(!user||passwords.get(user.id)!==password)return null;return {access_token:`access-${user.id}`,refresh_token:`refresh-${user.id}`};},
  register:async(name,password,hashes)=>{if(users.has(name))return false;const id=String(++sequence);users.set(name,{id,email:`${id}@accounts.invalid`});passwords.set(id,password);codes.set(id,new Set(hashes));return true;},
  replace:async(id,hashes)=>codes.set(id,new Set(hashes)),consume:async(id,hash)=>codes.get(id)?.delete(hash)||false,changePassword:async(id,password)=>passwords.set(id,password)};
 const handler=createUsernameHandler(deps);return {deps,call:requestHandler(handler),passwords};
}

test('signup enforces policy and username login returns a session, never an email',async()=>{
 const {call}=harness();for(const name of ['Shay','s_h_a_y','ADMIN'])assert.equal((await call({action:'signup',username:name,password:'password123'})).status,400);
 assert.equal((await call({action:'signup',username:'alice',password:'short'})).status,400);
 const signup=await call({action:'signup',username:'Alice',password:'password123'});assert.equal(signup.status,200);assert.equal(signup.body.codes.length,5);assert.match(signup.headers.get('cache-control'),/no-store/);
 assert.equal((await call({action:'signup',username:'ALICE',password:'password123'})).status,409);
 const owner=await call({action:'login',username:'Shay',password:'owner-password'});assert.equal(owner.status,200);assert.deepEqual(owner.body,{session:{access_token:'access-owner',refresh_token:'refresh-owner'}});assert.equal(owner.headers.get('x-content-type-options'),'nosniff');assert.equal(owner.headers.get('referrer-policy'),'no-referrer');assert.equal(owner.headers.get('cache-control'),'no-store');assert.doesNotMatch(JSON.stringify(owner.body),/@|owner@example\.test/);
 const unknown=await call({action:'login',username:'missing',password:'wrong-password'});const wrong=await call({action:'login',username:'Shay',password:'wrong-password'});assert.equal(unknown.status,400);assert.equal(wrong.status,400);assert.equal(unknown.body.error,wrong.body.error);assert.doesNotMatch(JSON.stringify([unknown.body,wrong.body]),/@|owner@example\.test/);
 assert.equal((await call({action:'resolve',username:'Shay'})).status,400,'the public email-resolution action must be disabled');
});

test('known and unknown usernames use isolated login buckets before account lookup',async()=>{
 const base=harness();await base.call({action:'signup',username:'alice',password:'password123'});
 const reservations=[],lookups=[];const handler=createUsernameHandler({...base.deps,
  resolve:async name=>{lookups.push(name);return base.deps.resolve(name);},
  reserve:async(action,subject)=>{reservations.push([action,subject]);return !(action==='login'&&subject==='username:shay');}
 });const call=requestHandler(handler);
 assert.equal((await call({action:'login',username:'Shay',password:'wrong'})).status,429);
 assert.equal((await call({action:'login',username:'Alice',password:'password123'})).status,200);
 assert.equal((await call({action:'login',username:'nobody',password:'wrong'})).status,400);
 assert.deepEqual(reservations,[['login','username:shay'],['login','username:alice'],['login','username:nobody']]);
 assert.deepEqual(lookups,['alice','nobody'],'a throttled name is rejected before the privileged lookup');
});

test('recovery codes are single-use, account-bound and code issuance requires authentication',async()=>{
 const {call,passwords}=harness();const one=(await call({action:'signup',username:'alice',password:'password123'})).body.codes;
 await call({action:'signup',username:'bobby',password:'password123'});
 assert.equal((await call({action:'recover',username:'bobby',code:one[0],password:'new-password'})).status,400);
 assert.equal((await call({action:'recover',username:'alice',code:one[0],password:'new-password'})).status,200);assert.equal(passwords.get('1'),'new-password');
 assert.equal((await call({action:'recover',username:'alice',code:one[0],password:'different-password'})).status,400);
 assert.equal((await call({action:'codes'})).status,401);assert.equal((await call({action:'codes'},'Bearer valid')).body.codes.length,5);
});

test('rate limit and provider errors do not expose secrets, and failed recovery consumes the code',async()=>{
 const limited=harness(async()=>false);const r=await limited.call({action:'signup',username:'alice',password:'secret-password'});assert.equal(r.status,429);assert.doesNotMatch(JSON.stringify(r.body),/secret-password/);
 const h=harness();const codes=(await h.call({action:'signup',username:'alice',password:'password123'})).body.codes;
 const failing=createUsernameHandler({...h.deps,changePassword:async()=>{throw Error('secret internal details');}});const request=()=>new Request('https://example.test/',{method:'POST',body:JSON.stringify({action:'recover',username:'alice',password:'new-password',code:codes[0]})});const failure=await failing(request());assert.equal(failure.status,503);assert.doesNotMatch(await failure.text(),/secret internal details/);assert.equal((await failing(request())).status,400);
});
