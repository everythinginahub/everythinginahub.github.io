import {OBBY_3D_STARS, createObby3DGame, jumpObby3D, stepObby3D} from './blockbound-engine.js?v=20261106-4';
import {createBlockboundViewport} from './arcade-3d-renderer.bundle.js?v=20261106-3';

const safeId = value => String(value || 'guest').replace(/[^a-z0-9_-]/gi, '_').slice(0, 80) || 'guest';
const makePlayerId = win => {
  try { if (win.crypto?.randomUUID) return win.crypto.randomUUID(); } catch {}
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
};
function formatClock(seconds) {
  const whole = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

export function mountSkyparkObby3D({root, userId, playerName = 'Player', onReward = () => {}, win = window}) {
  const canvas = root.querySelector('#obbyCanvas');
  if (!canvas) return {destroy() {}};
  const q = selector => root.querySelector(selector);
  const playerId = makePlayerId(win);
  const storageKey = `everything-skypark-obby-3d-best-v1-${safeId(userId)}`;
  let bestMs = 0;
  try { bestMs = Math.max(0, Number(win.localStorage.getItem(storageKey)) || 0); } catch {}
  let game = createObby3DGame({playerId, playerName});
  const viewport = createBlockboundViewport(canvas, {win, mode:'obby'});
  let cameraYaw = 0, cameraPitch = .4, frame = null, lastFrame = null, rewarded = false, destroyed = false;
  let dragging = false, moved = false, pointerX = 0, pointerY = 0;
  const input = {forward:false,back:false,left:false,right:false,sprint:false};
  const overlay = q('#obbyOverlay'), status = q('#obbyStatus'), pause = q('[data-obby-action="pause"]');
  const clearInput = () => { for (const key of Object.keys(input)) input[key] = false; };
  const focusCanvas = () => { try { canvas.focus({preventScroll:true}); } catch { canvas.focus?.(); } };
  const draw = () => viewport?.draw(game,cameraYaw,cameraPitch);
  const update = () => {
    q('#obbyStars').textContent = `${game.stars.length} / ${OBBY_3D_STARS.length}`;
    q('#obbyCheckpoint').textContent = `${game.checkpoint + 1} / 6`;
    q('#obbyTime').textContent = formatClock(game.elapsed);
    q('#obbyBest').textContent = bestMs ? formatClock(bestMs / 1000) : '—';
    q('#obbyFalls').textContent = String(game.falls);
    status.textContent = game.message;
    pause.textContent = game.status === 'paused' ? 'Resume' : 'Pause';
    pause.disabled = game.status === 'ready' || game.status === 'won';
    const running = game.status === 'running';
    overlay.hidden = running;
    if (!running) {
      q('#obbyOverlayTitle').textContent = game.status === 'paused' ? 'Catch your breath' : game.status === 'won' ? 'Course cleared!' : 'Ready for the 3D course?';
      q('#obbyOverlayText').textContent = game.status === 'paused' ? 'You are safe at your current checkpoint.' : game.status === 'won' ? game.message : 'Run forward and jump across the floating platforms. If you fall, you return to the last checkpoint.';
      q('[data-obby-action="start"]').textContent = game.status === 'paused' ? 'Resume course →' : game.status === 'won' ? 'Run it again →' : 'Start the obby →';
    }
  };
  const loop = timestamp => {
    frame = null;
    if (destroyed || game.status !== 'running') { lastFrame = null; return; }
    const dt = lastFrame === null ? 0 : Math.min(.05, Math.max(0, (timestamp - lastFrame) / 1000));
    lastFrame = timestamp;
    stepObby3D(game, dt, {...input,yaw:cameraYaw});
    if (game.status === 'won' && !rewarded) {
      rewarded = true;
      const elapsedMs = Math.max(1, Math.round(game.elapsed * 1000));
      if (!bestMs || elapsedMs < bestMs) {
        bestMs = elapsedMs;
        try { win.localStorage.setItem(storageKey,String(bestMs)); } catch {}
      }
      onReward('arcade');
    }
    draw(); update();
    if (game.status === 'running') frame = win.requestAnimationFrame(loop);
    else lastFrame = null;
  };
  const run = () => {
    if (game.status === 'won') {
      game = createObby3DGame({playerId,playerName});
      viewport?.setGame(game); rewarded = false;
    }
    game.status = 'running'; clearInput(); update(); draw(); focusCanvas(); lastFrame = null;
    if (frame === null) frame = win.requestAnimationFrame(loop);
  };
  const pauseGame = () => {
    if (game.status === 'running') { game.status = 'paused'; clearInput(); lastFrame = null; if(frame!==null)win.cancelAnimationFrame(frame);frame=null; }
    else if (game.status === 'paused') run();
    update(); draw();
  };
  const click = event => {
    const button = event.target.closest('button');
    if (!button) return;
    const action = button.dataset.obbyAction;
    if (action === 'start') run();
    else if (action === 'pause') pauseGame();
    else if (action === 'restart') { if(frame!==null)win.cancelAnimationFrame(frame);frame=null;game=createObby3DGame({playerId,playerName});rewarded=false;viewport?.setGame(game);update();draw(); }
    else if (action === 'jump') { if(game.status==='running')jumpObby3D(game);focusCanvas(); }
  };
  const pointerDown = event => {
    const hold = event.target.closest('[data-obby-hold]');
    if (hold && game.status === 'running') { event.preventDefault(); input[hold.dataset.obbyHold] = true; try{hold.setPointerCapture(event.pointerId);}catch{} return; }
    if (event.target !== canvas || game.status !== 'running') return;
    dragging=true;moved=false;pointerX=event.clientX;pointerY=event.clientY;try{canvas.setPointerCapture(event.pointerId);}catch{}event.preventDefault();focusCanvas();
  };
  const pointerMove = event => {
    if(!dragging||event.target!==canvas)return;
    const dx=event.clientX-pointerX,dy=event.clientY-pointerY;
    if(Math.abs(dx)+Math.abs(dy)>2)moved=true;
    pointerX=event.clientX;pointerY=event.clientY;
    cameraYaw-=dx*.008;cameraPitch=Math.max(.18,Math.min(1.02,cameraPitch+dy*.004));viewport?.setCamera(cameraYaw,cameraPitch);draw();
  };
  const pointerUp = event => {
    const hold=event.target.closest?.('[data-obby-hold]');if(hold)input[hold.dataset.obbyHold]=false;
    if(dragging&&event.target===canvas){dragging=false;if(!moved&&game.status==='running')jumpObby3D(game);}
  };
  const keyDown = event => {
    if(event.target.closest?.('input,textarea,select,[contenteditable="true"],a,button'))return;
    const key=event.key.toLowerCase();if(key==='p'&&!event.repeat){pauseGame();return;}if(game.status!=='running')return;
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','shift'].includes(key))event.preventDefault();
    if(key==='w'||key==='arrowup')input.forward=true;if(key==='s'||key==='arrowdown')input.back=true;
    if(key==='a'||key==='arrowleft')input.left=true;if(key==='d'||key==='arrowright')input.right=true;
    if(key==='shift')input.sprint=true;if(key===' '&&!event.repeat)jumpObby3D(game);
  };
  const keyUp = event => {const key=event.key.toLowerCase();if(key==='w'||key==='arrowup')input.forward=false;if(key==='s'||key==='arrowdown')input.back=false;if(key==='a'||key==='arrowleft')input.left=false;if(key==='d'||key==='arrowright')input.right=false;if(key==='shift')input.sprint=false;};
  const visibility=()=>{if(win.document.hidden&&game.status==='running')pauseGame();};
  const blur=()=>{clearInput();dragging=false;};
  root.addEventListener('click',click);root.addEventListener('pointerdown',pointerDown);root.addEventListener('pointermove',pointerMove);root.addEventListener('pointerup',pointerUp);root.addEventListener('pointercancel',pointerUp);
  win.addEventListener('keydown',keyDown);win.addEventListener('keyup',keyUp);win.addEventListener('blur',blur);win.document.addEventListener('visibilitychange',visibility);
  if(viewport)viewport.setGame(game);update();draw();
  return {
    get game(){return game;},get bestMs(){return bestMs;},
    destroy(){destroyed=true;clearInput();if(frame!==null)win.cancelAnimationFrame(frame);root.removeEventListener('click',click);root.removeEventListener('pointerdown',pointerDown);root.removeEventListener('pointermove',pointerMove);root.removeEventListener('pointerup',pointerUp);root.removeEventListener('pointercancel',pointerUp);win.removeEventListener('keydown',keyDown);win.removeEventListener('keyup',keyUp);win.removeEventListener('blur',blur);win.document.removeEventListener('visibilitychange',visibility);viewport?.destroy();}
  };
}
