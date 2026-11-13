import {
  BLOCKS, BLOCK_TYPES, GAME_HEIGHT, GAME_WIDTH, OBBY_CHECKPOINTS, OBBY_STARS, WORLD_WIDTH,
  blockTargetAtPoint, jumpBlockWorld, mineBlock, newBlockWorld, newObby,
  placeBlock, restoreBlockWorld, restoreObbyBest, snapshotBlockWorld,
  stepBlockWorld, stepObby, jumpObby
} from './arcade-creative-engine.js?v=20261114-1';
import {drawBlockWorld, drawObby} from './arcade-creative-render.js?v=20261114-1';

const safeId = id => String(id || 'guest').replace(/[^a-z0-9_-]/gi, '_').slice(0, 80) || 'guest';
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const keyCodes = new Map(BLOCK_TYPES.map((type, index) => [String(index + 1), type.id]));

export function blockWorldView() {
  const materialButtons = BLOCK_TYPES.map(type => `<button type="button" class="builder-material" data-world-block="${type.id}" aria-pressed="${type.id === BLOCKS.dirt}" aria-label="Select ${esc(type.name)}"><span class="builder-swatch block-swatch-${type.key}" aria-hidden="true"></span><span>${esc(type.name)}</span><strong data-world-count="${type.key}">0</strong></button>`).join('');
  return `<div class="creative-game builder-game"><a class="arcade-back" href="#arcade">← Games home</a><header class="creative-heading"><div><p class="game-eyebrow">ORIGINAL SANDBOX · PLAY YOUR WAY</p><h1>Blockbound: Pocket World</h1><p>Mine, explore and build a little world that is yours. Your world saves on this device.</p></div><div class="creative-heading-actions"><button type="button" class="creative-secondary" data-world-action="pause">Pause</button><button type="button" class="creative-primary" data-world-action="new-world">＋ New world</button></div></header><div class="creative-layout"><section class="creative-main"><div class="creative-hud" aria-label="World progress"><div><span>DAY</span><strong id="worldDay">1</strong></div><div><span>CRYSTALS</span><strong id="worldCrystals">0</strong></div><div><span>BUILT</span><strong id="worldPlaced">0</strong></div><p id="worldStatus" role="status" aria-live="polite">Your world is ready.</p></div><div class="creative-screen builder-screen"><canvas id="blockWorldCanvas" width="${GAME_WIDTH}" height="${GAME_HEIGHT}" tabindex="0" role="img" aria-label="Blockbound world. Move with A and D or the arrow keys, jump with Space, select Mine or Build, then click or tap a nearby block."></canvas><div class="creative-overlay" id="worldOverlay"><div><span class="creative-overlay-kicker">A WORLD OF YOUR OWN</span><h2 id="worldOverlayTitle">Ready to explore?</h2><p id="worldOverlayText">Mine blocks, collect crystals and place blocks to shape the landscape. Your world saves on this device.</p><button type="button" class="creative-primary" data-world-action="start">Start exploring →</button></div></div></div><div class="builder-toolbar"><div class="builder-tools" role="group" aria-label="Choose a tool"><button type="button" data-world-tool="mine" aria-pressed="true">⛏ Mine</button><button type="button" data-world-tool="place" aria-pressed="false">▧ Build</button></div><div class="builder-hotbar" role="group" aria-label="Block inventory">${materialButtons}</div></div><div class="creative-touch-controls" aria-label="Touch movement controls"><button type="button" data-world-hold="left" aria-label="Move left">←</button><button type="button" data-world-action="jump">Jump ↑</button><button type="button" data-world-hold="right" aria-label="Move right">→</button></div><p class="creative-hint">Move: A / D or ← / → · Jump: Space / ↑ · Mine or build: choose a tool, then click or tap a nearby block · Press 1–6 to select a block</p></section><aside class="creative-guide"><p class="game-eyebrow">HOW TO PLAY</p><h2>Build your own place</h2><ol><li><strong>Explore</strong><span>Move across the hills and jump over trees.</span></li><li><strong>Collect</strong><span>Select Mine, then tap a block close to you.</span></li><li><strong>Create</strong><span>Select a block and Build, then place it next to the landscape.</span></li></ol><div class="creative-guide-note"><strong>Just for you</strong><p>This original sandbox runs locally in your browser. Your build stays on this device; there is no online multiplayer or shared world.</p></div></aside></div></div>`;
}

