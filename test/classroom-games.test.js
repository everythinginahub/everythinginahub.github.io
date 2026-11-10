import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {classroomGames,classroomView,gameHtml,mountClassroom} from '../public/classroom-games.js';
import {arcadeView,mountArcade} from '../public/arcade.js';

const gadget='<?xml version="1.0"?><Module><Content type="html"><![CDATA[<!DOCTYPE html><html><head></head><body>Test</body></html>]]></Content></Module>';
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

test('popular picks link to safe game pages and preserve existing routes',()=>{
 assert.equal(classroomGames.length,25);assert.equal(new Set(classroomGames.map(g=>g.slug)).size,classroomGames.length);
 const home=arcadeView();assert.match(home,/Classroom favourites/);assert.doesNotMatch(home,/#arcade\/(?:library|skyline|geometry-dash|spotlight)/);assert.match(home,/#games/);for(const game of classroomGames)assert.match(home,new RegExp(`#arcade/classroom/${game.slug}`));assert.match(home,/not all are available/);
 assert.doesNotMatch(classroomView('../../evil'),/<iframe/);
 for(const game of classroomGames){const dom=new JSDOM(`<main>${arcadeView('classroom',game.slug)}</main>`,{url:'https://example.test/'});try{const doc=dom.window.document,frame=doc.querySelector('iframe');assert.equal(frame.title,`${game.name} game`);assert.ok(doc.querySelector('a[href^="https://sites.google.com/view/drive-u-7-home/"]'));assert.match(doc.body.textContent,/third.part|third part/i);assert.equal(frame.getAttribute('referrerpolicy'),'no-referrer');if(game.xml){assert.equal(frame.getAttribute('sandbox'),'allow-scripts allow-pointer-lock');assert.equal(frame.hasAttribute('src'),false);}else{assert.equal(frame.getAttribute('src'),game.embed);assert.match(game.embed,/^https:\/\/www\.twoplayergames\.org\/embed\//);}}finally{dom.window.close();}}
});

test('XML loader extracts game HTML, loads it only in opaque sandbox, restarts and cleans up',async()=>{
 assert.match(gameHtml(gadget),/<html>/);assert.throws(()=>gameHtml('<html>not a gadget</html>'));
 const dom=new JSDOM(`<main>${classroomView('snow-rider')}</main>`,{url:'https://example.test/'});
 try{let calls=0;dom.window.fetch=async(url,opts)=>{calls++;assert.equal(url,classroomGames[0].xml);assert.equal(opts.credentials,'omit');return {ok:true,text:async()=>gadget};};const root=dom.window.document.querySelector('main');const controller=mountArcade({root,id:'classroom',view:'snow-rider',win:dom.window});await tick();let frame=root.querySelector('iframe');assert.match(frame.srcdoc,/<body>Test/);assert.match(frame.srcdoc,/<base href="https:\/\/cdn\.jsdelivr\.net/);assert.doesNotMatch(frame.getAttribute('sandbox'),/same-origin/);assert.match(root.querySelector('#classroomStatus').textContent,/Game loaded/);root.querySelector('#classroomReload').click();await tick();assert.equal(calls,2);controller.destroy();assert.equal(root.querySelector('iframe'),null);}finally{dom.window.close();}
});

test('XML failure explains fallback; destroyed pending loads cannot mutate the page',async()=>{
 const dom=new JSDOM(`<main>${classroomView('dune-dash')}</main>`);try{const root=dom.window.document.querySelector('main');dom.window.fetch=async()=>({ok:false});const controller=mountClassroom(root,'dune-dash',dom.window);await tick();assert.match(root.querySelector('#classroomStatus').textContent,/Could not load/);controller.destroy();let resolve;dom.window.fetch=()=>new Promise(r=>resolve=r);root.innerHTML=classroomView('dune-dash');const next=mountClassroom(root,'dune-dash',dom.window);next.destroy();resolve({ok:true,text:async()=>gadget});await tick();assert.equal(root.querySelector('iframe'),null);}finally{dom.window.close();}
});

test('official embeds restart and fullscreen fallbacks are usable',()=>{
 const dom=new JSDOM(`<main>${classroomView('basket-random')}</main>`);try{const root=dom.window.document.querySelector('main'),ctl=mountClassroom(root,'basket-random',dom.window);root.querySelector('#classroomReload').click();assert.equal(root.querySelector('iframe').getAttribute('src'),'https://www.twoplayergames.org/embed/basket-random');root.querySelector('#classroomFullscreen').click();assert.match(root.querySelector('#classroomStatus').textContent,/unavailable/);ctl.destroy();}finally{dom.window.close();}
});


test('new home-page games retain their recovered source URLs and isolated players',async()=>{
 const expected={
  'survival-race':'https://cdn.jsdelivr.net/gh/events-files-manager/stles@1b4a1fc/1.xml',
  'jump-or-fall':'https://cdn.jsdelivr.net/gh/classroomusers/77u6666@8142074/2.xml',
  'level-67':'https://cdn.jsdelivr.net/npm/nxd-xm-1@1.0.1/s6.xml',
  'football-bros':'https://cdn.jsdelivr.net/gh/z799gs/550o8@main/Build/1.xml',
  'paper-io-2':'https://cdn.jsdelivr.net/gh/centerclassroom/mc55@main/paper-io-2.xml',
  'ragdoll-freefall':'https://cdn.jsdelivr.net/npm/nxd-xm-1@1.0.2/r8.xml'
 };
 for(const [slug,source] of Object.entries(expected)){
  const game=classroomGames.find(g=>g.slug===slug);assert.equal(game.xml,source);
  const dom=new JSDOM(`<main>${classroomView(slug)}</main>`);try{
   const root=dom.window.document.querySelector('main');dom.window.fetch=async(url,options)=>{assert.equal(url,source);assert.equal(options.credentials,'omit');return {ok:true,text:async()=>gadget};};
   const controller=mountClassroom(root,slug,dom.window);await tick();
   assert.match(root.querySelector('iframe').srcdoc,/<body>Test/);assert.equal(root.querySelector('iframe').getAttribute('sandbox'),'allow-scripts allow-pointer-lock');
   controller.destroy();
  }finally{dom.window.close();}
 }
});
