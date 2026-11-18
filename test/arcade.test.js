import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {newRunner,jumpRunner,slideRunner,stepRunner,newOrbit,activateNova,stepOrbit,newReef,launchReef,stepReef,stepGame} from '../public/arcade-engine.js';
import {arcadeView,mountArcade} from '../public/arcade.js';
import {dailyArcadeChallenge} from '../public/arcade-challenge.js';

test('Skyline Sprint jumps, collects coins, loses lives and ends',()=>{
 const g=newRunner();g.status='running';assert.ok(jumpRunner(g));assert.ok(jumpRunner(g));assert.equal(jumpRunner(g),false);stepRunner(g,.1,()=>0);assert.ok(g.y<g.ground);for(let i=0;i<20;i++)stepRunner(g,.05,()=>0);assert.equal(g.y,g.ground);
 g.obstacles=[{x:126,y:401,w:40,h:54}];g.invulnerable=0;stepRunner(g,.001,()=>0);assert.equal(g.lives,2);stepRunner(g,.001,()=>0);assert.equal(g.lives,2);g.invulnerable=0;g.lives=1;stepRunner(g,.001,()=>0);assert.equal(g.status,'lost');const distance=g.distance;stepRunner(g,1);assert.equal(g.distance,distance);
 const c=newRunner();c.status='running';c.coins=[{x:140,y:420,r:13}];stepRunner(c,.001,()=>0);assert.equal(c.coinsCollected,1);stepRunner(c,.001,()=>0);assert.ok(c.score>=25);
});
test('Orbit Defender fires, scores, advances waves and loses shields',()=>{
 const g=newOrbit();g.status='running';stepOrbit(g,.01);assert.equal(g.bullets.length,1);const e=g.enemies[0];g.bullets=[{x:e.x+10,y:e.y+12,w:6,h:17}];g.shot=1;stepOrbit(g,.001);assert.equal(g.score,100);g.enemies=[];stepOrbit(g,.01);assert.equal(g.wave,2);assert.equal(g.enemies.length,21);assert.equal(g.score,600);
 g.invulnerable=0;g.enemyBullets=[{x:g.x,y:470,w:8,h:15}];stepOrbit(g,.001);assert.equal(g.lives,2);g.invulnerable=0;g.lives=1;g.enemyBullets=[{x:g.x,y:470,w:8,h:15}];stepOrbit(g,.001);assert.equal(g.status,'lost');
});
test('Reef Breaker launches, breaks crystals, advances three levels and can lose',()=>{
 const g=newReef();assert.equal(launchReef(g),false);g.status='running';assert.ok(launchReef(g));assert.equal(launchReef(g),false);const b=g.bricks[0];g.ball={x:b.x+10,y:b.y+b.h+5,vx:0,vy:-100,r:9};stepReef(g,.001);assert.equal(g.score,25);assert.equal(g.bricks.length,26);
 g.bricks=[];stepReef(g,.001);assert.equal(g.level,2);assert.equal(g.launched,false);g.bricks=[];launchReef(g);stepReef(g,.001);assert.equal(g.level,3);g.bricks=[];launchReef(g);stepReef(g,.001);assert.equal(g.status,'won');
 const loss=newReef();loss.status='running';loss.lives=1;loss.launched=true;loss.ball.y=555;stepReef(loss,.01);assert.equal(loss.status,'lost');
});
test('stepGame caps large frame gaps and respects paused status',()=>{const g=newRunner();g.status='paused';stepGame(g,5);assert.equal(g.distance,0);g.status='running';stepGame(g,5);assert.ok(g.distance<20);});
test('game UI starts, pauses, restarts and cleans up animation and keys',()=>{
 const dom=new JSDOM('<main></main>',{url:'https://example.test'}),w=dom.window,root=w.document.querySelector('main');w.HTMLCanvasElement.prototype.getContext=()=>null;let scheduled=0,cancelled=0;w.requestAnimationFrame=()=>++scheduled;w.cancelAnimationFrame=()=>cancelled++;
 const home=arcadeView();for(const slug of ['skyline','orbit','reef','dungeon-quest-3d','voxelcraft-survival','skypark-obby'])assert.match(home,new RegExp(`#arcade/${slug}`));assert.doesNotMatch(home,/Merge 2048|Pocket Snake|Minefield/);
 for(const id of ['skyline','orbit','reef']){root.innerHTML=arcadeView(id);const ctl=mountArcade({root,id,userId:'test',win:w});assert.equal(root.querySelector('#gameOverlay').hidden,false);if(id==='skyline')assert.ok(root.querySelector('[data-action=slide]'));if(id==='orbit'){assert.ok(root.querySelector('[data-action=nova]'));assert.equal(root.querySelector('[data-action=nova]').disabled,true);}root.querySelector('[data-action=start]').click();assert.equal(root.querySelector('#gameOverlay').hidden,true);assert.equal(root.querySelector('[data-action=pause]').disabled,false);root.querySelector('[data-action=pause]').click();assert.match(root.querySelector('#overlayTitle').textContent,/Paused/);assert.ok(cancelled>0);root.querySelector('[data-action=start]').click();root.querySelector('[data-action=restart]').click();assert.match(root.querySelector('#overlayTitle').textContent,/Ready/);ctl.destroy();}
 assert.equal(w.localStorage.getItem('everything-arcade-v2-skyline-test'),'0');dom.window.close();
});

