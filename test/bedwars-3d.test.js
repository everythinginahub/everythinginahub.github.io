import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {arcadeView} from '../public/arcade.js';
import {
  BEDWARS_MAX_PLAYERS, OBBY_3D_STARS, addWorldBlock, applyPlayerHit, blockAt,
  breakEnemyBed, createBedWarsGame, createObby3DGame, createSurvivalGame,
  jumpObby3D, jumpPlayer, placeBridgeBlock, startMatch, stepBlockbound3D,
  stepObby3D
} from '../public/bedwars-engine.js';
import {cleanRoomCode, makeRoomCode} from '../public/bedwars-realtime.js';
import {blockWorld3DView, skyparkObby3DView} from '../public/arcade-3d-views.js';
import {mountBlockWorld3D, mountSkyparkObby3D} from '../public/arcade-3d-game.js';

const tick = (win, milliseconds = 10) => new Promise(resolve => win.setTimeout(resolve, milliseconds));

function fakeRealtimeClient() {
  const channels = new Map();
  const client = {
    channel(topic, options) {
      const channel = new FakeChannel(client, topic, options);
      if (!channels.has(topic)) channels.set(topic, new Set());
      channels.get(topic).add(channel);
      return channel;
    },
    presenceFor(topic) {
      const state = {};
      for (const channel of channels.get(topic) || []) if (channel.subscribed && channel.tracked) {
        const key = channel.options?.config?.presence?.key || channel.tracked.id;
        (state[key] ||= []).push({...channel.tracked});
      }
      return state;
    },
    sync(topic) {
      for (const channel of channels.get(topic) || []) if (channel.subscribed) {
        for (const listener of channel.listeners) if (listener.type === 'presence' && listener.filter.event === 'sync') listener.callback();
      }
    },
    broadcast(source, message) {
      for (const channel of channels.get(source.topic) || []) {
        if (channel === source || !channel.subscribed) continue;
        for (const listener of channel.listeners) if (listener.type === 'broadcast' && listener.filter.event === message.event) listener.callback({payload:message.payload});
      }
    },
    async removeChannel(channel) {
      channel.subscribed = false;
      channels.get(channel.topic)?.delete(channel);
      client.sync(channel.topic);
      return 'ok';
    }
  };
  return client;
}
class FakeChannel {
  constructor(client, topic, options) { this.client=client; this.topic=topic; this.options=options; this.listeners=[]; this.tracked=null; this.subscribed=false; }
  on(type, filter, callback) { this.listeners.push({type,filter,callback}); return this; }
  subscribe(callback) { this.subscribed=true; queueMicrotask(()=>callback('SUBSCRIBED')); return this; }
  track(value) { this.tracked={...value}; this.client.sync(this.topic); return Promise.resolve('ok'); }
  presenceState() { return this.client.presenceFor(this.topic); }
  send(message) { this.client.broadcast(this,message); return Promise.resolve('ok'); }
  untrack() { this.tracked=null; this.client.sync(this.topic); return Promise.resolve('ok'); }
}

function mockFrames(win) {
  let next=1;
  const pending=new Map();
  win.requestAnimationFrame=callback=>{const id=next++;pending.set(id,callback);return id;};
  win.cancelAnimationFrame=id=>pending.delete(id);
  return {tick(time){const item=pending.entries().next().value;if(!item)return false;pending.delete(item[0]);item[1](time);return true;},get size(){return pending.size;}};
}

test('3D Bed Wars rooms balance teams and reject small or oversized matches',()=>{
  const lobby=createBedWarsGame({players:[
    {id:'one',name:'One',joinedAt:1},{id:'two',name:'Two',joinedAt:2},
    {id:'three',name:'Three',joinedAt:3},{id:'four',name:'Four',joinedAt:4}
  ],localId:'one'});
  assert.equal(lobby.players.one.team,'red');
  assert.equal(lobby.players.two.team,'blue');
  assert.equal(lobby.players.three.team,'red');
  assert.equal(Object.keys(lobby.players).length,4);
  assert.ok(lobby.blocks.length>250);
  assert.equal(blockAt(lobby,0,0,-8),null,'the two bases are separated from the centre island by a real gap');
  const solo=createBedWarsGame({players:[{id:'solo',joinedAt:1}],localId:'solo'});
  assert.equal(startMatch(solo),false);
  assert.equal(startMatch(lobby),true);
  assert.equal(lobby.status,'running');
  const crowded=createBedWarsGame({players:Array.from({length:12},(_,i)=>({id:`p${i}`,joinedAt:i})),localId:'p0'});
  assert.equal(Object.keys(crowded.players).length,BEDWARS_MAX_PLAYERS);
});

