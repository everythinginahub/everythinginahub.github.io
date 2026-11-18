import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {arcadeView,mountArcade} from '../public/arcade.js';
import {deviceSaveKey,readDeviceSave} from '../public/device-saves.js';
const bridge=await readFile(new URL('../public/game-save-bridge.js',import.meta.url),'utf8');
test('sandbox bridge accepts only the parent, waits for data and bounds writes',()=>{
 const dom=new JSDOM('',{url:'https://example.test/',runScripts:'outside-only'}),win=dom.window,parent={postMessage() {}};
 try{
  Object.defineProperty(win,'parent',{value:parent});win.eval(bridge);
  const store=win.gameDeviceStorage;assert.equal(store.ready,false);assert.throws(()=>store.setItem('save','too early'));
  const message=(source,data)=>win.dispatchEvent(new win.MessageEvent('message',{source,data}));
  message({}, {type:'hub-game-init',data:{save:'bad'}});assert.equal(store.ready,false);
  message(parent,{type:'hub-game-init',data:{save:'restored'}});assert.equal(store.getItem('save'),'restored');
  let sent;parent.postMessage=data=>sent=data;store.setItem('save','updated');assert.equal(sent.type,'hub-game-write');assert.equal(sent.data.save,'updated');
  assert.throws(()=>store.setItem('save','a'.repeat(2000001)));assert.equal(store.getItem('save'),'updated');
  let flushed=false;win.addEventListener('pagehide',()=>flushed=true);message(parent,{type:'hub-game-flush'});assert.equal(flushed,true);
 }finally{win.close();}
});
test('game frame storage is scoped to its source, account and game',()=>{
 const dom=new JSDOM(`<main>${arcadeView('voxelcraft-survival')}</main>`,{url:'https://example.test/'}),win=dom.window,root=win.document.querySelector('main');
 try{
  const controller=mountArcade({root,win,userId:'owner',id:'voxelcraft-survival'}),frame=root.querySelector('iframe');
  const message=(source,data,origin='null')=>win.dispatchEvent(new win.MessageEvent('message',{source,origin,data}));
  const payload={type:'hub-game-write',data:{'world-save':'world contents'}};
  message(win,payload);assert.equal(win.localStorage.length,0);message(frame.contentWindow,payload,'https://untrusted.test');assert.equal(win.localStorage.length,0);
  message(frame.contentWindow,payload);assert.equal(readDeviceSave(win.localStorage,deviceSaveKey('voxelcraft','owner'))['world-save'],'world contents');assert.equal(readDeviceSave(win.localStorage,deviceSaveKey('voxelcraft','other')),null);
  message(frame.contentWindow,{type:'hub-game-write',data:{invalid:{}}});assert.equal(readDeviceSave(win.localStorage,deviceSaveKey('voxelcraft','owner'))['world-save'],'world contents');
  controller.destroy();
 }finally{win.close();}
});
