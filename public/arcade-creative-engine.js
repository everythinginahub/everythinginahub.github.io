// Deterministic, dependency-free simulation for the original sandbox and parkour games.
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const BLOCK_SIZE = 32;
export const WORLD_COLS = 96;
export const WORLD_ROWS = 18;
export const WORLD_WIDTH = WORLD_COLS * BLOCK_SIZE;

export const BLOCKS = Object.freeze({ grass: 1, dirt: 2, stone: 3, crystal: 4, wood: 5, leaf: 6 });
export const BLOCK_TYPES = Object.freeze([
  { id: BLOCKS.grass, name: 'Grass', key: 'grass' },
  { id: BLOCKS.dirt, name: 'Dirt', key: 'dirt' },
  { id: BLOCKS.stone, name: 'Stone', key: 'stone' },
  { id: BLOCKS.crystal, name: 'Crystal', key: 'crystal' },
  { id: BLOCKS.wood, name: 'Wood', key: 'wood' },
  { id: BLOCKS.leaf, name: 'Leaf', key: 'leaf' }
]);

const clamp = (number, min, max) => Math.max(min, Math.min(max, number));
const cellIndex = (col, row) => row * WORLD_COLS + col;
const isValidCell = (col, row) => Number.isInteger(col) && Number.isInteger(row) && col >= 0 && col < WORLD_COLS && row >= 0 && row < WORLD_ROWS;
const randomFromSeed = seed => {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
};
const surfaceFor = (col, random) => clamp(
  Math.round(10 + Math.sin(col * .16) * 1.1 + Math.sin(col * .047) * 1.4 + (random() - .5) * .8),
  8,
  13
);

function buildWorld(seed) {
  const random = randomFromSeed(seed);
  const world = new Array(WORLD_COLS * WORLD_ROWS).fill(0);
  const surface = new Array(WORLD_COLS);
  for (let col = 0; col < WORLD_COLS; col++) {
    const top = surfaceFor(col, random);
    surface[col] = top;
    for (let row = top; row < WORLD_ROWS; row++) {
      let block = row === top ? BLOCKS.grass : row <= top + 3 ? BLOCKS.dirt : BLOCKS.stone;
      if (row >= top + 5 && random() < .035) block = BLOCKS.crystal;
      world[cellIndex(col, row)] = block;
    }
  }
  for (let col = 12; col < WORLD_COLS - 4; col += 8 + Math.floor(random() * 6)) {
    const top = surface[col];
    for (let offset = 1; offset <= 3; offset++) world[cellIndex(col, top - offset)] = BLOCKS.wood;
    for (let row = top - 6; row <= top - 3; row++) {
      for (let leafCol = col - 2; leafCol <= col + 2; leafCol++) {
        if (isValidCell(leafCol, row) && Math.abs(leafCol - col) + Math.abs(row - (top - 4)) < 4) {
          world[cellIndex(leafCol, row)] = BLOCKS.leaf;
        }
      }
    }
  }
  return world;
}

export function newBlockWorld(seed = 7212026) {
  const safeSeed = Number.isFinite(Number(seed)) ? (Number(seed) >>> 0) : 7212026;
  const world = buildWorld(safeSeed);
  const player = { x: BLOCK_SIZE * 3, y: 0, w: 23, h: 43, vx: 0, vy: 0, grounded: true };
  const spawnRow = Math.floor(player.x / BLOCK_SIZE);
  let surface = 0;
  while (surface < WORLD_ROWS && world[cellIndex(spawnRow, surface)] === 0) surface++;
  player.y = surface * BLOCK_SIZE - player.h - 1;
  return {
    kind: 'block-world', status: 'ready', seed: safeSeed, world, player,
    inventory: { grass: 3, dirt: 20, stone: 6, crystal: 0, wood: 8, leaf: 0 },
    selected: BLOCKS.dirt, tool: 'mine', time: 0, day: 1, cameraX: 0,
    blocksPlaced: 0, blocksMined: 0, crystals: 0, falls: 0,
    hover: null, message: 'Your world is ready. Mine a block, then build something of your own.'
  };
}

export function getBlock(game, col, row) {
  return isValidCell(col, row) ? game.world[cellIndex(col, row)] || 0 : 0;
}