test('new arcade abilities reward play and reset cleanly',()=>{
 const runner=newRunner();runner.status='running';runner.lives=2;runner.coinsCollected=7;runner.coins=[{x:140,y:420,r:13}];stepRunner(runner,.001,()=>0);assert.equal(runner.lives,3);assert.equal(runner.coinsCollected,8);
 assert.ok(jumpRunner(runner));assert.ok(jumpRunner(runner));assert.equal(jumpRunner(runner),false);for(let i=0;i<30;i++)stepRunner(runner,.05,()=>0);assert.equal(runner.jumps,0);
 const orbit=newOrbit();orbit.status='running';orbit.wave=2;stepOrbit(orbit,.01);assert.equal(orbit.bullets.length,2);orbit.combo=3;orbit.comboTimer=.001;stepOrbit(orbit,.01);assert.equal(orbit.combo,0);
 const reef=newReef();reef.status='running';reef.launched=true;reef.pickups=[{x:reef.paddle,y:463}];stepReef(reef,.01);assert.ok(reef.wideTimer>11);reef.ball={x:reef.paddle+90,y:458,vx:0,vy:150,r:9};stepReef(reef,.01);assert.ok(reef.ball.vy<0);
});

test('original game rewards only a finished round, not pause or restart',()=>{
 const dom=new JSDOM('<main></main>',{url:'https://example.test'}),w=dom.window,root=w.document.querySelector('main');w.HTMLCanvasElement.prototype.getContext=()=>null;let next=null,rewards=[];w.requestAnimationFrame=fn=>(next=fn,1);w.cancelAnimationFrame=()=>{next=null;};root.innerHTML=arcadeView('skyline');const ctl=mountArcade({root,id:'skyline',userId:'test',win:w,onReward:kind=>rewards.push(kind)});const q=s=>root.querySelector(s);
 q('[data-action=start]').click();q('[data-action=pause]').click();assert.deepEqual(rewards,[]);q('[data-action=start]').click();q('[data-action=restart]').click();assert.deepEqual(rewards,[]);q('[data-action=start]').click();for(let i=0;i<4000&&next;i++){const frame=next;next=null;frame(i*50);}assert.match(q('#overlayTitle').textContent,/Game over/);assert.deepEqual(rewards,['arcade']);ctl.destroy();assert.deepEqual(rewards,['arcade']);dom.window.close();
});

test('daily arcade objectives finish their short run at the stated target',()=>{
 const runner=newRunner();runner.status='running';runner.daily={targetMeters:1};stepRunner(runner,.05,()=>0);assert.equal(runner.status,'won');
 const orbit=newOrbit();orbit.status='running';orbit.daily={targetWave:2};orbit.enemies=[];orbit.shot=1;stepOrbit(orbit,.01,{},()=>.9);assert.equal(orbit.wave,2);assert.equal(orbit.status,'won');
 const reef=newReef();reef.status='running';reef.daily={targetLevel:2};reef.launched=true;reef.bricks=[];stepReef(reef,.01);assert.equal(reef.level,2);assert.equal(reef.status,'won');
});

