import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import * as utils from '../public/study-utils.js';
import { createAccountBackend, validateConfig } from '../public/account-backend.js';
import { extraDecks, searchDecks } from '../public/decks.js';
import { subjects, starterDecks } from '../public/starter-decks.js';
import { videos, filterVideos, youtubeThumbnail, youtubeEmbed, youtubeVideoId, videoPracticeDecks } from '../public/videos.js';
import { subjectCatalog, cleanSubjects } from '../public/subject-catalog.js';
import { uniqueGameCards, createMatch, selectMatch, createQuiz, answerQuiz, advanceQuiz, createRecall, revealRecall, markRecall } from '../public/games.js';
import { gamesHub, gameSetCards, gameChooser, gameView } from '../public/game-views.js';
import { createPractice, submitPractice } from '../public/practice.js';
import { practiceChooser, practiceView } from '../public/practice-views.js';
import { rewardsCatalog, normalizeRewards, awardDaily, chooseReward } from '../public/rewards.js';
import { shopView } from '../public/reward-views.js';
import { parseCardLines } from '../public/card-import.js';
import { mountLive } from '../public/live-games.js';
import { mountCommunityChat } from '../public/community-chat.js';
import { mountTimetableImport } from '../public/timetable-import.js';
import { arcadeView, mountArcade } from '../public/arcade.js';
import { listsView, habitsView, bookmarksView, mountEveryday, localDay } from '../public/everyday.js';
import { revisionHub, schoolNotes, schoolTimetable, schoolToolkit, mountSchoolToolkit } from '../public/school-tools.js';
import { ebookLibrary, ebookReader, mountEbookLibrary, mountEbookReader } from '../public/ebooks.js';
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
      select:()=>({eq:()=>({maybeSingle:async()=>({data:progress?{progress:structuredClone(progress)}:null})})}),
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
  Object.assign(w,utils,{extraDecks,searchDecks,subjects,starterDecks,videos,filterVideos,youtubeThumbnail,youtubeEmbed,youtubeVideoId,videoPracticeDecks,uniqueGameCards,createMatch,selectMatch,createQuiz,answerQuiz,advanceQuiz,createRecall,revealRecall,markRecall,gamesHub,gameSetCards,gameChooser,gameView,createPractice,submitPractice,practiceChooser,practiceView,rewardsCatalog,normalizeRewards,awardDaily,chooseReward,shopView,parseCardLines,mountLive,mountCommunityChat,ebookLibrary,ebookReader,mountEbookLibrary,mountEbookReader,revisionHub,schoolNotes,schoolTimetable,schoolToolkit,mountSchoolToolkit,mountTimetableImport,arcadeView,mountArcade,listsView,habitsView,bookmarksView,mountEveryday,localDay,subjectCatalog,cleanSubjects,createAccountBackend,validateConfig,supabaseConfig:configured?{url:'https://example.supabase.co',publishableKey:'sb_publishable_test'}:{},createClient:()=>mock});
  w.scrollTo=()=>{};w.confirm=()=>true;w.fetch=async()=>({ok:true,text:async()=>('Project Gutenberg text.\n\n'+ 'A reading page. '.repeat(400))});
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
  w.localStorage.setItem('revisepro-state',JSON.stringify({completed:{maths:true},reviews:{},tasks:[],activity:[]}));
  return {dom,w,run:()=>w.eval(`(async()=>{${app}\n})()`)};
}
const go=(w,hash)=>{w.location.hash=hash;w.dispatchEvent(new w.HashChangeEvent('hashchange'));};

