import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {newRunner,jumpRunner,stepRunner,newOrbit,stepOrbit,newReef,launchReef,stepReef,stepGame} from '../public/arcade-engine.js';
import {arcadeView,mountArcade} from '../public/arcade.js';

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
 assert.match(arcadeView().toLowerCase(),/skyline sprint/);assert.doesNotMatch(arcadeView(),/Merge 2048|Pocket Snake|Minefield/);
 for(const id of ['skyline','orbit','reef']){root.innerHTML=arcadeView(id);const ctl=mountArcade({root,id,userId:'test',win:w});assert.equal(root.querySelector('#gameOverlay').hidden,false);root.querySelector('[data-action=start]').click();assert.equal(root.querySelector('#gameOverlay').hidden,true);assert.equal(root.querySelector('[data-action=pause]').disabled,false);root.querySelector('[data-action=pause]').click();assert.match(root.querySelector('#overlayTitle').textContent,/Paused/);assert.ok(cancelled>0);root.querySelector('[data-action=start]').click();root.querySelector('[data-action=restart]').click();assert.match(root.querySelector('#overlayTitle').textContent,/Ready/);ctl.destroy();}
 assert.equal(w.localStorage.getItem('everything-arcade-v2-skyline-test'),'0');dom.window.close();
});

test('new arcade abilities reward play and reset cleanly',()=>{
 const runner=newRunner();runner.status='running';runner.lives=2;runner.coinsCollected=7;runner.coins=[{x:140,y:420,r:13}];stepRunner(runner,.001,()=>0);assert.equal(runner.lives,3);assert.equal(runner.coinsCollected,8);
 assert.ok(jumpRunner(runner));assert.ok(jumpRunner(runner));assert.equal(jumpRunner(runner),false);for(let i=0;i<30;i++)stepRunner(runner,.05,()=>0);assert.equal(runner.jumps,0);
 const orbit=newOrbit();orbit.status='running';orbit.wave=2;stepOrbit(orbit,.01);assert.equal(orbit.bullets.length,2);orbit.combo=3;orbit.comboTimer=.001;stepOrbit(orbit,.01);assert.equal(orbit.combo,0);
 const reef=newReef();reef.status='running';reef.launched=true;reef.pickups=[{x:reef.paddle,y:463}];stepReef(reef,.01);assert.ok(reef.wideTimer>11);reef.ball={x:reef.paddle+90,y:458,vx:0,vy:150,r:9};stepReef(reef,.01);assert.ok(reef.ball.vy<0);
});