export function restoreBlockWorld(saved) {
  if (!saved || typeof saved !== 'object') return null;
  const seed = Number(saved.seed);
  if (!Array.isArray(saved.world) || saved.world.length !== WORLD_COLS * WORLD_ROWS || !Number.isFinite(seed)) return null;
  const game = newBlockWorld(seed);
  game.world = saved.world.map(block => Number.isInteger(block) && block >= 0 && block <= BLOCKS.leaf ? block : 0);
  if (game.world.length !== WORLD_COLS * WORLD_ROWS) return null;
  const inventory = saved.inventory && typeof saved.inventory === 'object' ? saved.inventory : {};
  for (const type of BLOCK_TYPES) game.inventory[type.key] = clamp(Math.floor(Number(inventory[type.key]) || 0), 0, 9999);
  game.selected = BLOCK_TYPES.some(type => type.id === Number(saved.selected)) ? Number(saved.selected) : BLOCKS.dirt;
  game.tool = saved.tool === 'place' ? 'place' : 'mine';
  game.time = clamp(Number(saved.time) || 0, 0, 1e9);
  game.day = Math.floor(game.time / 90) + 1;
  game.blocksPlaced = clamp(Math.floor(Number(saved.blocksPlaced) || 0), 0, 1e9);
  game.blocksMined = clamp(Math.floor(Number(saved.blocksMined) || 0), 0, 1e9);
  game.crystals = clamp(Math.floor(Number(saved.crystals) || 0), 0, 1e9);
  game.falls = clamp(Math.floor(Number(saved.falls) || 0), 0, 1e9);
  if (saved.player && typeof saved.player === 'object') {
    game.player.x = clamp(Number(saved.player.x) || game.player.x, 0, WORLD_WIDTH - game.player.w);
    game.player.y = clamp(Number(saved.player.y) || game.player.y, -BLOCK_SIZE * 4, GAME_HEIGHT + BLOCK_SIZE * 2);
    game.player.vx = clamp(Number(saved.player.vx) || 0, -260, 260);
    game.player.vy = clamp(Number(saved.player.vy) || 0, -800, 800);
  }
  const player = game.player;
  if (overlapsSolid(game, player.x, player.y, player.w, player.h)) movePlayerToSurface(game);
  player.grounded = isStandingOnBlock(game, player);
  game.cameraX = clamp(player.x - GAME_WIDTH * .42, 0, WORLD_WIDTH - GAME_WIDTH);
  game.status = 'ready';
  return game;
}

export function snapshotBlockWorld(game) {
  return {
    seed: game.seed,
    world: [...game.world],
    player: { x: game.player.x, y: game.player.y, vx: game.player.vx, vy: game.player.vy },
    inventory: { ...game.inventory },
    selected: game.selected,
    tool: game.tool,
    time: game.time,
    blocksPlaced: game.blocksPlaced,
    blocksMined: game.blocksMined,
    crystals: game.crystals,
    falls: game.falls
  };
}

