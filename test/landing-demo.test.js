import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mountLandingDemo } from '../public/landing-demo.js';

const validQuestions=[
 {id:'biology',name:'Biology',topic:'Cells',question:'Which part controls entry and exit?',options:['Nucleus','Cell membrane','Mitochondrion','Cytoplasm'],answer:1,explanation:'The membrane controls what enters and leaves the cell.'},
 {id:'maths',name:'Mathematics',topic:'Algebra',question:'What is x if 3x + 4 = 19?',options:['3','4','5','6'],answer:2,explanation:'Subtract four, then divide by three.'}
];
function fixture(){
 const dom=new JSDOM(`<main><details id="entryDemo"><summary>Try a question</summary><div><span id="entryDemoTopic"></span><h2 id="entryDemoQuestion" tabindex="-1"></h2><div id="entryDemoOptions"></div><p id="entryDemoFeedback" role="status"></p><button id="entryDemoNext" type="button" disabled>Try another</button></div></details></main>`),win=dom.window,root=win.document.querySelector('main');
 return {dom,win,root};
}

test('landing demo shows a date-stable question and renders question content as text',()=>{
 const {dom,root,win}=fixture();try{
  const questions=[{...validQuestions[0],question:'<img src=x onerror=alert(1)>',options:['<b>wrong</b>','Cell membrane'],answer:1}],date=new Date(2026,10,6);
  mountLandingDemo({root,questions,date,win});
  assert.equal(root.querySelector('#entryDemoQuestion').textContent,'<img src=x onerror=alert(1)>');assert.equal(root.querySelector('#entryDemoOptions img'),null);assert.equal(root.querySelector('#entryDemoOptions button').textContent,'<b>wrong</b>');
  assert.equal(root.querySelector('#entryDemoTopic').textContent,'Biology · Cells');assert.equal(root.querySelector('#entryDemoNext').disabled,true);
 }finally{dom.window.close();}
});

test('correct and incorrect answers reveal kind feedback and rotate without persistence',()=>{
 const {dom,root,win}=fixture();try{
  const controller=mountLandingDemo({root,questions:validQuestions,date:new Date(2026,10,6),win}),first=root.querySelector('#entryDemoQuestion').textContent;
  root.querySelector('[data-entry-demo-answer="1"]').click();assert.match(root.querySelector('#entryDemoFeedback').textContent,/That’s right!/);assert.match(root.querySelector('#entryDemoFeedback').textContent,/controls what enters/);
  assert.equal(root.querySelectorAll('#entryDemoOptions button:not(:disabled)').length,0);assert.equal(root.querySelector('#entryDemoOptions [aria-pressed="true"]').dataset.entryDemoAnswer,'1');
  root.querySelector('#entryDemoNext').click();assert.notEqual(root.querySelector('#entryDemoQuestion').textContent,first);assert.equal(root.querySelector('#entryDemoNext').disabled,true);
  root.querySelector('[data-entry-demo-answer="0"]').click();assert.match(root.querySelector('#entryDemoFeedback').textContent,/Not quite/);assert.match(root.querySelector('#entryDemoFeedback').textContent,/The answer is 5/);assert.match(root.querySelector('#entryDemoFeedback').textContent,/divide by three/);
  controller.destroy();
 }finally{dom.window.close();}
});

test('invalid sample data safely hides the demo and absent markup is a no-op',()=>{
 const {dom,root,win}=fixture();try{
  const panel=root.querySelector('#entryDemo');mountLandingDemo({root,questions:[{name:'Broken',topic:'',question:'Q?',options:['A'],answer:9}],win});assert.equal(panel.hidden,true);
  const other=dom.window.document.createElement('main');assert.doesNotThrow(()=>mountLandingDemo({root:other,questions:validQuestions,win}));
 }finally{dom.window.close();}
});
