import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {mountStatus} from '../public/status.js';
import {startSiteAnalytics} from '../public/site-analytics.js';
const tick=()=>new Promise(resolve=>setTimeout(resolve,15));
const sample={all_views:12,signed_views:4,unique_browsers:7,unique_accounts:3,signed_online:1,started_at:'2026-01-01T00:00:00Z'};
function mockClient({isOwner=false,session=null}={}){
 const calls=[],listeners=new Set();
 const client={calls,auth:{
  getSession:async()=>({data:{session}}),
  onAuthStateChange:callback=>{listeners.add(callback);return {data:{subscription:{unsubscribe(){listeners.delete(callback);}}}};}
 },rpc:async(name,args)=>{
  calls.push([name,args]);
  if(name==='site_status_ping')return {data:null};
  if(name==='site_status_is_owner')return {data:isOwner};
  if(name==='site_status_code')return isOwner?{data:'secret-code'}:{error:{}};
  if(name==='site_status_read')return isOwner||args.p_code==='test-code'?{data:sample}:{error:{}};
  return {data:null};
 }};
 client.emit=(event,nextSession=session)=>{session=nextSession;for(const listener of listeners)listener(event,nextSession);};
 return client;
}

test('share code unlocks dashboard without exposing the owner-only code button',async()=>{
 const html=await readFile('public/status.html','utf8');const dom=new JSDOM(html,{url:'https://example.test/status',pretendToBeVisual:true});try{
  const doc=dom.window.document,client=mockClient(),ctl=mountStatus(doc,client,dom.window);await tick();assert.equal(doc.getElementById('showCode').hidden,true);assert.equal(doc.getElementById('dashboard').hidden,true);
  doc.getElementById('accessCode').value='bad';doc.getElementById('accessForm').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();assert.match(doc.getElementById('statusMessage').textContent,/Could not open/);
  doc.getElementById('accessCode').value='test-code';doc.getElementById('accessForm').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();assert.equal(doc.getElementById('dashboard').hidden,false);assert.equal(doc.getElementById('allViews').textContent,'12');assert.equal(doc.getElementById('historicalGuestViews').textContent,'8');assert.equal(doc.getElementById('signedOnline').textContent,'1');assert.equal(doc.getElementById('accessCode').value,'');doc.getElementById('hideDashboard').click();assert.equal(doc.getElementById('dashboard').hidden,true);ctl.destroy();
 }finally{dom.window.close();}
});

test('only owner can request the code, and it is not put in the page until clicked',async()=>{
 const html=await readFile('public/status.html','utf8');const dom=new JSDOM(html,{url:'https://example.test/status'});try{
  const doc=dom.window.document,client=mockClient({isOwner:true,session:{user:{id:'owner'}}});doc.getElementById('codeDialog').showModal=function(){this.open=true;};doc.getElementById('codeDialog').close=function(){this.open=false;};const ctl=mountStatus(doc,client,dom.window);await tick();assert.equal(doc.getElementById('dashboard').hidden,false);assert.equal(doc.getElementById('showCode').hidden,false);assert.equal(client.calls.some(([name])=>name==='site_status_code'),false);doc.getElementById('showCode').click();await tick();assert.equal(doc.getElementById('codeValue').value,'secret-code');doc.getElementById('closeCode').click();assert.equal(doc.getElementById('codeValue').value,'');ctl.destroy();
 }finally{dom.window.close();}
});

test('anonymous visits neither persist an analytics identifier nor call the status write RPC',async()=>{
 const dom=new JSDOM('<!doctype html>',{url:'https://example.test/',pretendToBeVisual:true});try{const client=mockClient(),storageCalls=[];for(const method of ['getItem','setItem']){const original=dom.window.localStorage[method].bind(dom.window.localStorage);Object.defineProperty(dom.window.localStorage,method,{configurable:true,value(...args){storageCalls.push([method,...args]);return original(...args);}});}const tracker=startSiteAnalytics(client,dom.window);await tick();dom.window.location.hash='#notes';dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));await tick();assert.equal(client.calls.filter(([name])=>name==='site_status_ping').length,0);assert.deepEqual(storageCalls,[]);tracker.destroy();}finally{dom.window.close();}
});