function blockAtPixel(game, x, y) {
  return getBlock(game, Math.floor(x / BLOCK_SIZE), Math.floor(y / BLOCK_SIZE)) !== 0;
}
function overlapsSolid(game, x, y, width, height) {
  const left = Math.floor(x / BLOCK_SIZE), right = Math.floor((x + width - .01) / BLOCK_SIZE);
  const top = Math.floor(y / BLOCK_SIZE), bottom = Math.floor((y + height - .01) / BLOCK_SIZE);
  for (let row = top; row <= bottom; row++) for (let col = left; col <= right; col++) if (blockAtPixel(game, col * BLOCK_SIZE + 1, row * BLOCK_SIZE + 1)) return true;
  return false;
}
function isStandingOnBlock(game, player) {
  const row = Math.floor((player.y + player.h + 1) / BLOCK_SIZE);
  return getBlock(game, Math.floor((player.x + player.w / 2) / BLOCK_SIZE), row) !== 0;
}
function movePlayerToSurface(game) {
  const col = clamp(Math.floor((game.player.x + game.player.w / 2) / BLOCK_SIZE), 0, WORLD_COLS - 1);
  let row = 0;
  while (row < WORLD_ROWS && getBlock(game, col, row) === 0) row++;
  game.player.y = row * BLOCK_SIZE - game.player.h - 1;
  game.player.vy = 0;
  game.player.grounded = true;
}
function resolveHorizontal(game, previousX) {
  const player = game.player;
  if (player.vx > 0) {
    const col = Math.floor((player.x + player.w - .01) / BLOCK_SIZE);
    const firstRow = Math.floor((player.y + 2) / BLOCK_SIZE), lastRow = Math.floor((player.y + player.h - 2) / BLOCK_SIZE);
    for (let row = firstRow; row <= lastRow; row++) if (getBlock(game, col, row)) {
      player.x = col * BLOCK_SIZE - player.w - .01;
      break;
    }
  } else if (player.vx < 0) {
    const col = Math.floor(player.x / BLOCK_SIZE);
    const firstRow = Math.floor((player.y + 2) / BLOCK_SIZE), lastRow = Math.floor((player.y + player.h - 2) / BLOCK_SIZE);
    for (let row = firstRow; row <= lastRow; row++) if (getBlock(game, col, row)) {
      player.x = (col + 1) * BLOCK_SIZE + .01;
      break;
    }
  }
  player.x = clamp(player.x, 0, WORLD_WIDTH - player.w);
  if (player.x === previousX) player.vx = 0;
}
function resolveVertical(game, previousY) {
  const player = game.player;
  player.grounded = false;
  if (player.vy >= 0) {
    const row = Math.floor((player.y + player.h - .01) / BLOCK_SIZE);
    const firstCol = Math.floor((player.x + 2) / BLOCK_SIZE), lastCol = Math.floor((player.x + player.w - 2) / BLOCK_SIZE);
    for (let col = firstCol; col <= lastCol; col++) if (getBlock(game, col, row)) {
      player.y = row * BLOCK_SIZE - player.h - .01;
      player.vy = 0;
      player.grounded = true;
      break;
    }
  } else {
    const row = Math.floor(player.y / BLOCK_SIZE);
    const firstCol = Math.floor((player.x + 2) / BLOCK_SIZE), lastCol = Math.floor((player.x + player.w - 2) / BLOCK_SIZE);
    for (let col = firstCol; col <= lastCol; col++) if (getBlock(game, col, row)) {
      player.y = (row + 1) * BLOCK_SIZE + .01;
      player.vy = 0;
      break;
    }
  }
  if (player.y === previousY && player.vy < 0) player.vy = 0;
}

export function stepBlockWorld(game, dt, input = {}) {
  if (game.status !== 'running') return;
  const duration = clamp(Number(dt) || 0, 0, .05);
  const count = Math.max(1, Math.ceil(duration / (1 / 120)));
  const step = duration / count;
  const player = game.player;
  for (let index = 0; index < count; index++) {
    game.time += step;
    game.day = Math.floor(game.time / 90) + 1;
    player.vx = (Number(Boolean(input.right)) - Number(Boolean(input.left))) * 230;
    const previousX = player.x;
    player.x += player.vx * step;
    resolveHorizontal(game, previousX);
    const previousY = player.y;
    player.vy = Math.min(800, player.vy + 1500 * step);
    player.y += player.vy * step;
    resolveVertical(game, previousY);
    if (player.y > GAME_HEIGHT + BLOCK_SIZE * 2) {
      game.falls++;
      movePlayerToSurface(game);
      game.message = 'You found your way back to the surface.';
    }
  }
  game.cameraX = clamp(player.x - GAME_WIDTH * .42, 0, WORLD_WIDTH - GAME_WIDTH);
}

export function jumpBlockWorld(game) {
  if (game.status !== 'running' || !game.player.grounded) return false;
  game.player.vy = -520;
  game.player.grounded = false;
  return true;
}

export function blockTargetAtPoint(game, x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const col = Math.floor((x + game.cameraX) / BLOCK_SIZE), row = Math.floor(y / BLOCK_SIZE);
  return isValidCell(col, row) ? { col, row } : null;
}
function inBlockReach(game, col, row) {
  const player = game.player;
  const dx = col * BLOCK_SIZE + BLOCK_SIZE / 2 - (player.x + player.w / 2);
  const dy = row * BLOCK_SIZE + BLOCK_SIZE / 2 - (player.y + player.h / 2);
  return dx * dx + dy * dy <= (BLOCK_SIZE * 6) ** 2;
}

