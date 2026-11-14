import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {miniAppView, mountMiniApp} from '../public/mini-apps.js';
import {countTextSentences, countTextWords, editForClarity} from '../public/text-rewriter.js';

test('clarity edits simplify filler without claiming to detect or evade AI authorship',()=>{
  const source='At this point in time, it is important to note that we will not make use of the form in order to register.';
  const light=editForClarity(source,'light');
  assert.equal(light.text,'Now, it is important to note that we will not use the form to register.');
  const clear=editForClarity(source,'clear');
  assert.equal(clear.text,'Now, note that we will not use the form to register.');
  const friendly=editForClarity(source,'friendly');
  assert.equal(friendly.text,"Now, note that we won't use the form to register.");
  assert.equal(editForClarity("We can't skip the visit.",'formal').text,'We cannot skip the visit.');
  assert.equal(editForClarity('We are ready and it is time to go.','friendly').text,"We're ready and it's time to go.");
  assert.ok(clear.edits>0);
  assert.equal(clear.words,countTextWords(clear.text));
  assert.equal(clear.sentences,countTextSentences(clear.text));
});

test('text rewriter is available as a local, reviewable mini app with editing controls',()=>{
  const view=miniAppView('text-rewriter');
  assert.match(view,/Offline clarity editor/);
  assert.match(view,/There is no AI detector, score/);
  assert.match(view,/textEditStyle/);
  const dom=new JSDOM(`<main>${view}</main>`,{url:'https://example.test/'});
  try {
    const {window:win}=dom,root=win.document.querySelector('main'),q=selector=>root.querySelector(selector);
    const controller=mountMiniApp({root,id:'text-rewriter',win});
    q('#textEditInput').value='At this point in time, we are able to make use of the plan.';
    q('#textEditInput').dispatchEvent(new win.Event('input',{bubbles:true}));
    q('#textEditRun').click();
    assert.equal(q('#textEditOutput').value,'Now, we can use the plan.');
    assert.match(q('#textEditStatus').textContent,/edits suggested/);
    q('#textEditUse').click();
    assert.equal(q('#textEditInput').value,q('#textEditOutput').value);
    q('#textEditClear').click();
    assert.equal(q('#textEditInput').value,'');
    assert.equal(q('#textEditOutput').value,'');
    controller.destroy();
  } finally { dom.window.close(); }
});
