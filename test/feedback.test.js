import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {mountFeedback} from '../public/feedback.js';

const markup=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup({client=null,url='https://everythinginahub.github.io/public/#youtube',fetchImpl=globalThis.fetch}={}){
 const dom=new JSDOM(markup,{url});
 dom.window.fetch=fetchImpl;
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 dom.window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
 const controller=mountFeedback({root:dom.window.document,client,win:dom.window});
 return {dom,controller,query:selector=>dom.window.document.querySelector(selector)};
}

test('visitors can open the feedback dialog from the workspace and site footer',()=>{
 const {dom,controller,query:q}=setup();
 try{
  const triggers=qAll(dom.window.document,'[data-open-feedback]');
  assert.equal(triggers.length,2,'workspace and footer feedback buttons are available on the public page');
  triggers[0].click();assert.equal(q('#feedbackDialog').open,true);assert.equal(dom.window.document.activeElement,q('#feedbackMessage'));
  q('#closeFeedbackSecondary').click();assert.equal(q('#feedbackDialog').open,false);
  triggers.at(-1).click();assert.equal(q('#feedbackDialog').open,true);
  q('#feedbackDialog').dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}));assert.equal(q('#feedbackDialog').open,false);
  controller.destroy();
  triggers[0].click();assert.equal(q('#feedbackDialog').open,false,'destroy removes trigger listeners');
 }finally{dom.window.close();}
});

function qAll(root,selector){return [...root.querySelectorAll(selector)];}

test('feedback validates, trims and sends only the selected category, message, page and honeypot',async()=>{
 const calls=[];const client={supabaseUrl:'https://project.supabase.co',supabaseKey:'sb_publishable_test'};
 const fetchImpl=async(...args)=>(calls.push(args),new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json'}}));
 const {dom,controller,query:q}=setup({client,fetchImpl});
 try{
  q('[data-open-feedback]').click();
  const message=q('#feedbackMessage');message.value='  The selected video results are really useful.  ';message.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  assert.equal(q('#feedbackCount').textContent,`${message.value.length} / 1,500`);
  q('#feedbackCategory').value='suggestion';
  q('#feedbackForm').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
  assert.equal(calls.length,1);assert.equal(calls[0][0],'https://project.supabase.co/functions/v1/site-feedback');
  assert.deepEqual(JSON.parse(calls[0][1].body),{category:'suggestion',message:'The selected video results are really useful.',page:'youtube',website:''});
  assert.deepEqual(calls[0][1].headers,{ 'Content-Type':'application/json',apikey:'sb_publishable_test' });
  assert.equal(calls[0][1].credentials,'omit');assert.equal(calls[0][1].mode,'cors');
  assert.match(q('#feedbackStatus').textContent,/Thanks/);assert.equal(q('#feedbackStatus').classList.contains('feedback-status-error'),false);
  assert.equal(message.value,'');assert.equal(q('#feedbackCount').textContent,'0 / 1,500');
  controller.destroy();
 }finally{dom.window.close();}
});

test('feedback counts Unicode characters and enforces the shared 1,500-character limit',()=>{
 const {dom,controller,query:q}=setup();
 try{
  const message=q('#feedbackMessage');
  assert.equal(message.maxLength,3000,'native UTF-16 maxlength leaves room for 1,500 astral Unicode characters');
  message.value='😀'.repeat(10);message.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  assert.equal(q('#feedbackCount').textContent,'10 / 1,500');
  message.value='😀'.repeat(1501);message.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  assert.equal(Array.from(message.value).length,1500);
  assert.equal(q('#feedbackCount').textContent,'1500 / 1,500');
  assert.match(q('#feedbackStatus').textContent,/limited to 1,500/);
 }finally{controller.destroy();dom.window.close();}
});

test('feedback reports validation, unavailable service and server rate-limit errors accessibly',async()=>{
 const {dom,controller,query:q}=setup({client:{functions:{invoke:async()=>({data:{ok:true}})}}});
 try{
  q('[data-open-feedback]').click();
  q('#feedbackMessage').value='short';q('#feedbackForm').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  assert.match(q('#feedbackStatus').textContent,/between 10 and 1,500/);assert.equal(q('#feedbackStatus').getAttribute('role'),'status');
  controller.destroy();
 }finally{dom.window.close();}
 const unavailable=setup();
 try{
  unavailable.query('[data-open-feedback]').click();unavailable.query('#feedbackMessage').value='A sufficiently detailed suggestion.';
  unavailable.query('#feedbackForm').dispatchEvent(new unavailable.dom.window.Event('submit',{bubbles:true,cancelable:true}));
  assert.match(unavailable.query('#feedbackStatus').textContent,/unavailable/i);assert.equal(unavailable.query('#feedbackStatus').classList.contains('feedback-status-error'),true);
 }finally{unavailable.controller.destroy();unavailable.dom.window.close();}
 const limited=setup({client:{supabaseUrl:'https://project.supabase.co',supabaseKey:'sb_publishable_test'},fetchImpl:async()=>new Response(JSON.stringify({error:'Please try again in about an hour.'}),{status:429,headers:{'content-type':'application/json'}})});
 try{
  limited.query('[data-open-feedback]').click();limited.query('#feedbackMessage').value='A sufficiently detailed suggestion.';
  limited.query('#feedbackForm').dispatchEvent(new limited.dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
  assert.match(limited.query('#feedbackStatus').textContent,/about an hour/);assert.equal(limited.query('#feedbackStatus').classList.contains('feedback-status-error'),true);
 }finally{limited.controller.destroy();limited.dom.window.close();}
});
