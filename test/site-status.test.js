import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {mountStatus} from '../public/status.js';
import {startSiteAnalytics} from '../public/site-analytics.js';
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
const sample={all_views:12,signed_views:4,unique_browsers:7,unique_accounts:3,guest_online:2,signed_online:1,started_at:'2026-01-01T00:00:00Z'};
function mockClient(isOwner=false){const calls=[];return {calls,auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc:async(name,args)=>{calls.push([name,args]);if(name==='site_status_is_owner')return {data:isOwner};if(name==='site_status_code')return isOwner?{data:'secret-code'}:{error:{}};if(name==='site_status_read')return isOwner||args.p_code==='test-code'?{data:sample}:{error:{}};return {data:null};}};}

test('share code unlocks dashboard without exposing the owner-only code button',async()=>{
 const html=await readFile('public/status.html','utf8');const dom=new JSDOM(html,{url:'https://example.test/status',pretendToBeVisual:true});try{const doc=dom.window.document,client=mockClient(),ctl=mountStatus(doc,client,dom.window);await tick();assert.equal(doc.getElementById('showCode').hidden,true);assert.equal(doc.getElementById('dashboard').hidden,true);doc.getElementById('accessCode').value='bad';doc.getElementById('accessForm').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();assert.match(doc.getElementById('statusMessage').textContent,/Could not open/);doc.getElementById('accessCode').value='test-code';doc.getElementById('accessForm').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();assert.equal(doc.getElementById('dashboard').hidden,false);assert.equal(doc.getElementById('allViews').textContent,'12');assert.equal(doc.getElementById('guestViews').textContent,'8');assert.equal(doc.getElementById('onlineTotal').textContent,'3');assert.equal(doc.getElementById('accessCode').value,'');doc.getElementById('hideDashboard').click();assert.equal(doc.getElementById('dashboard').hidden,true);ctl.destroy();}finally{dom.window.close();}
});

test('only owner can request the code, and it is not put in the page until clicked',async()=>{
 const html=await readFile('public/status.html','utf8');const dom=new JSDOM(html,{url:'https://example.test/status'});try{const doc=dom.window.document,client=mockClient(true);doc.getElementById('codeDialog').showModal=function(){this.open=true;};doc.getElementById('codeDialog').close=function(){this.open=false;};const ctl=mountStatus(doc,client,dom.window);await tick();assert.equal(doc.getElementById('dashboard').hidden,false);assert.equal(doc.getElementById('showCode').hidden,false);assert.equal(client.calls.some(([name])=>name==='site_status_code'),false);doc.getElementById('showCode').click();await tick();assert.equal(doc.getElementById('codeValue').value,'secret-code');doc.getElementById('closeCode').click();assert.equal(doc.getElementById('codeValue').value,'');ctl.destroy();}finally{dom.window.close();}
});

test('tracker counts visits and visible presence without sending paths or content',async()=>{
 const dom=new JSDOM('<!doctype html>',{url:'https://example.test/',pretendToBeVisual:true});try{const client=mockClient();const tracker=startSiteAnalytics(client,dom.window);await tick();let calls=client.calls.filter(([name])=>name==='site_status_ping');assert.equal(calls.length,1);assert.equal(calls[0][1].p_view,true);assert.deepEqual(Object.keys(calls[0][1]).sort(),['p_browser','p_session','p_view']);dom.window.location.hash='#notes';await tick();calls=client.calls.filter(([name])=>name==='site_status_ping');assert.equal(calls.length,2);assert.equal(calls[1][1].p_session,calls[0][1].p_session);tracker.destroy();}finally{dom.window.close();}
});

test('public status pages do not load Clarity or embed a share code',async()=>{
 for(const path of ['public/status.html','status/index.html']){const html=await readFile(path,'utf8');assert.doesNotMatch(html,/clarity\.ms|zb3y8jd6m6/);assert.match(html,/id="showCode" hidden/);assert.match(html,/id="accessCode" type="password"/);}
 const sql=await readFile('supabase/site_status.sql','utf8');assert.match(sql,/enable row level security/);assert.match(sql,/public\.chat_is_owner\(auth\.uid\(\)\)/);assert.match(sql,/grant execute on function public\.site_status_code\(\) to authenticated/);
});

test('status presence is counted and fresh metrics win when initial read races its ping',async()=>{
 const html=await readFile('public/status.html','utf8');const dom=new JSDOM(html,{url:'https://example.test/status/',pretendToBeVisual:true});try{
  const doc=dom.window.document,client=mockClient(true);let releaseInitialRead,reads=0,pings=0;
  client.rpc=async(name,args)=>{
   if(name==='site_status_is_owner')return {data:true};
   if(name==='site_status_ping'){pings++;assert.equal(args.p_view,false);return {data:null};}
   if(name==='site_status_read'){reads++;if(reads===1)return await new Promise(resolve=>{releaseInitialRead=()=>resolve({data:{...sample,all_views:0,signed_views:0,signed_online:0}});});return {data:sample};}
   return {data:null};
  };
  const ctl=mountStatus(doc,client,dom.window);await tick();assert.equal(pings,1);assert.equal(reads,1);releaseInitialRead();await tick();assert.equal(reads,2);assert.equal(doc.getElementById('signedOnline').textContent,'1');assert.equal(doc.getElementById('allViews').textContent,'12');assert.match(doc.getElementById('updatedAt').textContent,/Updated/);ctl.destroy();
 }finally{dom.window.close();}
});

