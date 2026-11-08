// Small deterministic simulation functions, independent of rendering and the DOM.
export const WIDTH=960, HEIGHT=540;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const burst=(g,x,y,color)=>{g.particles??=[];for(let i=0;i<9;i++){const a=i*Math.PI*2/9;g.particles.push({x,y,vx:Math.cos(a)*(60+i*8),vy:Math.sin(a)*(60+i*8),life:.45,color});}};
const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export function newRunner(){return {kind:'skyline',status:'ready',score:0,coinsCollected:0,lives:3,time:0,distance:0,speed:300,y:390,vy:0,ground:390,obstacles:[],coins:[],spawn:1.8,invulnerable:0};}
export function jumpRunner(g){if(g.status==='running'&&g.y>=g.ground-.1&&g.vy===0){g.vy=-750;return true;}return false;}
export function stepRunner(g,dt,random=Math.random){
 if(g.status!=='running')return;g.time+=dt;g.distance+=g.speed*dt;g.score=Math.floor(g.distance/10)+g.coinsCollected*25;g.speed=Math.min(470,300+g.time*2);g.invulnerable=Math.max(0,g.invulnerable-dt);g.vy+=1900*dt;g.y+=g.vy*dt;if(g.y>g.ground){g.y=g.ground;g.vy=0;}
 g.spawn-=dt;if(g.spawn<=0){const h=random()<.5?54:74;g.obstacles.push({x:WIDTH+20,y:455-h,w:h===54?44:54,h});if(random()<.7)g.coins.push({x:WIDTH+78,y:350,r:13});g.spawn=1.35+random()*.65;}
 for(const ob of g.obstacles)ob.x-=g.speed*dt;for(const coin of g.coins)coin.x-=g.speed*dt;g.obstacles=g.obstacles.filter(o=>o.x+o.w>-20);g.coins=g.coins.filter(c=>c.x>-30);
 const player={x:126,y:g.y,w:36,h:65};if(!g.invulnerable&&g.obstacles.some(o=>intersects(player,o))){g.lives--;burst(g,144,g.y+35,'#ffc1a3');g.invulnerable=1.4;if(g.lives<=0)g.status='lost';}
 g.coins=g.coins.filter(c=>{if(intersects(player,{x:c.x-c.r,y:c.y-c.r,w:c.r*2,h:c.r*2})){g.coinsCollected=(g.coinsCollected||0)+1;burst(g,c.x,c.y,'#ffe28e');return false;}return true;});
}
function makeWave(wave){const out=[];for(let r=0;r<3;r++)for(let c=0;c<7;c++)out.push({x:170+c*90,y:72+r*53,baseX:170+c*90,w:42,h:30,hp:wave>=3&&r===0?2:1});return out;}
export function newOrbit(){return {kind:'orbit',status:'ready',score:0,lives:3,wave:1,time:0,x:WIDTH/2,bullets:[],enemyBullets:[],enemies:makeWave(1),shot:0,enemyShot:1.5,invulnerable:0};}
export function stepOrbit(g,dt,input={},random=Math.random){
 if(g.status!=='running')return;g.time+=dt;g.invulnerable=Math.max(0,g.invulnerable-dt);g.x=clamp(g.x+((input.right?1:0)-(input.left?1:0))*420*dt,35,WIDTH-35);if(Number.isFinite(input.pointerX))g.x=clamp(input.pointerX,35,WIDTH-35);
 g.shot-=dt;if(g.shot<=0){g.bullets.push({x:g.x-3,y:460,w:6,h:17});g.shot=.22;}
 for(const b of g.bullets)b.y-=610*dt;for(const b of g.enemyBullets)b.y+=200*dt;
 for(const e of g.enemies){e.x=e.baseX+Math.sin(g.time*.9)*55;e.y+=(5+g.wave*1.3)*dt;}
 g.enemyShot-=dt;if(g.enemyShot<=0&&g.enemies.length){const e=g.enemies[Math.floor(random()*g.enemies.length)];g.enemyBullets.push({x:e.x+e.w/2-4,y:e.y+e.h,w:8,h:15});g.enemyShot=Math.max(.3,1.0-g.wave*.06)+random()*.5;}
 for(const bullet of g.bullets){const hit=g.enemies.find(e=>intersects(bullet,e));if(hit){bullet.y=-100;hit.hp--;if(hit.hp<=0){burst(g,hit.x+hit.w/2,hit.y+hit.h/2,'#ffb09e');g.score+=100;g.enemies.splice(g.enemies.indexOf(hit),1);}}}
 const ship={x:g.x-22,y:466,w:44,h:38};if(!g.invulnerable&&(g.enemyBullets.some(b=>intersects(b,ship))||g.enemies.some(e=>e.y+e.h>=470))){g.lives--;burst(g,g.x,480,'#aaffef');g.invulnerable=1.5;g.enemyBullets=[];if(g.enemies.some(e=>e.y+e.h>=470))for(const e of g.enemies)e.y-=80;if(g.lives<=0)g.status='lost';}
 g.bullets=g.bullets.filter(b=>b.y>-30);g.enemyBullets=g.enemyBullets.filter(b=>b.y<HEIGHT+20);
 if(!g.enemies.length){g.wave++;g.score+=500;g.enemies=makeWave(g.wave);g.enemyBullets=[];g.enemyShot=1.5;}
}
function bricks(level){const result=[];const rows=level+2;for(let r=0;r<rows;r++)for(let c=0;c<9;c++){if(level===2&&r===1&&c===4)continue;result.push({x:76+c*90,y:92+r*35,w:80,h:24,color:(r+c+level)%5});}return result;}
export function newReef(){return {kind:'reef',status:'ready',score:0,lives:3,level:1,time:0,paddle:WIDTH/2,ball:{x:WIDTH/2,y:453,vx:190,vy:-330,r:9},launched:false,bricks:bricks(1)};}
export function launchReef(g){if(g.status==='running'&&!g.launched){g.launched=true;return true;}return false;}
export function stepReef(g,dt,input={}){
 if(g.status!=='running')return;g.time+=dt;g.paddle=clamp(g.paddle+((input.right?1:0)-(input.left?1:0))*560*dt,82,WIDTH-82);if(Number.isFinite(input.pointerX))g.paddle=clamp(input.pointerX,82,WIDTH-82);const b=g.ball;if(!g.launched){b.x=g.paddle;b.y=453;return;}
 b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x-b.r<0){b.x=b.r;b.vx=Math.abs(b.vx);}if(b.x+b.r>WIDTH){b.x=WIDTH-b.r;b.vx=-Math.abs(b.vx);}if(b.y-b.r<0){b.y=b.r;b.vy=Math.abs(b.vy);}
 if(b.vy>0&&b.y+b.r>=465&&b.y+b.r<=485&&Math.abs(b.x-g.paddle)<76+b.r){b.y=465-b.r;const offset=clamp((b.x-g.paddle)/76,-1,1);b.vx=offset*330;b.vy=-Math.sqrt(400*400-b.vx*b.vx);}
 for(let i=g.bricks.length-1;i>=0;i--){const a=g.bricks[i],cx=clamp(b.x,a.x,a.x+a.w),cy=clamp(b.y,a.y,a.y+a.h);if((b.x-cx)**2+(b.y-cy)**2<=b.r*b.r){if(b.x<a.x||b.x>a.x+a.w)b.vx=-b.vx;else b.vy=-b.vy;g.bricks.splice(i,1);burst(g,a.x+a.w/2,a.y+a.h/2,['#f5867f','#f9ca70','#73d7c8','#8fb2f0','#c19ee6'][a.color]);g.score+=25;break;}}
 if(b.y-b.r>HEIGHT){g.lives--;g.launched=false;if(g.lives<=0)g.status='lost';}
 if(!g.bricks.length){g.score+=250;if(g.level>=3){g.status='won';g.launched=false;}else{g.level++;g.bricks=bricks(g.level);g.launched=false;b.vx=190;b.vy=-330;}}
}
export function stepGame(game,dt,input={},random=Math.random){const step=Math.min(.05,Math.max(0,dt));const count=Math.max(1,Math.ceil(step/(1/120)));for(let i=0;i<count;i++){const d=step/count;if(game.kind==='skyline')stepRunner(game,d,random);else if(game.kind==='orbit')stepOrbit(game,d,input,random);else if(game.kind==='reef')stepReef(game,d,input);if(game.particles){for(const p of game.particles){p.x+=p.vx*d;p.y+=p.vy*d;p.vy+=100*d;p.life-=d;}game.particles=game.particles.filter(p=>p.life>0);}}}
