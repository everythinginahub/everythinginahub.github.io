import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {aiChatWorkspace,mountAiChat,askAi,askLocalAi,fetchLocalModels,listAiModels} from '../public/ai-chat.js';

const wait=()=>new Promise(resolve=>setTimeout(resolve,20));
function setup(ask,extra={}){
 const dom=new JSDOM(`<main>${aiChatWorkspace()}</main>`,{url:'https://example.test/'});
 const win=dom.window,root=win.document.querySelector('main');
 const controller=mountAiChat({root,win,ask,...extra});
 const query=selector=>root.querySelector(selector);
 const submit=message=>{query('#aiMessage').value=message;query('#aiApiForm').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));};
 return{dom,win,root,query,controller,submit};
}

test('chat branding introduces the assistant as Everything Hub AI',()=>{
 const view=setup(async()=>({answer:'ok'}));
 try{
  assert.match(view.root.querySelector('.ai-chat-identity h3').textContent,/Everything Hub AI/);
  assert.doesNotMatch(view.root.querySelector('.ai-chat-identity h3').textContent,/KindleHub AI/);
 }finally{view.controller.destroy();view.dom.window.close();}
});

test('calls the authenticated edge function without sending conversation history',async()=>{
 let args;
 const client={functions:{invoke:async(...values)=>(args=values,{data:{answer:'ok'}})}};
 const result=await askAi(client,'Hello',new AbortController().signal);
 assert.equal(result.answer,'ok');
 assert.equal(args[0],'ai-chat');
 assert.deepEqual(args[1].body,{message:'Hello'});
});

test('Studio cloud selection passes the chosen provider and explicitly opted-in search fields',async()=>{
 let args;
 const client={functions:{invoke:async(...values)=>(args=values,{data:{answer:'ok'}})}};
 const result=await askAi(client,'prompt with recent context',new AbortController().signal,{provider:'llm7',model:'gpt-oss:20b',webSearch:true,searchQuery:'latest question'});
 assert.equal(result.answer,'ok');assert.equal(args[0],'ai-chat');
 assert.deepEqual(args[1].body,{message:'prompt with recent context',provider:'llm7',model:'gpt-oss:20b',webSearch:true,searchQuery:'latest question'});
});

test('local model discovery contacts only an explicit loopback /v1 endpoint and hides small or unknown models',async()=>{
 let url,options;
 const result=await fetchLocalModels('http://localhost:11434/v1',{fetcher:async(...args)=>([url,options]=args,new Response(JSON.stringify({data:[{id:'qwen3:8b'},{id:'tiny-model:3b'},{id:'unknown-name'},{id:'dolphin-12b-abliterated'}]}),{status:200,headers:{'content-type':'application/json'}}))});
 assert.equal(url,'http://localhost:11434/v1/models');
 assert.equal(options.credentials,'omit');assert.equal(options.mode,'cors');assert.equal(options.redirect,'error');
 assert.equal('Authorization' in options.headers,false);
 assert.deepEqual(result.models.map(model=>model.id),['qwen3:8b','dolphin-12b-abliterated']);
 assert.equal(result.models[1].category,'abliterated');
 assert.equal(result.hidden,2);
 await assert.rejects(()=>fetchLocalModels('https://example.org/v1',{fetcher:async()=>{throw Error('must not call');}}),/loopback/i);
 await assert.rejects(()=>fetchLocalModels('http://192.168.1.4:11434/v1',{fetcher:async()=>{throw Error('must not call');}}),/loopback/i);
});

test('local completion sends prompts directly to the chosen loopback server without credentials',async()=>{
 let url,options;
 const result=await askLocalAi('A private local question',{baseUrl:'http://127.0.0.1:11434/v1',model:'qwen3:8b',maxOutputTokens:768},new AbortController().signal,{fetcher:async(...args)=>([url,options]=args,new Response(JSON.stringify({choices:[{message:{content:'Local answer'}}]}),{status:200,headers:{'content-type':'application/json'}}))});
 assert.equal(url,'http://127.0.0.1:11434/v1/chat/completions');
 assert.equal(options.credentials,'omit');assert.equal(options.mode,'cors');assert.equal('Authorization' in options.headers,false);
 const body=JSON.parse(options.body);assert.equal(body.model,'qwen3:8b');assert.equal(body.messages[1].content,'A private local question');
 assert.deepEqual(result,{answer:'Local answer',provider:'local',model:'qwen3:8b'});
 await assert.rejects(()=>askLocalAi('x',{baseUrl:'http://localhost/v1',model:'x'},{}, {fetcher:async()=>{throw Error('should be blocked');}}),/Could not reach the local model/);
});

