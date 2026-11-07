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
  const form=root.querySelector('#liveCreate');form.querySelector('[name=nickname]').value='Host';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.equal(calls.length,0);assert.match(form.textContent,/Confirm that the questions will be shared/);
  form.querySelector('[name=share]').checked=true;form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.equal(calls[0].name,'live_create');assert.equal(calls[0].args.p_questions.length,3);assert.equal(w.location.hash,'#live/AABBCCDDEE');controller.destroy();dom.window.close();
});
