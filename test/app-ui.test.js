import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import * as utils from '../public/study-utils.js';
import { createAccountBackend, validateConfig } from '../public/account-backend.js';
import { extraDecks, searchDecks } from '../public/decks.js';
import { subjects, starterDecks } from '../public/starter-decks.js';
import { videos, filterVideos } from '../public/videos.js';
import { subjectCatalog, cleanSubjects } from '../public/subject-catalog.js';
const html=await readFile('public/index.html','utf8');
const app=(await readFile('public/app.js','utf8')).replace(/^import .*;\n/gm,'');
const wait=()=>new Promise(resolve=>setTimeout(resolve,30));
const account={id:'b9248376-5088-4298-889f-3227c6105a21',email:'learner@example.com',user_metadata:{name:'Alex',subjects:['Biology','Mathematics']}};
const defaultProgress={completed:{biology:true},reviews:{},tasks:[],activity:[],subjects:['Biology','Mathematics']};
function mockClient({session=null,progress=defaultProgress,failSync=false}={}) {
  const log={saved:null,created:null,signup:null,signOut:0,sets:[]};
  const client={auth:{
    getSession:async()=>({data:{session:session?{user:session}:null}}),
    signInWithPassword:async()=>({data:{user:account}}),
    signUp:async input=>(log.signup=input,{data:{session:null,user:account}}),
    resend:async input=>(log.resend=input,{data:{}}),
    signOut:async()=>{log.signOut++;return {data:{}};}
  },from:table=>{
    if(table==='revision_progress')return {
      select:()=>({eq:()=>({maybeSingle:async()=>({data:progress?{progress}:null})})}),
      upsert:async data=>{log.saved=data;return failSync?{error:new Error('offline')}:{data:null};}
    };
    return {
      select:()=>({eq:(col,value)=>({order:()=>({limit:async()=>({data:log.sets.filter(s=>s[col]===value)})})})}),
      insert:data=>({select:()=>({single:async()=>{const row={...data,id:'a1234567-1234-4123-8123-123456789abc',owner_id:account.id};log.created=row;log.sets.push(row);return {data:row};}})}),
      delete:()=>({eq:async(_field,id)=>{log.sets=log.sets.filter(s=>s.id!==id);return {data:null};}}), update:values=>({eq:async(_field,id)=>{const set=log.sets.find(s=>s.id===id);if(set)Object.assign(set,values);return {data:null};}})
    };
  }};
  return {client,log};
}
function setup(mock, {configured=true,url='https://example.test/public/'}={}) {
  const dom=new JSDOM(html,{url,runScripts:'outside-only'});const w=dom.window;
  Object.assign(w,utils,{extraDecks,searchDecks,subjects,starterDecks,videos,filterVideos,subjectCatalog,cleanSubjects,createAccountBackend,validateConfig,supabaseConfig:configured?{url:'https://example.supabase.co',publishableKey:'sb_publishable_test'}:{},createClient:()=>mock});
  w.scrollTo=()=>{};w.confirm=()=>true;
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
  w.localStorage.setItem('revisepro-state',JSON.stringify({completed:{maths:true},reviews:{},tasks:[],activity:[]}));
  return {dom,w,run:()=>w.eval(`(async()=>{${app}\n})()`)};
}
const go=(w,hash)=>{w.location.hash=hash;w.dispatchEvent(new w.HashChangeEvent('hashchange'));};

