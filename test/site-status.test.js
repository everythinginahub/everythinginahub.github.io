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