export function starparkObbyView() {
  return `<div class="creative-game obby-game"><a class="arcade-back" href="#arcade">← Games home</a><header class="creative-heading"><div><p class="game-eyebrow">ORIGINAL PARKOUR · CHECKPOINTS INCLUDED</p><h1>Skypark Obby</h1><p>Hop across floating platforms, grab the stars and race for the finish portal.</p></div><div class="creative-heading-actions"><button type="button" class="creative-secondary" data-obby-action="pause">Pause</button><button type="button" class="creative-primary" data-obby-action="restart">↻ Restart</button></div></header><div class="creative-layout"><section class="creative-main"><div class="creative-hud obby-hud" aria-label="Course progress"><div><span>STARS</span><strong id="obbyStars">0 / ${OBBY_STARS.length}</strong></div><div><span>CHECKPOINT</span><strong id="obbyCheckpoint">1 / 5</strong></div><div><span>TIME</span><strong id="obbyTime">00:00</strong></div><div><span>BEST</span><strong id="obbyBest">—</strong></div><div><span>FALLS</span><strong id="obbyFalls">0</strong></div><p id="obbyStatus" role="status" aria-live="polite">Reach the glowing finish gate. Checkpoints save your progress.</p></div><div class="creative-screen obby-screen"><canvas id="obbyCanvas" width="${GAME_WIDTH}" height="${GAME_HEIGHT}" tabindex="0" role="img" aria-label="Skypark Obby platform course. Move with A and D or the arrow keys, jump with Space, and avoid the pink spikes."></canvas><div class="creative-overlay" id="obbyOverlay"><div><span class="creative-overlay-kicker">RUN, JUMP, REPEAT</span><h2 id="obbyOverlayTitle">Ready for the course?</h2><p id="obbyOverlayText">A relaxed parkour challenge with generous checkpoints. No timer pressure—take your time.</p><button type="button" class="creative-primary" data-obby-action="start">Start the obby →</button></div></div></div><div class="creative-touch-controls" aria-label="Touch movement controls"><button type="button" data-obby-hold="left" aria-label="Move left">←</button><button type="button" data-obby-action="jump">Jump ↑</button><button type="button" data-obby-hold="right" aria-label="Move right">→</button></div><p class="creative-hint">Move: A / D or ← / → · Jump: Space / ↑ / W · Pink spikes send you back to your latest checkpoint.</p></section><aside class="creative-guide"><p class="game-eyebrow">YOUR ROUTE</p><h2>Five checkpoints. One finish.</h2><ol><li><strong>Take a run-up</strong><span>Jump over the pink spikes and across the gaps.</span></li><li><strong>Collect stars</strong><span>Look for gold stars above the platforms.</span></li><li><strong>Keep going</strong><span>Touch a glowing flag to save your checkpoint.</span></li></ol><div class="creative-guide-note"><strong>Made for quick replays</strong><p>Fall as often as you need. You always restart from your latest checkpoint.</p></div></aside></div></div>`;
}

function formatTime(seconds) {
  const whole = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}
function focusCanvas(canvas) {
  try { canvas.focus({ preventScroll: true }); } catch { canvas.focus?.(); }
}

