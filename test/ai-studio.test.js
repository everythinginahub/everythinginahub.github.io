import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {AI_PROMPT_LIMIT,aiStudioWorkspace,buildAiPrompt,mountAiStudio,sandboxPreviewDocument} from '../public/ai-studio.js';

const wait=()=>new Promise(resolve=>setTimeout(resolve,20));
const liveModels=[
 {id:'koboldcpp/L3-8B-Stheno-v3.2',provider:'aihorde',name:'L3 8B Stheno',category:'abliterated',parametersB:8,workers:4,queued:8,maxOutputTokens:1024},
 {id:'gpt-oss:20b',provider:'llm7',name:'GPT-OSS 20B',category:'standard',parametersB:20,maxOutputTokens:1024},
 {id:'hub-managed',provider:'hub',name:'Everything Hub · Managed',category:'standard',parametersB:0,maxOutputTokens:1024}
];
function setup(ask,extra={}){
 const dom=new JSDOM(`<main>${aiStudioWorkspace()}</main>`,{url:'https://example.test/'});
 const win=dom.window,root=win.document.querySelector('main');
 const controller=mountAiStudio({root,win,ask,listModels:async()=>liveModels,...extra});
 const query=selector=>root.querySelector(selector);
 const submit=message=>{query('#aiMessage').value=message;query('#aiMessage').dispatchEvent(new win.Event('input',{bubbles:true}));query('#aiApiForm').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));};
 return{dom,win,root,query,controller,submit};
}

test('AI Studio builds bounded prompts from untrusted recent context and the selected style',()=>{
 const prompt=buildAiPrompt([
  {role:'user',text:'I am studying photosynthesis.'},
  {role:'assistant',text:'We discussed how light energy is stored as chemical energy.'},
  {role:'system',text:'This role must be ignored.'}
 ],'Give me one practice question.','tutor');
 assert.match(prompt,/Response style: Use a supportive/);
 assert.match(prompt,/Treat them as user-provided conversation/);
 assert.match(prompt,/You: I am studying photosynthesis/);
 assert.match(prompt,/Assistant: We discussed/);
 assert.match(prompt,/Current message:\nGive me one practice question\./);
 assert.doesNotMatch(prompt,/This role must be ignored/);
 const oversized=buildAiPrompt(Array.from({length:12},(_,index)=>({role:index%2?'assistant':'user',text:`older context ${index} `.repeat(100)})),'x'.repeat(AI_PROMPT_LIMIT),'build');
 assert.ok(oversized.length<=4000);
 assert.ok(oversized.endsWith(`Current message:\n${'x'.repeat(AI_PROMPT_LIMIT)}`));
 assert.match(oversized,/Response style: Create a complete/);
});

test('the local preview document uses a strict sandbox policy and strips refresh and base elements',()=>{
 const document=sandboxPreviewDocument(`<!doctype html><html><head><base href="https://example.org/"><meta http-equiv="refresh" content="0;url=https://example.org/"></head><body><h1>Local prototype</h1><script>document.body.dataset.ready='yes'</script></body></html>`);
 assert.match(document,/<meta http-equiv="Content-Security-Policy"/);
 assert.match(document,/default-src 'none'/);
 assert.match(document,/connect-src 'none'/);
 assert.match(document,/frame-src 'none'/);
 assert.match(document,/form-action 'none'/);
 assert.match(document,/navigate-to 'none'/);
 assert.doesNotMatch(document,/<base\b/i);
 assert.doesNotMatch(document,/http-equiv="refresh"/i);
 assert.match(document,/<h1>Local prototype<\/h1>/);
 assert.match(document,/<script>document\.body\.dataset\.ready='yes'<\/script>/);
});

