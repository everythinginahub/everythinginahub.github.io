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
 if(g.mode==='arena')return false;
 if(g.status!=='running')return false;
 if(g.driving){g.notice='Park and exit the car before switching partners.';return false;}
 g.characters[g.activeCharacter]=g.player;g.activeCharacter=g.activeCharacter==='mina'?'theo':'mina';g.player=g.characters[g.activeCharacter];
 g.notice=`${CITY_CHARACTERS[g.activeCharacter].name} is now in control. Patrol heat and mission earnings are shared.`;return true;
}
export function interactCity(g){
 if(g.mode==='arena')return false;
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
export function restartNeonCity(g){if(g.mode==='arena')return g.teamMatch?newCityTeamArena():newCityArena();const next=newNeonCity();next.bank=g.bank;next.trust=g.trust;next.homeUpgraded=g.homeUpgraded;return next;}
export function cityJournal(g){const chapter=g.deliveries<2?'1 · Prove your route':g.deliveries<4?'2 · Coastal connections':'3 · Partners on the rise';return `${chapter}. ${g.carrying?'Deliver the core to the gold beacon.':'Pick up the next cyan core.'} Earn 250 carried credits per delivery. Deposit at $ before risking another job. Q switches Mina/Theo; F uses services. ${g.homeUpgraded?'Your shared workshop is upgraded.':'Save 200 banked credits for the safe-house workshop.'}`;}

export function cityObjective(g){return CITY_STOPS[(g.deliveries+(g.carrying?1:0))%CITY_STOPS.length];}
export function enterCityCar(g){if(g.mode==='arena')return false;if(g.status!=='running')return false;if(g.driving){const p=g.car;for(const side of [-1,1]){const x=p.x+Math.cos(p.yaw)*3*side,z=p.z-Math.sin(p.yaw)*3*side;if(!cityBlocked(x,z)){Object.assign(g.player,{x,z,yaw:p.yaw});g.driving=false;g.car.speed=0;g.notice='On foot. Aim with the mouse or drag the screen.';return true;}}g.notice='No room to exit here. Drive onto a wider road.';return false;}if(distance(g.player,g.car)>5){g.notice='Move closer to the blue car, then press E / Drive.';return false;}g.driving=true;g.car.speed=0;g.player.yaw=g.car.yaw;g.notice='Driving! W/S to accelerate/reverse. A/D to steer. E to exit.';return true;}
export function reloadCity(g){if(g.status==='running'&&g.ammo<12&&!g.reload){g.reload=1.15;g.notice='Recharging blaster…';}}
export function fireCity(g){if(g.status!=='running'||g.respawnTimer>0||g.cooldown>0||g.reload>0)return false;if(!g.ammo){reloadCity(g);return false;}g.ammo--;g.cooldown=.18;g.heat=Math.min(6,g.heat+.3);g.quiet=0;const p=g.player,fx=-Math.sin(p.yaw),fz=-Math.cos(p.yaw);let hit=null,nearest=60;
 for(const enemy of g.enemies){const dx=enemy.x-p.x,dz=enemy.z-p.z,along=dx*fx+dz*fz,side=Math.abs(dx*fz-dz*fx);if(along>0&&along<nearest&&side<(g.mode==='arena'?.7:1.35)&&(g.mode==='arena'?Math.abs(1.8+Math.tan(p.pitch)*along-1.15)<1.05:Math.abs(p.pitch)<.22)&&cityLineClear(p,enemy)){nearest=along;hit=enemy;}}
 if(g.teamMatch&&hit){for(const ally of g.allies){const dx=ally.x-p.x,dz=ally.z-p.z,along=dx*fx+dz*fz;if(along>0&&along<nearest&&Math.abs(dx*fz-dz*fx)<.7){hit=null;nearest=along;break;}}}
 if(hit){if(g.teamMatch)g.hitMarker=.14;hit.hp--;g.score+=10;if(hit.hp<=0){g.enemies=g.enemies.filter(e=>e!==hit);g.score+=90;if(g.teamMatch){g.blueScore++;g.respawns.push({id:hit.id,time:3});g.hitMarker=.22;g.killFeed='YOU eliminated RED';}g.notice=g.mode==='arena'?'Bot eliminated. Keep moving!':'Drone disabled. Keep moving!';if(g.mode==='arena')g.kills++;}}
 g.effects.push({x:p.x,z:p.z,tx:p.x+fx*nearest,tz:p.z+fz*nearest,life:.12,hit:!!hit});if(!g.ammo)reloadCity(g);return true;
}
export function stepNeonCity(g,dt,input={}){if(g.status!=='running')return;dt=clamp(Number(dt)||0,0,.05);g.time+=dt;g.cooldown=Math.max(0,g.cooldown-dt);if(g.reload){g.reload=Math.max(0,g.reload-dt);if(!g.reload)g.ammo=12;}
 if(g.teamMatch&&g.respawnTimer>0){stepTeamArena(g,dt);return;}
 const p=g.player;g.effects=g.effects.filter(effect=>(effect.life-=dt)>0);
 if(g.driving){const c=g.car,throttle=c.fuel>0?(input.forward?1:0)-(input.back?1:0):0;c.speed=clamp(c.speed+throttle*18*dt,-12,30);c.speed*=Math.pow(throttle?.985:.93,dt*60);c.yaw+=((input.left||input.turnLeft?1:0)-(input.right||input.turnRight?1:0))*dt*1.65*Math.min(1,Math.abs(c.speed)/4)*(c.speed<0?-1:1);const before={x:c.x,z:c.z};move(c,-Math.sin(c.yaw)*c.speed*dt,-Math.cos(c.yaw)*c.speed*dt,1.7);c.fuel=Math.max(0,c.fuel-distance(before,c)*.065*(g.activeCharacter==='theo'?.65:1));if(c.fuel===0&&Math.abs(c.speed)<1)g.notice='Battery empty. Exit and walk to H safe house to recover your car.';if(distance(before,c)<Math.abs(c.speed*dt)*.4)c.speed*=-.2;Object.assign(p,{x:c.x,z:c.z,yaw:c.yaw,pitch:0});}
 else{p.yaw+=((input.turnLeft?1:0)-(input.turnRight?1:0))*dt*1.9;let f=(input.forward?1:0)-(input.back?1:0),s=(input.right?1:0)-(input.left?1:0),length=Math.hypot(f,s)||1;const speed=(input.sprint?(g.activeCharacter==='mina'?11:9):6)*dt/length;move(p,(-Math.sin(p.yaw)*f+Math.cos(p.yaw)*s)*speed,(-Math.cos(p.yaw)*f-Math.sin(p.yaw)*s)*speed,.65);}
 if(input.fire)fireCity(g);
 if(g.mode==='arena'){if(g.teamMatch)stepTeamArena(g,dt);else stepArenaBots(g,dt);return;}
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

// Offline, deterministic state-machine opponents: patrol, pursue, strafe and fire.
const ARENA_SPAWNS=[{x:0,z:-40},{x:48,z:0},{x:-48,z:0},{x:0,z:48},{x:48,z:-48},{x:-48,z:48}];
function arenaWave(wave){return ARENA_SPAWNS.map((p,id)=>({...p,id,hp:Math.min(4,2+Math.floor((wave-1)/3)),cooldown:1.5+id*.2,state:'patrol',yaw:0,routeTimer:0}));}
export function newCityArena(){const g=newNeonCity();Object.assign(g,{mode:'arena',wave:1,kills:0,nextWave:0,enemies:arenaWave(1),notice:'Bot arena: clear all six opponents. WASD move, mouse aim, hold Fire or Space, R reload. Stay behind cover.'});return g;}
function stepArenaBots(g,dt){
 const p=g.player;g.heat=0;g.patrols=[];g.driving=false;
 for(const e of g.enemies){const d=distance(e,p),visible=d<55&&cityLineClear(e,p);e.cooldown=Math.max(0,e.cooldown-dt);e.yaw=Math.atan2(e.x-p.x,e.z-p.z);e.state=visible?(d<23?'attack':'chase'):'patrol';
  let target=p;
  if(!visible&&d>65)target=ARENA_SPAWNS[(e.id+Math.floor(g.time/8))%6];
  if(!visible||d>20){e.routeTimer=Math.max(0,(e.routeTimer||0)-dt);if(!e.routeTimer||!e.waypoint||distance(e,e.waypoint)<1){e.waypoint=cityPatrolWaypoint(e,target);e.routeTimer=.7;}const delta=distance(e,e.waypoint);if(delta>.1){const travel=Math.min(delta,(3+Math.min(g.wave,8)*.2)*dt);move(e,(e.waypoint.x-e.x)/delta*travel,(e.waypoint.z-e.z)/delta*travel,.8);}}
  else if(d>1){const strafe=Math.sin(g.time*1.4+e.id)>0?1:-1;move(e,-(p.z-e.z)/d*strafe*dt*2,(p.x-e.x)/d*strafe*dt*2,.8);}
  if(visible&&!e.cooldown){e.cooldown=Math.max(.8,1.9-g.wave*.08);p.health=Math.max(0,p.health-6);g.effects.push({x:e.x,z:e.z,tx:p.x,tz:p.z,life:.15,enemy:true});}
 }
 if(!g.enemies.length){if(!g.nextWave){g.nextWave=3;g.notice=`Wave ${g.wave} cleared! Next squad in 3 seconds. Armour and ammo replenished.`;p.health=Math.min(100,p.health+35);g.ammo=12;g.reload=0;}g.nextWave=Math.max(0,g.nextWave-dt);if(!g.nextWave){g.wave++;g.enemies=arenaWave(g.wave);g.notice=`Wave ${g.wave}: eliminate the enemy squad. Use buildings as cover.`;}}
 if(p.health<=0){g.status='lost';g.notice=`Squad defeated you. ${g.kills} eliminations · wave ${g.wave}. Start a new arena run to try again.`;}
}
export function restoreCityArena(saved){
 if(saved?.mode!=='arena'||!Number.isInteger(saved.wave)||saved.wave<1||saved.wave>100000||!Number.isInteger(saved.kills)||saved.kills<0||saved.kills>1e9)return null;
 const g=restoreNeonCity(saved);if(!g)return null;Object.assign(g,{mode:'arena',wave:saved.wave,kills:saved.kills,nextWave:0,driving:false,heat:0,patrols:[],notice:'Bot arena restored. Resume when ready.'});if(saved.teamMatch===true){if(!Array.isArray(saved.allies)||saved.allies.length>3||new Set(saved.allies.map(b=>b.id)).size!==saved.allies.length||saved.allies.some(b=>!b||!Number.isInteger(b.id)||b.id<0||b.id>2||!Number.isInteger(b.hp)||b.hp<1||b.hp>3||!Number.isFinite(b.x)||!Number.isFinite(b.z)||cityBlocked(b.x,b.z,.8))||g.enemies.some(b=>b.id>3)||new Set(g.enemies.map(b=>b.id)).size!==g.enemies.length)return null;if(!['blueScore','redScore'].every(k=>Number.isInteger(saved[k])&&saved[k]>=0&&saved[k]<=100)||!Number.isFinite(saved.matchTime)||saved.matchTime<0||saved.matchTime>300)return null;Object.assign(g,{teamMatch:true,blueScore:saved.blueScore,redScore:saved.redScore,targetScore:20,matchTime:saved.matchTime,respawnTimer:g.player.health<=0?3:0,hitMarker:0,damageFlash:0,killFeed:'Match restored',allies:saved.allies.map(b=>({...teamBot(b.id,'blue'),x:b.x,z:b.z,hp:b.hp})),respawns:[...[0,1,2].filter(id=>!saved.allies.some(b=>b.id===id)).map(id=>({id,team:'blue',time:3})),...[0,1,2,3].filter(id=>!g.enemies.some(e=>e.id===id)).map(id=>({id,team:'red',time:3}))]});}return g;
}

// Red vs Blue team deathmatch. All AI and combat run locally.
const RED_SPAWNS=[{x:0,z:-38},{x:48,z:-48},{x:-48,z:-48},{x:96,z:-48},{x:-48,z:-70},{x:48,z:-70}];
const BLUE_SPAWNS=[{x:-5,z:38},{x:-48,z:48},{x:48,z:48},{x:96,z:48}];
function teamBot(id,team){const p=(team==='red'?RED_SPAWNS:BLUE_SPAWNS)[id%(team==='red'?6:4)];return {...p,id,hp:3,cooldown:1.5+id*.2,yaw:team==='red'?Math.PI:0,state:'patrol',routeTimer:0};}
export function newCityTeamArena(){const g=newCityArena();Object.assign(g,{teamMatch:true,blueScore:0,redScore:0,targetScore:20,matchTime:300,respawnTimer:0,hitMarker:0,damageFlash:0,respawns:[],allies:[0,1,2].map(id=>teamBot(id,'blue')),enemies:[0,1,2,3].map(id=>teamBot(id,'red')),killFeed:'BLUE TEAM · You + 3 bots vs 4 red bots',notice:'RED vs BLUE · First to 20. Left-click to shoot; hold for automatic fire. WASD move, Shift sprint, R reload.'});Object.assign(g.player,{x:0,z:38,yaw:0,pitch:0});return g;}
function stepTeamArena(g,dt){
 g.matchTime=Math.max(0,g.matchTime-dt);g.hitMarker=Math.max(0,g.hitMarker-dt);g.damageFlash=Math.max(0,g.damageFlash-dt);if(g.respawnTimer>0)g.effects=g.effects.filter(e=>(e.life-=dt)>0);g.heat=0;g.patrols=[];g.driving=false;
 if(g.respawnTimer>0){g.respawnTimer=Math.max(0,g.respawnTimer-dt);if(!g.respawnTimer){const spawn=BLUE_SPAWNS.slice().sort((a,b)=>Math.min(...g.enemies.map(e=>distance(b,e)),999)-Math.min(...g.enemies.map(e=>distance(a,e)),999))[0];Object.assign(g.player,{...spawn,health:100,yaw:0,pitch:0});g.ammo=12;g.reload=0;g.notice='Back in action. Stay with the blue squad.';}}
 for(const r of g.respawns)r.time-=dt;
 for(const r of g.respawns.filter(r=>r.time<=0)){const list=r.team==='blue'?g.allies:g.enemies;if(!list.some(e=>e.id===r.id))list.push(teamBot(r.id,r.team||'red'));}g.respawns=g.respawns.filter(r=>r.time>0);
 const fighters=[...g.enemies.map(bot=>({bot,team:'red'})),...g.allies.map(bot=>({bot,team:'blue'}))];
 for(const {bot:e,team} of fighters){if(e.hp<=0)continue;const opponents=team==='red'?[...g.allies.filter(b=>b.hp>0),...(g.respawnTimer?[]:[g.player])]:g.enemies.filter(b=>b.hp>0);if(!opponents.length)continue;
  const visible=opponents.filter(p=>distance(e,p)<65&&cityLineClear(e,p));const target=(visible.length?visible:opponents).slice().sort((a,b)=>distance(e,a)-distance(e,b))[0];const d=distance(e,target),canSee=visible.includes(target);e.state=canSee?'attack':'chase';e.yaw=Math.atan2(e.x-target.x,e.z-target.z);e.cooldown=Math.max(0,e.cooldown-dt);
  if(!canSee||d>22){e.routeTimer=Math.max(0,(e.routeTimer||0)-dt);if(!e.routeTimer||!e.waypoint||distance(e,e.waypoint)<1){e.waypoint=cityPatrolWaypoint(e,target);e.routeTimer=.7;}const dist=distance(e,e.waypoint);if(dist>.1){const travel=Math.min(dist,4.5*dt);move(e,(e.waypoint.x-e.x)/dist*travel,(e.waypoint.z-e.z)/dist*travel,.8);}}
  else if(d>2){const side=Math.sin(g.time*1.2+e.id)>0?1:-1;move(e,-(target.z-e.z)/d*side*dt*2,(target.x-e.x)/d*side*dt*2,.8);}
  if(canSee&&!e.cooldown){e.cooldown=.9+(e.id%3)*.15;const player=target===g.player;if(player){target.health=Math.max(0,target.health-9);g.damageFlash=.2;}else target.hp-=1;g.effects.push({x:e.x,z:e.z,tx:target.x,tz:target.z,life:.13,enemy:team==='red'});
   if((player?target.health:target.hp)<=0){if(team==='red')g.redScore++;else g.blueScore++;g.killFeed=`${team.toUpperCase()} eliminated ${team==='red'?'BLUE':'RED'}`;if(player){g.respawnTimer=3;g.notice='Armour depleted. Respawning in 3 seconds…';}else g.respawns.push({id:target.id,team:team==='red'?'blue':'red',time:3});}
  }
 }
 g.enemies=g.enemies.filter(b=>b.hp>0);g.allies=g.allies.filter(b=>b.hp>0);
 if(g.blueScore>=g.targetScore||g.redScore>=g.targetScore||g.matchTime<=0){g.status='lost';g.respawnTimer=0;g.notice=g.blueScore===g.redScore?'Match drawn. Play again for a rematch.':g.blueScore>g.redScore?'BLUE VICTORY! Your squad wins. Play again for a rematch.':'RED VICTORY. Regroup and play again.';}
}