test('Orbit Defender adds armored boss waves and a moving three-shot attack',()=>{
 const g=newOrbit();g.status='running';g.wave=2;g.enemies=[];g.shot=2;g.enemyShot=2;stepOrbit(g,.001,{},()=>.9);assert.equal(g.wave,3);const boss=g.enemies.find(enemy=>enemy.boss);assert.ok(boss);assert.equal(boss.hp,boss.maxHp);assert.equal(boss.maxHp,18);
 g.enemies=[boss];g.enemyShot=.001;g.enemyBullets=[];stepOrbit(g,.01,{},()=>0);assert.deepEqual(g.enemyBullets.map(bullet=>bullet.vx),[-105,0,105]);assert.ok(g.enemyBullets.every(bullet=>bullet.speed===250));
 g.enemyBullets=[];g.enemyShot=1;g.bullets=[{x:boss.x+100,y:boss.y+18,w:6,h:17}];g.shot=1;boss.hp=1;const before=g.score;stepOrbit(g,.01,{},()=>.99);assert.ok(g.score>=before+1000);assert.equal(g.enemies.some(enemy=>enemy.boss),false);
});

test('daily challenge screen explains its target and stores a separate local best',()=>{
 const date='2026-11-06',challenge=dailyArcadeChallenge(date),dom=new JSDOM('<main></main>',{url:'https://example.test'}),w=dom.window,root=w.document.querySelector('main');w.HTMLCanvasElement.prototype.getContext=()=>null;w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};
 const home=arcadeView(undefined,undefined,new Date(2026,10,6));assert.match(home,/daily-arcade-card/);assert.match(home,/#arcade\/daily/);
 root.innerHTML=arcadeView('daily',undefined,date);assert.match(root.querySelector('.daily-run-banner').textContent,new RegExp(challenge.goal));const ctl=mountArcade({root,id:'daily',userId:'challenge-user',win:w});assert.equal(root.querySelector('#arcadeBestLabel').textContent,"TODAY'S BEST");assert.equal(root.querySelector('#arcadeProgressLabel').textContent,challenge.gameId==='orbit'?'WAVES':challenge.gameId==='reef'?'LEVELS':'DISTANCE');root.querySelector('[data-action=start]').click();ctl.destroy();assert.equal(w.localStorage.getItem(`everything-arcade-daily-v1-${date}-${challenge.gameId}-challenge-user`),'0');assert.equal(w.localStorage.getItem(`everything-arcade-v2-${challenge.gameId}-challenge-user`),null);dom.window.close();
});

test('Skyline Sprint adds a useful slide move, a one-hit shield and a coin magnet',()=>{
 const standing=newRunner();standing.status='running';standing.spawn=10;standing.obstacles=[{x:140,y:397,w:78,h:26,kind:'beam'}];stepRunner(standing,.001,()=>.9);assert.equal(standing.lives,2);
 const sliding=newRunner();sliding.status='running';sliding.spawn=10;sliding.obstacles=[{x:140,y:397,w:78,h:26,kind:'beam'}];assert.equal(slideRunner(sliding),true);stepRunner(sliding,.001,()=>.9);assert.equal(sliding.lives,3);assert.equal(sliding.sliding,true);
 const powered=newRunner();powered.status='running';powered.spawn=10;powered.powerupSpawn=10;powered.powerups=[{x:140,y:420,r:17,type:'shield'}];stepRunner(powered,.001,()=>.9);assert.equal(powered.shield,true);powered.obstacles=[{x:140,y:401,w:44,h:54,kind:'crate'}];stepRunner(powered,.001,()=>.9);assert.equal(powered.lives,3);assert.equal(powered.shield,false);
 const magnet=newRunner();magnet.status='running';magnet.spawn=10;magnet.powerupSpawn=10;magnet.magnetTimer=5;magnet.coins=[{x:220,y:420,r:13}];stepRunner(magnet,.05,()=>.9);assert.ok(magnet.coins[0].x<220);
});