test('logged-out visitors see landing page and cannot access guest workspace',async()=>{
  const {dom,w,run}=setup(null,{configured:false,url:'https://example.test/public/#flashcards'});await run();
  assert.equal(w.document.querySelector('#landing').hidden,false);assert.equal(w.document.querySelector('.app-shell').hidden,true);
  assert.match(w.document.querySelector('#landing').textContent,/confidence/i);
  w.document.querySelector('[data-open-auth="login"]').click();assert.match(w.document.querySelector('#modal').textContent,/setup is not complete/i);dom.window.close();
});
test('signup requires subjects and sends subject selection with confirmation redirect',async()=>{
  const {client,log}=mockClient();const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  q('[data-open-auth="register"]').click();q('[name="name"]').value='Alex';q('[name="email"]').value='alex@example.com';q('[name="password"]').value='longpassword';
  q('#authForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.match(q('#authError').textContent,/select at least one/i);assert.equal(log.signup,null);
  q('input[name="subjects"][value="Biology"]').checked=true;q('#authForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();
  assert.equal(log.signup.options.emailRedirectTo,'https://example.test/public/login.html');assert.deepEqual(Array.from(log.signup.options.data.subjects),['Biology']);assert.match(q('#modal').textContent,/Check your email/);assert.equal(q('.app-shell').hidden,true);dom.window.close();
});
test('confirmation callback signs out the temporary session and opens login',async()=>{
  const {client,log}=mockClient({session:account});const {dom,w,run}=setup(client,{url:'https://example.test/public/?auth=confirmed#access_token=token&type=signup'});await run();
  assert.equal(log.signOut,1);assert.equal(w.document.querySelector('.app-shell').hidden,true);assert.match(w.document.querySelector('#authForm').textContent,/Email confirmed/);assert.equal(w.document.querySelector('#authForm').dataset.mode,'login');dom.window.close();
});
test('existing account chooses subjects and saves progress without overwriting guest data',async()=>{
  const existing={...account,user_metadata:{name:'Alex'}};const {client,log}=mockClient({session:existing,progress:{completed:{biology:true},reviews:{},tasks:[],activity:[]}});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  assert.match(q('#app').textContent,/Make this space yours/);q('input[name="subjects"][value="Biology"]').checked=true;q('#subjectsForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();
  assert.deepEqual(Array.from(log.saved.progress.subjects),['Biology']);assert.equal(JSON.parse(w.localStorage.getItem('revisepro-state')).completed.maths,true);assert.match(q('#app').textContent,/Hey, Alex/);dom.window.close();
});
test('signed-in users search and review selected starter sets',async()=>{
  const {client,log}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  go(w,'#flashcards');assert.ok(q('#deckSearch'));q('#deckSearch').value='chloroplasts';q('#deckSearch').dispatchEvent(new w.Event('input',{bubbles:true}));assert.ok([...w.document.querySelectorAll('.deck-card')].some(card=>/Photosynthesis/.test(card.textContent)));
  go(w,'#flashcards/bio-transport');q('#flipCard').click();assert.match(q('#flipCard').textContent,/net movement/i);q('#reviewCard').click();await wait();assert.ok(log.saved.progress.reviews['bio-transport-0']);dom.window.close();
});
test('users can create a private or public set and see its visibility',async()=>{
  const {client,log}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  go(w,'#create-set');q('[name="title"]').value='My biology';const questions=w.document.querySelectorAll('[name="question"]');const answers=w.document.querySelectorAll('[name="answer"]');questions[0].value='Question one?';answers[0].value='Answer one';questions[1].value='Question two?';answers[1].value='Answer two';
  q('#createSetForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.equal(log.created.is_public,false);assert.equal(log.created.owner_id,account.id);assert.match(q('#app').textContent,/Your private set/);assert.ok(q('[data-set-visibility="true"]'));q('[data-set-visibility="true"]').click();await wait();assert.equal(log.created.is_public,true);assert.match(q('#app').textContent,/Community set/);q('[data-set-visibility="false"]').click();await wait();assert.equal(log.created.is_public,false);
  go(w,'#create-set');q('[name="title"]').value='Shared set';const qs=w.document.querySelectorAll('[name="question"]'),as=w.document.querySelectorAll('[name="answer"]');qs[0].value='Q1';as[0].value='A1';qs[1].value='Q2';as[1].value='A2';q('[name="isPublic"]').checked=true;q('#createSetForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.equal(log.created.is_public,true);dom.window.close();
});
test('failed progress sync keeps local changes and offers a resolution',async()=>{
  const {client}=mockClient({session:account,failSync:true});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  go(w,'#planner');q('[name="title"]').value='Local change';q('#planForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.equal(w.localStorage.getItem(`revisepro-state-user-${account.id}-pending`),'1');q('#topAccount').click();assert.match(q('#modal').textContent,/not synced/);assert.ok(q('#useLocal'));dom.window.close();
});

test('community set content is escaped and other owners cannot see management buttons',async()=>{
  const {client,log}=mockClient({session:account});log.sets.push({id:'e1234567-1234-4123-8123-123456789abc',owner_id:'other',subject:'Biology',title:'<img src=x onerror=alert(1)>',description:'<script>evil()</script>',is_public:true,cards:[['<b>question</b>','<img src=x onerror=alert(1)>']]});
  const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  go(w,'#flashcards');assert.equal(q('#deckResults img'),null);assert.match(q('#deckResults').textContent,/<img/);
  go(w,'#flashcards/set-e1234567-1234-4123-8123-123456789abc');assert.equal(q('#app script'),null);assert.equal(q('#flipCard b'),null);assert.equal(q('[data-set-visibility]'),null);assert.equal(q('[data-delete-set]'),null);dom.window.close();
});

test('confirmation email can be requested again from login',async()=>{
  const {client,log}=mockClient();const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  q('[data-open-auth="login"]').click();q('#resendConfirmation').click();assert.match(q('#authError').textContent,/valid email/);q('[name="email"]').value='alex@example.com';q('#resendConfirmation').click();await wait();
  assert.equal(log.resend.type,'signup');assert.equal(log.resend.email,'alex@example.com');assert.equal(log.resend.options.emailRedirectTo,'https://example.test/public/login.html');assert.match(q('#authError').textContent,/check your email/i);dom.window.close();
});

test('expanded starter sets can be browsed and the twentieth card reviewed',async()=>{
  const progress={...defaultProgress,reviews:{'bio-transport-4':'2026-01-01'}};
  const {client,log}=mockClient({session:account,progress});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  go(w,'#subject/biology');assert.match(q('#app').textContent,/20 cards/);
  go(w,'#flashcards/bio-transport');assert.equal(w.document.querySelectorAll('.card-list-item').length,20);assert.match(q('.study-progress').textContent,/1 \/ 20 reviewed/);
  q('[data-card-index="19"]').click();assert.match(q('.study-progress').textContent,/Card 20 of 20/);q('#reviewCard').click();await wait();
  assert.equal(log.saved.progress.reviews['bio-transport-4'],'2026-01-01');assert.ok(log.saved.progress.reviews['bio-transport-19']);dom.window.close();
});

test('video library filters selected subjects and search with safe external links',async()=>{
  const {client}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  go(w,'#videos');assert.equal(q('[data-nav="videos"]').getAttribute('aria-current'),'page');
  assert.ok(q('#videoSearch'));assert.ok([...w.document.querySelectorAll('.video-card')].some(card=>/Osmosis/.test(card.textContent)));
  assert.ok(![...w.document.querySelectorAll('.video-card')].some(card=>/Covalent bonding/.test(card.textContent)));
  q('[data-video-filter="All subjects"]').click();assert.ok([...w.document.querySelectorAll('.video-card')].some(card=>/Covalent bonding/.test(card.textContent)));
  q('#videoSearch').value='covalent';q('#videoSearch').dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.equal(w.document.querySelectorAll('.video-card').length,1);assert.match(q('#videoCount').textContent,/1 video/);
  assert.equal(q('.video-card').href,'https://www.youtube.com/watch?v=7IkYm7ZgiAw');assert.equal(q('.video-card').target,'_blank');assert.match(q('.video-card').rel,/noopener/);
  q('#videoSearch').value='nothing will match';q('#videoSearch').dispatchEvent(new w.Event('input',{bubbles:true}));assert.match(q('#videoGrid').textContent,/No selected videos/);
  q('#clearVideoSearch').click();assert.equal(q('#videoSearch').value,'');assert.equal(q('[data-video-filter="My subjects"]').getAttribute('aria-pressed'),'true');
  assert.match(q('.video-discovery').textContent,/not selected or reviewed/);assert.ok(q('.video-discovery-link').href.startsWith('https://www.youtube.com/results?search_query='));dom.window.close();
});

test('custom subject video searches are escaped and remain on YouTube',async()=>{
  const progress={...defaultProgress,subjects:['<img src=x onerror=alert(1)>']};const {client}=mockClient({session:account,progress});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  go(w,'#videos');assert.equal(q('#videoGrid img'),null);assert.equal(q('.video-discovery img'),null);
  const link=q('.video-discovery-link');assert.equal(new URL(link.href).hostname,'www.youtube.com');assert.match(link.textContent,/<img/);dom.window.close();
});

test('dashboard, subject view and flashcards lead to newly added content',async()=>{
  const {client,log}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  assert.ok(q('.dashboard-video[href="#videos"]'));go(w,'#subject/biology');q('[data-open-video-subject="Biology"]').click();w.dispatchEvent(new w.HashChangeEvent('hashchange'));
  assert.equal(q('[data-video-filter="Biology"]').getAttribute('aria-pressed'),'true');assert.match(q('#videoGrid').textContent,/Osmosis/);
  go(w,'#flashcards');q('[data-filter="All subjects"]').click();q('#deckSearch').value='everyday italian';q('#deckSearch').dispatchEvent(new w.Event('input',{bubbles:true}));assert.match(q('#deckResults').textContent,/Everyday Italian/);
  go(w,'#flashcards/italian-intro');assert.equal(w.document.querySelectorAll('.card-list-item').length,20);q('#reviewCard').click();await wait();assert.ok(log.saved.progress.reviews['italian-intro-0']);dom.window.close();
});
