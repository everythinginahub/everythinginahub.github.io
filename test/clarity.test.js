import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

test('app head initialises the requested Clarity project once', async()=>{
 const html=await readFile('public/index.html','utf8');
 const dom=new JSDOM(html,{url:'https://example.test/public/',runScripts:'dangerously'});
 try {
  const {document,clarity}=dom.window;
  assert.equal(typeof clarity,'function');
  const scripts=document.head.querySelectorAll('script[src="https://www.clarity.ms/tag/zb3y8jd6m6"]');
  assert.equal(scripts.length,1);
  assert.equal(scripts[0].getAttribute('src'),'https://www.clarity.ms/tag/zb3y8jd6m6');
  clarity('test','value');
  assert.equal(clarity.q.length,1);
  assert.equal(clarity.q[0][0],'test');
  assert.equal(clarity.q[0][1],'value');
  assert.doesNotMatch(await readFile('index.html','utf8'),/clarity\.ms/);
 } finally {dom.window.close();}
});