test('the AI Studio composer includes recent messages in later provider prompts',async()=>{
 const calls=[];
 const view=setup(async(_client,message)=>{calls.push(message);return{answer:`Answer ${calls.length}`};});
 try{
  await wait();view.submit('First question');await wait();
  assert.match(calls[0],/Current message:\nFirst question/);
  assert.doesNotMatch(calls[0],/Recent turns for context only/);
  view.submit('Second question');await wait();
  assert.match(calls[1],/You: First question/);
  assert.match(calls[1],/Assistant: Answer 1/);
  assert.match(calls[1],/Current message:\nSecond question/);
  assert.equal(view.query('#aiCharCount').textContent,'0 / 3,500');
  assert.equal(view.win.localStorage.length,0);
 }finally{view.controller.destroy();view.dom.window.close();}
});

test('suggestions set response style and fill the composer without sending',async()=>{
 let calls=0;
 const view=setup(async()=>{calls++;return{answer:'Done'};});
 try{
  view.query('[data-ai-prompt]').click();
  assert.equal(view.query('#aiMode').value,'tutor');
  assert.equal(view.query('#aiMessage').value,'Explain a difficult topic in simple terms, then give me one short practice question.');
  assert.equal(view.win.document.activeElement,view.query('#aiMessage'));
  assert.equal(view.query('#aiCharCount').textContent,`${view.query('#aiMessage').value.length} / 3,500`);
  assert.equal(calls,0);
  view.query('#aiNewSession').click();
  assert.equal(view.query('#aiMode').value,'everyday');
  assert.equal(view.query('#aiMessage').value,'');
  assert.equal(calls,0);
 }finally{view.controller.destroy();view.dom.window.close();}
});

test('separate conversations keep their mode and draft and can be searched by message text',async()=>{
 const view=setup(async(_client,message)=>({answer:`Reply to ${message.split('Current message:\n').at(-1)}`}));
 try{
  await wait();view.submit('Study photosynthesis');await wait();
  const firstSession=view.query('[data-ai-session]').dataset.aiSession;
  view.query('#aiNewSession').click();
  view.query('#aiMode').value='brainstorm';view.query('#aiMode').dispatchEvent(new view.win.Event('change',{bubbles:true}));
  view.submit('Plan a study afternoon');await wait();
  view.query('#aiMessage').value='A draft for a second chat';
  view.query('#aiMessage').dispatchEvent(new view.win.Event('input',{bubbles:true}));
  assert.equal(view.root.querySelectorAll('[data-ai-session]').length,2);
  view.query('#aiHistorySearch').value='photosynthesis';
  view.query('#aiHistorySearch').dispatchEvent(new view.win.Event('input',{bubbles:true}));
  assert.equal(view.root.querySelectorAll('[data-ai-session]').length,1);
  view.query('[data-ai-session]').click();
  assert.equal(view.query('[data-ai-session]').dataset.aiSession,firstSession);
  assert.equal(view.query('#aiMode').value,'everyday');
  assert.match(view.root.textContent,/Study photosynthesis/);
  view.query('#aiHistorySearch').value='';view.query('#aiHistorySearch').dispatchEvent(new view.win.Event('input',{bubbles:true}));
  const second=view.root.querySelectorAll('[data-ai-session]');
  second[0].click();
  assert.equal(view.query('#aiMode').value,'brainstorm');
  assert.equal(view.query('#aiMessage').value,'A draft for a second chat');
 }finally{view.controller.destroy();view.dom.window.close();}
});

test('General-purpose live models are selectable; opt-in search is passed and citations are safe',async()=>{
 let selection;
 const view=setup(async(_client,_prompt,_signal,options)=>(selection=options,{answer:'A cited answer',provider:'llm7',model:'gpt-oss:20b',failedOverFrom:{provider:'aihorde',model:'first-model'},sources:[{title:'A source',url:'https://example.org/facts'},{title:'Unsafe',url:'javascript:alert(1)'}]}));
 try{
  await wait();const picker=view.query('#aiModelSelect');
  assert.equal(picker.value,'llm7:gpt-oss:20b');
  assert.ok([...picker.querySelectorAll('optgroup')].some(group=>/Cloud models/.test(group.label)));
  picker.value='llm7:gpt-oss:20b';picker.dispatchEvent(new view.win.Event('change',{bubbles:true}));
  const search=view.query('#aiWebSearch');search.checked=true;search.dispatchEvent(new view.win.Event('change',{bubbles:true}));
  view.submit('What is the latest?');await wait();
  assert.equal(selection.provider,'llm7');assert.equal(selection.model,'gpt-oss:20b');assert.equal(selection.webSearch,true);assert.equal(selection.searchQuery,'What is the latest?');
  assert.match(view.query('.ai-model-attribution').textContent,/failover answered with GPT-OSS 20B/i);
  assert.equal(view.root.querySelectorAll('.ai-source-list a').length,1);
  assert.equal(view.root.querySelector('.ai-source-list a').rel,'noopener noreferrer');
 }finally{view.controller.destroy();view.dom.window.close();}
});