test('signed-in tracker records page views and presence without paths or content',async()=>{
 const dom=new JSDOM('<!doctype html>',{url:'https://example.test/',pretendToBeVisual:true});try{const client=mockClient({session:{user:{id:'user-1'}}});const tracker=startSiteAnalytics(client,dom.window);await tick();let calls=client.calls.filter(([name])=>name==='site_status_ping');assert.equal(calls.length,1);assert.equal(calls[0][1].p_view,true);assert.deepEqual(Object.keys(calls[0][1]).sort(),['p_browser','p_session','p_view']);for(const name of ['p_browser','p_session'])assert.match(calls[0][1][name],/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);dom.window.location.hash='#notes';await tick();calls=client.calls.filter(([name])=>name==='site_status_ping');assert.equal(calls.length,2);assert.equal(calls[1][1].p_browser,calls[0][1].p_browser);assert.equal(calls[1][1].p_session,calls[0][1].p_session);tracker.destroy();}finally{dom.window.close();}
});

test('status entry pages load the cache-busted authenticated tracker',async()=>{
 const [publicPage,statusPage,statusScript,appScript]=await Promise.all(['public/status.html','status/index.html','public/status.js','public/app.js'].map(path=>readFile(path,'utf8')));
 assert.match(publicPage,/status\.js\?v=5/);assert.match(statusPage,/status\.js\?v=5/);
 assert.match(statusScript,/site-analytics\.js\?v=20261106-5/);assert.match(appScript,/site-analytics\.js\?v=20261106-5/);
});

test('public status pages do not load Clarity or embed a share code',async()=>{
 for(const path of ['public/status.html','status/index.html']){const html=await readFile(path,'utf8');assert.doesNotMatch(html,/clarity\.ms|zb3y8jd6m6/);assert.doesNotMatch(html,/excluded from page views and online counts/i);assert.match(html,/signed-in accounts appear in presence counts/i);assert.match(html,/id="showCode" hidden/);assert.match(html,/id="accessCode" type="password"/);}
 const [sql,existing]=await Promise.all([readFile('supabase/site_status.sql','utf8'),readFile('supabase/site_status_auth_only.sql','utf8')]);
 for(const source of [sql,existing]){assert.match(source,/enable row level security/);assert.match(source,/public\.chat_is_owner\(auth\.uid\(\)\)/);assert.match(source,/grant execute on function public\.site_status_ping\(uuid,uuid,boolean\) to authenticated/);assert.doesNotMatch(source,/grant execute on function public\.site_status_ping\(uuid,uuid,boolean\) to anon/i);assert.match(source,/rate\.attempts < 300/);assert.match(source,/\x27guest_online\x27,0/);assert.match(source,/create or replace function public\.site_status_read\(p_code text default null\)/);}
 assert.match(sql,/grant execute on function public\.site_status_code\(\) to authenticated/);
});

test('status presence is counted and fresh metrics win when initial read races its ping',async()=>{
 const html=await readFile('public/status.html','utf8');const dom=new JSDOM(html,{url:'https://example.test/status/',pretendToBeVisual:true});try{
  const doc=dom.window.document,client=mockClient({isOwner:true,session:{user:{id:'owner'}}});let releaseInitialRead,reads=0,pings=0;
  client.rpc=async(name,args)=>{client.calls.push([name,args]);if(name==='site_status_is_owner')return {data:true};if(name==='site_status_ping'){pings++;assert.equal(args.p_view,false);return {data:null};}if(name==='site_status_read'){reads++;if(reads===1)return await new Promise(resolve=>{releaseInitialRead=()=>resolve({data:{...sample,all_views:0,signed_views:0,signed_online:0}});});return {data:sample};}return {data:null};};
  const ctl=mountStatus(doc,client,dom.window);await tick();assert.equal(pings,1);assert.equal(reads,1);releaseInitialRead();await tick();assert.equal(reads,2);assert.equal(doc.getElementById('signedOnline').textContent,'1');assert.equal(doc.getElementById('allViews').textContent,'12');assert.match(doc.getElementById('updatedAt').textContent,/Updated/);ctl.destroy();
 }finally{dom.window.close();}
});

