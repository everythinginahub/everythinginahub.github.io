import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {arcadeView, mountArcade} from '../public/arcade.js';
import {VOXELCRAFT_SURVIVAL_PATH, skyparkObby3DView} from '../public/arcade-3d-views.js';
import {OBBY_3D_STARS, createObby3DGame, jumpObby3D, stepObby3D} from '../public/blockbound-engine.js';
import {mountSkyparkObby3D} from '../public/arcade-3d-game.js';

function mockFrames(win) {
  let next=1;
  const pending=new Map();
  win.requestAnimationFrame=callback=>{const id=next++;pending.set(id,callback);return id;};
  win.cancelAnimationFrame=id=>pending.delete(id);
  return {tick(time){const item=pending.entries().next().value;if(!item)return false;pending.delete(item[0]);item[1](time);return true;},get size(){return pending.size;}};
}

test('the Games hub features VoxelCraft Survival instead of the local Blockbound game',()=>{
  const home=arcadeView();
  assert.match(home,/#arcade\/voxelcraft-survival/);
  assert.match(home,/VoxelCraft Survival/);
  assert.match(home,/EMBEDDED/);
  assert.doesNotMatch(home,/Blockbound 3D|blockWorldCanvas|data-world-action/);
  assert.match(home,/Skypark Obby 3D/,'Skypark Obby remains a separate game');
});

test('VoxelCraft runs from a locally hosted sandboxed page with a new-tab fallback',()=>{
  const view=arcadeView('voxelcraft-survival');
  const dom=new JSDOM(`<main>${view}</main>`,{url:'https://example.test/',pretendToBeVisual:true});
  const root=dom.window.document.querySelector('main'),frame=root.querySelector('#voxelcraftFrame');
  assert.ok(frame);
  assert.equal(frame.getAttribute('src'),VOXELCRAFT_SURVIVAL_PATH);
  assert.equal(frame.src,'https://example.test/voxelcraft-survival.html');
  assert.equal(frame.title,'VoxelCraft Survival — Complete Sandbox Edition');
  assert.equal(frame.getAttribute('loading'),'eager');
  assert.equal(frame.getAttribute('allowfullscreen'),'');
  assert.equal(frame.getAttribute('sandbox'),'allow-scripts allow-pointer-lock');
  assert.match(frame.getAttribute('allow'),/fullscreen/);
  assert.match(frame.getAttribute('allow'),/pointer-lock/);
  const fallback=root.querySelector('.embedded-game-actions a');
  assert.equal(fallback.href,frame.src);
  assert.equal(fallback.target,'_blank');
  assert.match(fallback.rel,/noopener/);
  assert.match(root.textContent,/The game is hosted with the hub/);
  assert.doesNotMatch(view,/sites\.google\.com|blockWorldCanvas|data-world-action/);
  assert.equal(arcadeView('block-world').includes(VOXELCRAFT_SURVIVAL_PATH),true,'old bookmarks still open the replacement embed');
  dom.window.close();
});

test('the VoxelCraft route does not mount the removed local survival controller',()=>{
  const dom=new JSDOM(`<main>${arcadeView('voxelcraft-survival')}</main>`,{url:'https://example.test/'});
  const {window:win}=dom,root=win.document.querySelector('main');
  const route=mountArcade({root,id:'voxelcraft-survival',userId:'embed-test',win});
  assert.ok(root.querySelector('#voxelcraftFrame'));
  assert.equal(root.querySelector('#blockWorldCanvas'),null);
  assert.equal(typeof route.destroy,'function');
  route.destroy();
  dom.window.close();
});

test('Skypark Obby remains a separate playable 3D game',()=>{
  const obby=createObby3DGame({playerId:'runner'});
  obby.status='running';
  const runner=obby.players.runner;
  assert.equal(OBBY_3D_STARS.length,5);
  runner.grounded=false;assert.equal(jumpObby3D(obby),false);
  for(let i=0;i<30;i++)stepObby3D(obby,1/60,{forward:true,yaw:0});
  assert.equal(runner.grounded,true);
  assert.equal(jumpObby3D(obby),true);
  stepObby3D(obby,.12,{forward:true,yaw:0});assert.ok(runner.y>1);
  runner.x=-.5;runner.y=1;runner.z=-3.5;runner.vy=0;runner.grounded=true;
  stepObby3D(obby,.016);assert.equal(obby.checkpoint,1);assert.equal(obby.stars.length,1);
  runner.x=60;runner.y=-8;runner.z=-60;runner.vy=0;stepObby3D(obby,.05);
  assert.equal(obby.falls,1);assert.equal(runner.z,obby.checkpointSpawn.z);
  runner.x=.5;runner.y=1;runner.z=-30.5;runner.vy=0;runner.grounded=true;stepObby3D(obby,.016);
  assert.equal(obby.status,'won');

  const dom=new JSDOM(`<main>${skyparkObby3DView()}</main>`,{url:'https://example.test/',pretendToBeVisual:true});
  const {window:win}=dom;win.HTMLCanvasElement.prototype.getContext=()=>null;
  const frames=mockFrames(win),root=win.document.querySelector('main'),rewards=[];
  const mounted=mountSkyparkObby3D({root,userId:'runner-3d',playerName:'Runner',onReward:value=>rewards.push(value),win});
  root.querySelector('[data-obby-action="start"]').click();frames.tick(0);
  const avatar=mounted.game.players[mounted.game.localId];avatar.x=.5;avatar.y=1;avatar.z=-30.5;avatar.vy=0;avatar.grounded=true;
  frames.tick(50);
  assert.equal(mounted.game.status,'won');assert.deepEqual(rewards,['arcade']);
  mounted.destroy();assert.equal(frames.size,0);win.close();
});