test('logged-out visitors see landing page and cannot access guest workspace',async()=>{
  const {dom,w,run}=setup(null,{configured:false,url:'https://example.test/public/#flashcards'});await run();
  assert.equal(w.document.querySelector('#landing').hidden,false);assert.equal(w.document.querySelector('.app-shell').hidden,true);
  assert.match(w.document.querySelector('#landing').textContent,/Welcome to\s*Everything Hub/i);
  w.document.querySelector('[data-open-auth="login"]').click();assert.match(w.document.querySelector('#modal').textContent,/setup is not complete/i);dom.window.close();
});
test('signup does not require school subjects and sends a confirmation redirect',async()=>{
  const {client,log}=mockClient();const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  q('[data-open-auth="register"]').click();q('[name="name"]').value='Alex';q('[name="email"]').value='alex@example.com';q('[name="password"]').value='longpassword';
  assert.equal(q('input[name="subjects"]'),null);q('#authForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();
  assert.equal(log.signup.options.emailRedirectTo,'https://example.test/public/login.html');assert.deepEqual(Array.from(log.signup.options.data.subjects),[]);assert.match(q('#modal').textContent,/Check your email/);assert.equal(q('.app-shell').hidden,true);dom.window.close();
});
test('confirmation callback signs out the temporary session and opens login',async()=>{
  const {client,log}=mockClient({session:account});const {dom,w,run}=setup(client,{url:'https://example.test/public/?auth=confirmed#access_token=token&type=signup'});await run();
  assert.equal(log.signOut,1);assert.equal(w.document.querySelector('.app-shell').hidden,true);assert.match(w.document.querySelector('#authForm').textContent,/Email confirmed/);assert.equal(w.document.querySelector('#authForm').dataset.mode,'login');dom.window.close();
});
test('existing account chooses subjects and saves progress without overwriting guest data',async()=>{
  const existing={...account,user_metadata:{name:'Alex'}};const {client,log}=mockClient({session:existing,progress:{completed:{biology:true},reviews:{},tasks:[],activity:[]}});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  go(w,'#flashcards');assert.match(q('#app').textContent,/Make this space yours/);q('input[name="subjects"][value="Biology"]').checked=true;q('#subjectsForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();
  assert.deepEqual(Array.from(log.saved.progress.subjects),['Biology']);assert.equal(JSON.parse(w.localStorage.getItem('revisepro-state')).completed.maths,true);assert.match(q('#app').textContent,/Hello, Alex/);dom.window.close();
});
test('signed-in users search and review selected starter sets',async()=>{
  const {client,log}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  go(w,'#flashcards');assert.ok(q('#deckSearch'));q('#deckSearch').value='chloroplasts';q('#deckSearch').dispatchEvent(new w.Event('input',{bubbles:true}));assert.ok([...w.document.querySelectorAll('.deck-card')].some(card=>/Photosynthesis/.test(card.textContent)));
  go(w,'#flashcards/bio-transport/study');q('#flipCard').click();assert.match(q('#flipCard').textContent,/net movement/i);q('#reviewCard').click();await wait();assert.ok(log.saved.progress.reviews['bio-transport-0']);dom.window.close();
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
  go(w,'#flashcards/set-e1234567-1234-4123-8123-123456789abc');assert.equal(q('#app script'),null);assert.equal(q('.set-preview-card b'),null);assert.match(q('.set-preview-card').textContent,/<b>/);assert.equal(q('[data-set-visibility]'),null);assert.equal(q('[data-delete-set]'),null);dom.window.close();
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
  go(w,'#flashcards/bio-transport/study');assert.equal(w.document.querySelectorAll('.card-list-item').length,20);assert.match(q('.study-progress').textContent,/1 \/ 20 reviewed/);
  q('[data-card-index="19"]').click();assert.match(q('.study-progress').textContent,/Card 20 of 20/);q('#reviewCard').click();await wait();
  assert.equal(log.saved.progress.reviews['bio-transport-4'],'2026-01-01');assert.ok(log.saved.progress.reviews['bio-transport-19']);dom.window.close();
});

test('video library filters selected subjects and search with safe external links',async()=>{
  const {client}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  go(w,'#videos');assert.equal(q('#crumb').textContent,'Video lessons');
  assert.ok(q('#videoSearch'));assert.ok([...w.document.querySelectorAll('.video-card')].some(card=>/Osmosis/.test(card.textContent)));
  assert.ok(![...w.document.querySelectorAll('.video-card')].some(card=>/Covalent bonding/.test(card.textContent)));
  q('[data-video-filter="All subjects"]').click();assert.ok([...w.document.querySelectorAll('.video-card')].some(card=>/Covalent bonding/.test(card.textContent)));
  q('#videoSearch').value='covalent';q('#videoSearch').dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.equal(w.document.querySelectorAll('.video-card').length,1);assert.match(q('#videoCount').textContent,/1 video/);
  assert.equal(new URL(q('.video-card').href).hash,'#videos/chem-bonding-video');assert.equal(q('.video-card img').src,'https://i.ytimg.com/vi/7IkYm7ZgiAw/mqdefault.jpg');assert.equal(q('.video-card img').getAttribute('loading'),'lazy');
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
  go(w,'#flashcards/italian-intro/study');assert.equal(w.document.querySelectorAll('.card-list-item').length,20);q('#reviewCard').click();await wait();assert.ok(log.saved.progress.reviews['italian-intro-0']);dom.window.close();
});

test('watching a selected video opens an in-site player with fallback and practice',async()=>{
  const {client}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  go(w,'#videos');assert.equal(q('iframe'),null,'do not load players while browsing');
  q('#videoSearch').value='osmosis';q('#videoSearch').dispatchEvent(new w.Event('input',{bubbles:true}));
  const image=q('.video-thumbnail');assert.equal(image.getAttribute('alt'),'');image.dispatchEvent(new w.Event('error'));assert.equal(image.hidden,true);
  go(w,'#videos/bio-osmosis');const frame=q('.video-player iframe');assert.ok(frame);assert.equal(frame.src,'https://www.youtube-nocookie.com/embed/vCJVXYmXkzM?rel=0');
  assert.match(frame.title,/Osmosis/);assert.equal(frame.getAttribute('referrerpolicy'),'strict-origin-when-cross-origin');assert.ok(frame.hasAttribute('allowfullscreen'));
  assert.equal(q('#crumb').textContent,'Video lessons');assert.match(q('.watch-fallback').textContent,/restrict embedding/);
  assert.equal(q('.watch-source a').href,'https://www.youtube.com/watch?v=vCJVXYmXkzM');assert.match(q('.watch-source a').rel,/noopener/);
  assert.equal(new URL(q('.practice-deck').href).hash,'#flashcards/bio-transport');assert.match(q('.watch-tip').textContent,/recall/i);
  go(w,'#videos');assert.equal(q('iframe'),null);assert.equal(q('#videoSearch').value,'osmosis');assert.match(q('#videoGrid').textContent,/Osmosis/);
  go(w,'#videos/no-such-lesson');assert.match(q('#app').textContent,/Video not found/);assert.equal(q('iframe'),null);dom.window.close();
});

test('games hub finds sets and links from dashboard and flashcards',async()=>{
  const {client}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  assert.ok(q('.dashboard-games[href="#arcade"]'));go(w,'#games');await wait();assert.equal(q('#crumb').textContent,'Study games');assert.match(q('#app').textContent,/No timer/i);
  q('#gameSearch').value='osmosis';q('#gameSearch').dispatchEvent(new w.Event('input',{bubbles:true}));assert.match(q('#gameSetGrid').textContent,/Transport in cells/);
  q('#gameSearch').value='not a real set';q('#gameSearch').dispatchEvent(new w.Event('input',{bubbles:true}));assert.match(q('#gameSetGrid').textContent,/No sets found/);q('#clearGameSearch').click();assert.equal(q('#gameSearch').value,'');
  go(w,'#flashcards/bio-transport');await wait();assert.ok(q('a[href="#games/bio-transport"]'));dom.window.close();
});

test('match game handles misses and completion without changing review marks',async()=>{
  const {client,log}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  go(w,'#games/bio-transport');await wait();q('[data-game-start="match"]').click();assert.ok(q('.match-board'));assert.equal(log.saved,null);
  const ids=[...w.document.querySelectorAll('[data-match-side="question"]')].map(x=>x.dataset.matchId);
  q(`[data-match-side="question"][data-match-id="${ids[0]}"]`).click();q(`[data-match-side="answer"][data-match-id="${ids[1]}"]`).click();assert.match(q('.game-feedback').textContent,/Not a match/);
  for(const id of ids){q(`[data-match-side="question"][data-match-id="${id}"]`).click();q(`[data-match-side="answer"][data-match-id="${id}"]`).click();}
  await wait();assert.match(q('.game-result').textContent,/5 pairs matched/);assert.equal(log.saved.progress.activity.length,1);assert.deepEqual(Object.keys(log.saved.progress.reviews),[]);
  q('[data-game-start="match"]').click();assert.ok(q('.match-board'));go(w,'#home');await wait();go(w,'#games/bio-transport');await wait();assert.ok(q('[data-game-start="quiz"]'));assert.equal(q('.match-board'),null);dom.window.close();
});

test('quiz offers feedback and a review of missed answers without persisting scores',async()=>{
  const {client,log}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  go(w,'#games/bio-transport');await wait();q('[data-game-start="quiz"]').click();const deck=starterDecks.find(d=>d.id==='bio-transport');
  for(let i=0;i<10;i++){
    const question=q('#gameQuestion').textContent;const answer=deck.cards.find(card=>card[0]===question)[1];const choices=[...w.document.querySelectorAll('[data-quiz-answer]')];
    (i===0?choices.find(button=>button.children[1].textContent!==answer):choices.find(button=>button.children[1].textContent===answer)).click();
    assert.match(q('.quiz-feedback').textContent,/Answer:/);assert.match(q('#gameAnnouncer').textContent,/Answer:/);q('#nextQuestion').click();
  }
  await wait();assert.match(q('.game-result').textContent,/9 out of 10 correct/);assert.ok(q('.game-review-item'));assert.equal(log.saved.progress.activity.length,1);assert.equal('gameScore' in log.saved.progress,false);assert.deepEqual(Object.keys(log.saved.progress.reviews),[]);dom.window.close();
});

test('games escape community content and gracefully handle too-small sets',async()=>{
  const {client,log}=mockClient({session:account});const id='e1234567-1234-4123-8123-123456789abc';log.sets.push({id,owner_id:account.id,subject:'Biology',title:'<img src=x onerror=alert(1)>',description:'test',is_public:false,cards:[['<b>Question</b>','<script>bad()</script>']]});
  const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);go(w,'#games');await wait();assert.equal(q('#gameSetGrid img'),null);assert.match(q('#gameSetGrid').textContent,/<img/);
  go(w,`#games/set-${id}`);await wait();assert.equal(q('.game-page-heading img'),null);assert.match(q('.game-notice').textContent,/at least two/);assert.ok(q('[data-game-start="match"]').disabled);dom.window.close();
});


test('write and reveal accepts own wording, escapes responses and supports one-card sets',async()=>{
  const {client,log}=mockClient({session:account});const id='e1234567-1234-4123-8123-123456789abc';log.sets.push({id,owner_id:account.id,subject:'Biology',title:'My set',is_public:false,cards:[['<b>Prompt</b>','<script>answer</script>']]});
  const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);go(w,`#games/set-${id}`);await wait();assert.ok(q('[data-game-start="quiz"]').disabled);assert.equal(q('[data-game-start="recall"]').disabled,false);
  q('[data-game-start="recall"]').click();assert.equal(q('#gameQuestion b'),null);q('#recallInput').value='<img src=x onerror=alert(1)>';
  q('#recallForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(q('.recall-reveal img'),null);assert.equal(q('.recall-reveal script'),null);assert.match(q('.recall-response').textContent,/<img/);assert.equal(log.saved,null);
  q('[data-recall-mark="no"]').click();await wait();assert.match(q('.game-result').textContent,/0 out of 1 self-marked correct/);assert.match(q('.game-review').textContent,/<script>answer/);assert.equal(JSON.stringify(log.saved.progress).includes('<img'),false);dom.window.close();
});


test('community game content is escaped in matching and quiz modes',async()=>{
  const {client,log}=mockClient({session:account});const id='e1234567-1234-4123-8123-123456789abc';log.sets.push({id,owner_id:'another',subject:'Biology',title:'Shared',is_public:true,cards:[['<b>Question</b>','<script>answer</script>'],['<img src=x onerror=alert(1)>','<svg onload=alert(1)>']]});
  const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);go(w,`#games/set-${id}`);await wait();assert.match(q('.game-community-warning').textContent,/not reviewed/);
  q('[data-game-start="match"]').click();assert.equal(q('.game-stage script'),null);assert.equal(q('.game-stage img'),null);assert.equal(q('.game-stage svg'),null);assert.match(q('.game-stage').textContent,/<script>answer/);
  q('[data-game-exit]').click();q('[data-game-start="quiz"]').click();assert.equal(q('.game-stage script'),null);assert.equal(q('.game-stage img'),null);assert.equal(q('.game-stage svg'),null);dom.window.close();
});

