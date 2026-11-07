import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mountLiveChat } from '../public/live-chat.js';
import { mountLive } from '../public/live-games.js';
const wait=()=>new Promise(r=>setTimeout(r,30));
function setup(url='https://example.test/public/#live/AABBCCDDEE') {const dom=new JSDOM('<div id="gameAnnouncer"></div><main id="root"></main>',{url});dom.window.confirm=()=>true;return {dom,w:dom.window,root:dom.window.document.querySelector('#root')};}

test('room chat sends, escapes text, supports moderation and preserves a rejected draft',async()=>{
  const {dom,w,root}=setup();let messages=[],enabled=true,failNext=false;const calls=[];
  const client={rpc:async(name,args)=>{calls.push({name,args});if(name==='live_chat_list')return {data:{enabled,messages:structuredClone(messages)}};if(name==='live_chat_send'){if(failNext)return {error:{message:'Please wait a few seconds.'}};messages.push({id:'1',name:'Host',mine:true,text:args.p_text});return {data:null};}if(name==='live_chat_toggle'){enabled=args.p_enabled;return {data:null};}if(name==='live_chat_delete'){messages=messages.filter(m=>m.id!==args.p_message);return {data:null};}throw Error('unexpected');}};
  const chat=mountLiveChat({root,client,roomId:'room',isHost:true,win:w});await wait();const input=root.querySelector('#liveChatInput'),form=root.querySelector('form');assert.equal(input.disabled,false);
  input.value='<img src=x onerror=alert(1)>';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.equal(input.value,'');assert.equal(root.querySelector('img'),null);assert.match(root.textContent,/<img src=x/);assert.deepEqual(calls.find(c=>c.name==='live_chat_send').args,{p_room:'room',p_text:'<img src=x onerror=alert(1)>'});
  failNext=true;input.value='Keep my draft';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();assert.equal(input.value,'Keep my draft');assert.match(root.querySelector('#liveChatError').textContent,/wait/);
  root.querySelector('[data-chat-toggle]').click();await wait();assert.equal(enabled,false);assert.equal(input.disabled,true);assert.equal(input.value,'Keep my draft');assert.match(root.textContent,/paused chat/);
  root.querySelector('[data-chat-toggle]').click();await wait();assert.equal(enabled,true);assert.equal(input.disabled,false);
  root.querySelector('[data-chat-delete="1"]').click();await wait();assert.equal(messages.length,0);assert.match(root.textContent,/No messages yet/);
  chat.destroy();const count=calls.length;await new Promise(r=>setTimeout(r,2600));assert.equal(calls.length,count);dom.window.close();
});

test('room chat shows remote messages on polling and only offers deletion of your own',async()=>{
  const {dom,w,root}=setup();let messages=[];
  const client={rpc:async name=>name==='live_chat_list'?{data:{enabled:true,messages:structuredClone(messages)}}:{data:null}};
  const chat=mountLiveChat({root,client,roomId:'room',isHost:false,win:w});await wait();assert.equal(root.querySelector('[data-chat-toggle]'),null);assert.match(root.querySelector('#liveChatMessages').textContent,/No messages yet/);assert.doesNotMatch(root.querySelector('#liveChatMessages').textContent,/Loading/);
  messages=[{id:'a',name:'Other',text:'Hello!',mine:false},{id:'b',name:'Guest',text:'Hi!',mine:true}];await new Promise(r=>setTimeout(r,2600));assert.match(root.textContent,/Hello!/);assert.equal(root.querySelector('[data-chat-delete="a"]'),null);assert.ok(root.querySelector('[data-chat-delete="b"]'));chat.destroy();dom.window.close();
});

test('chat input draft, focus, selection and panel survive game state redraw',async()=>{
  const {dom,w,root}=setup();let state={id:'room',code:'AABBCCDDEE',title:'Cells',mode:'hosted',status:'lobby',isHost:false,nickname:'Guest',total:2,players:[{id:'1',name:'Host',host:true,score:0},{id:'2',name:'Guest',score:0}]};
  const client={rpc:async(name)=>{if(name==='live_join')return {data:{id:'room',code:'AABBCCDDEE'}};if(name==='live_state')return {data:structuredClone(state)};if(name==='live_chat_list')return {data:{enabled:true,messages:[]}};return {data:null};}};
  const controller=mountLive({root,client,decks:[],code:'AABBCCDDEE',session:w.sessionStorage,win:w});root.querySelector('[name=nickname]').value='Guest';root.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();
  const panel=root.querySelector('#liveChatSlot'),input=root.querySelector('#liveChatInput');root.querySelector('#liveChatJump').click();assert.equal(w.document.activeElement,input);input.value='Still typing';input.focus();input.setSelectionRange(2,5);
  state={...state,status:'question',question:{number:0,text:'Q',choices:['A','B'],selected:null,correct:null,answered:0}};await new Promise(r=>setTimeout(r,2600));
  assert.equal(root.querySelector('#liveChatSlot'),panel);assert.equal(root.querySelector('#liveChatInput'),input);assert.equal(input.value,'Still typing');assert.equal(w.document.activeElement,input);assert.equal(input.selectionStart,2);assert.equal(input.selectionEnd,5);controller.destroy();dom.window.close();
});

test('a room-chat connection failure does not leave the loading message on screen',async()=>{
  const {dom,w,root}=setup();const client={rpc:async()=>({error:{message:'offline'}})};const chat=mountLiveChat({root,client,roomId:'room',isHost:false,win:w});await wait();assert.match(root.querySelector('#liveChatMessages').textContent,/could not load/i);assert.match(root.querySelector('#liveChatStatus').textContent,/interrupted/i);assert.equal(root.querySelector('#liveChatInput').disabled,true);chat.destroy();dom.window.close();
});