test('Orbit upgrades drop on a kill streak, shield blocks a hit and Nova clears threats',()=>{
 const g=newOrbit();g.status='running';g.kills=4;g.enemyShot=10;g.shot=1;const target=g.enemies[0];g.bullets=[{x:target.x+4,y:target.y+7,w:6,h:17}];stepOrbit(g,.001,{},()=>0);assert.equal(g.kills,5);assert.equal(g.powerDrops.length,1);assert.equal(g.powerDrops[0].type,'weapon');
 g.powerDrops[0]={x:g.x-12,y:470,w:24,h:24,type:'weapon'};g.shot=0;stepOrbit(g,.01,{},()=>.9);assert.ok(g.weaponTimer>7.9);g.bullets=[];g.shot=0;stepOrbit(g,.01,{},()=>.9);assert.equal(g.bullets.length,3);
 g.shield=false;g.invulnerable=0;g.enemyBullets=[{x:g.x-8,y:470,w:8,h:15}];g.powerDrops=[{x:g.x-12,y:470,w:24,h:24,type:'shield'}];const lives=g.lives;stepOrbit(g,.001,{},()=>.9);assert.equal(g.shield,false);assert.equal(g.lives,lives);
 const nova=newOrbit();nova.status='running';nova.novaCharges=1;nova.enemyBullets=[{x:480,y:300,w:8,h:15}];nova.enemies=[{x:200,y:100,w:42,h:30,hp:1},{x:400,y:60,w:140,h:66,hp:12,maxHp:12,boss:true}];assert.equal(activateNova(nova),true);assert.equal(nova.novaCharges,0);assert.equal(nova.enemyBullets.length,0);assert.equal(nova.enemies.length,1);assert.equal(nova.enemies[0].hp,4);assert.ok(nova.score>=300);assert.equal(activateNova(nova),false);
});

test('Reef Breaker adds armored crystals, chain scoring and three distinct drops',()=>{
 const level=newReef();level.status='running';level.launched=true;level.bricks=[];stepReef(level,.001);assert.equal(level.level,2);assert.ok(level.bricks.some(brick=>brick.hp===2));
 const g=newReef();g.status='running';g.launched=true;g.bricks=[{x:300,y:100,w:80,h:24,color:0,hp:2},{x:700,y:100,w:80,h:24,color:1,hp:1}];g.ball={x:310,y:129,vx:0,vy:-100,r:9};stepReef(g,.001);assert.equal(g.bricks[0].hp,1);assert.equal(g.broken,0);g.ball={x:310,y:129,vx:0,vy:-100,r:9};stepReef(g,.001);assert.equal(g.bricks.length,1);assert.equal(g.bricks[0].x,700);assert.equal(g.broken,1);
 const pickups=newReef();pickups.status='running';pickups.launched=true;pickups.lives=2;pickups.pickups=[{x:pickups.paddle,y:463,type:'life'}];stepReef(pickups,.01);assert.equal(pickups.lives,3);assert.match(pickups.powerNotice,/BONUS HEART/);pickups.pickups=[{x:pickups.paddle,y:463,type:'slow'}];stepReef(pickups,.01);assert.ok(pickups.slowTimer>6.9);assert.match(pickups.powerNotice,/SLOW-MO/);
});

test('all original games restore paused runs after remount and isolate accounts',()=>{
 const dom=new JSDOM('<main></main>',{url:'https://example.test/'}),win=dom.window,root=win.document.querySelector('main');win.HTMLCanvasElement.prototype.getContext=()=>null;win.requestAnimationFrame=()=>1;win.cancelAnimationFrame=()=>{};
 try{
  for(const id of ['skyline','orbit','reef']){
   const mount=userId=>{root.innerHTML=arcadeView(id);return mountArcade({root,id,userId,win});};
   let controller=mount('owner');root.querySelector('[data-action=start]').click();win.dispatchEvent(new win.Event('pagehide'));controller.destroy();
   controller=mount('owner');assert.match(root.querySelector('#overlayTitle').textContent,/Paused/);controller.destroy();
   controller=mount('other');assert.match(root.querySelector('#overlayTitle').textContent,/Ready/);controller.destroy();
   controller=mount('owner');root.querySelector('[data-action=restart]').click();controller.destroy();controller=mount('owner');assert.match(root.querySelector('#overlayTitle').textContent,/Ready/);controller.destroy();
  }
 }finally{win.close();}
});