test('practice tests mark answers on submission and support retakes without saving scores',async()=>{
  const {client,log}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  assert.equal(q('[data-nav="tests"]'),null);assert.equal(q('a[href="#tests"]'),null);
  go(w,'#flashcards/bio-transport');await wait();assert.ok(['Flashcards','Practice tests'].includes(q('#crumb').textContent));assert.ok(q('a[href="#flashcards/bio-transport/study"]'));assert.ok(q('a[href="#games/bio-transport"]'));assert.ok(q('a[href="#tests/bio-transport"]'));assert.equal(w.document.querySelectorAll('.set-preview-card').length,20);assert.equal(q('.set-preview-card').open,false);q('.set-preview-card summary').click();assert.equal(q('.set-preview-card').open,true);
  go(w,'#tests');await wait();assert.ok(q('#deckSearch'));assert.ok(['Flashcards','Practice tests'].includes(q('#crumb').textContent));assert.equal(q('#testSearch'),null);
  go(w,'#tests/bio-transport');await wait();assert.ok(['Flashcards','Practice tests'].includes(q('#crumb').textContent));assert.equal(new URL(q('.game-page-heading .back-link').href).hash,'#flashcards/bio-transport');q('#testLength').value='5';q('#practiceStart').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(w.document.querySelectorAll('.practice-question').length,5);
  q('#practiceForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.match(q('#practiceError').textContent,/at least one/);assert.equal(log.saved,null);
  const deck=starterDecks.find(d=>d.id==='bio-transport');const fields=[...w.document.querySelectorAll('.practice-question')];
  fields.slice(0,4).forEach((field,i)=>{const question=field.querySelector('legend strong').textContent,answer=deck.cards.find(card=>card[0]===question)[1];const choices=[...field.querySelectorAll('label')];const chosen=i===0?choices.find(label=>label.querySelector('span').textContent!==answer):choices.find(label=>label.querySelector('span').textContent===answer);chosen.querySelector('input').checked=true;});
  q('#practiceForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.match(q('.practice-summary h2').textContent,/3 \/ 5/);assert.equal(w.document.querySelectorAll('.practice-review').length,5);assert.match(q('.practice-review:last-child').textContent,/UNANSWERED/);assert.equal(log.saved.progress.rewards.coins,15);assert.equal(log.saved.progress.activity.length,1);assert.deepEqual(Object.keys(log.saved.progress.reviews),[]);assert.equal('testScore' in log.saved.progress,false);
  q('#retryPractice').click();q('.practice-question input').checked=true;q('#practiceForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.equal(log.saved.progress.rewards.coins,15);dom.window.close();
});

test('rewards are earned once per activity, spent once and equipped without changing reviews',async()=>{
  const {client,log}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  go(w,'#flashcards/bio-transport/study');await wait();q('#reviewCard').click();await wait();assert.equal(log.saved.progress.rewards.coins,5);q('#reviewCard').click();await wait();assert.equal(log.saved.progress.rewards.coins,5);
  go(w,'#tests/bio-transport');await wait();q('#testLength').value='5';q('#practiceStart').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));q('.practice-question input').checked=true;q('#practiceForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.equal(log.saved.progress.rewards.coins,20);
  go(w,'#shop');await wait();assert.match(q('.shop-wallet').textContent,/20/);assert.match(q('.reward-tasks').textContent,/Earned today/);q('[data-reward="sun"]').click();await wait();assert.equal(log.saved.progress.rewards.coins,0);assert.equal(log.saved.progress.rewards.equipped,'sun');assert.equal(q('.top-avatar').dataset.badge,'sun');assert.ok(q('[data-reward="moon"]').disabled);
  q('[data-reward="leaf"]').click();await wait();q('[data-reward="sun"]').click();await wait();assert.equal(log.saved.progress.rewards.coins,0);assert.equal(log.saved.progress.rewards.equipped,'sun');assert.equal(Object.keys(log.saved.progress.reviews).length,2);dom.window.close();
});

test('test generation escapes learner content and handles sets too small to test',async()=>{
  const {client,log}=mockClient({session:account});const id='e1234567-1234-4123-8123-123456789abc';log.sets.push({id,owner_id:'another',subject:'Biology',title:'<img src=x onerror=alert(1)>',is_public:true,cards:[['<b>Question</b>','<script>answer</script>'],['<img src=x>','<svg onload=alert(1)>']]});
  const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);go(w,`#tests/set-${id}`);await wait();assert.equal(q('.game-page-heading img'),null);assert.match(q('.game-page-heading').textContent,/<img/);assert.match(q('.game-community-warning').textContent,/not reviewed/);q('#practiceStart').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(q('#practiceForm script'),null);assert.equal(q('#practiceForm svg'),null);assert.equal(q('#practiceForm img'),null);q('.practice-question input').checked=true;q('#practiceForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(q('.practice-review script'),null);dom.window.close();
});

test('bulk card import checks input and never silently overwrites a draft',async()=>{
  const {client,log}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);go(w,'#create-set');await wait();
  q('#bulkCards').value='bad line';q('#importCards').click();assert.match(q('#importError').textContent,/tab/);assert.equal(w.document.querySelectorAll('#creatorCards .creator-card').length,2);
  q('[name="question"]').value='Draft';w.confirm=()=>false;q('#bulkCards').value='First\tOne\n<img>\t<script>answer</script>';q('#importCards').click();assert.equal(q('[name="question"]').value,'Draft');
  w.confirm=()=>true;q('#importCards').click();assert.equal(w.document.querySelectorAll('#creatorCards .creator-card').length,2);assert.equal(w.document.querySelectorAll('[name="question"]')[1].value,'<img>');assert.equal(q('#creatorCards img'),null);q('[name="title"]').value='My import';q('#createSetForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.equal(log.created.cards[1][1],'<script>answer</script>');dom.window.close();
});

test('game completion awards coins once and the streak reflects study activity',async()=>{
  const {client,log}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);go(w,'#games/bio-transport');await wait();q('[data-game-start="match"]').click();const ids=[...w.document.querySelectorAll('[data-match-side="question"]')].map(x=>x.dataset.matchId);
  for(const id of ids){q(`[data-match-side="question"][data-match-id="${id}"]`).click();q(`[data-match-side="answer"][data-match-id="${id}"]`).click();}await wait();assert.equal(log.saved.progress.rewards.coins,10);go(w,'#revision');await wait();assert.match(q('.streak-panel').textContent,/1 day streak/);assert.equal(w.document.querySelectorAll('.streak-day.active').length,1);dom.window.close();
});

test('decorative starbursts are absent while existing rewards and site branding remain',async()=>{
  const progress={...defaultProgress,rewards:{coins:0,owned:['spark','sun','bloom'],equipped:'spark',daily:{date:'',claimed:[]}}};
  const {client}=mockClient({session:account,progress});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  assert.equal(q('#landing .brand-mark').getAttribute('src'),'logo.svg?v=20261113-1');assert.equal(q('.sidebar'),null);
  assert.equal(q('.top-avatar').textContent,'◇');
  for(const hash of ['#home','#games','#games/bio-transport','#flashcards/bio-transport/study','#shop','#videos/bio-osmosis']){
    go(w,hash);await wait();assert.doesNotMatch(q('.app-shell').textContent,/[✳✦☀✿]/,hash);
  }
  go(w,'#shop');assert.equal(q('#reward-spark .reward-badge').textContent,'◇');assert.equal(q('[data-reward="spark"]').textContent,'Equipped');
  q('[data-reward="sun"]').click();await wait();assert.equal(q('.top-avatar').textContent,'●');assert.equal(q('.top-avatar').dataset.badge,'sun');dom.window.close();
});

test('skip link focuses the visible content for logged-out and signed-in visitors',async()=>{
  const visitor=setup(null,{configured:false});await visitor.run();visitor.w.document.querySelector('.skip-link').click();assert.ok(visitor.w.document.activeElement.classList.contains('landing-main'));visitor.dom.window.close();
  const {client}=mockClient({session:account});const signedIn=setup(client);await signedIn.run();signedIn.w.document.querySelector('.skip-link').click();assert.equal(signedIn.w.document.activeElement.id,'app');signedIn.dom.window.close();
});

test('live games are available from games and flashcard sets',async()=>{
  const {client}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  go(w,'#games');assert.ok(q('.live-promo[href="#live"]'));
  go(w,'#flashcards/bio-transport');assert.ok(q('.set-mode[href="#live/host/bio-transport"]'));go(w,'#live/host/bio-transport');assert.equal(q('#liveCreate [name=deck]').value,'bio-transport');
  go(w,'#live');assert.equal(q('#crumb').textContent,'Live games');assert.ok(q('#liveJoin'));assert.ok(q('#liveCreate'));assert.match(q('#app').textContent,/everyone needs a signed-in account/i);
  go(w,'#home');assert.ok(q('.dashboard-action'));dom.window.close();
});


test('subject setup preserves a live invitation for an existing account',async()=>{
  const existing={...account,user_metadata:{name:'Alex'}};const {client}=mockClient({session:existing,progress:{completed:{},reviews:{},tasks:[],activity:[]}});const {dom,w,run}=setup(client,{url:'https://example.test/public/#live/AABBCCDDEE'});await run();const q=s=>w.document.querySelector(s);
  assert.ok(q('#subjectsForm'));q('input[name="subjects"][value="Biology"]').checked=true;q('#subjectsForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.equal(w.location.hash,'#live/AABBCCDDEE');assert.ok(q('#liveJoin'));assert.match(q('#app').textContent,/AABBCCDDEE/);dom.window.close();
});

test('signed-in users can open community chat without a live game and navigate away',async()=>{
  const {client}=mockClient({session:account});client.rpc=async name=>name==='community_chat_list'?{data:[]}:{data:null};const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  go(w,'#chat');await wait();assert.equal(q('#crumb').textContent,'Community chat');assert.match(q('#app').textContent,/Community chat/);assert.match(q('#app').textContent,/no game needed/i);assert.ok(q('#communityInput'));go(w,'#home');assert.equal(q('#communityInput'),null);dom.window.close();
});

test('school hub preserves revision links and adds synced notes and a weekly timetable',async()=>{
  const {client,log}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  for(const path of ['#revision','#chat','#planner','#notes','#timetable','#tools'])assert.ok(q(`a[href="${path}"]`),path);
  go(w,'#revision');assert.ok(q('a[href="#flashcards"]'));assert.ok(q('a[href="#games"]'));assert.ok(q('a[href="#videos"]'));
  go(w,'#notes');q('#schoolNoteForm [name=title]').value='<img src=x>';q('#schoolNoteForm [name=body]').value='First line\nSecond line';q('#schoolNoteForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();
  assert.equal(q('.school-note img'),null);assert.match(q('.school-note').textContent,/<img src=x>/);assert.equal(log.saved.progress.schoolNotes[0].body,'First line\nSecond line');assert.equal(log.saved.progress.completed.biology,true);
  q('[data-school-note-edit]').click();q('#schoolNoteForm [name=body]').value='Updated';q('#schoolNoteForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.equal(log.saved.progress.schoolNotes[0].body,'Updated');
  go(w,'#timetable');q('#schoolLessonForm [name=title]').value='Maths';q('#schoolLessonForm [name=day]').value='1';q('#schoolLessonForm [name=time]').value='09:15';q('#schoolLessonForm [name=room]').value='A12';q('#schoolLessonForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.match(q('.school-week').textContent,/Tuesday[\s\S]*09:15[\s\S]*Maths[\s\S]*A12/);assert.equal(log.saved.progress.schoolLessons[0].day,1);
  go(w,'#notes');assert.match(q('.school-note').textContent,/Updated/);q('[data-school-note-delete]').click();await wait();assert.equal(log.saved.progress.schoolNotes.length,0);assert.equal(log.saved.progress.schoolLessons.length,1);
  go(w,'#timetable');q('[data-school-lesson-delete]').click();await wait();assert.equal(log.saved.progress.schoolLessons.length,0);dom.window.close();
});

test('school tools calculate safely and timer resets on navigation',async()=>{
  const {client}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);go(w,'#tools');
  q('#schoolCalcForm [name=expression]').value='(12 + 8) / 4';q('#schoolCalcForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.match(q('#schoolCalcResult').textContent,/Answer: 5/);
  q('#schoolCalcForm [name=expression]').value='1/0';q('#schoolCalcForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.match(q('#schoolCalcResult').textContent,/divide by zero/);
  q('#schoolPercentForm [name=score]').value='36';q('#schoolPercentForm [name=total]').value='40';q('#schoolPercentForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.match(q('#schoolPercentResult').textContent,/90%/);
  q('#focusMinutes').value='1';q('#focusStart').click();assert.equal(q('#focusStart').textContent,'Pause');assert.equal(q('#focusMinutes').disabled,true);q('#focusStart').click();assert.equal(q('#focusStart').textContent,'Resume');go(w,'#home');go(w,'#tools');assert.equal(q('#focusDisplay').textContent,'25:00');dom.window.close();
});

test('chat and school tools work independently of selecting revision subjects',async()=>{
  const noSubjects={...account,user_metadata:{name:'Alex',subjects:[]}};const {client}=mockClient({session:noSubjects,progress:{...defaultProgress,subjects:[]}});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  assert.ok(q('a[href="#chat"]'));go(w,'#chat');assert.ok(q('#communityInput'));go(w,'#tools');assert.ok(q('#focusDisplay'));go(w,'#flashcards');assert.ok(q('#subjectsForm'));dom.window.close();
});

test('eBooks shelf searches, filters, and opens trusted Archive readers separately from revision',async()=>{
  const noSubjects={...account,user_metadata:{name:'Alex',subjects:[]}};const {client}=mockClient({session:noSubjects,progress:{...defaultProgress,subjects:[]}});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  assert.ok(q('.hub-tile[href="#ebooks"]'));go(w,'#ebooks');assert.equal(q('#crumb').textContent,'Books');assert.equal(q('#app iframe'),null);assert.ok(w.document.querySelectorAll('.book-card').length>=8);
  q('#bookSearch').value='carroll';q('#bookSearch').dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(w.document.querySelectorAll('.book-card').length,1);assert.match(q('#bookGrid').textContent,/Alice/);
  q('#bookSearch').value='';q('#bookSearch').dispatchEvent(new w.Event('input',{bubbles:true}));q('[data-book-filter="Nature"]').click();assert.equal(q('[data-book-filter="Nature"]').getAttribute('aria-pressed'),'true');assert.match(q('#bookGrid').textContent,/Darwin/);assert.doesNotMatch(q('#bookGrid').textContent,/Alice/);
  q('#archiveBookInput').value='https://evil.test/details/abc';q('#archiveBookForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.match(q('#archiveBookError').textContent,/Internet Archive/);assert.equal(w.location.hash,'#ebooks');
  q('#archiveBookInput').value='https://archive.org/details/secretgarden00burn/page/10';q('#archiveBookForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));w.dispatchEvent(new w.HashChangeEvent('hashchange'));await wait();assert.match(q('#readerContent').textContent,/Project Gutenberg/);q('[data-reader-mode=archive]').click();assert.equal(q('.reader-frame iframe').getAttribute('src'),'https://archive.org/embed/secretgarden00burn');assert.ok(q('a[href="https://archive.org/details/secretgarden00burn"]'));assert.equal(q('#crumb').textContent,'Books');
  go(w,'#ebooks/bad%22id');assert.equal(q('iframe'),null);assert.match(q('#app').textContent,/Book not found/);dom.window.close();
});

test('local book reader loads without Archive, saves position and settings, searches, and lazily opens a scan',async()=>{
  const {client}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);go(w,'#ebooks/wonderfulwizardo00baumiala');await wait();
  assert.match(q('#readerContent').textContent,/Project Gutenberg/);assert.equal(q('iframe'),null);assert.ok(!q('[data-reader-page=next]').disabled);
  q('[data-reader-page=next]').click();assert.equal(q('#readerPageInput').value,'2');q('#readerTheme').value='night';q('#readerTheme').dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(q('#readerPaper').dataset.theme,'night');
  go(w,'#home');go(w,'#ebooks/wonderfulwizardo00baumiala');await wait();assert.equal(q('#readerPageInput').value,'2');assert.equal(q('#readerTheme').value,'night');q('#readerSearch').value='reading';q('#readerSearchForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.match(q('#readerStatus').textContent,/Found on page/);
  q('[data-reader-mode=archive]').click();assert.equal(q('iframe').getAttribute('src'),'https://archive.org/embed/wonderfulwizardo00baumiala');q('[data-reader-mode=text]').click();assert.equal(q('#readerTextPanel').hidden,false);dom.window.close();
});

test('word counter, metric converter, and date countdown work without saving text',async()=>{
 const {client,log}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);go(w,'#tools');q('#wordCounterInput').value='one two three';q('#wordCounterInput').dispatchEvent(new w.Event('input',{bubbles:true}));assert.match(q('#wordCounterResult').textContent,/3 words/);
 q('#unitForm [name=value]').value='250';q('#unitForm [name=from]').value='cm';q('#unitForm [name=to]').value='m';q('#unitForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.match(q('#unitResult').textContent,/2.5 m/);
 q('#dateForm [name=date]').value='2099-01-01';q('#dateForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.match(q('#dateResult').textContent,/days to go/);assert.equal(log.saved,null);dom.window.close();
});
test('homework, notes and timetable support edits and useful filters without losing other data',async()=>{
 const progress={...defaultProgress,tasks:[{title:'Maths work',date:'2026-11-09',done:false},{title:'History essay',date:'',done:true}],schoolNotes:[{title:'Physics',body:'Waves'},{title:'History',body:'Sources'}],schoolLessons:[{title:'Maths',day:0,time:'09:00',room:'A1'}]};const {client,log}=mockClient({session:account,progress});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
 go(w,'#planner');q('[data-task-filter=done]').click();assert.equal(q('[data-planner-task][data-task-done=false]').hidden,true);assert.equal(q('[data-planner-task][data-task-done=true]').hidden,false);q('[data-task-edit="0"]').click();q('#planForm [name=title]').value='Maths chapter 2';q('#planForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.equal(log.saved.progress.tasks[0].title,'Maths chapter 2');assert.equal(log.saved.progress.tasks[1].done,true);
 go(w,'#notes');q('#schoolNoteSearch').value='physics';q('#schoolNoteSearch').dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal([...w.document.querySelectorAll('.school-note')].filter(n=>!n.hidden).length,1);
 go(w,'#timetable');q('[data-school-lesson-edit="0"]').click();q('#schoolLessonForm [name=title]').value='Further Maths';q('#schoolLessonForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.equal(log.saved.progress.schoolLessons[0].title,'Further Maths');assert.equal(log.saved.progress.schoolNotes.length,2);dom.window.close();
});

test('book load failure is visible and can be retried',async()=>{
 const {client}=mockClient({session:account});const {dom,w,run}=setup(client);let failed=true;w.fetch=async()=>failed?{ok:false}:{ok:true,text:async()=>('Project Gutenberg\n\nA working book.')};await run();const q=s=>w.document.querySelector(s);go(w,'#ebooks/alicesadventures00carr_13');await wait();assert.match(q('#readerStatus').textContent,/Could not load/);assert.equal(q('#readerRetry').hidden,false);failed=false;q('#readerRetry').click();await wait();assert.match(q('#readerContent').textContent,/working book/);assert.equal(q('#readerRetry').hidden,true);dom.window.close();
});


test('everything hub puts everyday spaces first while preserving school tools',async()=>{
  const visitor=setup(null,{configured:false});await visitor.run();const landing=visitor.w.document.querySelector('#landing');
  for(const word of ['lists','habits','notes','books','revision'])assert.match(landing.textContent,new RegExp(word,'i'));
  assert.match(landing.querySelector('.brand').textContent,/Everything Hub/);assert.equal(landing.querySelectorAll('.preview-list a,.preview-list button').length,0);visitor.dom.window.close();
  const {client}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
  for(const path of ['#lists','#habits','#bookmarks','#planner','#notes','#revision','#tools','#ebooks'])assert.ok(q(`.home-directory a[href="${path}"]`));
  assert.equal(q('.widget-timetable').getAttribute('href'),'#timetable');go(w,'#explore');q('#directorySearch').value='packing';q('#directorySearch').dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal([...w.document.querySelectorAll('[data-directory-item]')].filter(x=>!x.hidden).length,1);assert.equal(q('[data-directory-item]:not([hidden])').getAttribute('href'),'#lists');dom.window.close();
});

test('dashboard shows only today’s lessons in time order and escapes lesson data',async()=>{
  const today=(new Date().getDay()+6)%7;const progress={...defaultProgress,schoolLessons:[{title:'Later lesson',day:today,time:'15:00'}, {title:'<img src=x onerror=alert(1)>',day:today,time:'09:00'}, {title:'Another day',day:(today+1)%7,time:'08:00'}]};
  const {client}=mockClient({session:account,progress});const {dom,w,run}=setup(client);await run();const widget=w.document.querySelector('.widget-timetable');
  assert.match(widget.textContent,/2 lessons today/);assert.match(widget.textContent,/<img src=x onerror=alert\(1\)>/);assert.match(widget.textContent,/09:00/);assert.doesNotMatch(widget.textContent,/Another day|Later lesson/);assert.equal(widget.querySelector('img'),null);dom.window.close();
});

test('everyday spaces save alongside existing progress without requiring subjects',async()=>{
 const noSubjects={...account,user_metadata:{name:'Alex',subjects:[]}}, progress={...defaultProgress,subjects:[],schoolNotes:[{title:'Old note',body:'Keep me'}]};const {client,log}=mockClient({session:noSubjects,progress});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);const submit=form=>form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 go(w,'#lists');q('#everyListName').value='Groceries';submit(q('#everyListForm'));q('[name="item"]').value='Milk';submit(q('[data-every-list-form]'));await wait();assert.equal(log.saved.progress.everydayLists[0].items[0].text,'Milk');assert.equal(log.saved.progress.schoolNotes[0].title,'Old note');
 go(w,'#habits');q('#everyHabitName').value='Read';submit(q('#everyHabitForm'));q('[data-every-habit]').click();await wait();assert.deepEqual(Array.from(log.saved.progress.everydayHabits[0].days),[localDay()]);
 go(w,'#bookmarks');q('[name="name"]').value='Library';q('[name="url"]').value='https://example.com/';submit(q('#everyBookmarkForm'));await wait();assert.equal(log.saved.progress.everydayBookmarks[0].url,'https://example.com/');go(w,'#home');assert.match(q('.home-hero-summary').textContent,/1 of 1 habits checked/);go(w,'#flashcards');assert.ok(q('#subjectsForm'));dom.window.close();
});

test('the Games app works without revision subjects and keeps old study routes',async()=>{
 const noSubjects={...account,user_metadata:{name:'Alex',subjects:[]}};const {client}=mockClient({session:noSubjects,progress:{...defaultProgress,subjects:[]}});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
 assert.ok(q('.os-dock a[href="#arcade"]'));assert.ok(q('.home-directory a[href="#arcade"]'));assert.ok(q('#homeClock').textContent.includes(':'));go(w,'#arcade');assert.equal(q('#crumb').textContent,'Games');assert.equal(w.document.querySelectorAll('.arcade-game-card').length,3);w.HTMLCanvasElement.prototype.getContext=()=>null;w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};go(w,'#arcade/skyline');assert.ok(q('#gameCanvas'));q('[data-action=start]').click();assert.equal(q('#gameOverlay').hidden,true);go(w,'#arcade/orbit');assert.ok(q('#gameCanvas'));go(w,'#arcade/reef');assert.ok(q('[data-action=launch]'));go(w,'#games');assert.ok(q('#subjectsForm'));go(w,'#home');assert.equal(q('.app-shell').classList.contains('os-home'),true);dom.window.close();
});


test('launcher searches all apps and opens focused views without a sidebar',async()=>{
 const {client}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
 const links=['ai','planner','lists','notes','habits','bookmarks','timetable','arcade','tools','ebooks','revision','flashcards','subjects','videos','resources','chat','shop'];for(const link of links)assert.ok(q(`.home-directory a[href="#${link}"]`),link);assert.equal(q('.sidebar'),null);assert.equal(q('.os-secondary'),null);
 const search=q('#directorySearch');search.value='study games';search.dispatchEvent(new w.Event('input',{bubbles:true}));assert.ok(!q('.home-directory a[href="#arcade"]').hidden);search.value='flashcards';search.dispatchEvent(new w.Event('input',{bubbles:true}));assert.ok(!q('.home-directory a[href="#flashcards"]').hidden);assert.ok(q('.home-directory a[href="#notes"]').hidden);assert.match(q('#directoryStatus').textContent,/results/);search.value='no-such-app';search.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(q('#directoryStatus').textContent,'0 results');search.value='';search.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal([...w.document.querySelectorAll('.home-directory [data-directory-item]:not([hidden])')].length,links.length);
 for(const path of ['#notes','#timetable','#arcade','#ebooks','#flashcards','#tools']){go(w,path);assert.equal(q('.sidebar'),null);assert.equal(q('.os-dock'),null);assert.equal(q('.home-directory'),null);assert.equal(q('.app-home-link').getAttribute('href'),'#home');assert.equal(q('.app-shell').classList.contains('os-home'),false);}go(w,'#home');assert.ok(q('#directorySearch'));dom.window.close();
});

test('combined Games app opens the collection and preserves study links',async()=>{
 const {client}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
 go(w,'#arcade');assert.ok(q('a[href="#arcade/library"]'));assert.ok(q('a[href="#games"]'));assert.equal(w.document.querySelectorAll('.arcade-game-card').length,3);
 go(w,'#arcade/library');assert.ok(q('#embedSearch'));assert.equal(q('iframe'),null);q('#embedSearch').value='sudoku';q('#embedSearch').dispatchEvent(new w.Event('input',{bubbles:true}));assert.match(q('#embedGrid').textContent,/Sudoku/);
 go(w,'#arcade/play/sudoku');assert.equal(q('iframe').getAttribute('title'),'Sudoku — game by sausi-7');assert.ok(q('a[target="_blank"]'));go(w,'#games/bio-transport');assert.ok(q('[data-game-start="quiz"]'));dom.window.close();
});

test('retrying missed quiz cards creates a focused round without changing the deck',async()=>{
 const {client}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);go(w,'#games/bio-transport');q('[data-game-start="quiz"]').click();const deck=starterDecks.find(d=>d.id==='bio-transport');
 for(let i=0;i<10;i++){const question=q('#gameQuestion').textContent;const answer=deck.cards.find(card=>card[0]===question)[1];const choices=[...w.document.querySelectorAll('[data-quiz-answer]')];(i<2?choices.find(b=>b.children[1].textContent!==answer):choices.find(b=>b.children[1].textContent===answer)).click();q('#nextQuestion').click();}
 assert.match(q('.game-best-streak').textContent,/Best streak/);assert.equal(w.document.querySelectorAll('.game-review-item').length,2);q('[data-game-retry-missed]').click();assert.match(q('.game-progress').textContent,/QUESTION 1 OF 2/);assert.equal(deck.cards.length,20);dom.window.close();
});

test('Tasks list adds, stars, filters, completes and edits tasks while preserving progress',async()=>{
 const progress={...defaultProgress,tasks:[{title:'Old task',date:'2026-11-09',done:false},{title:'Finished task',date:'2020-01-01',done:true}],schoolNotes:[{title:'Keep',body:'This note'}]};
 const {client,log}=mockClient({session:account,progress});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
 go(w,'#planner');assert.equal(q('#planForm').hidden,true);assert.equal(w.document.querySelectorAll('#taskOpenRows [data-planner-task]').length,1);assert.equal(w.document.querySelectorAll('#taskCompletedRows [data-planner-task]').length,1);assert.doesNotMatch(q('#taskCompletedRows .tasks-date').textContent,/Overdue/);
 q('#taskAddButton').click();assert.equal(q('#planForm').hidden,false);assert.equal(w.document.activeElement.id,'taskTitle');q('#taskTitle').value='New task';q('#taskDate').value='2026-12-01';q('#planForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.equal(log.saved.progress.tasks[2].title,'New task');assert.equal(log.saved.progress.tasks[2].date,'2026-12-01');assert.equal(log.saved.progress.schoolNotes[0].title,'Keep');
 q('[data-task-star="2"]').click();await wait();assert.equal(log.saved.progress.tasks[2].starred,true);assert.equal(q('[data-task-star="2"]').getAttribute('aria-pressed'),'true');q('[data-task-filter="starred"]').click();assert.equal(q('[data-planner-task][data-task-starred="false"]').hidden,true);assert.equal(q('[data-planner-task][data-task-starred="true"]').hidden,false);
 q('[data-task="2"]').click();await wait();assert.equal(log.saved.progress.tasks[2].done,true);assert.ok(q('#taskCompletedRows [data-task="2"]'));q('#taskCompletedToggle').click();assert.equal(q('#taskCompletedRows').hidden,true);q('#taskCompletedToggle').click();assert.equal(q('#taskCompletedRows').hidden,false);
 q('[data-task-edit="2"]').click();assert.equal(q('#taskTitle').value,'New task');q('#taskTitle').value='Edited task';q('#planForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.equal(log.saved.progress.tasks[2].title,'Edited task');assert.equal(log.saved.progress.tasks[2].starred,true);assert.equal(log.saved.progress.tasks[2].done,true);
 q('[data-delete="2"]').click();await wait();assert.equal(log.saved.progress.tasks.length,2);assert.equal(q('#taskFilterEmpty').hidden,false);assert.match(q('#taskFilterEmptyText').textContent,/No starred/);dom.window.close();
});

test('Tasks handles empty views, cancel, and escaping of task content',async()=>{
 const progress={...defaultProgress,tasks:[{title:'<img src=x onerror=alert(1)>',date:'',done:false}]};const {client}=mockClient({session:account,progress});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);go(w,'#planner');assert.equal(q('.tasks-row img'),null);assert.match(q('.tasks-row strong').textContent,/<img/);
 q('[data-task-filter="starred"]').click();assert.equal(q('#taskFilterEmpty').hidden,false);q('#taskAddButton').click();q('#taskTitle').value='Draft';q('#planCancel').click();assert.equal(q('#planForm').hidden,true);assert.equal(w.document.activeElement.id,'taskAddButton');q('#taskAddButton').click();assert.equal(q('#taskTitle').value,'');dom.window.close();
});

test('AI chat is searchable and loads its third-party embed only on request',async()=>{
 const {client}=mockClient({session:account});const {dom,w,run}=setup(client);await run();const q=s=>w.document.querySelector(s);
 const search=q('#directorySearch');search.value='ai chat';search.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(q('.home-directory [data-directory-item]:not([hidden])').getAttribute('href'),'#ai');
 go(w,'#ai');assert.equal(q('#crumb').textContent,'AI chat');assert.equal(q('.app-home-link').getAttribute('href'),'#home');assert.match(q('#app').textContent,/third-party service/i);assert.match(q('#app').textContent,/not Gemini/i);assert.match(q('#app').textContent,/unsupervised children/i);assert.equal(q('iframe'),null);assert.equal(q('.ai-panel-top a').target,'_blank');
 q('#loadAiChat').click();const frame=q('#aiEmbed iframe');assert.ok(frame);assert.equal(frame.src,'https://zacheus10-free-ai-chat.hf.space/');assert.equal(frame.getAttribute('sandbox'),'allow-scripts allow-forms allow-same-origin');assert.equal(frame.getAttribute('referrerpolicy'),'no-referrer');assert.equal(frame.title,'Free AI Chat on Hugging Face');
 go(w,'#home');assert.equal(q('iframe'),null);go(w,'#kindle-ai');assert.ok(q('#loadAiChat'));assert.equal(q('iframe'),null);dom.window.close();
});
