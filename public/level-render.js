import {TILE,FLOOR,PLAYER} from './level-engine.js?v=20261114-5';

// Original canvas artwork. Visuals do not change the collision geometry.
const palettes={
 dusk:{sky:'#101331',horizon:'#48457a',far:'#242348',near:'#33335a',line:'#65e6d3',block:'#6775b7',spike:'#ff91ae',coin:'#ffe08c'},
 ocean:{sky:'#092b40',horizon:'#247f89',far:'#114357',near:'#1b6471',line:'#98f4d7',block:'#4d9bb3',spike:'#ffa794',coin:'#ffe08c'},
 sunset:{sky:'#321c37',horizon:'#d3766c',far:'#683f59',near:'#91536b',line:'#ffda9b',block:'#be7992',spike:'#ffe1bd',coin:'#ffe08c'}
};
function polygon(ctx,points){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(const [x,y] of points.slice(1))ctx.lineTo(x,y);ctx.closePath();}
export function drawLevel(ctx,run,width=640,height=360,{reducedMotion=false}={}){
 if(!ctx||!run)return;
 const p=palettes[run.level.theme]||palettes.dusk,camera=Math.max(0,run.x-160);
 ctx.clearRect(0,0,width,height);
 const sky=ctx.createLinearGradient(0,0,0,FLOOR);sky.addColorStop(0,p.sky);sky.addColorStop(1,p.horizon);ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
 // Distant stars and towers move more slowly than the foreground.
 const offset=(camera*.12)%140;
 for(let i=-1;i<Math.ceil(width/140)+1;i++){const x=i*140-offset;ctx.fillStyle='#ffffff38';ctx.fillRect(x+34,31+(i%3+3)%3*25,3,3);ctx.fillRect(x+103,73+(i%2+2)%2*31,2,2);}
 ctx.fillStyle=p.far;const farOffset=(camera*.22)%160;
 for(let i=-1;i<Math.ceil(width/160)+1;i++){const x=i*160-farOffset;polygon(ctx,[[x,FLOOR],[x+34,165],[x+73,FLOOR],[x+97,190],[x+160,FLOOR]]);ctx.fill();}
 ctx.fillStyle=p.near;const nearOffset=(camera*.45)%160;
 for(let i=-1;i<Math.ceil(width/160)+1;i++){const x=i*160-nearOffset;ctx.fillRect(x,FLOOR-49,32,49);ctx.fillRect(x+35,FLOOR-76,44,76);ctx.fillRect(x+85,FLOOR-37,45,37);ctx.fillStyle='#ffffff18';ctx.fillRect(x+46,FLOOR-65,5,17);ctx.fillRect(x+60,FLOOR-65,5,17);ctx.fillStyle=p.near;}
 // Grid and rails keep object alignment easy to read while playing.
 ctx.strokeStyle='#ffffff0d';ctx.lineWidth=1;for(let x=-(camera%TILE);x<width;x+=TILE){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,FLOOR);ctx.stroke();}
 const ground=ctx.createLinearGradient(0,FLOOR,0,height);ground.addColorStop(0,p.sky);ground.addColorStop(1,'#080f22');ctx.fillStyle=ground;ctx.fillRect(0,FLOOR,width,height-FLOOR);
 ctx.fillStyle=p.line;ctx.fillRect(0,FLOOR,width,3);ctx.fillStyle='#ffffff35';ctx.fillRect(0,FLOOR+5,width,1);
 ctx.strokeStyle='#ffffff18';for(let x=-(camera%TILE);x<width;x+=TILE){ctx.beginPath();ctx.moveTo(x,FLOOR+8);ctx.lineTo(x-18,height);ctx.stroke();}ctx.beginPath();ctx.moveTo(0,FLOOR+36);ctx.lineTo(width,FLOOR+36);ctx.stroke();
 for(const cell of run.level.cells){
  const x=cell.x*TILE-camera,y=FLOOR-(cell.y+1)*TILE;if(x< -TILE||x>width)continue;
  if(cell.type==='coin'){
   if(run.collected.has(`${cell.x}:${cell.y}`))continue;
   ctx.fillStyle=p.coin;ctx.beginPath();ctx.arc(x+24,y+24,11,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#8e663b';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#fff6cd';ctx.fillRect(x+22,y+16,3,14);continue;
  }
  if(cell.type==='spike'){
   polygon(ctx,[[x+3,y+48],[x+24,y+4],[x+45,y+48]]);ctx.fillStyle=p.spike;ctx.fill();ctx.strokeStyle='#fff4';ctx.lineWidth=2;ctx.stroke();polygon(ctx,[[x+24,y+8],[x+24,y+45],[x+42,y+45]]);ctx.fillStyle='#10152b3d';ctx.fill();continue;
  }
  if(cell.type==='pad'){
   ctx.fillStyle='#1a263a';ctx.fillRect(x+2,y+35,44,13);ctx.fillStyle=p.coin;ctx.fillRect(x+4,y+35,40,5);ctx.fillStyle='#fff7c1';ctx.fillRect(x+11,y+38,26,3);continue;
  }
  ctx.fillStyle='#1a233b';ctx.fillRect(x+1,y+1,46,46);ctx.fillStyle=p.block;ctx.fillRect(x+4,y+4,40,40);ctx.fillStyle='#ffffff32';ctx.fillRect(x+5,y+5,38,5);ctx.fillStyle='#12163245';ctx.fillRect(x+5,y+38,38,5);ctx.strokeStyle='#ffffff80';ctx.lineWidth=1;ctx.strokeRect(x+8,y+8,32,32);ctx.fillStyle='#ffffff24';ctx.fillRect(x+16,y+16,16,16);
 }
 const finish=run.level.length*TILE-TILE-camera;if(finish>-30&&finish<width+30){ctx.fillStyle='#fff8';ctx.fillRect(finish,42,4,FLOOR-42);for(let i=0;i<5;i++){ctx.fillStyle=i%2?'#192139':'#fff';ctx.fillRect(finish+4,48+i*8,28,8);}ctx.font='bold 12px sans-serif';ctx.fillStyle='#fff';ctx.fillText('FINISH',finish-18,30);}
 const px=run.x-camera,py=run.y;
 if(!reducedMotion&&run.status==='running'){for(let i=0;i<4;i++){ctx.globalAlpha=.14-i*.025;ctx.fillStyle=p.line;ctx.fillRect(px-9-i*11,py+10+(i%2)*5,6,6);}ctx.globalAlpha=1;}
 ctx.save();ctx.translate(px+PLAYER/2,py+PLAYER/2);if(!run.grounded&&!reducedMotion)ctx.rotate((run.x/65)% (Math.PI/2));ctx.fillStyle='#0d2235';ctx.fillRect(-16,-14,32,32);ctx.fillStyle=p.line;ctx.fillRect(-15,-17,30,30);ctx.fillStyle='#ffffff80';ctx.fillRect(-12,-14,24,4);ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.strokeRect(-12,-14,24,24);ctx.fillStyle=p.sky;ctx.fillRect(-8,-7,5,5);ctx.fillRect(3,-7,5,5);ctx.fillRect(-6,3,12,3);ctx.restore();
 // Readable progress bar and counters.
 const progress=Math.min(1,run.x/(run.level.length*TILE-TILE));ctx.fillStyle='#091328aa';ctx.fillRect(16,14,width-32,22);ctx.fillStyle='#ffffff38';ctx.fillRect(21,18,width-42,3);ctx.fillStyle=p.line;ctx.fillRect(21,18,(width-42)*progress,3);ctx.font='bold 11px sans-serif';ctx.fillStyle='#fff';ctx.fillText(`${Math.floor(progress*100)}%`,22,32);ctx.textAlign='right';ctx.fillText(`${run.coins} coins`,width-22,32);ctx.textAlign='start';
}