test('refresh on returning to dashboard and manually; a rejected signed-in ping is shown',async()=>{
 const html=await readFile('public/status.html','utf8');const dom=new JSDOM(html,{url:'https://example.test/status/',pretendToBeVisual:true});try{
  const doc=dom.window.document,client=mockClient({isOwner:true,session:{user:{id:'owner'}}});let reads=0;const original=client.rpc;
  client.rpc=async(name,args)=>{if(name==='site_status_ping')return {error:{message:'offline'}};if(name==='site_status_read')reads++;return original(name,args);};
  const ctl=mountStatus(doc,client,dom.window);await tick();assert.match(doc.getElementById('trackingMessage').textContent,/presence could not be updated/);assert.equal(reads,1);doc.dispatchEvent(new dom.window.Event('visibilitychange'));await tick();assert.equal(reads,2);doc.getElementById('refreshStatus').click();await tick();assert.equal(reads,3);ctl.destroy();
 }finally{dom.window.close();}
});

test('a signed-in tab opened hidden records its first view when it becomes visible',async()=>{
 const dom=new JSDOM('<!doctype html>',{url:'https://example.test/',pretendToBeVisual:true});try{let hidden=true;Object.defineProperty(dom.window.document,'hidden',{get:()=>hidden});const client=mockClient({session:{user:{id:'user-1'}}}),tracker=startSiteAnalytics(client,dom.window);await tick();assert.equal(client.calls.filter(([name])=>name==='site_status_ping').length,0);hidden=false;dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));await tick();assert.equal(client.calls.filter(([name])=>name==='site_status_ping')[0][1].p_view,true);tracker.destroy();}finally{dom.window.close();}
});

test('restoring auth, repeated sign-in events and route changes count each page only once',async()=>{
 const dom=new JSDOM('<!doctype html>',{url:'https://example.test/public/#home',pretendToBeVisual:true});try{const client=mockClient({session:{user:{id:'user-1'}}});const tracker=startSiteAnalytics(client,dom.window);client.emit('INITIAL_SESSION',{user:{id:'user-1'}});await tick();client.emit('SIGNED_IN',{user:{id:'user-1'}});client.emit('SIGNED_IN',{user:{id:'user-1'}});await tick();dom.window.location.hash='';await tick();let pings=client.calls.filter(([n])=>n==='site_status_ping').map(([,args])=>args.p_view);assert.equal(pings.filter(Boolean).length,1);dom.window.location.hash='#notes';await tick();pings=client.calls.filter(([n])=>n==='site_status_ping').map(([,args])=>args.p_view);assert.equal(pings.filter(Boolean).length,2);tracker.destroy();}finally{dom.window.close();}
});

test('each signed-in reload records one view while the status page sends presence only',async()=>{
 for(const path of ['https://example.test/status/','https://example.test/public/status.html']){const html=await readFile('public/status.html','utf8');for(let i=0;i<2;i++){const dom=new JSDOM(html,{url:path,pretendToBeVisual:true});try{const client=mockClient({isOwner:true,session:{user:{id:'owner'}}}),ctl=mountStatus(dom.window.document,client,dom.window);await tick();dom.window.document.getElementById('refreshStatus').click();dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));await tick();const pings=client.calls.filter(([name])=>name==='site_status_ping');assert.ok(pings.length>=1);assert.ok(pings.every(([,args])=>args.p_view===false));ctl.destroy();}finally{dom.window.close();}}}
 const dom=new JSDOM('<!doctype html>',{url:'https://example.test/public/',pretendToBeVisual:true});try{const client=mockClient({session:{user:{id:'user-1'}}}),tracker=startSiteAnalytics(client,dom.window);await tick();const views=client.calls.filter(([name,args])=>name==='site_status_ping'&&args.p_view);assert.equal(views.length,1);tracker.destroy();}finally{dom.window.close();}
});

test('an ambiguous failed signed-in view is not retried as another view',async()=>{
 const dom=new JSDOM('<!doctype html>',{url:'https://example.test/public/',pretendToBeVisual:true});try{const client=mockClient({session:{user:{id:'user-1'}}}),pings=[];client.rpc=async(name,args)=>{if(name==='site_status_ping'){pings.push(args.p_view);return pings.length===1?{error:{message:'network error'}}:{data:null};}return {data:null};};const tracker=startSiteAnalytics(client,dom.window);await tick();dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));await tick();assert.deepEqual(pings,[true,false]);tracker.destroy();}finally{dom.window.close();}
});
