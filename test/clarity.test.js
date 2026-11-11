import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

test('main app does not load third-party session recording', async()=>{
 const html=await readFile('public/index.html','utf8');
 const dom=new JSDOM(html,{url:'https://example.test/public/'});
 try {
  assert.equal(dom.window.document.querySelectorAll('script[src*="clarity.ms"]').length,0);
  assert.doesNotMatch(html,/clarity\.ms|zb3y8jd6m6/i);
  assert.doesNotMatch(await readFile('index.html','utf8'),/clarity\.ms|zb3y8jd6m6/i);
 } finally {dom.window.close();}
});
