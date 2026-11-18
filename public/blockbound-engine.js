export const PLAYER_RADIUS = .32;
export const PLAYER_HEIGHT = 1.7;
export const WORLD_DAY_SECONDS = 240;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const blockKey = (x, y, z) => `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
const distanceSquared = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
const cellKey = block => blockKey(block.x, block.y, block.z);
const BLOCK_KINDS = new Set(['grass','dirt','stone','crystal','wood','leaves','berry','copper','bedrock','wool']);

function randomFrom(seed) {
  let state = (Number(seed) >>> 0) || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
function hashNoise(x, z, seed = 1) {
  const value = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453123;
  return value - Math.floor(value);
}
function appendBlock(blocks, x, y, z, kind) {
  const id = blockKey(x, y, z);
  let index = blockIndexes.get(blocks);
  if (!index) {
    index = new Set(blocks.map(block => block.id));
    blockIndexes.set(blocks, index);
  }
  if (index.has(id)) return null;
  const block = {id, x, y, z, kind};
  blocks.push(block);
  index.add(id);
  return block;
}
const blockIndexes = new WeakMap();
function replaceBlock(blocks, x, y, z, kind) {
  const id = blockKey(x, y, z);
  const existing = blocks.find(block => block.id === id);
  if (existing) { existing.kind = kind; return existing; }
  return appendBlock(blocks, x, y, z, kind);
}

function addIsland(blocks, {x:centerX, z:centerZ, radiusX, radiusZ, topY = 0, seed = 1}) {
  const minX = Math.floor(centerX - radiusX - 1), maxX = Math.ceil(centerX + radiusX + 1);
  const minZ = Math.floor(centerZ - radiusZ - 1), maxZ = Math.ceil(centerZ + radiusZ + 1);
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      const dx = (x - centerX) / radiusX, dz = (z - centerZ) / radiusZ;
      const distance = Math.sqrt(dx * dx + dz * dz);
      const edge = 1 + (hashNoise(x, z, seed) - .5) * .11;
      if (distance > edge) continue;
      appendBlock(blocks, x, topY, z, hashNoise(x, z, seed + 4) > .94 ? 'dirt' : 'grass');
      if (distance < .985) appendBlock(blocks, x, topY - 1, z, 'dirt');
      if (distance < .79) appendBlock(blocks, x, topY - 2, z, 'stone');
      if (distance < .56) appendBlock(blocks, x, topY - 3, z, 'stone');
      if (distance < .31) appendBlock(blocks, x, topY - 4, z, 'stone');
      if (distance < .12) appendBlock(blocks, x, topY - 5, z, 'bedrock');
    }
  }
}
function plantTree(blocks, x, z, {height = 4, baseY = 0, seed = 1} = {}) {
  for (let y = 1; y <= height; y++) appendBlock(blocks, x, baseY + y, z, 'wood');
  const top = baseY + height;
  for (let y = top - 1; y <= top + 2; y++) {
    const radius = y === top + 2 ? 1 : y === top - 1 ? 2 : 2;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (Math.abs(dx) + Math.abs(dz) > (y === top + 2 ? 1 : 3)) continue;
        if (dx === 0 && dz === 0 && y <= top) continue;
        if (hashNoise(x + dx, z + dz, seed + y) > .96) continue;
        appendBlock(blocks, x + dx, y, z + dz, 'leaves');
      }
    }
  }
}
function buildSurvivalWorld(seed, decorations) {
  const blocks = [];
  const islands = [
    {x:0, z:3, radiusX:14, radiusZ:15, topY:0, seed:seed + 1},
    {x:0, z:-23, radiusX:7, radiusZ:7, topY:1, seed:seed + 2},
    {x:25, z:5, radiusX:7, radiusZ:6, topY:0, seed:seed + 3},
    {x:16, z:-18, radiusX:5, radiusZ:5, topY:2, seed:seed + 4}
  ];
  for (const island of islands) addIsland(blocks, island);

  for (const [x, z, height, baseY, treeSeed] of [
    [-7, 4, 4, 0, 11], [7, 7, 5, 0, 17], [-4, -2, 4, 0, 23], [5, -4, 4, 0, 31],
    [-2, -23, 4, 1, 37], [21, 5, 4, 0, 43], [16, -18, 4, 2, 53]
  ]) plantTree(blocks, x, z, {height,baseY,seed:seed + treeSeed});

  for (const [x, z, y] of [[3,9,0],[-9,8,0],[8,1,0],[-3,-5,0],[2,-22,1],[20,2,0]]) {
    replaceBlock(blocks, x, y, z, 'berry');
  }
  for (const [x, y, z] of [[-11,0,1],[10,0,3],[1,0,-8],[19,0,5],[15,2,-18]]) {
    replaceBlock(blocks, x, y, z, 'copper');
  }
  for (const [x, z] of [[-11,7],[11,10],[13,-17],[25,3]]) {
    appendBlock(blocks, x, 1, z, 'stone');
    appendBlock(blocks, x, 2, z, 'stone');
  }

  const random = randomFrom(seed ^ 0xa53f91e7);
  for (const island of islands) {
    const samples = Math.round(island.radiusX * island.radiusZ * .62);
    for (let index = 0; index < samples; index++) {
      const angle = random() * Math.PI * 2;
      const radius = Math.sqrt(random()) * .83;
      const x = Math.round(island.x + Math.cos(angle) * island.radiusX * radius);
      const z = Math.round(island.z + Math.sin(angle) * island.radiusZ * radius);
      if (Math.hypot(x, z - 9.5) < 2.8) continue;
      if (blocks.some(block => block.x === x && block.y === island.topY + 1 && block.z === z)) continue;
      const roll = random();
      if (roll < .28) {
        decorations.push({kind:'flower', x:x + .5, y:island.topY + 1, z:z + .5, tint:Math.floor(random() * 4)});
      } else if (roll < .66) {
        decorations.push({kind:'grass', x:x + .5, y:island.topY + 1, z:z + .5, tint:Math.floor(random() * 3)});
      } else if (roll < .72) {
        decorations.push({kind:'mushroom', x:x + .5, y:island.topY + 1, z:z + .5, tint:Math.floor(random() * 3)});
      }
    }
  }
  return blocks;
}

function makePlayer({id, name, local = false, spawn = {x:.5,y:1,z:9.5}}) {
  return {
    id:String(id), name:String(name || (local ? 'You' : 'Player')).slice(0,24), local,
    x:spawn.x, y:spawn.y, z:spawn.z, vx:0, vy:0, yaw:0,
    health:100, hunger:100, alive:true, grounded:true,
    blocks:16, wood:0, stone:0, copper:0, crystals:0, berries:2, falls:0
  };
}
export function rebuildWorldIndex(game) {
  game.blockIndex = new Map((game.blocks || []).map(block => [cellKey(block), block]));
  game.blockRevision = (game.blockRevision || 0) + 1;
  return game.blockIndex;
}
function indexFor(game) {
  if (!(game.blockIndex instanceof Map)) return rebuildWorldIndex(game);
  return game.blockIndex;
}

export function createSurvivalGame({playerId = 'local-player', playerName = 'You', seed = 7212026} = {}) {
  const worldSeed = Number(seed) >>> 0 || 7212026;
  const player = makePlayer({id:String(playerId),name:playerName,local:true});
  const decorations = [];
  const game = {
    kind:'blockbound-3d', mode:'survival', status:'ready', seed:worldSeed,
    blocks:buildSurvivalWorld(worldSeed,decorations), players:{[player.id]:player}, localId:player.id,
    spawn:{x:.5,y:1,z:9.5}, decorations,
    crystals:[
      {id:'sky-crystal-east',x:20.5,y:1.7,z:5.5},
      {id:'sky-crystal-north',x:.5,y:2.7,z:-23.5},
      {id:'sky-crystal-highland',x:16.5,y:3.7,z:-18.5}
    ],
    time:0, day:1, blocksPlaced:0, blocksMined:0, blockRevision:0,
    message:'Gather wood and berries, mine stone, craft building blocks, and make the island your home.'
  };
  rebuildWorldIndex(game);
  return game;
}

export function createObby3DGame({playerId = 'local-player', playerName = 'You'} = {}) {
  const player = makePlayer({id:String(playerId),name:playerName,local:true,spawn:{x:.5,y:1,z:4.5}});
  player.blocks = 0;
  player.wood = player.stone = player.copper = player.berries = 0;
  const checkpointSpawn = {...OBBY_3D_STAGES[0].checkpoint};
  const game = {
    kind:'skypark-obby-3d', mode:'obby', status:'ready', blocks:buildObbyBlocks(),
    players:{[player.id]:player}, localId:player.id, spawn:{...checkpointSpawn}, decorations:[], beds:{}, generators:[],
    crystals:OBBY_3D_STARS.map((star,index)=>({...star,id:`obby-star-${index}`})),
    stars:[], checkpoint:0, checkpointSpawn, falls:0, time:0, elapsed:0,
    blocksPlaced:0, blocksMined:0, blockRevision:0,
    message:'Run, jump and land on each platform. Falling sends you back to your latest checkpoint.'
  };
  rebuildWorldIndex(game);
  return game;
}

export function serializeSurvivalGame(game) {
  const player = game?.players?.[game.localId];
  if (!game || game.mode !== 'survival' || !player) return null;
  return {
    version:1, seed:game.seed, time:game.time,
    blocks:game.blocks.map(({id,x,y,z,kind,owner})=>({id,x,y,z,kind,owner})),
    crystals:(game.crystals || []).map(({id,x,y,z})=>({id,x,y,z})),
    player:{x:player.x,y:player.y,z:player.z,yaw:player.yaw,health:player.health,hunger:player.hunger,alive:player.alive,
      blocks:player.blocks,wood:player.wood,stone:player.stone,copper:player.copper,crystals:player.crystals,berries:player.berries,falls:player.falls}
  };
}
export function restoreSurvivalGame(snapshot, {playerId = 'local-player', playerName = 'You'} = {}) {
  if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.blocks) || snapshot.blocks.length < 100 || snapshot.blocks.length > 15000 || !snapshot.player) return null;
  const game = createSurvivalGame({playerId,playerName,seed:snapshot.seed});
  const seen = new Set();
  const blocks = [];
  for (const item of snapshot.blocks) {
    if (!item || ![item.x,item.y,item.z].every(Number.isFinite) || Math.abs(item.x)>80 || Math.abs(item.z)>80 || item.y < -8 || item.y > 24 || !BLOCK_KINDS.has(item.kind)) continue;
    const x=Math.round(item.x), y=Math.round(item.y), z=Math.round(item.z), id=blockKey(x,y,z);
    if (seen.has(id)) continue;
    seen.add(id); blocks.push({id,x,y,z,kind:item.kind,owner:String(item.owner || '')});
  }
  if (blocks.length < 100) return null;
  game.blocks = blocks;
  const crystals = Array.isArray(snapshot.crystals) ? snapshot.crystals.slice(0,80).filter(item=>item && [item.x,item.y,item.z].every(Number.isFinite)).map(item=>({id:String(item.id || `saved-${item.x}-${item.z}`).slice(0,80),x:clamp(item.x,-80,80),y:clamp(item.y,-10,32),z:clamp(item.z,-80,80)})) : game.crystals;
  game.crystals = crystals;
  game.time = clamp(Number(snapshot.time) || 0, 0, 1e9);
  game.day = Math.floor(game.time / WORLD_DAY_SECONDS) + 1;
  const player = game.players[game.localId], saved = snapshot.player;
  for (const field of ['blocks','wood','stone','copper','crystals','berries','falls']) player[field] = clamp(Math.floor(Number(saved[field]) || 0), 0, 9999);
  player.health = clamp(Number(saved.health) || 0, 0, 100);
  player.hunger = clamp(Number(saved.hunger) || 0, 0, 100);
  player.yaw = clamp(Number(saved.yaw) || 0, -Math.PI * 2, Math.PI * 2);
  const safePosition = [saved.x,saved.y,saved.z].every(Number.isFinite) && Math.abs(saved.x)<80 && Math.abs(saved.z)<80 && saved.y>-6 && saved.y<24;
  if (safePosition) { player.x=saved.x; player.y=saved.y; player.z=saved.z; }
  const spawnX=Math.floor(game.spawn.x), spawnZ=Math.floor(game.spawn.z);
  if (!safePosition || !indexHasSupport(blocks,player.x,player.z,player.y)) { player.x=game.spawn.x;player.y=game.spawn.y;player.z=game.spawn.z; }
  player.alive = saved.alive !== false && player.health > 0;
  game.status = player.alive ? 'ready' : 'dead';
  game.message = player.alive ? 'Welcome back. Your island has been saved on this device.' : 'Your world is safe. Respawn when you are ready to try again.';
  rebuildWorldIndex(game);
  return game;
}
function indexHasSupport(blocks,x,z,y) {
  const bx=Math.floor(x), bz=Math.floor(z), by=Math.floor(y - .01);
  return blocks.some(block=>block.x===bx && block.z===bz && block.y<=by && block.y+1>=y-.12);
}

export function blockAt(game, x, y, z) {
  return indexFor(game).get(blockKey(x,y,z)) || null;
}
export function addWorldBlock(game, block, {consume = false, playerId = game?.localId} = {}) {
  if (!game || !block || !['survival','obby'].includes(game.mode) || ![block.x,block.y,block.z].every(Number.isFinite)) return false;
  const x=Math.round(block.x), y=Math.round(block.y), z=Math.round(block.z), key=blockKey(x,y,z), index=indexFor(game);
  if (index.has(key) || y < -7 || y > 24 || Math.abs(x)>80 || Math.abs(z)>80) return false;
  const player=game.players?.[playerId];
  if (consume && (!player || player.blocks<1)) return false;
  const connected=[[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,1,0],[0,-1,0]].some(([dx,dy,dz])=>index.has(blockKey(x+dx,y+dy,z+dz)));
  if (!connected) return false;
  const kind=BLOCK_KINDS.has(block.kind) && block.kind!=='bedrock' ? block.kind : 'wood';
  const added={id:key,x,y,z,kind,owner:String(block.owner || playerId || '')};
  game.blocks.push(added);index.set(key,added);game.blockRevision++;
  if (consume && player) player.blocks--;
  game.blocksPlaced++;
  return added;
}
export function placeBuildBlock(game, playerId = game?.localId) {
  if (!game || game.status!=='running') return false;
  const player=game.players?.[playerId];
  if (!player?.alive || player.blocks<1) return false;
  const forwardX=Math.sin(player.yaw), forwardZ=-Math.cos(player.yaw);
  const x=Math.floor(player.x + forwardX * 1.08), z=Math.floor(player.z + forwardZ * 1.08);
  const y=Math.max(-7,Math.floor(player.y + .001)-1);
  return addWorldBlock(game,{x,y,z,kind:'wood',owner:playerId},{consume:true,playerId});
}
export function removeWorldBlock(game, blockId, playerId = game?.localId) {
  if (!game || game.status!=='running' || !blockId) return false;
  const index=indexFor(game), block=index.get(String(blockId)), player=game.players?.[playerId];
  if (!block || block.kind==='bedrock' || !player?.alive) return false;
  const target={x:block.x+.5,y:block.y+.5,z:block.z+.5};
  if (distanceSquared(player,target)>4.4**2) return false;
  game.blocks=game.blocks.filter(item=>item.id!==block.id);index.delete(block.id);game.blockRevision++;
  if (block.kind==='wood') player.wood=Math.min(999,player.wood+1);
  else if (block.kind==='stone') player.stone=Math.min(999,player.stone+1);
  else if (block.kind==='copper') player.copper=Math.min(999,player.copper+1);
  else if (block.kind==='crystal') player.crystals=Math.min(999,player.crystals+1);
  else if (block.kind==='berry') player.berries=Math.min(999,player.berries+1);
  else if (block.kind==='grass' || block.kind==='dirt' || block.kind==='wool') player.blocks=Math.min(999,player.blocks+1);
  game.blocksMined++;
  const names={wood:'log',leaves:'leaves',stone:'stone',copper:'copper ore',crystal:'crystal',berry:'berries',grass:'grass',dirt:'dirt'};
  game.message=`Mined ${names[block.kind] || block.kind}.`;
  return block;
}
export function craftBlocks(game, playerId = game?.localId) {
  const player=game?.players?.[playerId];
  if (!game || game.status!=='running' || game.mode!=='survival' || !player?.alive || player.wood<3 || player.stone<2) return false;
  player.wood-=3;player.stone-=2;player.blocks=Math.min(999,player.blocks+8);
  game.message='Crafted 8 building blocks from 3 logs and 2 stone.';
  return true;
}
export function eatBerry(game, playerId = game?.localId) {
  const player=game?.players?.[playerId];
  if (!game || game.status!=='running' || game.mode!=='survival' || !player?.alive || player.berries<1 || player.hunger>=99) return false;
  player.berries--;player.hunger=Math.min(100,player.hunger+38);player.health=Math.min(100,player.health+6);
  game.message='A handful of berries restores your hunger and a little health.';
  return true;
}
export function respawnSurvivor(game) {
  const player=game?.players?.[game?.localId];
  if (!game || game.mode!=='survival' || game.status!=='dead' || !player) return false;
  player.x=game.spawn.x;player.y=game.spawn.y;player.z=game.spawn.z;player.vx=player.vy=0;
  player.health=72;player.hunger=Math.max(player.hunger,35);player.alive=true;player.grounded=true;
  game.status='ready';game.message='You are back at camp. Gather food and keep an eye on your health.';
  return true;
}

function nearbySupport(game,x,z,oldY,nextY) {
  const index=indexFor(game);let best=null;
  const minX=Math.floor(x-PLAYER_RADIUS),maxX=Math.floor(x+PLAYER_RADIUS);
  const minZ=Math.floor(z-PLAYER_RADIUS),maxZ=Math.floor(z+PLAYER_RADIUS);
  const low=Math.max(-8,Math.floor(nextY-1.05)),high=Math.min(24,Math.floor(oldY+.1));
  for(let bx=minX;bx<=maxX;bx++)for(let bz=minZ;bz<=maxZ;bz++)for(let by=low;by<=high;by++){
    const block=index.get(blockKey(bx,by,bz)),top=by+1;
    if(block && top<=oldY+.11 && top>=nextY-.1 && (best===null || top>best))best=top;
  }
  return best;
}
function collidesAt(game,player,x,z) {
  const index=indexFor(game),bottom=player.y+.08,top=player.y+PLAYER_HEIGHT-.04;
  const minX=Math.floor(x-PLAYER_RADIUS),maxX=Math.floor(x+PLAYER_RADIUS);
  const minZ=Math.floor(z-PLAYER_RADIUS),maxZ=Math.floor(z+PLAYER_RADIUS);
  for(let bx=minX;bx<=maxX;bx++)for(let bz=minZ;bz<=maxZ;bz++)for(let by=Math.max(-8,Math.floor(bottom));by<Math.ceil(top);by++){
    const block=index.get(blockKey(bx,by,bz));
    if(block && block.y<top && block.y+1>bottom)return true;
  }
  return false;
}
function moveToSpawn(game,player) {
  const spawn=game.mode==='obby'?(game.checkpointSpawn || game.spawn):game.spawn;
  player.x=spawn.x;player.y=spawn.y;player.z=spawn.z;player.vx=player.vy=0;player.grounded=true;
}
function resetPlayer(game,player,{fell=false}={}) {
  if(fell)player.falls++;
  if(game.mode==='survival' && fell){player.health=Math.max(0,player.health-22);player.hunger=Math.max(0,player.hunger-8);}
  else if(game.mode==='obby')player.health=100;
  moveToSpawn(game,player);
  if(game.mode==='survival' && player.health<=0){player.alive=false;game.status='dead';game.message='The fall was too much. Your island is still here when you are ready to respawn.';return;}
  player.alive=true;
  if(fell && game.mode==='survival')game.message=`You fell and lost some health. Careful around the island edges!`;
}
function collectNearbyCrystals(game,player) {
  if(game.mode!=='survival' || player.id!==game.localId)return;
  for(const crystal of [...(game.crystals || [])]){
    if((crystal.x-player.x)**2+(crystal.y-(player.y+1))**2+(crystal.z-player.z)**2<1.7**2){
      game.crystals=game.crystals.filter(item=>item.id!==crystal.id);player.crystals++;
      game.message=`Sky crystal collected. ${player.crystals} in your pack.`;
    }
  }
}
export function jumpPlayer(game,playerId=game?.localId) {
  const player=game?.players?.[playerId];
  if(!game || game.status!=='running' || !player?.alive || !player.grounded)return false;
  player.vy=8.8;player.grounded=false;return true;
}
export function stepBlockbound3D(game,dt,input={}) {
  if(!game || game.status!=='running')return;
  const duration=clamp(Number(dt)||0,0,.05);
  game.time+=duration;
  if(game.mode==='survival')game.day=Math.floor(game.time/WORLD_DAY_SECONDS)+1;
  for(const player of Object.values(game.players || {})){
    if(!player.alive)continue;
    const isLocal=player.id===game.localId;
    const controls=isLocal?input:{};
    const forward=Number(Boolean(controls.forward))-Number(Boolean(controls.back));
    const sideways=Number(Boolean(controls.right))-Number(Boolean(controls.left));
    const magnitude=Math.hypot(forward,sideways)||1;
    const speed=controls.sprint?7.6:5.6;
    const yaw=Number.isFinite(controls.yaw)?controls.yaw:player.yaw;
    player.yaw=yaw;
    const fx=Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=Math.sin(yaw);
    const dx=(fx*forward+rx*sideways)/magnitude*speed*duration;
    const dz=(fz*forward+rz*sideways)/magnitude*speed*duration;
    if(!collidesAt(game,player,player.x+dx,player.z))player.x+=dx;
    if(!collidesAt(game,player,player.x,player.z+dz))player.z+=dz;
    if(game.mode==='survival' && isLocal){
      player.hunger=Math.max(0,player.hunger-duration*.08);
      if(player.hunger<=0)player.health=Math.max(0,player.health-duration*1.2);
      else if(player.hunger>78 && player.health<100)player.health=Math.min(100,player.health+duration*.2);
      collectNearbyCrystals(game,player);
      if(player.health<=0){player.alive=false;game.status='dead';game.message='You ran out of strength. Respawn at camp and gather food to keep going.';break;}
    }
  }
  for(const player of Object.values(game.players || {})){
    if(!player.alive)continue;
    const oldY=player.y;
    player.vy=Math.max(-24,player.vy-23*duration);
    const nextY=player.y+player.vy*duration;
    if(player.vy<=0){
      const supportY=nearbySupport(game,player.x,player.z,oldY,nextY);
      if(supportY!==null){player.y=supportY;player.vy=0;player.grounded=true;}
      else{player.y=nextY;player.grounded=false;}
    }else{player.y=nextY;player.grounded=false;}
    if(player.y < -8)resetPlayer(game,player,{fell:true});
  }
}

const OBBY_3D_STAGES = Object.freeze([
  {id:'start',x1:-3,x2:3,z1:0,z2:6,y:0,checkpoint:{x:.5,y:1,z:4.5}},
  {id:'step-1',x1:-3,x2:0,z1:-5,z2:-3,y:0,checkpoint:{x:-.5,y:1,z:-3.5}},
  {id:'step-2',x1:1,x2:4,z1:-10,z2:-8,y:1,checkpoint:{x:2.5,y:2,z:-8.5}},
  {id:'step-3',x1:-2,x2:1,z1:-15,z2:-13,y:0,checkpoint:{x:-.5,y:1,z:-13.5}},
  {id:'step-4',x1:-4,x2:-1,z1:-20,z2:-18,y:1,checkpoint:{x:-2.5,y:2,z:-18.5}},
  {id:'step-5',x1:0,x2:3,z1:-25,z2:-23,y:0,checkpoint:{x:1.5,y:1,z:-23.5}},
  {id:'finish',x1:-2,x2:2,z1:-32,z2:-29,y:0,checkpoint:{x:.5,y:1,z:-30.5}}
]);
function fillArea(blocks,minX,maxX,minZ,maxZ,y=0,kind='grass') {
  for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++)blocks.push({id:blockKey(x,y,z),x,y,z,kind});
}
function buildObbyBlocks() {
  const blocks=[];
  for(const stage of OBBY_3D_STAGES)fillArea(blocks,stage.x1,stage.x2,stage.z1,stage.z2,stage.y,stage.id==='start'||stage.id==='finish'?'grass':'stone');
  for(const stage of OBBY_3D_STAGES.slice(1,-1)){
    const side=stage.x2;
    for(const z of [stage.z1,stage.z2])blocks.push({id:blockKey(side,stage.y+1,z),x:side,y:stage.y+1,z,kind:'wool'});
  }
  return blocks;
}
export const OBBY_3D_STARS=Object.freeze([
  {x:-.5,y:2.1,z:-3.5},{x:2.5,y:3.1,z:-8.5},{x:-.5,y:2.2,z:-13.5},
  {x:-2.5,y:3.1,z:-18.5},{x:1.5,y:2.2,z:-23.5}
]);
export const OBBY_3D_FINISH_Z=-30;
export function jumpObby3D(game){return jumpPlayer(game,game?.localId);}
export function stepObby3D(game,dt,input={}) {
  if(!game || game.mode!=='obby' || game.status!=='running')return;
  const oldFalls=game.falls;
  game.elapsed+=clamp(Number(dt)||0,0,.05);
  stepBlockbound3D(game,dt,input);
  const player=game.players[game.localId];if(!player)return;
  if(player.falls>oldFalls){game.falls=player.falls;game.message=`Big jump! You fell and respawned at checkpoint ${game.checkpoint+1}.`;}
  for(let index=1;index<OBBY_3D_STAGES.length-1;index++){
    const stage=OBBY_3D_STAGES[index];
    if(index>game.checkpoint && player.z<=stage.checkpoint.z+.7 && Math.abs(player.x-stage.checkpoint.x)<3 && player.grounded){
      game.checkpoint=index;game.checkpointSpawn={...stage.checkpoint};game.message=`Checkpoint ${index+1} reached! Keep going.`;
    }
  }
  for(const star of [...game.crystals]){
    if((star.x-player.x)**2+(star.y-(player.y+1))**2+(star.z-player.z)**2<1.6**2){
      game.crystals=game.crystals.filter(item=>item.id!==star.id);game.stars.push(star.id);
      game.message=`Star collected! ${game.stars.length} of ${OBBY_3D_STARS.length}.`;
    }
  }
  if(player.z<=OBBY_3D_FINISH_Z && player.grounded){game.status='won';game.message=`Course cleared in ${game.elapsed.toFixed(1)} seconds! You collected ${game.stars.length} stars.`;}
}

export function restoreObbyProgress(saved,options={}) {
  if(!saved||!Number.isInteger(saved.checkpoint)||saved.checkpoint<0||saved.checkpoint>=OBBY_3D_STAGES.length||!Number.isFinite(saved.elapsed)||saved.elapsed<0)return null;
  const game=createObby3DGame(options);
  game.checkpoint=saved.checkpoint;game.checkpointSpawn={...OBBY_3D_STAGES[game.checkpoint].checkpoint};
  const player=game.players[game.localId];Object.assign(player,game.checkpointSpawn);
  game.stars=(Array.isArray(saved.stars)?saved.stars:[]).filter((id,index,list)=>OBBY_3D_STARS.some((_,i)=>id===`obby-star-${i}`)&&list.indexOf(id)===index);
  game.crystals=game.crystals.filter(star=>!game.stars.includes(star.id));
  game.elapsed=Math.min(saved.elapsed,1e8);game.falls=Math.max(0,Math.min(1e6,Math.floor(Number(saved.falls)||0)));
  game.status='paused';game.message='Saved checkpoint restored. Resume when ready.';return game;
}