export function mineBlock(game, col, row) {
  if (game.status !== 'running' || !isValidCell(col, row) || row === WORLD_ROWS - 1 || !inBlockReach(game, col, row)) return false;
  const index = cellIndex(col, row), block = game.world[index];
  if (!block) return false;
  game.world[index] = 0;
  const type = BLOCK_TYPES.find(item => item.id === block);
  if (type) game.inventory[type.key] = Math.min(9999, game.inventory[type.key] + 1);
  if (block === BLOCKS.crystal) game.crystals++;
  game.blocksMined++;
  game.message = block === BLOCKS.crystal ? 'Crystal collected! Keep exploring.' : `${type?.name || 'Block'} mined. Build something with it.`;
  return true;
}

export function placeBlock(game, col, row) {
  if (game.status !== 'running' || !isValidCell(col, row) || !inBlockReach(game, col, row) || getBlock(game, col, row)) return false;
  const type = BLOCK_TYPES.find(item => item.id === game.selected);
  if (!type || game.inventory[type.key] < 1) return false;
  const x = col * BLOCK_SIZE, y = row * BLOCK_SIZE;
  if (game.player.x < x + BLOCK_SIZE && game.player.x + game.player.w > x && game.player.y < y + BLOCK_SIZE && game.player.y + game.player.h > y) return false;
  const connected = getBlock(game, col - 1, row) || getBlock(game, col + 1, row) || getBlock(game, col, row - 1) || getBlock(game, col, row + 1);
  if (!connected) return false;
  game.world[cellIndex(col, row)] = game.selected;
  game.inventory[type.key]--;
  game.blocksPlaced++;
  game.message = `${type.name} placed. Your world is taking shape.`;
  return true;
}

export const OBBY_WIDTH = 4800;
export const OBBY_FINISH_X = 4570;
export const OBBY_CHECKPOINTS = Object.freeze([60, 1160, 2120, 3130, 4060]);
export const OBBY_PLATFORMS = Object.freeze([
  { id: 'ground-0', x: 0, y: 472, w: 560, h: 68, ground: true },
  { id: 'step-1', x: 690, y: 428, w: 142, h: 18 },
  { id: 'step-2', x: 918, y: 386, w: 150, h: 18 },
  { id: 'ground-1', x: 1120, y: 472, w: 520, h: 68, ground: true },
  { id: 'step-3', x: 1672, y: 432, w: 136, h: 18 },
  { id: 'step-4', x: 1876, y: 390, w: 140, h: 18 },
  { id: 'ground-2', x: 2078, y: 472, w: 410, h: 68, ground: true },
  { id: 'step-5', x: 2540, y: 426, w: 130, h: 18 },
  { id: 'step-6', x: 2750, y: 382, w: 130, h: 18 },
  { id: 'moving-step', x: 0, y: 340, w: 132, h: 18, moving: true },
  { id: 'ground-3', x: 3090, y: 472, w: 530, h: 68, ground: true },
  { id: 'step-7', x: 3650, y: 430, w: 130, h: 18 },
  { id: 'step-8', x: 3845, y: 388, w: 138, h: 18 },
  { id: 'ground-4', x: 4040, y: 472, w: 640, h: 68, ground: true }
]);
export const OBBY_SPIKES = Object.freeze([
  { x: 270, y: 446, w: 58, h: 26 }, { x: 436, y: 446, w: 72, h: 26 },
  { x: 1260, y: 446, w: 64, h: 26 }, { x: 1455, y: 446, w: 75, h: 26 },
  { x: 2210, y: 446, w: 62, h: 26 }, { x: 2390, y: 446, w: 62, h: 26 },
  { x: 3240, y: 446, w: 70, h: 26 }, { x: 3450, y: 446, w: 72, h: 26 },
  { x: 4140, y: 446, w: 72, h: 26 }, { x: 4360, y: 446, w: 78, h: 26 }
]);
export const OBBY_STARS = Object.freeze([
  { x: 360, y: 400 }, { x: 735, y: 380 }, { x: 955, y: 338 },
  { x: 1320, y: 400 }, { x: 1540, y: 405 }, { x: 1730, y: 385 }, { x: 1940, y: 342 },
  { x: 2260, y: 400 }, { x: 2570, y: 378 }, { x: 2790, y: 332 }, { x: 2980, y: 295 },
  { x: 3290, y: 400 }, { x: 3505, y: 402 }, { x: 3700, y: 382 }, { x: 3900, y: 340 },
  { x: 4190, y: 400 }, { x: 4400, y: 400 }
]);