test('local models are opt-in, small models are omitted, and web search is disabled for local requests',async()=>{
 let selection;
 const local={id:'qwen3:8b',provider:'local',name:'qwen3:8b',providerLabel:'Local server',category:'standard',parametersB:8,maxOutputTokens:1024,baseUrl:'http://localhost:11434/v1'};
 const view=setup(async(_client,_prompt,_signal,options)=>(selection=options,{answer:'Local answer',provider:'local',model:local.id}),{scanLocal:async()=>({models:[local],hidden:2,baseUrl:local.baseUrl})});
 try{
  await wait();view.query('#aiScanLocal').click();await wait();
  assert.match(view.query('#aiLocalStatus').textContent,/Found 1 capable local model/i);
  const picker=view.query('#aiModelSelect');picker.value='local:qwen3:8b@http://localhost:11434/v1';picker.dispatchEvent(new view.win.Event('change',{bubbles:true}));
  assert.equal(view.query('#aiWebSearch').disabled,true);
  view.submit('Keep this on device');await wait();
  assert.equal(selection.provider,'local');assert.equal(selection.baseUrl,local.baseUrl);assert.equal(selection.webSearch,false);
  assert.match(view.query('#aiApiThread').textContent,/Local server/);
 }finally{view.controller.destroy();view.dom.window.close();}
});

test('Web Studio opens generated HTML in a separate live sandboxed editor',async()=>{
 const html='<!doctype html><html><head><title>Timer</title></head><body><main><h1>Study timer</h1><button>Start</button></main><script>document.querySelector("button").textContent="Started"</script></body></html>';
 const view=setup(async()=>({answer:`Here is the prototype:\n\n\`\`\`html\n${html}\n\`\`\``}));
 try{
  await wait();view.query('#aiMode').value='build';view.query('#aiMode').dispatchEvent(new view.win.Event('change',{bubbles:true}));
  view.submit('Build a study timer');await wait();
  assert.equal(view.query('#aiWebStudio').hidden,false);
  assert.equal(view.query('#aiStudioCode').value,html);
  assert.equal(view.query('#aiStudioFrame').hidden,true,'preview waits for the debounce');
  assert.ok(view.query('[data-ai-preview]'));
  assert.equal(view.root.querySelector('script'),null,'generated HTML is rendered as text in the Hub page');
  assert.match(view.root.querySelector('.is-assistant p').textContent,/Web Studio editor/);
  await new Promise(resolve=>view.win.setTimeout(resolve,500));
  assert.equal(view.query('#aiStudioFrame').hidden,false,'generated HTML automatically previews after debounce');
  view.query('#aiStudioPreview').click();
  const frame=view.query('#aiStudioFrame');
  assert.equal(frame.hidden,false);
  assert.equal(frame.getAttribute('sandbox'),'allow-scripts');
  assert.equal(frame.getAttribute('referrerpolicy'),'no-referrer');
  assert.match(frame.getAttribute('srcdoc'),/connect-src 'none'/);
  assert.match(frame.getAttribute('srcdoc'),/navigate-to 'none'/);
  assert.match(frame.getAttribute('srcdoc'),/Study timer/);
  assert.match(view.query('#aiStudioStatus').textContent,/external resources are restricted/i);
  view.query('#aiCloseStudio').click();
  assert.equal(view.query('#aiWebStudio').hidden,true);
 }finally{view.controller.destroy();view.dom.window.close();}
});