export function mountBlockWorld({root, userId, win = window}) {
  const canvas = root.querySelector('#blockWorldCanvas');
  if (!canvas) return { destroy() {} };
  const q = selector => root.querySelector(selector);
  const storageKey = `everything-block-world-v1-${safeId(userId)}`;
  let game;
  try { game = restoreBlockWorld(JSON.parse(win.localStorage.getItem(storageKey) || 'null')); } catch { game = null; }
  game ||= newBlockWorld();
  if (game.status === 'ready' && game.time > 0) game.message = 'Welcome back. Your world is right where you left it.';
  const overlay = q('#worldOverlay'), title = q('#worldOverlayTitle'), overlayText = q('#worldOverlayText');
  const status = q('#worldStatus'), pause = q('[data-world-action="pause"]');
  let frame = null, last = null, lastMessage = '';
  const input = { left: false, right: false };
  const save = () => { try { win.localStorage.setItem(storageKey, JSON.stringify(snapshotBlockWorld(game))); } catch {} };
  const updateInventory = () => {
    for (const type of BLOCK_TYPES) {
      const button = q(`[data-world-block="${type.id}"]`);
      const count = q(`[data-world-count="${type.key}"]`);
      if (count) count.textContent = String(game.inventory[type.key]);
      if (button) {
        button.setAttribute('aria-pressed', String(game.selected === type.id));
        button.setAttribute('aria-label', `Select ${type.name}, ${game.inventory[type.key]} blocks`);
        button.toggleAttribute('data-empty', game.inventory[type.key] === 0);
      }
    }
    root.querySelectorAll('[data-world-tool]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.worldTool === game.tool)));
  };
  const update = () => {
    if (q('#worldDay')) q('#worldDay').textContent = String(game.day);
    if (q('#worldCrystals')) q('#worldCrystals').textContent = String(game.crystals);
    if (q('#worldPlaced')) q('#worldPlaced').textContent = String(game.blocksPlaced);
    if (game.message !== lastMessage) { status.textContent = game.message; lastMessage = game.message; }
    pause.textContent = game.status === 'paused' ? 'Resume' : 'Pause';
    pause.disabled = game.status === 'ready';
    const isRunning = game.status === 'running';
    overlay.hidden = isRunning;
    if (!isRunning) {
      title.textContent = game.status === 'paused' ? 'Take a breather' : 'Ready to explore?';
      overlayText.textContent = game.status === 'paused' ? 'Your world is safe. Resume whenever you are ready.' : 'Mine blocks, collect crystals and place blocks to shape the landscape. Your world saves on this device.';
      const start = q('[data-world-action="start"]');
      if (start) start.textContent = game.status === 'paused' ? 'Resume exploring →' : 'Start exploring →';
    }
  };
  const draw = () => { try { drawBlockWorld(canvas, game); } catch (error) { if (!/not implemented/i.test(String(error))) throw error; } };
  const stop = () => {
    if (frame !== null) win.cancelAnimationFrame(frame);
    frame = null; last = null; input.left = false; input.right = false;
  };
  const loop = timestamp => {
    if (game.status !== 'running') { frame = null; update(); draw(); return; }
    if (last !== null) {
      const delta = Math.max(0, Math.min(.05, (timestamp - last) / 1000));
      stepBlockWorld(game, delta, input);
    }
    last = timestamp;
    draw(); update();
    frame = game.status === 'running' ? win.requestAnimationFrame(loop) : null;
  };
  const run = () => {
    if (game.status === 'running') return;
    game.status = 'running'; last = null; update(); draw(); focusCanvas(canvas);
    if (frame === null) frame = win.requestAnimationFrame(loop);
    save();
  };
  const pauseGame = () => {
    if (game.status === 'running') { game.status = 'paused'; stop(); update(); draw(); save(); }
    else if (game.status === 'paused') run();
  };
  const setTool = tool => {
    game.tool = tool === 'place' ? 'place' : 'mine';
    game.message = game.tool === 'mine' ? 'Pick a nearby block to collect it.' : 'Choose a block, then tap an empty space beside the landscape.';
    update(); updateInventory();
  };
  const pointerPosition = event => {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return { x: Number(event.offsetX) || 0, y: Number(event.offsetY) || 0 };
    return { x: (event.clientX - bounds.left) / bounds.width * GAME_WIDTH, y: (event.clientY - bounds.top) / bounds.height * GAME_HEIGHT };
  };
  const useToolAt = (x, y) => {
    const target = blockTargetAtPoint(game, x, y);
    game.hover = target;
    if (!target) return;
    const changed = game.tool === 'mine' ? mineBlock(game, target.col, target.row) : placeBlock(game, target.col, target.row);
    if (!changed && game.tool === 'place') game.message = game.inventory[BLOCK_TYPES.find(type => type.id === game.selected)?.key] < 1 ? 'No blocks of that kind left. Mine some more first.' : 'Build beside a block, within reach, and not inside yourself.';
    else if (!changed && game.tool === 'mine') game.message = 'That block is too far away or there is nothing to mine.';
    if (changed) { save(); updateInventory(); }
    update(); draw();
  };
  const click = event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.worldAction === 'start') run();
    else if (button.dataset.worldAction === 'pause') pauseGame();
    else if (button.dataset.worldAction === 'jump') { if (jumpBlockWorld(game)) focusCanvas(canvas); }
    else if (button.dataset.worldAction === 'new-world') {
      const seed = (game.seed + 1) >>> 0;
      stop(); game = newBlockWorld(seed); game.status = 'running'; lastMessage = ''; updateInventory(); update(); draw(); save(); focusCanvas(canvas);
      frame = win.requestAnimationFrame(loop);
    } else if (button.dataset.worldTool) { setTool(button.dataset.worldTool); focusCanvas(canvas); }
    else if (button.dataset.worldBlock) { game.selected = Number(button.dataset.worldBlock); updateInventory(); focusCanvas(canvas); }
    else if (button.dataset.worldHold && event.detail === 0 && game.status === 'running') {
      game.player.vx = button.dataset.worldHold === 'left' ? -230 : 230;
      game.player.x = Math.max(0, Math.min(WORLD_WIDTH - game.player.w, game.player.x + game.player.vx * .13));
      draw(); save(); focusCanvas(canvas);
    }
  };
  const pointerDown = event => {
    const hold = event.target.closest('[data-world-hold]');
    if (hold && game.status === 'running') {
      event.preventDefault(); input[hold.dataset.worldHold] = true;
      try { hold.setPointerCapture(event.pointerId); } catch {}
      return;
    }
    if (event.target !== canvas || game.status !== 'running') return;
    event.preventDefault(); focusCanvas(canvas);
    const point = pointerPosition(event); useToolAt(point.x, point.y);
  };
  const pointerMove = event => {
    if (event.target !== canvas) return;
    const point = pointerPosition(event);
    game.hover = blockTargetAtPoint(game, point.x, point.y);
    draw();
  };
  const pointerUp = event => {
    const hold = event.target.closest?.('[data-world-hold]');
    if (hold) input[hold.dataset.worldHold] = false;
  };
  const keyDown = event => {
    if (event.target.closest?.('input,textarea,select,[contenteditable="true"],a,button')) return;
    const key = event.key.toLowerCase();
    if (key === 'p' && !event.repeat) { pauseGame(); return; }
    if (game.status !== 'running') return;
    if (['arrowleft', 'a', 'arrowright', 'd', 'arrowup', 'w', ' '].includes(key)) event.preventDefault();
    if (key === 'arrowleft' || key === 'a') input.left = true;
    if (key === 'arrowright' || key === 'd') input.right = true;
    if (!event.repeat && ['arrowup', 'w', ' '].includes(key)) jumpBlockWorld(game);
    if (keyCodes.has(key)) { game.selected = keyCodes.get(key); updateInventory(); }
  };
  const keyUp = event => {
    const key = event.key.toLowerCase();
    if (key === 'arrowleft' || key === 'a') input.left = false;
    if (key === 'arrowright' || key === 'd') input.right = false;
  };
  const contextMenu = event => { if (event.target === canvas) event.preventDefault(); };
  const visibility = () => { if (win.document.hidden && game.status === 'running') pauseGame(); };
  const blur = () => { if (game.status === 'running') pauseGame(); };

  root.addEventListener('click', click);
  root.addEventListener('pointerdown', pointerDown);
  root.addEventListener('pointermove', pointerMove);
  root.addEventListener('pointerup', pointerUp);
  root.addEventListener('pointercancel', pointerUp);
  root.addEventListener('contextmenu', contextMenu);
  win.addEventListener('keydown', keyDown); win.addEventListener('keyup', keyUp);
  win.addEventListener('blur', blur); win.document.addEventListener('visibilitychange', visibility);
  const saveTimer = win.setInterval(() => { if (game.status === 'running') save(); }, 4000);
  updateInventory(); update(); draw();
  return {
    get game() { return game; },
    destroy() {
      save(); stop(); win.clearInterval(saveTimer);
      root.removeEventListener('click', click); root.removeEventListener('pointerdown', pointerDown);
      root.removeEventListener('pointermove', pointerMove); root.removeEventListener('pointerup', pointerUp);
      root.removeEventListener('pointercancel', pointerUp); root.removeEventListener('contextmenu', contextMenu);
      win.removeEventListener('keydown', keyDown); win.removeEventListener('keyup', keyUp);
      win.removeEventListener('blur', blur); win.document.removeEventListener('visibilitychange', visibility);
    }
  };
}

