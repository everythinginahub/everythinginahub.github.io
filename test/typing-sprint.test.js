import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {miniAppView} from '../public/mini-apps.js';
import {mountTypingSprint,scoreTyping,typingProgressKey} from '../public/typing-sprint.js';

function fixture() {
  const dom=new JSDOM(`<main>${miniAppView('typing-sprint')}</main>`,{url:'https://example.test'}),win=dom.window,root=win.document.querySelector('main');
  const clock={now:0},timers=new Map();let timerId=0;
  win.setInterval=callback=>{const id=++timerId;timers.set(id,callback);return id;};win.clearInterval=id=>timers.delete(id);
  const controller=mountTypingSprint({root,win,userId:'typing-user',now:()=>clock.now});
  const q=selector=>root.querySelector(selector);
  return {dom,win,root,q,clock,timers,controller};
}

test('typing scores compare exact characters and bound account-scoped best records',()=>{
  assert.deepEqual(scoreTyping('hello world','hello worle',30),{wpm:4,accuracy:91,correctCharacters:10,typedCharacters:11});
  assert.deepEqual(scoreTyping('hello','',30),{wpm:0,accuracy:0,correctCharacters:0,typedCharacters:0});
  assert.notEqual(typingProgressKey('alice'),typingProgressKey('bob'));
});

test('Typing Sprint starts, times, scores, saves a best, resets and cleans up',()=>{
  const {dom,q,clock,timers,controller}=fixture();try{
    assert.equal(q('#typingInput').disabled,true);q('#typingStart').click();
    assert.equal(q('#typingInput').disabled,false);assert.equal(q('#typingFinish').hidden,false);assert.equal(timers.size,1);
    const prompt=q('#typingPrompt').textContent;q('#typingInput').value=prompt;q('#typingInput').dispatchEvent(new dom.window.Event('input',{bubbles:true}));
    clock.now=10000;q('#typingFinish').click();
    assert.equal(q('#typingInput').disabled,true);assert.equal(q('#typingResult').hidden,false);
    assert.equal(q('#typingAccuracy').textContent,'100%');assert.match(q('#typingWpm').textContent,/^\d+$/);
    assert.match(q('#typingBest').textContent,/Personal best/);assert.ok(JSON.parse(dom.window.localStorage.getItem(typingProgressKey('typing-user'))).attempts===1);
    q('#typingReset').click();assert.equal(q('#typingResult').hidden,true);assert.equal(q('#typingInput').value,'');
    q('#typingDuration').value='60';q('#typingDuration').dispatchEvent(new dom.window.Event('change',{bubbles:true}));assert.equal(q('#typingTime').textContent,'60s');
    controller.destroy();assert.equal(timers.size,0);
  }finally{dom.window.close();}
});
