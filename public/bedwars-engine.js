export const BEDWARS_MAX_PLAYERS = 8;
export const PLAYER_RADIUS = .32;
export const PLAYER_HEIGHT = 1.7;
export const TEAM_INFO = Object.freeze({
  red: Object.freeze({ name: 'Ember', colour: '#ff6573', spawn: { x: .5, y: 1, z: -15.5 }, bed: { x: .5, y: 1, z: -18.5 } }),
  blue: Object.freeze({ name: 'Tide', colour: '#69a8ff', spawn: { x: .5, y: 1, z: 15.5 }, bed: { x: .5, y: 1, z: 18.5 } })
});

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const blockKey = (x, y, z) => `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
const distanceSquared = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
const cellKey = block => blockKey(block.x, block.y, block.z);

function fillArea(blocks, minX, maxX, minZ, maxZ, y = 0, kind = 'grass') {
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      blocks.push({ id: blockKey(x, y, z), x, y, z, kind });
    }
  }
}
function buildBedwarsBlocks() {
  const blocks = [];
  fillArea(blocks, -4, 4, -4, 4, 0, 'stone');
  fillArea(blocks, -4, 4, -22, -12, 0, 'grass');
  fillArea(blocks, -4, 4, 12, 22, 0, 'grass');
  // Wool pads around each bed give teams a little cover to start with.
  for (let x = -1; x <= 1; x++) {
    for (const z of [-19, -18, -17, 17, 18, 19]) {
      if (Math.abs(z) !== 18 || x !== 0) blocks.push({ id: blockKey(x, 1, z), x, y: 1, z, kind: 'wool' });
    }
  }
  blocks.push({ id: blockKey(0, 1, -18), x: 0, y: 1, z: -18, kind: 'wool' });
  blocks.push({ id: blockKey(0, 1, 18), x: 0, y: 1, z: 18, kind: 'wool' });
  return blocks;
}
function buildSurvivalBlocks() {
  const blocks = [];
  fillArea(blocks, -5, 5, -5, 6, 0, 'grass');
  fillArea(blocks, -4, 2, -13, -10, 0, 'dirt');
  fillArea(blocks, 5, 10, -19, -14, 1, 'stone');
  fillArea(blocks, -3, 3, -28, -24, 0, 'grass');
  fillArea(blocks, -9, -6, -34, -31, 1, 'stone');
  const ores = [
    [-3, 0, 3], [3, 0, 2], [-2, 0, -3], [0, 0, -12],
    [7, 1, -16], [0, 0, -26], [-8, 1, -33]
  ];
  for (const [x, y, z] of ores) {
    const index = blocks.findIndex(block => block.x === x && block.y === y && block.z === z);
    if (index >= 0) blocks[index] = { ...blocks[index], kind: 'crystal' };
  }
  return blocks;
}

function makePlayer({ id, name, team, local = false, spawn, seat = 0 }) {
  const info = TEAM_INFO[team] || TEAM_INFO.red;
  const point = spawn || info.spawn;
  const offset = ((seat % 3) - 1) * .8;
  return {
    id: String(id), name: String(name || (local ? 'You' : 'Player')).slice(0, 24), team,
    local, x: point.x + offset, y: point.y, z: point.z, vx: 0, vy: 0,
    yaw: team === 'red' ? Math.PI : 0, health: 100, alive: true, grounded: true,
    blocks: 24, iron: 0, crystals: 0, kills: 0, respawnAt: null, hitAt: 0, falls: 0
  };
}
function buildBlockIndex(game) {
  game.blockIndex = new Map((game.blocks || []).map(block => [cellKey(block), block]));
  return game.blockIndex;
}
function indexFor(game) {
  if (!(game.blockIndex instanceof Map)) return buildBlockIndex(game);
  return game.blockIndex;
}

export function createBedWarsGame({ players = [], localId = 'local-player', seed = 1 } = {}) {
  const unique = new Map();
  for (const player of players) {
    const id = String(player?.id || '').slice(0, 80);
    if (id && !unique.has(id)) unique.set(id, { id, name: String(player.name || 'Player').slice(0, 24), joinedAt: Number(player.joinedAt) || 0 });
  }
  if (!unique.has(String(localId))) unique.set(String(localId), { id: String(localId), name: 'You', joinedAt: Date.now() });
  const roster = [...unique.values()].slice(0, BEDWARS_MAX_PLAYERS).sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
  const teamSeats = { red: 0, blue: 0 };
  const gamePlayers = {};
  roster.forEach((entry, index) => {
    const team = index % 2 === 0 ? 'red' : 'blue';
    const seat = teamSeats[team]++;
    gamePlayers[entry.id] = makePlayer({ ...entry, team, local: entry.id === String(localId), seat });
  });
  const beds = Object.fromEntries(Object.entries(TEAM_INFO).map(([team, info]) => [team, { team, x: info.bed.x, y: info.bed.y, z: info.bed.z, alive: true }]));
  const game = {
    kind: 'blockbound-3d', mode: 'bedwars', status: 'lobby', seed: Number(seed) || 1,
    blocks: buildBedwarsBlocks(), players: gamePlayers, localId: String(localId), beds,
    generators: [{ id: 'centre', x: .5, z: .5, kind: 'emerald' }, { id: 'red', x: .5, z: -14.5, kind: 'iron' }, { id: 'blue', x: .5, z: 14.5, kind: 'iron' }],
    crystals: [], time: 0, kills: 0, blocksPlaced: 0, blocksMined: 0, winner: '',
    message: 'Create a room, invite friends with the code, then start the match.'
  };
  buildBlockIndex(game);
  return game;
}

export function createSurvivalGame({ playerId = 'local-player', playerName = 'You', seed = 7212026 } = {}) {
  const player = makePlayer({ id: String(playerId), name: playerName, local: true, team: 'red', spawn: { x: .5, y: 1, z: 2.5 } });
  player.blocks = 32;
  return {
    kind: 'blockbound-3d', mode: 'survival', status: 'ready', seed: Number(seed) || 7212026,
    blocks: buildSurvivalBlocks(), players: { [player.id]: player }, localId: player.id,
    beds: {}, generators: [], crystals: [{ id: 'sky-crystal', x: 0, y: 1.6, z: -26.5 }],
    time: 0, kills: 0, blocksPlaced: 0, blocksMined: 0, winner: '',
    message: 'Explore the floating islands, mine crystals, and place blocks to bridge the gaps.'
  };
}

export function startMatch(game) {
  if (!game || game.mode !== 'bedwars' || Object.keys(game.players).length < 2) return false;
  game.status = 'running';
  game.time = 0;
  game.message = 'Protect your bed, collect iron, build a bridge, and break the other team’s bed.';
  return true;
}

export function blockAt(game, x, y, z) {
  return indexFor(game).get(blockKey(x, y, z)) || null;
}
export function addWorldBlock(game, block, { consume = false, playerId = game.localId } = {}) {
  if (!game || !block || ![block.x, block.y, block.z].every(Number.isFinite)) return false;
  const x = Math.round(block.x), y = Math.round(block.y), z = Math.round(block.z);
  const key = blockKey(x, y, z), index = indexFor(game);
  if (index.has(key) || y < 0 || y > 24 || Math.abs(x) > 80 || Math.abs(z) > 80) return false;
  const player = game.players[playerId];
  if (consume && (!player || player.blocks < 1)) return false;
  const connected = [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,1,0],[0,-1,0]].some(([dx,dy,dz]) => index.has(blockKey(x + dx, y + dy, z + dz)));
  if (!connected) return false;
  const added = { id: key, x, y, z, kind: ['wool','wood','stone','grass','dirt'].includes(block.kind) ? block.kind : 'wool', owner: String(block.owner || playerId || '') };
  game.blocks.push(added);
  index.set(key, added);
  if (consume && player) player.blocks--;
  game.blocksPlaced++;
  return added;
}

export function placeBridgeBlock(game, playerId = game.localId) {
  if (!game || game.status !== 'running') return false;
  const player = game.players[playerId];
  if (!player?.alive || player.blocks < 1) return false;
  const forwardX = Math.sin(player.yaw), forwardZ = -Math.cos(player.yaw);
  const x = Math.floor(player.x + forwardX * 1.45);
  const z = Math.floor(player.z + forwardZ * 1.45);
  const y = Math.max(0, Math.floor(player.y + .001) - 1);
  return addWorldBlock(game, { x, y, z, kind: game.mode === 'bedwars' ? 'wool' : 'wood', owner: playerId }, { consume: true, playerId });
}

export function removeWorldBlock(game, blockId, playerId = game.localId) {
  if (!game || game.status !== 'running' || !blockId) return false;
  const index = indexFor(game), block = index.get(String(blockId));
  const player = game.players[playerId];
  if (!block || !player?.alive) return false;
  const target = { x: block.x + .5, y: block.y + .5, z: block.z + .5 };
  if (distanceSquared(player, target) > 3.4 ** 2 || block.y === 0 && game.blocks.filter(item => item.y === 0).length < 30) return false;
  game.blocks = game.blocks.filter(item => item.id !== block.id);
  index.delete(block.id);
  if (block.kind === 'crystal') {
    player.crystals = Math.min(999, (player.crystals || 0) + 1);
    game.message = `Crystal collected. ${player.crystals} in your pack.`;
  } else player.blocks = Math.min(999, player.blocks + 1);
  game.blocksMined++;
  return block;
}

function nearbySupport(game, x, z, oldY, nextY) {
  const index = indexFor(game);
  let best = null;
  const minX = Math.floor(x - PLAYER_RADIUS), maxX = Math.floor(x + PLAYER_RADIUS);
  const minZ = Math.floor(z - PLAYER_RADIUS), maxZ = Math.floor(z + PLAYER_RADIUS);
  const low = Math.max(-1, Math.floor(nextY - 1.05));
  const high = Math.min(24, Math.floor(oldY + .1));
  for (let bx = minX; bx <= maxX; bx++) {
    for (let bz = minZ; bz <= maxZ; bz++) {
      for (let by = low; by <= high; by++) {
        const block = index.get(blockKey(bx, by, bz));
        const top = by + 1;
        if (block && top <= oldY + .11 && top >= nextY - .1 && (best === null || top > best)) best = top;
      }
    }
  }
  return best;
}
function collidesAt(game, player, x, z) {
  const index = indexFor(game), bottom = player.y + .08, top = player.y + PLAYER_HEIGHT - .04;
  const minX = Math.floor(x - PLAYER_RADIUS), maxX = Math.floor(x + PLAYER_RADIUS);
  const minZ = Math.floor(z - PLAYER_RADIUS), maxZ = Math.floor(z + PLAYER_RADIUS);
  for (let bx = minX; bx <= maxX; bx++) {
    for (let bz = minZ; bz <= maxZ; bz++) {
      for (let by = Math.max(0, Math.floor(bottom)); by < Math.ceil(top); by++) {
        const block = index.get(blockKey(bx, by, bz));
        if (block && block.y < top && block.y + 1 > bottom) return true;
      }
    }
  }
  return false;
}
function resetPlayer(game, player, { fell = false } = {}) {
  if (fell) player.falls++;
  if (game.mode === 'bedwars' && !game.beds[player.team]?.alive) {
    player.alive = false;
    player.health = 0;
    player.respawnAt = null;
    return;
  }
  const spawn = game.mode === 'bedwars' ? TEAM_INFO[player.team].spawn : game.mode === 'obby' ? (game.checkpointSpawn || { x: .5, y: 1, z: 4.5 }) : { x: .5, y: 1, z: 2.5 };
  player.x = spawn.x;
  player.y = spawn.y;
  player.z = spawn.z;
  player.vx = player.vy = 0;
  player.health = 100;
  player.alive = true;
  player.grounded = true;
  player.respawnAt = null;
}
function settlePlayer(game, player, oldY, dt) {
  const nextY = player.y + player.vy * dt;
  if (player.vy <= 0) {
    const supportY = nearbySupport(game, player.x, player.z, oldY, nextY);
    if (supportY !== null) {
      player.y = supportY;
      player.vy = 0;
      player.grounded = true;
      return;
    }
  }
  player.y = nextY;
  player.grounded = false;
}

export function jumpPlayer(game, playerId = game?.localId) {
  const player = game?.players?.[playerId];
  if (!game || game.status !== 'running' || !player?.alive || !player.grounded) return false;
  player.vy = 8.8;
  player.grounded = false;
  return true;
}

export function stepBlockbound3D(game, dt, input = {}) {
  if (!game || game.status !== 'running') return;
  const duration = clamp(Number(dt) || 0, 0, .05);
  game.time += duration;
  for (const player of Object.values(game.players)) {
    if (player.respawnAt && game.time >= player.respawnAt) { resetPlayer(game, player); continue; }
    if (!player.alive) continue;
    const isLocal = player.id === game.localId;
    const controls = isLocal ? input : {};
    const forward = Number(Boolean(controls.forward)) - Number(Boolean(controls.back));
    const sideways = Number(Boolean(controls.right)) - Number(Boolean(controls.left));
    const magnitude = Math.hypot(forward, sideways) || 1;
    const speed = controls.sprint ? 7.6 : 5.6;
    const yaw = Number.isFinite(controls.yaw) ? controls.yaw : player.yaw;
    player.yaw = yaw;
    const fx = Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = Math.sin(yaw);
    const dx = (fx * forward + rx * sideways) / magnitude * speed * duration;
    const dz = (fz * forward + rz * sideways) / magnitude * speed * duration;
    if (!collidesAt(game, player, player.x + dx, player.z)) player.x += dx;
    if (!collidesAt(game, player, player.x, player.z + dz)) player.z += dz;
    if (!isLocal) continue;
    if (game.mode === 'bedwars' && Math.hypot(player.x - (TEAM_INFO[player.team]?.spawn.x || 0), player.z - (TEAM_INFO[player.team]?.spawn.z || 0)) < 4.5) {
      player.generatorTick = (player.generatorTick || 0) + duration;
      if (player.generatorTick >= 3) { player.generatorTick -= 3; player.iron = Math.min(999, player.iron + 1); }
    }
    if (game.mode === 'survival') {
      const crystalIndex = game.crystals.findIndex(item => (item.x - player.x) ** 2 + (item.y - player.y) ** 2 + (item.z - player.z) ** 2 < 1.35 ** 2);
      if (crystalIndex >= 0) {
        game.crystals.splice(crystalIndex, 1);
        player.crystals++;
        game.message = `Crystal found! ${player.crystals} collected.`;
      }
    }
  }
  for (const player of Object.values(game.players)) {
    if (!player.alive) continue;
    const oldY = player.y;
    player.vy = Math.max(-24, player.vy - 23 * duration);
    settlePlayer(game, player, oldY, duration);
    if (player.y < -7) resetPlayer(game, player, { fell: true });
  }
  if (game.mode === 'bedwars') checkWinner(game);
}

export function buyBridgeBlocks(game, playerId = game?.localId) {
  const player = game?.players?.[playerId];
  if (!game || game.status !== 'running' || game.mode !== 'bedwars' || !player?.alive || player.iron < 4) return false;
  player.iron -= 4;
  player.blocks = Math.min(999, player.blocks + 8);
  return true;
}

export function breakEnemyBed(game, playerId = game?.localId, team = null) {
  const player = game?.players?.[playerId];
  if (!game || game.status !== 'running' || game.mode !== 'bedwars' || !player?.alive) return false;
  const targets = team ? [game.beds[team]] : Object.values(game.beds).filter(bed => bed.team !== player.team && bed.alive);
  const bed = targets.find(item => item?.alive && distanceSquared(player, item) <= 2.8 ** 2);
  if (!bed || bed.team === player.team) return false;
  bed.alive = false;
  game.message = `${TEAM_INFO[bed.team].name} bed destroyed! They have no more respawns.`;
  checkWinner(game);
  return bed.team;
}

export function applyPlayerHit(game, attackerId, targetId) {
  const attacker = game?.players?.[attackerId], target = game?.players?.[targetId];
  if (!game || game.mode !== 'bedwars' || game.status !== 'running' || !attacker?.alive || !target?.alive || attacker.team === target.team || distanceSquared(attacker, target) > 3.6 ** 2) return false;
  target.health = Math.max(0, target.health - 45);
  target.vy = Math.max(target.vy, 2.1);
  target.hitAt = game.time;
  if (target.health === 0) {
    target.alive = false;
    target.respawnAt = game.beds[target.team]?.alive ? game.time + 1.7 : null;
    if (target.respawnAt === null) game.message = `${target.name} has been knocked out.`;
    attacker.kills++;
    if (attacker.id === game.localId) game.kills++;
    checkWinner(game);
  }
  return true;
}

function checkWinner(game) {
  const teams = Object.keys(TEAM_INFO).filter(team => {
    const members = Object.values(game.players).filter(player => player.team === team);
    return members.length && (game.beds[team]?.alive || members.some(player => player.alive || player.respawnAt));
  });
  if (teams.length !== 1) return;
  game.winner = teams[0];
  game.status = game.players[game.localId]?.team === teams[0] ? 'won' : 'lost';
  game.message = `${TEAM_INFO[teams[0]].name} team wins!`;
}

export function nearestEnemyBed(game, playerId = game?.localId) {
  const player = game?.players?.[playerId];
  if (!player) return null;
  return Object.values(game.beds || {}).filter(bed => bed.alive && bed.team !== player.team).sort((a, b) => distanceSquared(player, a) - distanceSquared(player, b))[0] || null;
}

export function nearestOpponent(game, playerId = game?.localId) {
  const player = game?.players?.[playerId];
  if (!player) return null;
  return Object.values(game.players).filter(other => other.id !== playerId && other.alive && other.team !== player.team && distanceSquared(player, other) <= 3.6 ** 2).sort((a, b) => distanceSquared(player, a) - distanceSquared(player, b))[0] || null;
}

export function snapshotPlayer(player) {
  if (!player) return null;
  return {
    id: String(player.id), name: String(player.name).slice(0, 24), team: player.team,
    x: clamp(Number(player.x) || 0, -80, 80), y: clamp(Number(player.y) || 1, -10, 32),
    z: clamp(Number(player.z) || 0, -80, 80), yaw: clamp(Number(player.yaw) || 0, -Math.PI * 2, Math.PI * 2),
    vy: clamp(Number(player.vy) || 0, -24, 24), grounded: Boolean(player.grounded),
    health: clamp(Math.floor(Number(player.health) || 0), 0, 100), alive: Boolean(player.alive),
    blocks: clamp(Math.floor(Number(player.blocks) || 0), 0, 999), iron: clamp(Math.floor(Number(player.iron) || 0), 0, 999),
    crystals: clamp(Math.floor(Number(player.crystals) || 0), 0, 999),
    kills: clamp(Math.floor(Number(player.kills) || 0), 0, 999), respawnAt: Number.isFinite(player.respawnAt) ? player.respawnAt : null
  };
}

export function applyRemotePlayer(game, incoming) {
  if (!game || !incoming || typeof incoming.id !== 'string' || incoming.id === game.localId || !game.players[incoming.id]) return false;
  const safe = snapshotPlayer(incoming);
  const player = game.players[safe.id];
  if (safe.team !== player.team) return false;
  Object.assign(player, safe);
  return true;
}

const OBBY_3D_STAGES = Object.freeze([
  { id: 'start', x1: -3, x2: 3, z1: 0, z2: 6, y: 0, checkpoint: { x: .5, y: 1, z: 4.5 } },
  { id: 'step-1', x1: -3, x2: 0, z1: -5, z2: -3, y: 0, checkpoint: { x: -.5, y: 1, z: -3.5 } },
  { id: 'step-2', x1: 1, x2: 4, z1: -10, z2: -8, y: 1, checkpoint: { x: 2.5, y: 2, z: -8.5 } },
  { id: 'step-3', x1: -2, x2: 1, z1: -15, z2: -13, y: 0, checkpoint: { x: -.5, y: 1, z: -13.5 } },
  { id: 'step-4', x1: -4, x2: -1, z1: -20, z2: -18, y: 1, checkpoint: { x: -2.5, y: 2, z: -18.5 } },
  { id: 'step-5', x1: 0, x2: 3, z1: -25, z2: -23, y: 0, checkpoint: { x: 1.5, y: 1, z: -23.5 } },
  { id: 'finish', x1: -2, x2: 2, z1: -32, z2: -29, y: 0, checkpoint: { x: .5, y: 1, z: -30.5 } }
]);
function buildObbyBlocks() {
  const blocks = [];
  for (const stage of OBBY_3D_STAGES) fillArea(blocks, stage.x1, stage.x2, stage.z1, stage.z2, stage.y, stage.id === 'start' || stage.id === 'finish' ? 'grass' : 'stone');
  // Soft rails make the narrow platforms readable without hiding their edges.
  for (const stage of OBBY_3D_STAGES.slice(1, -1)) {
    const side = stage.x2;
    for (const z of [stage.z1, stage.z2]) blocks.push({ id: blockKey(side, stage.y + 1, z), x: side, y: stage.y + 1, z, kind: 'wool' });
  }
  return blocks;
}
export const OBBY_3D_STARS = Object.freeze([
  { x: -.5, y: 2.1, z: -3.5 }, { x: 2.5, y: 3.1, z: -8.5 },
  { x: -.5, y: 2.2, z: -13.5 }, { x: -2.5, y: 3.1, z: -18.5 }, { x: 1.5, y: 2.2, z: -23.5 }
]);
export const OBBY_3D_FINISH_Z = -30;

export function createObby3DGame({ playerId = 'local-player', playerName = 'You' } = {}) {
  const player = makePlayer({ id: String(playerId), name: playerName, local: true, team: 'red', spawn: { x: .5, y: 1, z: 4.5 } });
  player.blocks = 0;
  const checkpointSpawn = { ...OBBY_3D_STAGES[0].checkpoint };
  const game = {
    kind: 'skypark-obby-3d', mode: 'obby', status: 'ready', blocks: buildObbyBlocks(),
    players: { [player.id]: player }, localId: player.id, beds: {}, generators: [],
    crystals: OBBY_3D_STARS.map((star, index) => ({ ...star, id: `obby-star-${index}` })),
    stars: [], checkpoint: 0, checkpointSpawn, falls: 0, time: 0, elapsed: 0,
    kills: 0, blocksPlaced: 0, blocksMined: 0, winner: '',
    message: 'Run, jump and land on each platform. Falling sends you back to your latest checkpoint.'
  };
  buildBlockIndex(game);
  return game;
}
export function jumpObby3D(game) { return jumpPlayer(game, game?.localId); }
export function stepObby3D(game, dt, input = {}) {
  if (!game || game.mode !== 'obby' || game.status !== 'running') return;
  const oldFalls = game.falls;
  game.elapsed += clamp(Number(dt) || 0, 0, .05);
  stepBlockbound3D(game, dt, input);
  const player = game.players[game.localId];
  if (!player) return;
  if (player.falls > oldFalls) {
    game.falls = player.falls;
    game.message = `Big jump! You fell and respawned at checkpoint ${game.checkpoint + 1}.`;
  }
  for (let index = 1; index < OBBY_3D_STAGES.length - 1; index++) {
    const stage = OBBY_3D_STAGES[index];
    if (index > game.checkpoint && player.z <= stage.checkpoint.z + .7 && Math.abs(player.x - stage.checkpoint.x) < 3 && player.grounded) {
      game.checkpoint = index;
      game.checkpointSpawn = { ...stage.checkpoint };
      game.message = `Checkpoint ${index + 1} reached! Keep going.`;
    }
  }
  for (const star of [...game.crystals]) {
    if ((star.x - player.x) ** 2 + (star.y - (player.y + 1)) ** 2 + (star.z - player.z) ** 2 < 1.6 ** 2) {
      game.crystals = game.crystals.filter(item => item.id !== star.id);
      game.stars.push(star.id);
      game.message = `Star collected! ${game.stars.length} of ${OBBY_3D_STARS.length}.`;
    }
  }
  if (player.z <= OBBY_3D_FINISH_Z && player.grounded) {
    game.status = 'won';
    game.message = `Course cleared in ${game.elapsed.toFixed(1)} seconds! You collected ${game.stars.length} stars.`;
  }
}
