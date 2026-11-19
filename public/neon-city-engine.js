// Original city-action simulation. Rendering and input live in separate modules.
export const CITY_LIMIT=140;
export const CITY_BOUNDS={minX:-94,maxX:136,minZ:-94,maxZ:94};
export const CITY_SERVICES=[{id:'home',name:'Safe house',x:-48,z:0,color:'#bba2ff'},{id:'bank',name:'Bank terminal',x:48,z:0,color:'#84ffc3'},{id:'fuel',name:'Charging station',x:96,z:0,color:'#ffbf72'}];
export const CITY_CHARACTERS={mina:{name:'Mina',role:'Courier · faster on foot'},theo:{name:'Theo',role:'Mechanic · efficient driving'}};
export const CITY_BUILDINGS=[];
for(const x of [-72,-24,24,72])for(const z of [-72,-24,24,72])CITY_BUILDINGS.push({x,z,w:28,d:28,h:10+((x*z+6000)%23+23)%23});
export const CITY_STOPS=[{x:0,z:-70},{x:70,z:0},{x:0,z:70},{x:-70,z:0},{x:120,z:-65},{x:120,z:65}];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function cityBlocked(x,z,r=.65){return x<CITY_BOUNDS.minX+r||x>CITY_BOUNDS.maxX-r||z<CITY_BOUNDS.minZ+r||z>CITY_BOUNDS.maxZ-r||CITY_BUILDINGS.some(b=>Math.abs(x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r);}
function move(body,dx,dz,r){if(!cityBlocked(body.x+dx,body.z,r))body.x+=dx;if(!cityBlocked(body.x,body.z+dz,r))body.z+=dz;}
export function cityLineClear(a,b){const steps=Math.ceil(distance(a,b)/1.5);for(let i=1;i<steps;i++)if(cityBlocked(a.x+(b.x-a.x)*i/steps,a.z+(b.z-a.z)*i/steps,0))return false;return true;}
// Small road graph keeps patrols from getting stuck on a building corner.
const ROAD_NODES=[];for(const x of [-48,0,48,96,120])for(const z of [-48,0,48])ROAD_NODES.push({x,z});
const ROAD_EDGES=ROAD_NODES.map(a=>ROAD_NODES.map(b=>cityLineClear(a,b)?distance(a,b):Infinity));
export function cityPatrolWaypoint(a,b){
 if(cityLineClear(a,b))return {x:b.x,z:b.z};
 const points=[a,...ROAD_NODES,b],end=points.length-1,cost=points.map(()=>Infinity),previous=[],done=new Set();cost[0]=0;
 for(let step=0;step<points.length;step++){
  let current=-1;for(let i=0;i<points.length;i++)if(!done.has(i)&&(current<0||cost[i]<cost[current]))current=i;
  if(current<0||!Number.isFinite(cost[current]))break;if(current===end)break;done.add(current);
  for(let next=1;next<points.length;next++){if(done.has(next))continue;const length=current>0&&current<end&&next<end?ROAD_EDGES[current-1][next-1]:cityLineClear(points[current],points[next])?distance(points[current],points[next]):Infinity;
   if(cost[current]+length<cost[next]){cost[next]=cost[current]+length;previous[next]=current;}}
 }
 if(!Number.isFinite(cost[end]))return {x:a.x,z:a.z};let next=end;while(previous[next]!==0&&previous[next]!==undefined)next=previous[next];return {x:points[next].x,z:points[next].z};
}
function drones(wave=0){return [{x:0,z:-30},{x:38,z:0},{x:-35,z:0},{x:0,z:48},{x:48,z:-48},{x:-48,z:48}].map((p,i)=>({...p,id:i,hp:2+Math.min(wave,2),cooldown:1+i*.25}));}
export function newNeonCity(){
 const characters={mina:{x:0,z:10,yaw:0,pitch:0,health:100},theo:{x:-48,z:4,yaw:0,pitch:0,health:100}};
 return {version:2,status:'ready',characters,activeCharacter:'mina',player:characters.mina,car:{x:4,z:8,yaw:0,speed:0,fuel:100},driving:false,enemies:drones(),patrols:[],heat:0,quiet:0,cash:0,bank:0,trust:20,homeUpgraded:false,score:0,deliveries:0,carrying:false,ammo:12,reload:0,cooldown:0,time:0,effects:[],notice:'Mina & Theo: build a courier partnership. Collect a cyan core, then reach the gold beacon.'};
}
export function cityDistrict(p){return p.x>106?'Sunline Beach':p.x>86?'Coastal Highway':p.z>40?'Harbour Quarter':p.z< -40?'Uptown':'Neon Centre';}
export function switchCityCharacter(g){
 if(g.status!=='running')return false;
 if(g.driving){g.notice='Park and exit the car before switching partners.';return false;}
 g.characters[g.activeCharacter]=g.player;g.activeCharacter=g.activeCharacter==='mina'?'theo':'mina';g.player=g.characters[g.activeCharacter];
 g.notice=`${CITY_CHARACTERS[g.activeCharacter].name} is now in control. Patrol heat and mission earnings are shared.`;return true;
}
export function interactCity(g){
 if(g.status!=='running')return false;
 const service=CITY_SERVICES.find(s=>distance(s,g.player)<7);
 if(!service){g.notice='Go to a map service: H safe house, $ bank, or F charging station. Press F / Interact nearby.';return false;}
 if(service.id==='bank'){
  if(!g.cash){g.notice='No carried earnings to bank. Complete a delivery first.';return false;}
  g.bank+=g.cash;g.cash=0;g.notice='Earnings deposited. Banked credits survive a failed patrol or a restarted run.';return true;
 }
 if(service.id==='fuel'){
  if(distance(g.car,service)>10){g.notice='Bring the blue car to the charging station before refuelling.';return false;}
  g.car.fuel=100;g.notice='Vehicle charged to 100%. Theo uses less fuel when driving.';return true;
 }
 if(g.heat>0){g.notice='Lose patrol heat before resting at the safe house. Hide out of sight or head to the beach.';return false;}
 if(!g.homeUpgraded&&g.bank>=200){g.bank-=200;g.homeUpgraded=true;g.trust=Math.min(100,g.trust+10);g.notice='Workshop upgraded for 200 banked credits. Partnership +10. Armour repaired and car recovered.';}
 else g.notice=g.homeUpgraded?'Safe house: workshop ready, partners rested and car recovered.':'Safe house: partners rested, armour repaired and car recovered. Bank 200 credits to upgrade the workshop.';
 for(const body of Object.values(g.characters))body.health=100;g.player.health=100;
 Object.assign(g.car,{x:-44,z:4,yaw:0,speed:0,fuel:100});g.driving=false;g.ammo=12;g.reload=0;return true;
}
export function restartNeonCity(g){const next=newNeonCity();next.bank=g.bank;next.trust=g.trust;next.homeUpgraded=g.homeUpgraded;return next;}
export function cityJournal(g){const chapter=g.deliveries<2?'1 · Prove your route':g.deliveries<4?'2 · Coastal connections':'3 · Partners on the rise';return `${chapter}. ${g.carrying?'Deliver the core to the gold beacon.':'Pick up the next cyan core.'} Earn 250 carried credits per delivery. Deposit at $ before risking another job. Q switches Mina/Theo; F uses services. ${g.homeUpgraded?'Your shared workshop is upgraded.':'Save 200 banked credits for the safe-house workshop.'}`;}

export function cityObjective(g){return CITY_STOPS[(g.deliveries+(g.carrying?1:0))%CITY_STOPS.length];}
export function enterCityCar(g){if(g.status!=='running')return false;if(g.driving){const p=g.car;for(const side of [-1,1]){const x=p.x+Math.cos(p.yaw)*3*side,z=p.z-Math.sin(p.yaw)*3*side;if(!cityBlocked(x,z)){Object.assign(g.player,{x,z,yaw:p.yaw});g.driving=false;g.car.speed=0;g.notice='On foot. Aim with the mouse or drag the screen.';return true;}}g.notice='No room to exit here. Drive onto a wider road.';return false;}if(distance(g.player,g.car)>5){g.notice='Move closer to the blue car, then press E / Drive.';return false;}g.driving=true;g.car.speed=0;g.player.yaw=g.car.yaw;g.notice='Driving! W/S to accelerate/reverse. A/D to steer. E to exit.';return true;}
export function reloadCity(g){if(g.status==='running'&&g.ammo<12&&!g.reload){g.reload=1.15;g.notice='Recharging blaster…';}}
export function fireCity(g){if(g.status!=='running'||g.cooldown>0||g.reload>0)return false;if(!g.ammo){reloadCity(g);return false;}g.ammo--;g.cooldown=.18;g.heat=Math.min(6,g.heat+.3);g.quiet=0;const p=g.player,fx=-Math.sin(p.yaw),fz=-Math.cos(p.yaw);let hit=null,nearest=60;
 for(const enemy of g.enemies){const dx=enemy.x-p.x,dz=enemy.z-p.z,along=dx*fx+dz*fz,side=Math.abs(dx*fz-dz*fx);if(along>0&&along<nearest&&side<1.35&&Math.abs(p.pitch)<.22&&cityLineClear(p,enemy)){nearest=along;hit=enemy;}}
 if(hit){hit.hp--;g.score+=10;if(hit.hp<=0){g.enemies=g.enemies.filter(e=>e!==hit);g.score+=90;g.notice='Drone disabled. Keep moving!';}}
 g.effects.push({x:p.x,z:p.z,tx:p.x+fx*nearest,tz:p.z+fz*nearest,life:.12,hit:!!hit});if(!g.ammo)reloadCity(g);return true;
}
export function stepNeonCity(g,dt,input={}){if(g.status!=='running')return;dt=clamp(Number(dt)||0,0,.05);g.time+=dt;g.cooldown=Math.max(0,g.cooldown-dt);if(g.reload){g.reload=Math.max(0,g.reload-dt);if(!g.reload)g.ammo=12;}
 const p=g.player;g.effects=g.effects.filter(effect=>(effect.life-=dt)>0);
 if(g.driving){const c=g.car,throttle=c.fuel>0?(input.forward?1:0)-(input.back?1:0):0;c.speed=clamp(c.speed+throttle*18*dt,-12,30);c.speed*=Math.pow(throttle?.985:.93,dt*60);c.yaw+=((input.left||input.turnLeft?1:0)-(input.right||input.turnRight?1:0))*dt*1.65*Math.min(1,Math.abs(c.speed)/4)*(c.speed<0?-1:1);const before={x:c.x,z:c.z};move(c,-Math.sin(c.yaw)*c.speed*dt,-Math.cos(c.yaw)*c.speed*dt,1.7);c.fuel=Math.max(0,c.fuel-distance(before,c)*.065*(g.activeCharacter==='theo'?.65:1));if(c.fuel===0&&Math.abs(c.speed)<1)g.notice='Battery empty. Exit and walk to H safe house to recover your car.';if(distance(before,c)<Math.abs(c.speed*dt)*.4)c.speed*=-.2;Object.assign(p,{x:c.x,z:c.z,yaw:c.yaw,pitch:0});}
 else{p.yaw+=((input.turnLeft?1:0)-(input.turnRight?1:0))*dt*1.9;let f=(input.forward?1:0)-(input.back?1:0),s=(input.right?1:0)-(input.left?1:0),length=Math.hypot(f,s)||1;const speed=(input.sprint?(g.activeCharacter==='mina'?11:9):6)*dt/length;move(p,(-Math.sin(p.yaw)*f+Math.cos(p.yaw)*s)*speed,(-Math.cos(p.yaw)*f-Math.sin(p.yaw)*s)*speed,.65);}
 if(input.fire)fireCity(g);
 let seen=false;const sheltered=g.heat===0&&distance(p,CITY_SERVICES[0])<7;
 for(const e of g.enemies){if(distance(e,p)<32&&cityLineClear(e,p))seen=true;e.cooldown=Math.max(0,e.cooldown-dt);const d=distance(e,p);if(d<48&&d>10)move(e,(p.x-e.x)/d*2.8*dt,(p.z-e.z)/d*2.8*dt,.8);if(!sheltered&&d<32&&!e.cooldown&&cityLineClear(e,p)){e.cooldown=1.6;g.player.health=Math.max(0,g.player.health-(g.driving?3:7));g.effects.push({x:e.x,z:e.z,tx:p.x,tz:p.z,life:.16,enemy:true});}}
 if(distance(p,cityObjective(g))<4){if(!g.carrying){g.carrying=true;g.notice='Core collected! Follow the gold beacon to deliver it.';}else{g.carrying=false;g.deliveries++;g.score+=500;g.cash+=250;g.trust=Math.min(100,g.trust+5);g.heat=Math.min(6,g.heat+.7);g.quiet=0;g.player.health=Math.min(100,p.health+30);g.ammo=12;g.reload=0;g.enemies=drones(g.deliveries);g.notice='Job complete! +500 points, +250 carried credits, partnership +5. Bank your earnings at $. Patrol heat increased.';}}
 if(g.heat>=2&&!g.patrols.length)g.patrols=[{id:0,x:96,z:-48,cooldown:1},{id:1,x:-48,z:-48,cooldown:1}];
 for(const patrol of g.patrols){const d=distance(patrol,p);if(d<36&&cityLineClear(patrol,p))seen=true;if(d>5&&g.heat>0){patrol.routeTimer=Math.max(0,(patrol.routeTimer||0)-dt);if(!patrol.routeTimer||!patrol.waypoint||distance(patrol,patrol.waypoint)<1){patrol.waypoint=cityPatrolWaypoint(patrol,p);patrol.routeTimer=.8;}const target=patrol.waypoint,remaining=distance(patrol,target);if(remaining>0){const travel=Math.min(remaining,(5+g.heat)*dt);move(patrol,(target.x-patrol.x)/remaining*travel,(target.z-patrol.z)/remaining*travel,1.2);}}patrol.cooldown=Math.max(0,patrol.cooldown-dt);if(d<9&&!patrol.cooldown&&g.heat>0&&cityLineClear(patrol,p)){patrol.cooldown=1.5;p.health=Math.max(0,p.health-5);}}
 g.quiet=seen?0:g.quiet+dt;if(g.quiet>5)g.heat=Math.max(0,g.heat-dt*.14);if(g.heat===0)g.patrols=[];
 if(p.health<=0){g.cash=0;g.heat=0;g.patrols=[];g.status='lost';g.car.speed=0;g.notice='Armour depleted. Carried credits lost; banked credits and partnership progress are safe.';}
}
export function snapshotNeonCity(g){const {effects,...data}=g;return {...data,characters:{...g.characters,[g.activeCharacter]:{...g.player}},status:g.status==='running'?'paused':g.status};}
export function restoreNeonCity(saved){if(!saved||![1,2].includes(saved.version)||!['paused','ready','lost'].includes(saved.status))return null;const fresh=newNeonCity();
 for(const body of [saved.player,saved.car])if(!body||!['x','z','yaw'].every(key=>Number.isFinite(body[key]))||cityBlocked(body.x,body.z,body===saved.car?1.7:.65))return null;
 if(!Number.isFinite(saved.player.health)||saved.player.health<0||saved.player.health>100||!Number.isInteger(saved.deliveries)||saved.deliveries<0||saved.deliveries>100000||!Number.isFinite(saved.score)||saved.score<0||saved.score>1e9||!Number.isFinite(saved.time)||saved.time<0||saved.time>1e9)return null;
 if(!Array.isArray(saved.enemies)||saved.enemies.length>6||saved.enemies.some(e=>!e||!Number.isInteger(e.id)||e.id<0||e.id>5||!Number.isFinite(e.hp)||e.hp<=0||e.hp>4||!Number.isFinite(e.x)||!Number.isFinite(e.z)||cityBlocked(e.x,e.z,.8)))return null;
 Object.assign(fresh,{status:saved.status==='lost'?'lost':'paused',player:{...fresh.player,x:saved.player.x,z:saved.player.z,yaw:saved.player.yaw,pitch:clamp(Number(saved.player.pitch)||0,-.65,.65),health:saved.player.health},car:{x:saved.car.x,z:saved.car.z,yaw:saved.car.yaw,speed:0},driving:saved.driving===true,enemies:saved.enemies.map(e=>({id:e.id,x:e.x,z:e.z,hp:e.hp,cooldown:1})),score:Math.floor(saved.score),deliveries:saved.deliveries,time:saved.time,carrying:saved.carrying===true,ammo:Number.isInteger(saved.ammo)?clamp(saved.ammo,0,12):12,notice:'Device save restored. Resume when ready.'});
 if(saved.version===2){
  const bounded=(v,max)=>Number.isFinite(v)&&v>=0&&v<=max;
  if(!Object.hasOwn(CITY_CHARACTERS,saved.activeCharacter)||!bounded(saved.heat,6)||!bounded(saved.cash,1e9)||!bounded(saved.bank,1e9)||!bounded(saved.trust,100)||!bounded(saved.car.fuel,100))return null;
  const characters={};for(const name of Object.keys(CITY_CHARACTERS)){const c=saved.characters?.[name];if(!c||!['x','z','yaw','pitch','health'].every(k=>Number.isFinite(c[k]))||cityBlocked(c.x,c.z)||!bounded(c.health,100)||Math.abs(c.pitch)>.65)return null;characters[name]={x:c.x,z:c.z,yaw:c.yaw,pitch:c.pitch,health:c.health};}
  Object.assign(fresh,{characters,activeCharacter:saved.activeCharacter,heat:saved.heat,cash:Math.floor(saved.cash),bank:Math.floor(saved.bank),trust:saved.trust,homeUpgraded:saved.homeUpgraded===true});fresh.characters[fresh.activeCharacter]=fresh.player;fresh.car.fuel=saved.car.fuel;
 }else{fresh.characters.mina=fresh.player;fresh.car.fuel=100;}
 fresh.version=2;return fresh;
}