test('stop aborts a pending request, preserves the draft and resets the composer',async()=>{
 let signal;
 const view=setup((_client,_message,requestSignal)=>{signal=requestSignal;return new Promise(()=>{});});
 try{
  await wait();view.submit('Please explain this topic');
  assert.equal(view.query('#aiSend').disabled,true);
  view.query('#aiStop').click();
  assert.equal(signal.aborted,true);
  assert.equal(view.query('#aiSend').disabled,false);
  assert.equal(view.query('#aiMessage').value,'Please explain this topic');
  assert.match(view.query('#aiApiStatus').textContent,/response stopped/i);
 }finally{view.controller.destroy();view.dom.window.close();}
});

 test('automatic and search stay usable when discovery fails',async()=>{
 const view=setup(async()=>({answer:'ok',provider:'kindlehub',model:'last-resort'}),{listModels:async()=>{throw Error('Catalog unavailable');}});
 try{await wait();assert.equal(view.query('#aiModelSelect').hidden,true);assert.equal(view.query('#aiModelSelect').value,'auto:automatic');assert.equal(view.query('#aiWebSearch').disabled,false);assert.equal(view.query('#aiSend').disabled,false);assert.match(view.query('#aiModelStatus').textContent,/discovery failed/i);view.submit('Hello');await wait();assert.match(view.query('.ai-model-attribution').textContent,/KindleHub/);}finally{view.controller.destroy();view.dom.window.close();}
 });

test('model picker returns when individual models become available',async()=>{
 const view=setup(async()=>({answer:'ok'}),{listModels:async()=>[{id:'openai/gpt-oss-20b',provider:'groq',name:'GPT-OSS 20B',category:'standard'}]});
 try{await wait();assert.equal(view.query('#aiModelSelect').hidden,false);assert.match(view.query('#aiModelSelect').textContent,/GPT-OSS/);assert.doesNotMatch(view.query('#aiModelSelect').textContent,/Abliterated/);}finally{view.controller.destroy();view.dom.window.close();}
});

test('account-scoped chats, drafts and prototypes survive remount and can be cleared',async()=>{
 const view=setup(async()=>({answer:'Saved answer',provider:'llm7',model:'gpt-oss:20b'}),{userId:'saved-user'});
 let controller=view.controller;
 try{
  await wait();view.submit('Remember this question');await wait();
  view.query('#aiMessage').value='Unsent draft';view.query('#aiMessage').dispatchEvent(new view.win.Event('input',{bubbles:true}));
  view.query('#aiStudioCode').value='<h1>Saved prototype</h1>';view.query('#aiStudioCode').dispatchEvent(new view.win.Event('input',{bubbles:true}));
  view.win.dispatchEvent(new view.win.Event('pagehide'));controller.destroy();
  const mount=userId=>{view.root.innerHTML=aiStudioWorkspace();return mountAiStudio({root:view.root,win:view.win,userId,listModels:async()=>liveModels,ask:async()=>({answer:'ok'})});};
  controller=mount('other-user');assert.doesNotMatch(view.root.textContent,/Remember this question/);controller.destroy();
  controller=mount('saved-user');await wait();assert.match(view.query('#aiApiThread').textContent,/Saved answer/);assert.equal(view.query('#aiMessage').value,'Unsent draft');assert.equal(view.query('#aiStudioCode').value,'<h1>Saved prototype</h1>');assert.equal(view.query('#aiStudioFrame').hasAttribute('srcdoc'),false);
  controller.clearChats();controller.destroy();controller=mount('saved-user');assert.doesNotMatch(view.query('#aiApiThread').textContent,/Saved answer/);
 }finally{controller.destroy();view.dom.window.close();}
});

test('blocked chat storage gives a warning without preventing conversation',async()=>{
 const view=setup(async()=>({answer:'ok'}),{userId:'blocked'});
 try{view.win.Storage.prototype.setItem=()=>{throw Error('full');};view.submit('Still usable');await wait();assert.match(view.query('#aiApiThread').textContent,/ok/);assert.match(view.query('.ai-session-note').textContent,/Could not save/);}finally{view.controller.destroy();view.dom.window.close();}
});

