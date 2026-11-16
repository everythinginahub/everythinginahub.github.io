import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {filterLifeHacks,lifeHackCategories,lifeHacks,lifeHacksView,mountLifeHacks} from '../public/life-hacks.js';

test('life-hack tips cover practical categories and can be searched without overpromising',()=>{
 assert.ok(lifeHacks.length>=16);
 assert.deepEqual(lifeHackCategories,['All','Study','Planning','Home','Digital']);
 assert.ok(filterLifeHacks('mistake log','Study').some(item=>/mistake log/i.test(item.title)));
 assert.ok(filterLifeHacks('NOTIFICATIONS','All').some(item=>item.category==='Digital'));
 assert.equal(filterLifeHacks('does not exist').length,0);
});

test('Life Hacks app filters tips, picks from current results, and reports empty searches accessibly',()=>{
 const dom=new JSDOM(`<main>${lifeHacksView()}</main>`,{url:'https://example.test/'});
 try{
  const win=dom.window,root=win.document.querySelector('main'),q=selector=>root.querySelector(selector),controller=mountLifeHacks({root,win});
  assert.equal(root.querySelectorAll('.life-hack-card').length,lifeHacks.length);
  q('#lifeHacksCategory').value='Digital';q('#lifeHacksCategory').dispatchEvent(new win.Event('change',{bubbles:true}));
  assert.ok([...root.querySelectorAll('.life-hack-card')].every(card=>card.querySelector('.life-hack-category').textContent==='Digital'));
  q('#lifeHacksSearch').value='password';q('#lifeHacksSearch').dispatchEvent(new win.Event('input',{bubbles:true}));
  assert.equal(root.querySelectorAll('.life-hack-card').length,1);
  win.Math.random=()=>0;q('#lifeHacksPick').click();assert.match(q('#lifeHacksSpotlight').textContent,/unique passwords/i);
  q('#lifeHacksSearch').value='no-match';q('#lifeHacksSearch').dispatchEvent(new win.Event('input',{bubbles:true}));
  assert.equal(q('#lifeHacksCount').textContent,'0 tips');assert.equal(q('#lifeHacksEmpty').hidden,false);
  q('#lifeHacksPick').click();assert.match(q('#lifeHacksSpotlight').textContent,/no matching tips/i);
  controller.destroy();
 }finally{dom.window.close();}
});