export function movingObbyPlatform(time) {
  return 2928 + Math.sin(time * 1.15) * 66;
}
export function obbyPlatforms(time = 0) {
  return OBBY_PLATFORMS.map(platform => platform.moving ? { ...platform, x: movingObbyPlatform(time) } : platform);
}
export function newObby() {
  const player = { x: 54, y: 428, w: 25, h: 44, vx: 0, vy: 0, grounded: false, platformId: '' };
  return { kind: 'skypark-obby', status: 'ready', player, time: 0, elapsed: 0, cameraX: 0, stars: [], starsCollected: 0, checkpoint: 0, falls: 0, stage: 1, message: 'Reach the glowing finish gate. Checkpoints save your progress.' };
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function respawnObby(game, message = 'Back at the checkpoint. You can do it!') {
  const x = OBBY_CHECKPOINTS[game.checkpoint];
  game.player.x = x + 10;
  game.player.y = 472 - game.player.h - 1;
  game.player.vx = 0;
  game.player.vy = 0;
  game.player.grounded = true;
  game.player.platformId = '';
  game.falls++;
  game.message = message;
}
export function jumpObby(game) {
  if (game.status !== 'running' || !game.player.grounded) return false;
  game.player.vy = -610;
  game.player.grounded = false;
  game.player.platformId = '';
  return true;
}
export function stepObby(game, dt, input = {}) {
  if (game.status !== 'running') return;
  const step = clamp(Number(dt) || 0, 0, .05);
  const player = game.player;
  const oldTime = game.time;
  const nextTime = oldTime + step;
  const oldMovingX = movingObbyPlatform(oldTime), nextMovingX = movingObbyPlatform(nextTime);
  if (player.grounded && player.platformId === 'moving-step') player.x += nextMovingX - oldMovingX;
  game.time = nextTime;
  game.elapsed += step;
  const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
  player.vx = direction * 255;
  player.x = clamp(player.x + player.vx * step, 0, OBBY_WIDTH - player.w);
  const previousBottom = player.y + player.h;
  player.vy = Math.min(900, player.vy + 1650 * step);
  player.y += player.vy * step;
  player.grounded = false;
  player.platformId = '';
  if (player.vy >= 0) {
    let landing = null;
    for (const platform of obbyPlatforms(game.time)) {
      const horizontalOverlap = player.x + player.w - 2 > platform.x && player.x + 2 < platform.x + platform.w;
      if (horizontalOverlap && previousBottom <= platform.y + 12 && player.y + player.h >= platform.y && (!landing || platform.y < landing.y)) landing = platform;
    }
    if (landing) {
      player.y = landing.y - player.h;
      player.vy = 0;
      player.grounded = true;
      player.platformId = landing.id;
    }
  }
  const hitSpike = OBBY_SPIKES.some(spike => overlap(player, { x: spike.x + 9, y: spike.y + 6, w: spike.w - 18, h: spike.h - 6 }));
  if (hitSpike || player.y > GAME_HEIGHT + 60) {
    respawnObby(game, hitSpike ? 'Watch the spikes. You are back at your checkpoint.' : 'Mind the gaps. You are back at your checkpoint.');
  }
  for (const checkpoint of OBBY_CHECKPOINTS) {
    const index = OBBY_CHECKPOINTS.indexOf(checkpoint);
    if (index > game.checkpoint && player.x >= checkpoint) {
      game.checkpoint = index;
      game.message = 'Checkpoint reached! Keep going.';
    }
  }
  for (const star of OBBY_STARS) {
    if (game.stars.includes(star.x)) continue;
    const dx = star.x - (player.x + player.w / 2), dy = star.y - (player.y + player.h / 2);
    if (dx * dx + dy * dy < 38 ** 2) {
      game.stars.push(star.x);
      game.starsCollected++;
    }
  }
  game.stage = Math.min(5, game.checkpoint + 1);
  game.cameraX = clamp(player.x - GAME_WIDTH * .38, 0, OBBY_WIDTH - GAME_WIDTH);
  if (player.x + player.w >= OBBY_FINISH_X) {
    game.status = 'won';
    game.message = `Course cleared in ${game.elapsed.toFixed(1)} seconds!`;
  }
}

export function restoreObbyBest(value) {
  return clamp(Math.floor(Number(value) || 0), 0, 1e9);
}