export function mountSkyparkObby({root, userId, onReward = () => {}, win = window}) {
  const canvas = root.querySelector('#obbyCanvas');
  if (!canvas) return { destroy() {} };
  const q = selector => root.querySelector(selector);
  const storageKey = `everything-skypark-obby-best-v1-${safeId(userId)}`;
  let bestMs = 0;
  try { bestMs = restoreObbyBest(win.localStorage.getItem(storageKey)); } catch {}
  let game = newObby(), frame = null, last = null, rewarded = false;
  const overlay = q('#obbyOverlay'), title = q('#obbyOverlayTitle'), overlayText = q('#obbyOverlayText');
  const status = q('#obbyStatus'), pause = q('[data-obby-action="pause"]');
  const input = { left: false, right: false };
  const update = () => {
    q('#obbyStars').textContent = `${game.starsCollected} / ${OBBY_STARS.length}`;
    q('#obbyCheckpoint').textContent = `${game.checkpoint + 1} / ${OBBY_CHECKPOINTS.length}`;
    q('#obbyTime').textContent = formatTime(game.elapsed);
    q('#obbyBest').textContent = bestMs ? formatTime(bestMs / 1000) : '—';
    q('#obbyFalls').textContent = String(game.falls);
    status.textContent = game.message;
    pause.textContent = game.status === 'paused' ? 'Resume' : 'Pause';
    pause.disabled = game.status === 'ready' || game.status === 'won';
    const running = game.status === 'running';
    overlay.hidden = running;
    if (!running) {
      title.textContent = game.status === 'paused' ? 'Catch your breath' : game.status === 'won' ? 'Course cleared!' : 'Ready for the course?';
      overlayText.textContent = game.status === 'paused' ? 'You are safe at your current checkpoint.' : game.status === 'won' ? `${game.message} You collected ${game.starsCollected} of ${OBBY_STARS.length} stars.` : 'A relaxed parkour challenge with generous checkpoints. No timer pressure—take your time.';
      const start = q('[data-obby-action="start"]');
      if (start) start.textContent = game.status === 'paused' ? 'Resume course →' : game.status === 'won' ? 'Run it again →' : 'Start the obby →';
    }
  };
  const draw = () => { try { drawObby(canvas, game); } catch {} };
  const stop = () => {
    if (frame !== null) win.cancelAnimationFrame(frame);
    frame = null; last = null; input.left = false; input.right = false;
  };
  const loop = timestamp => {
    if (game.status !== 'running') { frame = null; update(); draw(); return; }
    if (last !== null) {
      const before = game.status;
      stepObby(game, Math.max(0, Math.min(.05, (timestamp - last) / 1000)), input);
      if (before !== 'won' && game.status === 'won' && !rewarded) {
        rewarded = true;
        const elapsedMs = Math.max(1, Math.round(game.elapsed * 1000));
        if (!bestMs || elapsedMs < bestMs) {
          bestMs = elapsedMs;
          try { win.localStorage.setItem(storageKey, String(bestMs)); } catch {}
        }
        onReward('arcade');
      }
    }
    last = timestamp; draw(); update();
    frame = game.status === 'running' ? win.requestAnimationFrame(loop) : null;
  };
  const run = () => {
    if (game.status === 'won') { game = newObby(); rewarded = false; }
    if (game.status !== 'running') { game.status = 'running'; last = null; update(); draw(); focusCanvas(canvas); }
    if (frame === null) frame = win.requestAnimationFrame(loop);
  };
  const pauseGame = () => {
    if (game.status === 'running') { game.status = 'paused'; stop(); update(); draw(); }
    else if (game.status === 'paused') run();
  };
  const click = event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.obbyAction === 'start') run();
    else if (button.dataset.obbyAction === 'pause') pauseGame();
    else if (button.dataset.obbyAction === 'restart') { stop(); game = newObby(); rewarded = false; update(); draw(); }
    else if (button.dataset.obbyAction === 'jump') { jumpObby(game); focusCanvas(canvas); }
    else if (button.dataset.obbyHold && event.detail === 0 && game.status === 'running') {
      game.player.x = Math.max(0, Math.min(OBBY_WIDTH - game.player.w, game.player.x + (button.dataset.obbyHold === 'left' ? -34 : 34)));
      draw(); focusCanvas(canvas);
    }
  };
  const pointerDown = event => {
    const hold = event.target.closest('[data-obby-hold]');
    if (hold && game.status === 'running') {
      event.preventDefault(); input[hold.dataset.obbyHold] = true;
      try { hold.setPointerCapture(event.pointerId); } catch {}
      return;
    }
    if (event.target === canvas && game.status === 'running') {
      event.preventDefault(); jumpObby(game); focusCanvas(canvas);
    }
  };
  const pointerUp = event => {
    const hold = event.target.closest?.('[data-obby-hold]');
    if (hold) input[hold.dataset.obbyHold] = false;
  };
  const keyDown = event => {
    if (event.target.closest?.('input,textarea,select,[contenteditable="true"],a,button')) return;
    const key = event.key.toLowerCase();
    if (key === 'p' && !event.repeat) { pauseGame(); return; }
    if (game.status !== 'running') return;
    if (['arrowleft', 'a', 'arrowright', 'd', 'arrowup', 'w', ' '].includes(key)) event.preventDefault();
    if (key === 'arrowleft' || key === 'a') input.left = true;
    if (key === 'arrowright' || key === 'd') input.right = true;
    if (!event.repeat && ['arrowup', 'w', ' '].includes(key)) jumpObby(game);
  };
  const keyUp = event => {
    const key = event.key.toLowerCase();
    if (key === 'arrowleft' || key === 'a') input.left = false;
    if (key === 'arrowright' || key === 'd') input.right = false;
  };
  const visibility = () => { if (win.document.hidden && game.status === 'running') pauseGame(); };
  const blur = () => { if (game.status === 'running') pauseGame(); };

  root.addEventListener('click', click);
  root.addEventListener('pointerdown', pointerDown); root.addEventListener('pointerup', pointerUp); root.addEventListener('pointercancel', pointerUp);
  win.addEventListener('keydown', keyDown); win.addEventListener('keyup', keyUp);
  win.addEventListener('blur', blur); win.document.addEventListener('visibilitychange', visibility);
  update(); draw();
  return {
    get game() { return game; },
    get bestMs() { return bestMs; },
    destroy() {
      stop(); root.removeEventListener('click', click); root.removeEventListener('pointerdown', pointerDown);
      root.removeEventListener('pointerup', pointerUp); root.removeEventListener('pointercancel', pointerUp);
      win.removeEventListener('keydown', keyDown); win.removeEventListener('keyup', keyUp);
      win.removeEventListener('blur', blur); win.document.removeEventListener('visibilitychange', visibility);
    }
  };
}
