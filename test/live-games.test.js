import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { liveQuestions, liveHub, liveJoinPage, liveRoomView, mountLive } from '../public/live-games.js';
const deck={id:'bio',subject:'Biology',title:'Cells',cards:[['Q1','A1'],['Q2','A2'],['Q3','A3']]};
const wait=()=>new Promise(resolve=>setTimeout(resolve,20));
test('live questions use distinct cards with valid answer indices without mutating the set',()=>{
  const source=structuredClone(deck.cards), questions=liveQuestions(deck.cards,5,()=>.2);
  assert.equal(questions.length,3);for(const q of questions){assert.equal(q.choices[q.correct],source.find(card=>card[0]===q.question)[1]);assert.equal(new Set(q.choices).size,q.choices.length);}
  assert.deepEqual(deck.cards,source);assert.equal(liveQuestions([['a','b']],5),null);
});
test('game setup and rooms escape learner content and show mode rules',()=>{
  assert.match(liveHub([deck]),/Host-led quiz/);assert.match(liveHub([deck]),/Flashcard race/);assert.match(liveHub([{...deck,title:'<img src=x>'}]),/&lt;img/);
  assert.doesNotMatch(liveJoinPage('<img>'),/<img>/);
  const state={title:'<img>',code:'AABBCCDDEE',mode:'race',status:'finished',isHost:true,nickname:'<b>',players:[{id:'1',name:'Later',score:2,progress:3,finishedAt:'2026-01-01T12:01:00Z'},{id:'2',name:'Earlier',score:2,progress:3,finishedAt:'2026-01-01T12:00:00Z'}],total:3};
  const html=liveRoomView(state,'https://example.test/');assert.doesNotMatch(html,/<img>|<b>/);assert.ok(html.indexOf('Earlier')<html.indexOf('Later'));assert.match(html,/Finishing time breaks ties/);
});
test('joining a room, showing the lobby and answering invoke the backend and stop polling on cleanup',async()=>{
  const dom=new JSDOM('<main id="root"></main>',{url:'https://example.test/public/#live/AABBCCDDEE'});const w=dom.window,root=w.document.querySelector('#root');let state={id:'room',code:'AABBCCDDEE',title:'Cells',mode:'hosted',status:'lobby',isHost:false,nickname:'Tester',total:3,question:null,players:[{id:'1',name:'Host',host:true,score:0},{id:'2',name:'Tester',host:false,score:0}]};const calls=[];
  const client={rpc:async(name,args)=>{calls.push({name,args});if(name==='live_join')return {data:{id:'room',code:'AABBCCDDEE'}};if(name==='live_state')return {data:structuredClone(state)};if(name==='live_answer'){state.question.selected=args.p_choice;return {data:null};}return {data:null};}};
  const controller=mountLive({root,client,decks:[deck],code:'AABBCCDDEE',session:w.sessionStorage,win:w});root.querySelector('[name=nickname]').value='Tester';root.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();
  assert.match(root.textContent,/Invite your players/);assert.ok(calls.some(x=>x.name==='live_join'));assert.equal(w.sessionStorage.getItem('revisepro-live-AABBCCDDEE'),'Tester');
  state={...state,status:'question',question:{number:0,text:'Q1',choices:['A1','A2'],correct:null,selected:null,answered:0}};await new Promise(resolve=>setTimeout(resolve,2600));root.querySelector('[data-live-answer="0"]').click();await wait();assert.ok(calls.some(x=>x.name==='live_answer'&&x.args.p_choice===0));assert.match(root.textContent,/Answer received/);
  controller.destroy();const count=calls.length;await new Promise(resolve=>setTimeout(resolve,2600));assert.equal(calls.length,count);dom.window.close();
});
test('lobby creation requires explicit sharing consent and the chosen set',async()=>{
  const dom=new JSDOM('<main id="root"></main>',{url:'https://example.test/public/#live'});const w=dom.window,root=w.document.querySelector('#root');const calls=[];
  const controller=mountLive({root,client:{rpc:async(name,args)=>{calls.push({name,args});return {data:{id:'room',code:'AABBCCDDEE'}};}},decks:[deck],code:'',session:w.sessionStorage,win:w});
  root.querySelector('[data-live-mode=rocket]').click();assert.equal(root.querySelector('#liveCreate [name=mode]').value,'rocket');
  const form=root.querySelector('#liveCreate');form.querySelector('[name=nickname]').value='Host';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.equal(calls.length,0);assert.match(form.textContent,/Confirm that the questions will be shared/);
  form.querySelector('[name=share]').checked=true;form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.equal(calls[0].name,'live_create');assert.equal(calls[0].args.p_questions.length,3);assert.equal(w.location.hash,'#live/AABBCCDDEE');controller.destroy();dom.window.close();
});

