import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';
import {JSDOM} from 'jsdom';
import {arcadeView,mountArcade} from '../public/arcade.js';
import {DUNGEON_QUEST_3D_PATH,dungeonQuest3DView} from '../public/arcade-3d-views.js';
import {securityHeadersForRequest} from '../scripts/security-headers.js';

const gameHtml=await readFile(new URL('../public/dungeon-quest-3d.html',import.meta.url),'utf8');

function mockCanvas(win){
 win.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/png;base64,';
 win.HTMLCanvasElement.prototype.getBoundingClientRect=function(){return {left:0,top:0,width:this.width||960,height:this.height||600,right:this.width||960,bottom:this.height||600};};
 win.HTMLCanvasElement.prototype.getContext=function(){
  const canvas=this,noop=()=>{},image=(width,height)=>({width,height,data:new Uint8ClampedArray(Math.max(0,width*height*4))});
  return new Proxy({canvas,globalAlpha:1,createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),measureText:text=>({width:String(text).length*7}),createImageData:(width,height)=>image(width,height),getImageData:(x,y,width,height)=>image(width,height),createPattern:()=>({}),isPointInPath:()=>false},{get(target,key){return key in target?target[key]:noop;},set(target,key,value){target[key]=value;return true;}});
 };
}

test('Dungeon Quest source is self-contained, valid, higher-resolution and visually enhanced',async()=>{
 assert.match(gameHtml,/<title>Dungeon Quest 3D<\/title>/);
 assert.match(gameHtml,/id="titleArtwork"/);
 assert.match(gameHtml,/BW=960, BH=600/);
 assert.match(gameHtml,/function drawOutdoorSky\(/);
 assert.match(gameHtml,/menu-art-active/);
 assert.match(gameHtml,/assets\/dungeon-quest-hero\.jpg/);
 assert.match(gameHtml,/if\(window\.matchMedia[\s\S]*?G\.quality=0/,'compact screens start with the faster render mode');
 const inline=[...gameHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match=>match[1]).filter(code=>code.trim());
 assert.equal(inline.length,1,'the uploaded game remains a single self-contained script');
 assert.doesNotThrow(()=>new Script(inline[0],{filename:'dungeon-quest-3d.inline.js'}));
 const image=await readFile(new URL('../public/assets/dungeon-quest-hero.jpg',import.meta.url));
 assert.deepEqual(image.subarray(0,3),Buffer.from([0xff,0xd8,0xff]));
 assert.ok(image.length<1_000_000,'the title artwork should stay lightweight');
});

test('Dungeon Quest boots into its title menu and activates the upgraded artwork without script errors',async()=>{
 const dom=new JSDOM(gameHtml,{url:'https://example.test/public/dungeon-quest-3d.html',runScripts:'outside-only',pretendToBeVisual:true}),win=dom.window,errors=[];
 win.addEventListener('error',event=>errors.push(event.error||event.message));mockCanvas(win);
 win.requestAnimationFrame=()=>1;win.cancelAnimationFrame=()=>{};win.setTimeout=()=>1;win.clearTimeout=()=>{};win.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
 const ready=new Promise(resolve=>win.document.addEventListener('DOMContentLoaded',resolve,{once:true}));
 try{
  const inline=[...gameHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match=>match[1]).find(code=>code.trim());
  win.eval(inline);
  if(win.document.readyState==='loading')await ready;
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(win.__DQ?.G?.mode,'menu');
  assert.equal(win.document.querySelector('#ovl').classList.contains('show'),true);
  assert.equal(win.document.querySelector('#stage').classList.contains('menu-art-active'),true);
  assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
});

test('Dungeon Quest is featured in the Games hub and opens inside a safe local game frame',async()=>{
 const home=arcadeView();
 assert.match(home,/#arcade\/dungeon-quest-3d/);
 assert.match(home,/Dungeon Quest 3D/);
 assert.match(home,/assets\/dungeon-quest-hero\.jpg/);
 assert.match(home,/<strong>6<\/strong> featured games/);
 assert.match(arcadeView('dungeon-quest-3d'),/id="dungeonQuestFrame"/);
 const dom=new JSDOM(`<main>${dungeonQuest3DView()}</main>`,{url:'https://example.test/public/'});
 try{
  const root=dom.window.document.querySelector('main'),frame=root.querySelector('#dungeonQuestFrame');
  assert.equal(DUNGEON_QUEST_3D_PATH,'./dungeon-quest-3d.html');
  assert.equal(frame.src,'https://example.test/public/dungeon-quest-3d.html');
  assert.equal(frame.title,'Dungeon Quest 3D fantasy action RPG');
  assert.deepEqual(frame.getAttribute('sandbox').split(/\s+/).sort(),['allow-pointer-lock','allow-scripts'].sort());
  assert.doesNotMatch(frame.getAttribute('sandbox'),/allow-same-origin/,'the opaque iframe sandbox keeps local storage isolated from the parent app');
  assert.match(frame.getAttribute('allow'),/pointer-lock/);assert.match(frame.getAttribute('allow'),/fullscreen/);
  const fallback=root.querySelector('.embedded-game-actions a');
  assert.equal(fallback.href,frame.src);assert.equal(fallback.target,'_blank');assert.match(fallback.rel,/noopener/);
  const controller=mountArcade({root,id:'dungeon-quest-3d',win:dom.window});
  controller.destroy();await new Promise(resolve=>dom.window.setTimeout(resolve,120));assert.equal(root.querySelector('#dungeonQuestFrame'),null);
 }finally{dom.window.close();}
});

test('Dungeon Quest iframe headers permit same-site play and only the game’s optional PeerJS connection',()=>{
 const headers=securityHeadersForRequest({url:'/public/dungeon-quest-3d.html?test=1',headers:{},socket:{encrypted:false}});
 assert.equal(headers['X-Frame-Options'],'SAMEORIGIN');
 assert.match(headers['Content-Security-Policy'],/frame-ancestors 'self'/);
 assert.match(headers['Content-Security-Policy'],/script-src 'self' 'unsafe-inline' https:\/\/unpkg\.com/);
 assert.match(headers['Content-Security-Policy'],/connect-src 'self' https:\/\/0\.peerjs\.com wss:\/\/0\.peerjs\.com/);
 assert.match(headers['Content-Security-Policy-Report-Only'],/frame-ancestors 'self'/);
});