test('model catalog loader filters malformed providers and uses the authenticated function',async()=>{
 let args;const models=[{id:'m1',provider:'aihorde',name:'Stheno 8B',category:'abliterated'},{id:'bad',provider:'custom',name:'Bad',category:'standard'},{id:'x',provider:'llm7',name:'Small',category:'unknown'}];
 const result=await listAiModels({functions:{invoke:async(...values)=>(args=values,{data:{models}})}},{refresh:true});
 assert.equal(args[0],'ai-chat');assert.deepEqual(args[1].body,{action:'models',refresh:true});
 assert.deepEqual(result.map(model=>model.id),['m1']);
});

test('renders answers as safe text without a daily allowance counter and can clear the chat display',async()=>{
 const calls=[];
 const view=setup(async(_client,message)=>(calls.push(message),{answer:'<img src=x onerror=alert(1)>'}));
 try{
  view.submit('First');await wait();
  assert.equal(view.query('.is-assistant p').textContent,'<img src=x onerror=alert(1)>');
  assert.equal(view.root.querySelector('img'),null);
  assert.match(view.query('#aiApiStatus').textContent,/response received/i);
  assert.doesNotMatch(view.query('#aiApiStatus').textContent,/remaining|daily allowance/i);
  view.submit('Second');await wait();
  assert.deepEqual(calls,['First','Second']);
  assert.equal(view.win.localStorage.length,0);
  view.query('#aiNewSession').click();
  assert.equal(view.root.querySelectorAll('.ai-api-message').length,0);
  assert.match(view.query('#aiApiStatus').textContent,/request limits are unchanged/i);
 }finally{view.controller.destroy();view.dom.window.close();}
});

test('short-term rate-limit errors keep the draft and allow retry',async()=>{
 const view=setup(async()=>{throw new Error('Too many requests in a short period. Please wait for the rate limit to reset.');});
 try{
  view.submit('Hello');await wait();
  assert.match(view.query('#aiApiStatus').textContent,/short period/i);
  assert.equal(view.query('#aiMessage').value,'Hello');
  assert.equal(view.query('#aiSend').disabled,false);
 }finally{view.controller.destroy();view.dom.window.close();}
});

test('reset ignores stale results and cannot unlock a newer request',async()=>{
 const resolves=[];
 const view=setup(()=>new Promise(resolve=>resolves.push(resolve)));
 try{
  view.submit('First');view.query('#aiNewSession').click();view.submit('Second');
  resolves[0]({answer:'Old answer'});await wait();
  assert.equal(view.query('#aiSend').disabled,true);
  assert.doesNotMatch(view.root.textContent,/Old answer/);
  resolves[1]({answer:'New answer'});await wait();
  assert.equal(view.query('#aiSend').disabled,false);
  assert.match(view.root.textContent,/New answer/);
 }finally{view.controller.destroy();view.dom.window.close();}
});

test('timeout and cleanup abort requests',async()=>{
 const signals=[];
 const view=setup((_client,_message,signal)=>{signals.push(signal);return new Promise(()=>{});},{timeoutMs:10});
 try{
  view.submit('Hello');await new Promise(resolve=>setTimeout(resolve,40));
  assert.match(view.query('#aiApiStatus').textContent,/too long/i);
  assert.match(view.query('#aiApiStatus').textContent,/short-term rate limit/i);
  assert.equal(signals[0].aborted,true);
  view.submit('Hello again');view.controller.destroy();
  assert.equal(signals[1].aborted,true);
 }finally{view.dom.window.close();}
});

test('question suggestions fill the composer without sending and clear restores them',async()=>{
 let calls=0;
 const view=setup(async()=>{calls++;return {answer:'ok'};});
 try{
  view.query('[data-ai-prompt]').click();
  assert.equal(view.query('#aiMessage').value,'Explain a difficult topic in simple terms');
  assert.equal(view.win.document.activeElement,view.query('#aiMessage'));
  assert.match(view.query('#aiCharCount').textContent,/41 \/ 4,000/);
  assert.equal(calls,0);
  view.query('#aiNewSession').click();
  assert.equal(view.query('#aiMessage').value,'');
  assert.equal(view.query('#aiCharCount').textContent,'0 / 4,000');
  assert.equal(view.root.querySelectorAll('[data-ai-prompt]').length,3);
 }finally{view.controller.destroy();view.dom.window.close();}
});

test('count follows edits, busy state clears after a response',async()=>{
 let resolve;
 const view=setup(()=>new Promise(done=>{resolve=done;}));
 try{
  view.query('#aiMessage').value='Hello';
  view.query('#aiMessage').dispatchEvent(new view.win.Event('input',{bubbles:true}));
  assert.equal(view.query('#aiCharCount').textContent,'5 / 4,000');
  view.query('#aiApiForm').dispatchEvent(new view.win.Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(view.query('#aiApiThread').getAttribute('aria-busy'),'true');
  resolve({answer:'Hi'});await wait();
  assert.equal(view.query('#aiApiThread').hasAttribute('aria-busy'),false);
  assert.equal(view.query('#aiCharCount').textContent,'0 / 4,000');
 }finally{view.controller.destroy();view.dom.window.close();}
});
