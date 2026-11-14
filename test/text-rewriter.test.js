import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {miniApps, miniAppView, mountMiniApp} from '../public/mini-apps.js';
import {countTextSentences, countTextWords, humanizeText} from '../public/text-rewriter.js';

test('humanizer makes stiff wording more natural while keeping facts and meaning intact',()=>{
  const source='At this point in time, it is important to note that our team is utilizing a wide range of tools in order to examine the data. Furthermore, we are able to review the results on a daily basis. In conclusion, these changes are of great importance to the team. We will check again next week.';
  const light=humanizeText(source,'light');
  assert.equal(light.text,'Now, it is important to note that our team is utilizing a wide range of tools to examine the data. Furthermore, we are able to review the results daily. In conclusion, these changes are of great importance to the team. We will check again next week.');
  const natural=humanizeText(source,'natural');
  assert.equal(natural.text,'Now, our team is using a range of tools to examine the data. Also, we can review the results daily. Overall, these changes matter to the team. We will check again next week.');
  const conversational=humanizeText(source,'conversational');
  assert.equal(conversational.text,'Now, our team is using a range of tools to examine the data. Also, we can review the results daily. Overall, these changes matter to the team. We\'ll check again next week.');
  const formal=humanizeText("We can't skip the visit.",'professional');
  assert.equal(formal.text,'We cannot skip the visit.');
  const robotic="In today's fast-paced digital landscape, teams must delve into the intricate tapestry of data. Furthermore, tools play a crucial role in facilitating seamless workflows.";
  assert.equal(humanizeText(robotic,'natural').text,'Today, teams must explore the complex mix of data. Also, tools are key to supporting smooth workflows.');
  assert.ok(natural.edits>0);
  assert.equal(natural.words,countTextWords(natural.text));
  assert.equal(natural.sentences,countTextSentences(natural.text));
});

test('humanizer is a local, reviewable mini app with working voice and copy controls',async()=>{
  assert.equal(miniApps['text-rewriter'].name,'Humanizer');
  const view=miniAppView('text-rewriter');
  assert.match(view,/Local humanizer/);
  assert.match(view,/Nothing is sent or saved/);
  assert.match(view,/Humanize draft/);
  assert.match(view,/Natural voice/);
  assert.doesNotMatch(view,/AI detector|authorship score/i);
  const dom=new JSDOM(`<main>${view}</main>`,{url:'https://example.test/'});
  try {
    const {window:win}=dom,root=win.document.querySelector('main'),q=selector=>root.querySelector(selector);
    const controller=mountMiniApp({root,id:'text-rewriter',win});
    q('#textEditInput').value='At this point in time, we are able to make use of the plan.';
    q('#textEditInput').dispatchEvent(new win.Event('input',{bubbles:true}));
    q('#textEditRun').click();
    assert.equal(q('#textEditOutput').value,'Now, we can use the plan.');
    assert.match(q('#textEditStatus').textContent,/wording changes made/);

    q('#textEditInput').value='We will commence the review.';
    q('#textEditStyle').value='conversational';
    q('#textEditRun').click();
    assert.equal(q('#textEditOutput').value,"We'll start the review.");

    q('#textEditUse').click();
    assert.equal(q('#textEditInput').value,q('#textEditOutput').value);
    q('#textEditClear').click();
    assert.equal(q('#textEditInput').value,'');
    assert.equal(q('#textEditOutput').value,'');
    controller.destroy();
  } finally { dom.window.close(); }
});
