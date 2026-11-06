import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import * as utils from '../public/study-utils.js';
import { createAccountBackend, validateConfig } from '../public/account-backend.js';
import { extraDecks, searchDecks } from '../public/decks.js';
const html=await readFile('public/index.html','utf8');
const app=(await readFile('public/app.js','utf8')).replace(/^import .*;\n/gm,'');
const wait=()=>new Promise(resolve=>setTimeout(resolve,25));

function setup(mock, configured=true) {
  const dom=new JSDOM(html,{url:'https://example.test/public/',runScripts:'outside-only'});
  const w=dom.window;
  Object.assign(w,utils,{extraDecks,searchDecks,createAccountBackend,validateConfig,supabaseConfig: configured ? {url:'https://example.supabase.co',publishableKey:'sb_publishable_test'} : {},createClient:()=>mock});
  w.scrollTo=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
  w.localStorage.setItem('revisepro-state',JSON.stringify({completed:{maths:true},reviews:{},tasks:[],activity:[]}));
  return {dom,w,run:()=>w.eval(`(async()=>{${app}\n})()`)};
}

test('guest mode works when Supabase is not configured',async()=>{
  const {dom,w,run}=setup(null,false);await run();
  assert.match(w.document.querySelector('#app').textContent,/1 \/ 6 starter topics/);
  w.document.querySelector('#topAccount').click();
  assert.match(w.document.querySelector('#modal').textContent,/setup is not complete/);
  dom.window.close();
});

test('login loads remote progress and syncs only to the authenticated user',async()=>{
  let saved=null;
  const account={id:'user-123',email:'learner@example.com',user_metadata:{name:'Alex'}};
  const mock={auth:{getSession:async()=>({data:{session:null}}), signInWithPassword:async()=>({data:{user:account}}), signOut:async()=>({data:{}})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{progress:{completed:{biology:true},reviews:{},tasks:[],activity:[]}}})})}),upsert:async data=>(saved=data,{data:null})})};
  const {dom,w,run}=setup(mock);await run();const q=s=>w.document.querySelector(s);
  q('#topAccount').click();q('[name="email"]').value='learner@example.com';q('[name="password"]').value='longpassword';q('#authForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();
  assert.match(q('#app').textContent,/Hey, Alex/);assert.match(q('#app').textContent,/1 \/ 6 starter topics/);
  w.location.hash='#planner';w.dispatchEvent(new w.HashChangeEvent('hashchange'));q('[name="title"]').value='Practise algebra';q('#planForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();
  assert.equal(saved.user_id,'user-123');assert.equal(saved.progress.completed.biology,true);assert.equal(saved.progress.completed.maths,undefined);assert.equal(saved.progress.tasks[0].title,'Practise algebra');
  q('#topAccount').click();q('#logout').click();await wait();assert.match(q('#app').textContent,/Study planner/);assert.equal(JSON.parse(w.localStorage.getItem('revisepro-state')).completed.maths,true);
  dom.window.close();
});

test('signup requiring email confirmation does not create a progress row',async()=>{
  let writes=0;
  const mock={auth:{getSession:async()=>({data:{session:null}}),signUp:async()=>({data:{session:null,user:{id:'new-user'}}})},from:()=>({upsert:async()=>{writes++;return {data:null}}})};
  const {dom,w,run}=setup(mock);await run();const q=s=>w.document.querySelector(s);
  q('#topAccount').click();q('[data-auth-mode="register"]').click();q('[name="name"]').value='Alex';q('[name="email"]').value='alex@example.com';q('[name="password"]').value='longpassword';q('#authForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();
  assert.match(q('#modal').textContent,/Check your email/);assert.equal(writes,0);dom.window.close();
});

test('failed sync retains local changes and offers explicit conflict choices after reload',async()=>{
  const account={id:'u1',email:'a@example.com',user_metadata:{name:'Alex'}};
  const mock={auth:{getSession:async()=>({data:{session:{user:account}}})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{progress:{completed:{},reviews:{},tasks:[],activity:[]}}})})}),upsert:async()=>({error:new Error('offline')})})};
  const {dom,w,run}=setup(mock);await run();const q=s=>w.document.querySelector(s);
  w.location.hash='#planner';w.dispatchEvent(new w.HashChangeEvent('hashchange'));q('[name="title"]').value='Local change';q('#planForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();
  assert.equal(w.localStorage.getItem('revisepro-state-user-u1-pending'),'1');q('#topAccount').click();assert.match(q('#modal').textContent,/not synced/);assert.ok(q('#useLocal'));assert.ok(q('#useCloud'));dom.window.close();
});

test('flashcard library supports search, subject filtering, browsing and saving review progress',async()=>{
  const {dom,w,run}=setup(null,false);await run();const q=s=>w.document.querySelector(s);
  w.location.hash='#flashcards';w.dispatchEvent(new w.HashChangeEvent('hashchange'));
  assert.ok(q('#deckSearch'));assert.equal(q('#deckSelect'),null);assert.equal(w.document.querySelectorAll('.deck-card').length,32);
  q('#deckSearch').value='chloroplasts';q('#deckSearch').dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.equal(w.document.querySelectorAll('.deck-card').length,1);assert.match(q('.deck-card').textContent,/Photosynthesis/);
  q('[data-filter="Mathematics"]').click();assert.match(q('#deckResults').textContent,/No sets found/);
  q('#clearSearch').click();assert.equal(w.document.querySelectorAll('.deck-card').length,32);
  w.location.hash='#flashcards/bio-transport';w.dispatchEvent(new w.HashChangeEvent('hashchange'));
  assert.match(q('#flipCard').textContent,/diffusion/i);assert.equal(w.document.querySelectorAll('.card-list-item').length,5);
  q('#flipCard').click();assert.match(q('#flipCard').textContent,/net movement/i);
  q('#reviewCard').click();assert.equal(JSON.parse(w.localStorage.getItem('revisepro-state')).reviews['bio-transport-0'].length,10);assert.match(q('.study-progress').textContent,/1 \/ 5 reviewed/);
  q('[data-card-index="4"]').click();assert.match(q('#flipCard').textContent,/root hair/i);q('#nextCard').click();assert.match(q('#flipCard').textContent,/diffusion/i);
  dom.window.close();
});
