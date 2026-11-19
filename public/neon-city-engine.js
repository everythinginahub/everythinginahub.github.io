// Original city-action simulation. Rendering and input live in separate modules.
export const CITY_LIMIT=94;
export const CITY_BUILDINGS=[];
for(const x of [-72,-24,24,72])for(const z of [-72,-24,24,72])CITY_BUILDINGS.push({x,z,w:28,d:28,h:10+((x*z+6000)%23+23)%23});
export const CITY_STOPS=[{x:0,z:-70},{x:70,z:0},{x:0,z:70},{x:-70,z:0}];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function cityBlocked(x,z,r=.65){return Math.abs(x)>CITY_LIMIT-r||Math.abs(z)>CITY_LIMIT-r||CITY_BUILDINGS.some(b=>Math.abs(x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r);}
function move(body,dx,dz,r){if(!cityBlocked(body.x+dx,body.z,r))body.x+=dx;if(!cityBlocked(body.x,body.z+dz,r))body.z+=dz;}
export function cityLineClear(a,b){const steps=Math.ceil(distance(a,b)/1.5);for(let i=1;i<steps;i++)if(cityBlocked(a.x+(b.x-a.x)*i/steps,a.z+(b.z-a.z)*i/steps,0))return false;return true;}
function drones(wave=0){return [{x:0,z:-30},{x:38,z:0},{x:-35,z:0},{x:0,z:48},{x:48,z:-48},{x:-48,z:48}].map((p,i)=>({...p,id:i,hp:2+Math.min(wave,2),cooldown:1+i*.25}));}
export function newNeonCity(){return {version:1,status:'ready',player:{x:0,z:10,yaw:0,pitch:0,health:100},car:{x:4,z:8,yaw:0,speed:0},driving:false,enemies:drones(),score:0,deliveries:0,carrying:false,ammo:12,reload:0,cooldown:0,time:0,effects:[],notice:'Find the cyan core. Deliver it to the gold beacon. Your car is parked nearby.'};}
export function cityObjective(g){return CITY_STOPS[(g.deliveries+(g.carrying?1:0))%CITY_STOPS.length];}
export function enterCityCar(g){if(g.status!=='running')return false;if(g.driving){const p=g.car;for(const side of [-1,1]){const x=p.x+Math.cos(p.yaw)*3*side,z=p.z-Math.sin(p.yaw)*3*side;if(!cityBlocked(x,z)){Object.assign(g.player,{x,z,yaw:p.yaw});g.driving=false;g.car.speed=0;g.notice='On foot. Aim with the mouse or drag the screen.';return true;}}g.notice='No room to exit here. Drive onto a wider road.';return false;}if(distance(g.player,g.car)>5){g.notice='Move closer to the blue car, then press E / Drive.';return false;}g.driving=true;g.car.speed=0;g.player.yaw=g.car.yaw;g.notice='Driving! W/S to accelerate/reverse. A/D to steer. E to exit.';return true;}
export function reloadCity(g){if(g.status==='running'&&g.ammo<12&&!g.reload){g.reload=1.15;g.notice='Recharging blaster…';}}
export function fireCity(g){if(g.status!=='running'||g.cooldown>0||g.reload>0)return false;if(!g.ammo){reloadCity(g);return false;}g.ammo--;g.cooldown=.18;const p=g.player,fx=-Math.sin(p.yaw),fz=-Math.cos(p.yaw);let hit=null,nearest=60;
 for(const enemy of g.enemies){const dx=enemy.x-p.x,dz=enemy.z-p.z,along=dx*fx+dz*fz,side=Math.abs(dx*fz-dz*fx);if(along>0&&along<nearest&&side<1.35&&Math.abs(p.pitch)<.22&&cityLineClear(p,enemy)){nearest=along;hit=enemy;}}
 if(hit){hit.hp--;g.score+=10;if(hit.hp<=0){g.enemies=g.enemies.filter(e=>e!==hit);g.score+=90;g.notice='Drone disabled. Keep moving!';}}
 g.effects.push({x:p.x,z:p.z,tx:p.x+fx*nearest,tz:p.z+fz*nearest,life:.12,hit:!!hit});if(!g.ammo)reloadCity(g);return true;
}
export function stepNeonCity(g,dt,input={}){if(g.status!=='running')return;dt=clamp(Number(dt)||0,0,.05);g.time+=dt;g.cooldown=Math.max(0,g.cooldown-dt);if(g.reload){g.reload=Math.max(0,g.reload-dt);if(!g.reload)g.ammo=12;}
 const p=g.player;g.effects=g.effects.filter(effect=>(effect.life-=dt)>0);
 if(g.driving){const c=g.car,throttle=(input.forward?1:0)-(input.back?1:0);c.speed=clamp(c.speed+throttle*18*dt,-12,30);c.speed*=Math.pow(throttle?.985:.93,dt*60);c.yaw+=((input.left||input.turnLeft?1:0)-(input.right||input.turnRight?1:0))*dt*1.65*Math.min(1,Math.abs(c.speed)/4)*(c.speed<0?-1:1);const before={x:c.x,z:c.z};move(c,-Math.sin(c.yaw)*c.speed*dt,-Math.cos(c.yaw)*c.speed*dt,1.7);if(distance(before,c)<Math.abs(c.speed*dt)*.4)c.speed*=-.2;Object.assign(p,{x:c.x,z:c.z,yaw:c.yaw,pitch:0});}
 else{p.yaw+=((input.turnLeft?1:0)-(input.turnRight?1:0))*dt*1.9;let f=(input.forward?1:0)-(input.back?1:0),s=(input.right?1:0)-(input.left?1:0),length=Math.hypot(f,s)||1;const speed=(input.sprint?10:6)*dt/length;move(p,(-Math.sin(p.yaw)*f+Math.cos(p.yaw)*s)*speed,(-Math.cos(p.yaw)*f-Math.sin(p.yaw)*s)*speed,.65);}
 if(input.fire)fireCity(g);
 for(const e of g.enemies){e.cooldown=Math.max(0,e.cooldown-dt);const d=distance(e,p);if(d<48&&d>10)move(e,(p.x-e.x)/d*2.8*dt,(p.z-e.z)/d*2.8*dt,.8);if(d<32&&!e.cooldown&&cityLineClear(e,p)){e.cooldown=1.6;g.player.health=Math.max(0,g.player.health-(g.driving?3:7));g.effects.push({x:e.x,z:e.z,tx:p.x,tz:p.z,life:.16,enemy:true});}}
 if(distance(p,cityObjective(g))<4){if(!g.carrying){g.carrying=true;g.notice='Core collected! Follow the gold beacon to deliver it.';}else{g.carrying=false;g.deliveries++;g.score+=500;g.player.health=Math.min(100,p.health+30);g.ammo=12;g.reload=0;g.enemies=drones(g.deliveries);g.notice='Delivery complete! +500 points, repaired armour. A new core is ready.';}}
 if(p.health<=0){g.status='lost';g.car.speed=0;g.notice='Armour depleted. Restart to try a new run.';}
}
export function snapshotNeonCity(g){const {effects,...data}=g;return {...data,status:g.status==='running'?'paused':g.status};}
export function restoreNeonCity(saved){if(!saved||saved.version!==1||!['paused','ready','lost'].includes(saved.status))return null;const fresh=newNeonCity();
 for(const body of [saved.player,saved.car])if(!body||!['x','z','yaw'].every(key=>Number.isFinite(body[key]))||cityBlocked(body.x,body.z,body===saved.car?1.7:.65))return null;
 if(!Number.isFinite(saved.player.health)||saved.player.health<0||saved.player.health>100||!Number.isInteger(saved.deliveries)||saved.deliveries<0||saved.deliveries>100000||!Number.isFinite(saved.score)||saved.score<0||saved.score>1e9||!Number.isFinite(saved.time)||saved.time<0||saved.time>1e9)return null;
 if(!Array.isArray(saved.enemies)||saved.enemies.length>6||saved.enemies.some(e=>!e||!Number.isInteger(e.id)||e.id<0||e.id>5||!Number.isFinite(e.hp)||e.hp<=0||e.hp>4||!Number.isFinite(e.x)||!Number.isFinite(e.z)||cityBlocked(e.x,e.z,.8)))return null;
 Object.assign(fresh,{status:saved.status==='lost'?'lost':'paused',player:{...fresh.player,x:saved.player.x,z:saved.player.z,yaw:saved.player.yaw,pitch:clamp(Number(saved.player.pitch)||0,-.65,.65),health:saved.player.health},car:{x:saved.car.x,z:saved.car.z,yaw:saved.car.yaw,speed:0},driving:saved.driving===true,enemies:saved.enemies.map(e=>({id:e.id,x:e.x,z:e.z,hp:e.hp,cooldown:1})),score:Math.floor(saved.score),deliveries:saved.deliveries,time:saved.time,carrying:saved.carrying===true,ammo:Number.isInteger(saved.ammo)?clamp(saved.ammo,0,12):12,notice:'Device save restored. Resume when ready.'});return fresh;
}
