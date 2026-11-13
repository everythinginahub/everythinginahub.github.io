import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {arcadeView} from '../public/arcade.js';
import {
  BLOCKS, BLOCK_SIZE, GAME_HEIGHT, OBBY_FINISH_X, OBBY_SPIKES, OBBY_STARS, getBlock,
  jumpBlockWorld, jumpObby, mineBlock, movingObbyPlatform, newBlockWorld,
  newObby, obbyPlatforms, placeBlock, restoreBlockWorld, snapshotBlockWorld,
  stepBlockWorld, stepObby
} from '../public/arcade-creative-engine.js';
import {blockWorldView, mountBlockWorld, mountSkyparkObby, starparkObbyView} from '../public/arcade-creative.js';

function fakeAnimation(win) {
  let nextId = 1;
  const frames = new Map();
  win.requestAnimationFrame = callback => { const id = nextId++; frames.set(id, callback); return id; };
  win.cancelAnimationFrame = id => frames.delete(id);
  return {
    tick(timestamp) { const entry = frames.entries().next().value; if (!entry) return false; const [id, callback] = entry; frames.delete(id); callback(timestamp); return true; },
    get size() { return frames.size; }
  };
}

test('Blockbound generates repeatable, walkable worlds with a useful starter inventory',()=>{
  const first = newBlockWorld(42), same = newBlockWorld(42), other = newBlockWorld(43);
  assert.deepEqual(first.world, same.world);
  assert.notDeepEqual(first.world, other.world);
  assert.equal(first.world.length, 96 * 18);
  assert.ok(first.world.includes(BLOCKS.grass));
  assert.ok(first.world.includes(BLOCKS.dirt));
  assert.ok(first.world.includes(BLOCKS.stone));
  assert.ok(first.world.includes(BLOCKS.crystal));
  assert.ok(first.world.includes(BLOCKS.wood));
  assert.ok(first.world.includes(BLOCKS.leaf));
  assert.equal(first.player.grounded, true);
  assert.ok(first.inventory.dirt >= 10);
  assert.equal(first.status, 'ready');
});

test('Blockbound mines nearby blocks, places from inventory, and safely restores saved worlds',()=>{
  const game = newBlockWorld(7);
  game.status = 'running';
  const col = Math.floor((game.player.x + game.player.w / 2) / BLOCK_SIZE);
  const row = Math.floor((game.player.y + game.player.h + 1) / BLOCK_SIZE);
  assert.equal(getBlock(game, col, row), BLOCKS.grass);
  const grassCount = game.inventory.grass;
  assert.equal(mineBlock(game, col, row), true);
  assert.equal(game.inventory.grass, grassCount + 1);
  assert.equal(game.blocksMined, 1);
  game.selected = BLOCKS.dirt;
  const dirtCount = game.inventory.dirt;
  assert.equal(placeBlock(game, col, row), true);
  assert.equal(getBlock(game, col, row), BLOCKS.dirt);
  assert.equal(game.inventory.dirt, dirtCount - 1);
  assert.equal(game.blocksPlaced, 1);
  assert.equal(mineBlock(game, -1, 0), false);
  assert.equal(mineBlock(game, 80, 2), false);
  const saved = snapshotBlockWorld(game);
  const restored = restoreBlockWorld(saved);
  assert.deepEqual(restored.world, game.world);
  assert.deepEqual(restored.inventory, game.inventory);
  assert.equal(restored.blocksPlaced, 1);
  assert.equal(restored.status, 'ready');
  assert.equal(restoreBlockWorld({seed: 1, world: [1]}), null);
});

test('Blockbound jump, gravity, ground collision and camera movement stay deterministic',()=>{
  const game = newBlockWorld(21);
  game.status = 'running';
  const startY = game.player.y;
  assert.equal(jumpBlockWorld(game), true);
  assert.equal(jumpBlockWorld(game), false);
  stepBlockWorld(game, .05);
  assert.ok(game.player.y < startY);
  for (let index = 0; index < 55; index++) stepBlockWorld(game, 1 / 60);
  assert.equal(game.player.grounded, true);
  assert.ok(Math.abs(game.player.y - startY) < 1.1);
  for (let index = 0; index < 90; index++) stepBlockWorld(game, 1 / 60, {right: true});
  assert.ok(game.player.x > 160);
  assert.ok(game.cameraX >= 0);
  game.status = 'paused';
  const before = game.time;
  stepBlockWorld(game, 1);
  assert.equal(game.time, before);
});

test('Skypark Obby supports jumps, stars, checkpoints, spike respawns and the finish',()=>{
  const game = newObby();
  game.status = 'running';
  stepObby(game, .016);
  assert.equal(game.player.grounded, true);
  assert.equal(jumpObby(game), true);
  assert.equal(jumpObby(game), false);
  game.player.x = 350; game.player.y = 375; game.player.vy = 0; game.player.grounded = false;
  stepObby(game, .016);
  assert.equal(game.starsCollected, 1);
  assert.ok(game.stars.includes(OBBY_STARS[0].x));
  game.player.x = 1162; game.player.y = 428; game.player.grounded = true; game.player.vy = 0;
  stepObby(game, .016);
  assert.equal(game.checkpoint, 1);
  game.player.x = 275; game.player.y = 430; game.player.grounded = false;
  stepObby(game, .016);
  assert.equal(game.falls, 1);
  assert.equal(game.player.x, 1170);
  assert.match(game.message, /checkpoint/i);
  game.player.x = OBBY_FINISH_X - 20; game.player.y = 428; game.player.grounded = true;
  stepObby(game, .016);
  assert.equal(game.status, 'won');
  assert.ok(movingObbyPlatform(0) !== movingObbyPlatform(1));
});