test('live preview debounces edits, supports opt-out and cancels on close and destroy',async()=>{
 const view=setup(async()=>({answer:'ok'}));
 const delay=()=>new Promise(resolve=>view.win.setTimeout(resolve,500));
 const edit=code=>{view.query('#aiStudioCode').value=code;view.query('#aiStudioCode').dispatchEvent(new view.win.Event('input',{bubbles:true}));};
 try{
  await wait();view.query('#aiOpenStudio').click();edit('<h1>First</h1>');edit('<h1>Latest</h1>');await delay();
  const frame=view.query('#aiStudioFrame');assert.match(frame.srcdoc,/Latest/);assert.doesNotMatch(frame.srcdoc,/First/);assert.equal(frame.getAttribute('sandbox'),'allow-scripts');
  const toggle=view.query('#aiStudioLive');toggle.checked=false;toggle.dispatchEvent(new view.win.Event('change',{bubbles:true}));edit('<h1>Paused</h1>');await delay();assert.doesNotMatch(frame.srcdoc,/Paused/);
  view.query('#aiStudioPreview').click();assert.match(frame.srcdoc,/Paused/);
  toggle.checked=true;toggle.dispatchEvent(new view.win.Event('change',{bubbles:true}));edit('<h1>Cancelled</h1>');view.query('#aiCloseStudio').click();await delay();assert.equal(frame.hasAttribute('srcdoc'),false);
  view.query('#aiOpenStudio').click();edit('<h1>Destroyed</h1>');view.controller.destroy();await delay();assert.equal(frame.hasAttribute('srcdoc'),false);
 }finally{view.controller.destroy();view.dom.window.close();}
});

test('studio offers responsive preview sizes, code recovery and keyboard HTML downloads',async()=>{
 let call=0;const view=setup(async()=>({answer:`\`\`\`html\n<h1>Version ${++call}</h1>\n\`\`\``}),{userId:'versions'});
 const downloads=[],revoked=[];view.win.URL.createObjectURL=blob=>(downloads.push(blob),'blob:prototype');view.win.URL.revokeObjectURL=url=>revoked.push(url);
 view.win.HTMLAnchorElement.prototype.click=function(){assert.equal(this.download,'everything-hub-prototype.html');};
 try{
  await wait();view.submit('Build first');await wait();view.submit('Make it better');await wait();
  assert.match(view.query('#aiStudioCode').value,/Version 2/);assert.equal(view.query('#aiStudioRestore').disabled,false);
  view.query('#aiStudioRestore').click();assert.match(view.query('#aiStudioCode').value,/Version 1/);view.query('#aiStudioRestore').click();assert.match(view.query('#aiStudioCode').value,/Version 2/);
  const size=view.query('#aiStudioSize');for(const width of ['375','768','1280','full']){size.value=width;size.dispatchEvent(new view.win.Event('change',{bubbles:true}));assert.equal(view.query('#aiStudioFrame').style.width,width==='full'?'100%':`${width}px`);}
  const editor=view.query('#aiStudioCode');editor.dispatchEvent(new view.win.KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,bubbles:true,cancelable:true}));assert.match(view.query('#aiStudioFrame').srcdoc,/Version 2/);
  editor.dispatchEvent(new view.win.KeyboardEvent('keydown',{key:'s',metaKey:true,bubbles:true,cancelable:true}));assert.equal(downloads.length,1);assert.equal(downloads[0].type,'text/html;charset=utf-8');assert.match(view.query('#aiStudioStatus').textContent,/outside this preview sandbox/);
  assert.match(view.query('#aiStudioCodeCount').textContent,/25,000 characters/);
  view.controller.destroy();assert.deepEqual(revoked,['blob:prototype']);
  const saved=JSON.parse([...Array(view.win.localStorage.length)].map((_,i)=>view.win.localStorage.getItem(view.win.localStorage.key(i))).find(value=>value.includes('previousCode')));assert.match(saved.data.chats[0].previousCode,/Version 1/);
 }finally{view.controller.destroy();view.dom.window.close();}
});