test('treasure and rocket screens show their distinct mechanics and escape events',()=>{
  assert.match(liveHub([deck]),/Treasure Tussle/);assert.match(liveHub([deck]),/Rocket Rally/);
  const base={title:'Cells',code:'AABBCCDDEE',status:'question',isHost:false,nickname:'Tester',total:3,players:[{id:'1',name:'Tester',host:false,score:25,progress:1,shield:true,streak:2}],lastAnswer:{correct:true,answer:'A1'},question:null};
  const treasure=liveRoomView({...base,mode:'treasure',pendingChest:0,lastEvent:'<img src=x>'},'https://example.test/');
  assert.match(treasure,/Choose a mystery chest/);assert.equal((treasure.match(/data-live-chest=/g)||[]).length,3);assert.match(treasure,/25 gold/);assert.match(treasure,/SHIELD/);assert.doesNotMatch(treasure,/<img src=x>/);assert.match(treasure,/&lt;img/);
  const rocket=liveRoomView({...base,mode:'rocket',question:{number:1,text:'Next?',choices:['Yes','No'],selected:null,correct:null}},'https://example.test/');
  assert.match(rocket,/Rocket Rally/);assert.match(rocket,/CORRECT STREAK/);assert.match(rocket,/rocket-progress/);assert.match(rocket,/2 in a row/);
});

test('treasure answers offer a chest and opening it calls the server once',async()=>{
  const dom=new JSDOM('<div id="gameAnnouncer"></div><main id="root"></main>',{url:'https://example.test/public/#live/AABBCCDDEE'});const w=dom.window,root=w.document.querySelector('#root');let state={id:'room',code:'AABBCCDDEE',title:'Cells',mode:'treasure',status:'question',isHost:false,nickname:'Tester',total:3,pendingChest:null,question:{number:0,text:'Q1',choices:['A1','A2'],correct:null,selected:null,answered:0},players:[{id:'1',name:'Tester',score:0,progress:0}]};const calls=[];
  const client={rpc:async(name,args)=>{calls.push({name,args});if(name==='live_join')return {data:{id:'room',code:'AABBCCDDEE'}};if(name==='live_state')return {data:structuredClone(state)};if(name==='live_answer'){state={...state,question:null,pendingChest:0,lastAnswer:{correct:true,answer:'A1'}};}if(name==='live_open_chest'){state={...state,pendingChest:null,chestResult:'You found 50 gold!',question:{number:1,text:'Q2',choices:['A2','A1'],correct:null,selected:null},players:[{...state.players[0],score:50,progress:1}]};}return {data:null};}};
  const controller=mountLive({root,client,decks:[deck],code:'AABBCCDDEE',session:w.sessionStorage,win:w});root.querySelector('[name=nickname]').value='Tester';root.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();root.querySelector('[data-live-answer="0"]').focus();root.querySelector('[data-live-answer="0"]').click();await wait();assert.equal(w.document.activeElement.id,'liveQuestionHeading');assert.match(root.textContent,/Choose a mystery chest/);assert.match(w.document.querySelector('#gameAnnouncer').textContent,/Choose a mystery chest/);
  root.querySelector('[data-live-chest="2"]').click();await wait();assert.deepEqual(calls.filter(x=>x.name==='live_open_chest').map(x=>x.args),[{p_room:'room',p_question:0,p_chest:2}]);assert.match(root.textContent,/You found 50 gold/);assert.match(root.textContent,/Q2/);controller.destroy();dom.window.close();
});

test('live game nickname rejects restricted variants before sending to server',async()=>{
 const dom=new JSDOM('<main id="root"></main>',{url:'https://example.test/public/#live'}),w=dom.window,root=w.document.querySelector('#root');let calls=0;const client={rpc:async()=>{calls++;return {data:null};}};const controller=mountLive({root,client,decks:[],code:'',session:w.sessionStorage,win:w});try{const form=root.querySelector('#liveJoin');form.querySelector('[name=code]').value='AABBCCDDEE';form.querySelector('[name=nickname]').value='sh4y';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.equal(calls,0);assert.match(form.textContent,/restricted/i);}finally{controller.destroy();dom.window.close();}
});

test('live game asks the server to decide whether Shay is permitted',async()=>{
 const dom=new JSDOM('<main id="root"></main>',{url:'https://example.test/public/#live'}),w=dom.window,root=w.document.querySelector('#root');let calls=0;const client={rpc:async(name,args)=>{calls++;assert.equal(args.p_nickname,'Shay');return {error:{message:'Choose a different nickname; some names and role titles are restricted.'}};}};const controller=mountLive({root,client,decks:[],code:'',session:w.sessionStorage,win:w});try{const form=root.querySelector('#liveJoin');form.querySelector('[name=code]').value='AABBCCDDEE';form.querySelector('[name=nickname]').value='Shay';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.equal(calls,1);assert.match(form.textContent,/restricted/i);}finally{controller.destroy();dom.window.close();}
});