test('a careful Skypark run can finish the entire course with its built-in jump windows',()=>{
  const game = newObby(); game.status = 'running';
  let jumps = 0, tick = 0;
  for (; tick < 1800 && game.status === 'running'; tick++) {
    const player = game.player;
    const support = obbyPlatforms(game.time).filter(platform => player.x + player.w > platform.x && player.x < platform.x + platform.w && Math.abs(player.y + player.h - platform.y) < 2).sort((a, b) => b.x - a.x)[0];
    const nextSpike = OBBY_SPIKES.find(spike => spike.x + spike.w > player.x + player.w + 2);
    if (player.grounded) {
      let shouldJump = Boolean(nextSpike && nextSpike.x - (player.x + player.w) < 65);
      const nextPlatform = obbyPlatforms(game.time).filter(platform => platform.x > player.x + player.w).sort((a, b) => a.x - b.x)[0];
      if (support && nextPlatform && support.x + support.w - (player.x + player.w) < 45) shouldJump = true;
      if (shouldJump && jumpObby(game)) jumps++;
    }
    stepObby(game, 1 / 60, {right: true});
  }
  assert.equal(game.status, 'won');
  assert.ok(jumps > 5);
  assert.ok(game.falls < 5);
});

test('new creative game routes render playable canvas screens and reachable controls',()=>{
  const home = arcadeView();
  assert.match(home, /#arcade\/block-world/);
  assert.match(home, /#arcade\/skypark-obby/);
  assert.match(blockWorldView(), /id="blockWorldCanvas"/);
  assert.match(blockWorldView(), /data-world-action="start"/);
  assert.match(blockWorldView(), /data-world-tool="place"/);
  assert.match(starparkObbyView(), /id="obbyCanvas"/);
  assert.match(starparkObbyView(), /data-obby-action="jump"/);
  assert.match(starparkObbyView(), /checkpoint/i);
  assert.ok(GAME_HEIGHT > 0);
});

test('Blockbound mount starts, saves, changes tools and disposes its frame and listeners',()=>{
  const dom = new JSDOM(`<main>${blockWorldView()}</main>`, {url: 'https://example.test/'});
  const {window: win} = dom;
  win.HTMLCanvasElement.prototype.getContext = () => null;
  const animation = fakeAnimation(win), root = win.document.querySelector('main');
  const controller = mountBlockWorld({root, userId: 'builder-test', win});
  const q = selector => root.querySelector(selector);
  const originalSeed = controller.game.seed;
  assert.equal(controller.game.status, 'ready');
  q('[data-world-action="start"]').click();
  assert.equal(controller.game.status, 'running');
  assert.equal(q('#worldOverlay').hidden, true);
  q('[data-world-tool="place"]').click();
  assert.equal(controller.game.tool, 'place');
  q('[data-world-block="3"]').click();
  assert.equal(controller.game.selected, BLOCKS.stone);
  animation.tick(0);
  const startX = controller.game.player.x;
  win.dispatchEvent(new win.KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
  animation.tick(40);
  win.dispatchEvent(new win.KeyboardEvent('keyup', {key: 'ArrowRight', bubbles: true}));
  assert.ok(controller.game.player.x > startX);
  q('[data-world-action="new-world"]').click();
  assert.equal(controller.game.seed, originalSeed + 1);
  assert.equal(controller.game.status, 'running');
  controller.destroy();
  const saved = JSON.parse(win.localStorage.getItem('everything-block-world-v1-builder-test'));
  assert.equal(saved.seed, originalSeed + 1);
  assert.equal(animation.size, 0);
  dom.window.close();
});

test('Skypark Obby mount rewards a completed run once, stores a best time, and cleans up',()=>{
  const dom = new JSDOM(`<main>${starparkObbyView()}</main>`, {url: 'https://example.test/'});
  const {window: win} = dom;
  win.HTMLCanvasElement.prototype.getContext = () => null;
  const animation = fakeAnimation(win), root = win.document.querySelector('main'), rewards = [];
  const controller = mountSkyparkObby({root, userId: 'runner-test', onReward: kind => rewards.push(kind), win});
  const q = selector => root.querySelector(selector);
  q('[data-obby-action="start"]').click();
  assert.equal(controller.game.status, 'running');
  animation.tick(0);
  controller.game.player.x = OBBY_FINISH_X - 20;
  controller.game.player.y = 428;
  controller.game.player.grounded = true;
  animation.tick(50);
  assert.equal(controller.game.status, 'won');
  assert.deepEqual(rewards, ['arcade']);
  assert.ok(controller.bestMs > 0);
  assert.match(q('#obbyBest').textContent, /^\d\d:\d\d$/);
  assert.equal(q('#obbyOverlay').hidden, false);
  controller.destroy();
  assert.equal(animation.size, 0);
  dom.window.close();
});