test('Bed Wars players can place bridge wool across a void, gather iron, break beds, and respawn',()=>{
  const game=createBedWarsGame({players:[{id:'host',joinedAt:1},{id:'guest',joinedAt:2}],localId:'host'});
  startMatch(game);
  const red=game.players.host, blue=game.players.guest;
  assert.equal(red.yaw,Math.PI,'the red base faces into the central void');
  assert.equal(blue.yaw,0,'the blue base faces into the central void');
  red.x=.5;red.y=1;red.z=-11.5;
  assert.equal(blockAt(game,0,0,-11),null);
  let placed;
  for(let step=0;step<7;step++) {
    red.z=-11.5+step;
    placed=placeBridgeBlock(game);
    assert.ok(placed,`bridge block ${step+1} should reach the next empty tile`);
  }
  assert.equal(blockAt(game,0,0,-5).kind,'wool');
  assert.equal(red.blocks,17);
  red.z=-11.5;red.y=1;red.vy=0;red.grounded=true;
  for(let i=0;i<50;i++)stepBlockbound3D(game,.05,{forward:true,yaw:red.yaw});
  assert.ok(red.z>-4,'the player can walk over the new bridge to the centre island');
  red.x=.5;red.y=1;red.z=-15.5;
  const ironBefore=red.iron;
  for(let i=0;i<61;i++)stepBlockbound3D(game,.05);
  assert.ok(red.iron>ironBefore);
  red.x=.5;red.y=1;red.z=18.4;
  assert.equal(breakEnemyBed(game,'host','blue'),'blue');
  assert.equal(game.beds.blue.alive,false);
  red.x=.5;red.y=1;red.z=0;
  blue.x=.5;blue.y=1;blue.z=0;
  assert.equal(applyPlayerHit(game,'host','guest'),true);
  assert.equal(applyPlayerHit(game,'host','guest'),true);
  assert.equal(applyPlayerHit(game,'host','guest'),true);
  assert.equal(blue.alive,false);
  assert.equal(blue.respawnAt,null,'a player cannot respawn after their bed is gone');
});

test('3D Survival and Obby simulate jumping, bridging, checkpoints, and falling back safely',()=>{
  const survival=createSurvivalGame({playerId:'builder'});
  survival.status='running';
  const player=survival.players.builder;
  const startingY=player.y;
  assert.equal(jumpPlayer(survival),true);
  stepBlockbound3D(survival,.15,{forward:true,yaw:0});
  assert.ok(player.y>startingY);
  player.x=40;player.z=40;player.y=0;player.vy=0;
  for(let i=0;i<30;i++)stepBlockbound3D(survival,.05);
  assert.equal(player.falls,1);
  assert.equal(player.z,2.5);

  const obby=createObby3DGame({playerId:'runner'});
  obby.status='running';
  const runner=obby.players.runner;
  assert.equal(OBBY_3D_STARS.length,5);
  runner.grounded=false;
  assert.equal(jumpObby3D(obby),false,'must be grounded before jumping');
  for(let i=0;i<30;i++)stepObby3D(obby,1/60,{forward:true,yaw:0});
  assert.equal(runner.grounded,true);
  assert.equal(jumpObby3D(obby),true);
  stepObby3D(obby,.12,{forward:true,yaw:0});
  assert.ok(runner.y>1);
  runner.x=-.5;runner.y=1;runner.z=-3.5;runner.vy=0;runner.grounded=true;
  stepObby3D(obby,.016);
  assert.equal(obby.checkpoint,1);
  assert.equal(obby.stars.length,1);
  runner.x=60;runner.y=-8;runner.z=-60;runner.vy=0;
  stepObby3D(obby,.05);
  assert.equal(obby.falls,1);
  assert.equal(runner.z,obby.checkpointSpawn.z);
  runner.x=.5;runner.y=1;runner.z=-30.5;runner.vy=0;runner.grounded=true;
  stepObby3D(obby,.016);
  assert.equal(obby.status,'won');
});

test('the public game routes render perspective play, bridge controls, room codes and a jumping 3D obby',()=>{
  const arcade=arcadeView();
  assert.match(arcade,/Blockbound 3D/);
  assert.match(arcade,/SURVIVAL \+ BED WARS/);
  assert.match(arcade,/Skypark Obby 3D/);
  const block=blockWorld3DView();
  assert.match(block,/id="blockWorldCanvas"/);
  assert.match(block,/FIRST-PERSON 3D/);
  assert.match(block,/data-world-mode="bedwars"/);
  assert.match(block,/data-room-action="create"/);
  assert.match(block,/data-room-action="join"/);
  assert.match(block,/Place block/);
  const obby=skyparkObby3DView();
  assert.match(obby,/id="obbyCanvas"/);
  assert.match(obby,/data-obby-action="jump"/);
  assert.match(obby,/3D parkour/i);
});

test('Bed Wars realtime room helpers sanitize invite codes and generate six-character codes',()=>{
  assert.equal(cleanRoomCode('ab-cd 12'), 'ABCD12');
  assert.equal(cleanRoomCode('a?b!'), 'AB');
  assert.match(makeRoomCode({crypto:null}),/^[A-Z2-9]{6}$/);
});

