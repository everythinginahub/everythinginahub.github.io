// Original auto-runner physics shared by the editor playtest and tests.
export const TILE = 48, ROWS = 6, FLOOR = ROWS * TILE, PLAYER = 30, MAX_CELLS = 120;
export const TYPES = ['block','spike','pad','coin'];
export const LENGTHS = [40,64,96];
const speeds = {slow:150,normal:190,fast:235};
export function cleanLevel(raw) {
  if(!raw || typeof raw !== 'object' || !LENGTHS.includes(Number(raw.length)) || !Array.isArray(raw.cells)) return null;
  const length=Number(raw.length), seen=new Set(), cells=[];
  for(const item of raw.cells){
    if(!item || !Number.isInteger(item.x) || !Number.isInteger(item.y) || item.x<3 || item.x>=length-1 || item.y<0 || item.y>=ROWS || !TYPES.includes(item.type)) continue;
    const key=`${item.x}:${item.y}`;if(seen.has(key))continue;seen.add(key);cells.push({x:item.x,y:item.y,type:item.type});if(cells.length>=MAX_CELLS)break;
  }
  return {name:String(raw.name||'Untitled level').slice(0,60),length,speed:Object.hasOwn(speeds,raw.speed)?raw.speed:'normal',theme:['dusk','ocean','sunset'].includes(raw.theme)?raw.theme:'dusk',cells};
}
export function starterLevel(){return {name:'First flight',length:64,speed:'normal',theme:'dusk',cells:[{x:8,y:0,type:'spike'},{x:13,y:0,type:'block'},{x:18,y:0,type:'pad'},{x:20,y:2,type:'coin'},{x:23,y:0,type:'spike'},{x:30,y:0,type:'block'},{x:31,y:0,type:'block'},{x:39,y:0,type:'spike'},{x:46,y:0,type:'pad'},{x:49,y:2,type:'coin'},{x:54,y:0,type:'spike'}]};}
export function createRun(level){const safe=cleanLevel(level);if(!safe)throw new Error('Invalid level');return {level:safe,x:TILE,y:FLOOR-PLAYER,vy:0,grounded:true,status:'ready',coins:0,collected:new Set(),speed:speeds[safe.speed]};}
export function jump(run){if(run.status==='running'&&run.grounded){run.vy=-620;run.grounded=false;return true;}return false;}
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function substep(run,dt){
 const previousBottom=run.y+PLAYER;
 run.x+=run.speed*dt;run.vy+=1900*dt;run.y+=run.vy*dt;run.grounded=false;
 if(run.y+PLAYER>=FLOOR){run.y=FLOOR-PLAYER;run.vy=0;run.grounded=true;}
 const player={x:run.x,y:run.y,w:PLAYER,h:PLAYER};
 for(const tile of run.level.cells){
  const tx=tile.x*TILE, ty=FLOOR-(tile.y+1)*TILE;
  if(tx+TILE<run.x-PLAYER||tx>run.x+PLAYER+TILE)continue;
  if(tile.type==='coin'){
   const key=`${tile.x}:${tile.y}`;if(!run.collected.has(key)&&overlaps(player,{x:tx+11,y:ty+11,w:26,h:26})){run.collected.add(key);run.coins++;}continue;
  }
  if(tile.type==='spike'){
   if(overlaps(player,{x:tx+10,y:ty+13,w:TILE-20,h:TILE-13})){run.status='lost';return;}continue;
  }
  const rect=tile.type==='pad'?{x:tx+2,y:ty+TILE-12,w:TILE-4,h:12}:{x:tx,y:ty,w:TILE,h:TILE};
  if(!overlaps(player,rect))continue;
  if(tile.type==='pad'&&run.grounded&&run.y+PLAYER===FLOOR&&tile.y===0){run.vy=-850;run.grounded=false;continue;}
  if(run.vy>=0&&previousBottom<=rect.y+2){run.y=rect.y-PLAYER;player.y=run.y;run.vy=tile.type==='pad'?-850:0;run.grounded=tile.type==='block';}
  else if(tile.type==='block'){run.status='lost';return;}
 }
 if(run.x>=run.level.length*TILE-TILE)run.status='won';
}
export function stepRun(run,dt){if(run.status!=='running'||!Number.isFinite(dt))return;const bounded=Math.max(0,Math.min(.05,dt));const steps=Math.max(1,Math.ceil(bounded/(1/120)));for(let i=0;i<steps&&run.status==='running';i++)substep(run,bounded/steps);}