test('refresh on returning to dashboard and manually; a rejected ping is shown',async()=>{
 const html=await readFile('public/status.html','utf8');const dom=new JSDOM(html,{url:'https://example.test/status/',pretendToBeVisual:true});try{
  const doc=dom.window.document,client=mockClient(true);let reads=0;const original=client.rpc;
  client.rpc=async(name,args)=>{if(name==='site_status_ping')return {error:{message:'offline'}};if(name==='site_status_read')reads++;return original(name,args);};
  const ctl=mountStatus(doc,client,dom.window);await tick();assert.match(doc.getElementById('trackingMessage').textContent,/presence could not be updated/);assert.equal(reads,1);
  doc.dispatchEvent(new dom.window.Event('visibilitychange'));await tick();assert.equal(reads,2);
  doc.getElementById('refreshStatus').click();await tick();assert.equal(reads,3);ctl.destroy();
 }finally{dom.window.close();}
});

test('first visit is recorded when a tab initially opens hidden and later becomes visible',async()=>{
 const dom=new JSDOM('<!doctype html>',{url:'https://example.test/',pretendToBeVisual:true});try{
  let hidden=true;Object.defineProperty(dom.window.document,'hidden',{get:()=>hidden});const client=mockClient(),tracker=startSiteAnalytics(client,dom.window);await tick();assert.equal(client.calls.filter(([name])=>name==='site_status_ping').length,0);hidden=false;dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));await tick();assert.equal(client.calls.filter(([name])=>name==='site_status_ping')[0][1].p_view,true);tracker.destroy();
 }finally{dom.window.close();}
});

test('restoring auth, repeated SIGNED_IN events and returning to the same route do not add views',async()=>{
 const dom=new JSDOM('<!doctype html>',{url:'https://example.test/public/#home',pretendToBeVisual:true});try{
  const client=mockClient();let notify;client.auth.onAuthStateChange=cb=>{notify=cb;return {data:{subscription:{unsubscribe(){}}}};};
  const tracker=startSiteAnalytics(client,dom.window);notify('INITIAL_SESSION');await tick();notify('SIGNED_IN');notify('SIGNED_IN');await tick();dom.window.location.hash='';await tick();
  let pings=client.calls.filter(([n])=>n==='site_status_ping').map(([,args])=>args.p_view);assert.equal(pings.filter(Boolean).length,1);assert.ok(pings.filter(v=>!v).length>=2);
  dom.window.location.hash='#notes';await tick();pings=client.calls.filter(([n])=>n==='site_status_ping').map(([,args])=>args.p_view);assert.equal(pings.filter(Boolean).length,2);tracker.destroy();
 }finally{dom.window.close();}
});

test('each main-site reload records one view but status reloads only report presence',async()=>{
 for(const path of ['https://example.test/status/','https://example.test/public/status.html']){
  const html=await readFile('public/status.html','utf8');for(let i=0;i<3;i++){
   const dom=new JSDOM(html,{url:path,pretendToBeVisual:true});try{const client=mockClient(true),ctl=mountStatus(dom.window.document,client,dom.window);await tick();dom.window.document.getElementById('refreshStatus').click();dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));await tick();const pings=client.calls.filter(([name])=>name==='site_status_ping');assert.ok(pings.length>=1);assert.ok(pings.every(([,args])=>args.p_view===false));ctl.destroy();}finally{dom.window.close();}
  }
 }
 for(let i=0;i<3;i++){const dom=new JSDOM('<!doctype html>',{url:'https://example.test/public/',pretendToBeVisual:true});try{const client=mockClient(),tracker=startSiteAnalytics(client,dom.window);await tick();const views=client.calls.filter(([name,args])=>name==='site_status_ping'&&args.p_view);assert.equal(views.length,1);tracker.destroy();}finally{dom.window.close();}}
});

test('an ambiguous failed view is not retried as another view',async()=>{
 const dom=new JSDOM('<!doctype html>',{url:'https://example.test/public/',pretendToBeVisual:true});try{const client=mockClient(),pings=[];client.rpc=async(name,args)=>{if(name==='site_status_ping'){pings.push(args.p_view);return pings.length===1?{error:{message:'network error'}}:{data:null};}return {data:null};};const tracker=startSiteAnalytics(client,dom.window);await tick();dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));await tick();assert.deepEqual(pings,[true,false]);tracker.destroy();}finally{dom.window.close();}
});