test('two fake realtime players can create and join a Bed Wars room, start a match, and share bridges',async()=>{
  const client=fakeRealtimeClient();
  const makeRoot=()=>{
    const dom=new JSDOM(`<main>${blockWorld3DView()}</main>`,{url:'https://example.test/',pretendToBeVisual:true});
    dom.window.HTMLCanvasElement.prototype.getContext=()=>null;
    const frames=mockFrames(dom.window);
    return {dom,root:dom.window.document.querySelector('main'),frames};
  };
  const first=makeRoot(), second=makeRoot();
  const host=mountBlockWorld3D({root:first.root,userId:'host-user',playerName:'Host',client,win:first.dom.window});
  const guest=mountBlockWorld3D({root:second.root,userId:'guest-user',playerName:'Guest',client,win:second.dom.window});
  const q=(root,selector)=>root.querySelector(selector);
  q(first.root,'[data-world-mode="bedwars"]').click();
  q(first.root,'[data-room-action="create"]').click();
  await tick(first.dom.window,15);
  assert.match(host.roomCode,/^[A-Z2-9]{6}$/);
  q(second.root,'[data-world-mode="bedwars"]').click();
  q(second.root,'#bedwarsRoomCode').value=host.roomCode;
  q(second.root,'[data-room-action="join"]').click();
  await tick(first.dom.window,20);
  assert.equal(q(first.root,'[data-room-action="start"]').disabled,false);
  q(first.root,'[data-room-action="start"]').click();
  assert.equal(host.game.status,'running');
  assert.equal(guest.game.status,'running');
  const guestPlayer=guest.game.players[guest.game.localId];
  second.root.querySelector('[data-world-action="jump"]').click();
  assert.ok(guestPlayer.vy>0,'the Bed Wars jump button works on touch and desktop');
  const hostPlayer=host.game.players[host.game.localId];
  hostPlayer.x=.5;hostPlayer.y=1;hostPlayer.yaw=hostPlayer.team==='red'?Math.PI:0;
  hostPlayer.z=hostPlayer.team==='red'?-11.5:12.5;
  first.frames.tick(0);first.frames.tick(125);
  assert.equal(guest.game.players[host.game.localId].z,hostPlayer.z,'live positions are broadcast to the other player');
  q(first.root,'[data-world-action="place"]').click();
  assert.equal(hostPlayer.blocks,23);
  const shared=host.game.blocks.find(block=>block.owner===host.game.localId && block.kind==='wool');
  assert.ok(shared);
  assert.ok(guest.game.blocks.some(block=>block.id===shared.id));
  assert.equal(guest.game.players[host.game.localId].blocks,23);
  host.destroy();guest.destroy();
  await tick(first.dom.window,5);
  first.dom.window.close();second.dom.window.close();
});

test('the Blockbound 3D mount starts, moves, jumps and cleans up its animation loop',()=>{
  const dom=new JSDOM(`<main>${blockWorld3DView()}</main>`,{url:'https://example.test/',pretendToBeVisual:true});
  const {window:win}=dom;win.HTMLCanvasElement.prototype.getContext=()=>null;
  const frames=mockFrames(win),root=win.document.querySelector('main');
  const game=mountBlockWorld3D({root,userId:'builder',playerName:'Builder',win});
  root.querySelector('[data-world-action="start"]').click();
  assert.equal(game.game.status,'running');
  const player=game.game.players[game.game.localId],startZ=player.z;
  win.dispatchEvent(new win.KeyboardEvent('keydown',{key:' ',bubbles:true}));
  win.dispatchEvent(new win.KeyboardEvent('keydown',{key:'w',bubbles:true,cancelable:true}));
  frames.tick(0);frames.tick(100);
  win.dispatchEvent(new win.KeyboardEvent('keyup',{key:'w',bubbles:true}));
  assert.ok(player.y>1,'Space makes the 3D player jump');
  assert.ok(player.z<startZ,'W moves through the 3D world');
  game.destroy();assert.equal(frames.size,0);win.close();
});

test('the 3D obby mount handles starts, completion rewards, personal bests and cleanup without WebGL',()=>{
  const dom=new JSDOM(`<main>${skyparkObby3DView()}</main>`,{url:'https://example.test/',pretendToBeVisual:true});
  const {window:win}=dom;win.HTMLCanvasElement.prototype.getContext=()=>null;
  const frames=mockFrames(win),root=win.document.querySelector('main'),rewards=[];
  const obby=mountSkyparkObby3D({root,userId:'runner-3d',playerName:'Runner',onReward:value=>rewards.push(value),win});
  root.querySelector('[data-obby-action="start"]').click();
  assert.equal(obby.game.status,'running');
  frames.tick(0);
  const runner=obby.game.players[obby.game.localId];
  runner.x=.5;runner.y=1;runner.z=-30.5;runner.vy=0;runner.grounded=true;
  frames.tick(50);
  assert.equal(obby.game.status,'won');
  assert.deepEqual(rewards,['arcade']);
  assert.ok(obby.bestMs>0);
  assert.match(root.querySelector('#obbyBest').textContent,/^\d\d:\d\d$/);
  obby.destroy();assert.equal(frames.size,0);win.close();
});
