import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {AI_PROMPT_LIMIT,aiStudioWorkspace,buildAiPrompt,mountAiStudio,sandboxPreviewDocument} from '../public/ai-studio.js';

const wait=()=>new Promise(resolve=>setTimeout(resolve,20));
function setup(ask,extra={}){
 const dom=new JSDOM(`<main>${aiStudioWorkspace()}</main>`,{url:'https://example.test/'});
 const win=dom.window,root=win.document.querySelector('main');
 const controller=mountAiStudio({root,win,ask,...extra});
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
  view.submit('First question');await wait();
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
  view.submit('Study photosynthesis');await wait();
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

test('Web Studio opens generated HTML only on request inside an opaque-origin iframe sandbox',async()=>{
 const html='<!doctype html><html><head><title>Timer</title></head><body><main><h1>Study timer</h1><button>Start</button></main><script>document.querySelector("button").textContent="Started"</script></body></html>';
 const view=setup(async()=>({answer:`Here is the prototype:\n\n\`\`\`html\n${html}\n\`\`\``}));
 try{
  view.query('#aiMode').value='build';view.query('#aiMode').dispatchEvent(new view.win.Event('change',{bubbles:true}));
  view.submit('Build a study timer');await wait();
  assert.equal(view.query('#aiWebStudio').hidden,false);
  assert.equal(view.query('#aiStudioCode').value,html);
  assert.equal(view.query('#aiStudioFrame').hidden,true,'generated code is not auto-run');
  assert.ok(view.query('[data-ai-preview]'));
  assert.equal(view.root.querySelector('script'),null,'generated HTML is rendered as text in the Hub page');
  assert.match(view.root.querySelector('.is-assistant p').textContent,/<script>/);
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
  view.submit('Please explain this topic');
  assert.equal(view.query('#aiSend').disabled,true);
  view.query('#aiStop').click();
  assert.equal(signal.aborted,true);
  assert.equal(view.query('#aiSend').disabled,false);
  assert.equal(view.query('#aiMessage').value,'Please explain this topic');
  assert.match(view.query('#aiApiStatus').textContent,/response stopped/i);
 }finally{view.controller.destroy();view.dom.window.close();}
});
