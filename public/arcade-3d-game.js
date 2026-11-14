import {
  BEDWARS_MAX_PLAYERS, OBBY_3D_STARS, TEAM_INFO,
  addWorldBlock, applyPlayerHit, applyRemotePlayer, breakEnemyBed, buyBridgeBlocks,
  createBedWarsGame, createObby3DGame, createSurvivalGame, jumpObby3D,
  jumpPlayer, nearestEnemyBed, nearestOpponent,
  placeBridgeBlock, removeWorldBlock, snapshotPlayer, startMatch,
  stepBedwarsBots, stepBlockbound3D, stepObby3D
} from './bedwars-engine.js?v=20261106-2';
import {cleanRoomCode, createBedWarsRoom, makeRoomCode} from './bedwars-realtime.js?v=20261106-1';
import {createBlockboundViewport} from './arcade-3d-renderer.bundle.js?v=20261106-1';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeId = value => String(value || 'guest').replace(/[^a-z0-9_-]/gi, '_').slice(0, 80) || 'guest';
const makePlayerId = win => {
  try { if (win.crypto?.randomUUID) return win.crypto.randomUUID(); } catch {}
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
};


function setText(root, selector, value) {
  const element = root.querySelector(selector);
  if (element) element.textContent = String(value);
}
function safeMemberTeam(index) { return index % 2 ? 'blue' : 'red'; }
function formatClock(seconds) {
  const whole = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}
function updateRoster(root, members, hostId, localId) {
  const list = root.querySelector('#bedwarsPlayerList');
  if (!list) return;
  list.innerHTML = members.map((member, index) => {
    const team = safeMemberTeam(index);
    return `<li><span class="bedwars-team-dot team-${team}" aria-hidden="true"></span><strong>${esc(member.name)}</strong><small>${member.id === hostId ? 'HOST' : member.id === localId ? 'YOU' : 'PLAYER'} · ${esc(TEAM_INFO[team].name)}</small></li>`;
  }).join('');
}

export function mountBlockWorld3D({root, userId, playerName = 'Player', client = null, win = window}) {
  const canvas = root.querySelector('#blockWorldCanvas');
  if (!canvas) return {destroy() {}};
  const q = selector => root.querySelector(selector);
  const localId = makePlayerId(win);
  const localName = String(playerName || 'Player').replace(/[<>]/g, '').slice(0, 24) || 'Player';
  let mode = 'survival';
  let game = createSurvivalGame({playerId: localId, playerName: localName});
  let viewport = createBlockboundViewport(canvas, {win, mode});
  let cameraYaw = 0, cameraPitch = 0;
  let frame = null, lastFrame = null, lastBroadcast = 0, lastAttack = -1, lastUiUpdate = 0;
  let room = null, roomCode = '', roomHostId = '', roomMembers = [], roomReady = false, creatingRoom = false, advertisedHostId = '';
  let roomTimeout = null, destroyed = false, lockRequested = false;
  const input = {forward: false, back: false, left: false, right: false, sprint: false};
  let dragging = false, dragMoved = false, pointerX = 0, pointerY = 0;
  const status = q('#worldStatus'), overlay = q('#worldOverlay'), overlayTitle = q('#worldOverlayTitle'), overlayText = q('#worldOverlayText');
  const modeButtons = root.querySelectorAll('[data-world-mode]');
  const pauseButton = q('[data-world-action="pause"]');
  const roomPanel = q('#bedwarsLobby');
  const setStatus = text => {
    if (status) status.textContent = text;
    const roomStatus = q('#bedwarsRoomStatus');
    if (roomStatus && mode === 'bedwars') roomStatus.textContent = text;
  };
  const draw = () => viewport?.draw(game, cameraYaw, cameraPitch);
  const focusCanvas = () => { try { canvas.focus({preventScroll: true}); } catch { canvas.focus?.(); } };
  const hasPointerLock = () => win.document.pointerLockElement === canvas;
  const requestPointerLock = () => {
    if (hasPointerLock() || lockRequested) return true;
    if (typeof canvas.requestPointerLock !== 'function') return false;
    try {
      lockRequested = true;
      const result = canvas.requestPointerLock();
      if (result && typeof result.catch === 'function') result.catch(() => {
        lockRequested = false;
        setStatus('Mouse lock is unavailable. Drag the game view to look around instead.');
      });
      return true;
    } catch {
      lockRequested = false;
      return false;
    }
  };
  const releasePointerLock = () => {
    if (!hasPointerLock()) return;
    try { win.document.exitPointerLock?.(); } catch {}
  };
  const clearInput = () => { for (const key of Object.keys(input)) input[key] = false; };
  const localPlayer = () => game.players?.[game.localId];
  const setMode = async nextMode => {
    if (!['survival', 'bedwars'].includes(nextMode)) return;
    if (room && nextMode !== mode) await leaveRoom(false);
    if (frame !== null) win.cancelAnimationFrame(frame);
    frame = null; lastFrame = null; clearInput(); releasePointerLock(); lockRequested = false; dragging = false;
    mode = nextMode;
    if (mode === 'survival') {
      game = createSurvivalGame({playerId: localId, playerName: localName, seed: 7212026});
      cameraYaw = 0; cameraPitch = 0;
      q('[data-world-action="new-world"]').hidden = false;
      q('[data-world-action="pause"]').hidden = false;
      q('[data-world-action="buy"]').hidden = true;
      q('.bedwars-iron').hidden = true;
      q('#bedwarsTeamBoard').hidden = true;
      q('#worldGuideTitle').textContent = 'A little island. A lot to do.';
      q('#worldGuideSteps').innerHTML = '<li><strong>Explore</strong><span>Walk, jump and look around the floating survival islands.</span></li><li><strong>Build</strong><span>Press E to place a block in front of you and bridge the gaps.</span></li><li><strong>Collect</strong><span>Mine glowing crystals and bring them back to your island.</span></li>';
      q('#worldGuideNoteTitle').textContent = 'Survival mode';
      q('#worldGuideNote').textContent = 'This solo world runs in your browser. Your blocks are local; Bed Wars can be played against an AI opponent.';
      setStatus('3D Survival is ready. Start exploring or choose Bed Wars vs AI.');
    } else {
      game = createBedWarsGame({players: [{id: localId, name: localName, joinedAt: Date.now()}], localId});
      cameraYaw = 0; cameraPitch = 0;
      q('[data-world-action="new-world"]').hidden = true;
      q('[data-world-action="pause"]').hidden = true;
      q('[data-world-action="buy"]').hidden = false;
      q('.bedwars-iron').hidden = false;
      q('#bedwarsTeamBoard').hidden = false;
      q('#worldGuideTitle').textContent = 'Defend. Bridge. Break beds.';
      q('#worldGuideSteps').innerHTML = '<li><strong>Pick a challenge</strong><span>Choose an AI difficulty and start a local match.</span></li><li><strong>Bridge the void</strong><span>Collect iron and place wool blocks with E or right-click.</span></li><li><strong>Protect your bed</strong><span>Fight the rival and break their bed with F or left-click.</span></li>';
      q('#worldGuideNoteTitle').textContent = 'Bed Wars vs AI';
      q('#worldGuideNote').textContent = 'The AI match runs locally in your browser. Online rooms remain available as an optional way to play with friends.';
      setStatus('Choose an opponent difficulty, then start a local match.');
    }
    modeButtons.forEach(button => {
      const selected = button.dataset.worldMode === mode;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('is-active', selected);
    });
    roomPanel.hidden = mode !== 'bedwars';
    if (viewport) viewport.setGame(game);
    update(); draw();
  };
  const update = () => {
    const player = localPlayer();
    setText(root, '#worldCrystals', mode === 'survival' ? player?.crystals || 0 : player?.iron || 0);
    setText(root, '#worldBlocks', player?.blocks || 0);
    setText(root, '#worldKills', player?.kills || 0);
    setText(root, '#worldHealth', player?.health ?? 100);
    setText(root, '#worldIron', player?.iron || 0);
    setText(root, '#worldClockLabel', mode === 'survival' ? 'CRYSTALS' : 'IRON');
    setText(root, '#worldBlocksLabel', mode === 'bedwars' ? 'WOOL BLOCKS' : 'BUILD BLOCKS');
    const red = game.beds?.red?.alive !== false, blue = game.beds?.blue?.alive !== false;
    setText(root, '#redBedStatus', `Ember bed: ${red ? 'safe' : 'broken'}`);
    setText(root, '#blueBedStatus', `Tide bed: ${blue ? 'safe' : 'broken'}`);
    const running = game.status === 'running';
    const paused = game.status === 'paused';
    const over = game.status === 'won' || game.status === 'lost';
    const showOverlay = !running && !(mode === 'bedwars' && roomReady && !over);
    overlay.hidden = !showOverlay;
    if (mode === 'survival') {
      overlayTitle.textContent = paused ? 'Take a breather' : over ? 'Island adventure complete!' : 'Ready to explore?';
      overlayText.textContent = paused ? 'Your island is safe. Resume when you are ready.' : over ? game.message : 'Explore the islands, collect crystals and bridge the gaps. Or switch to Bed Wars vs AI for a fight.';
      const start = q('[data-world-action="start"]');
      start.hidden = false;
      start.textContent = paused ? 'Resume survival →' : over ? 'Explore again →' : 'Start Survival →';
    } else {
      overlayTitle.textContent = over ? (game.status === 'won' ? 'Bed Wars victory!' : 'Bed Wars defeat') : 'Ready for Bed Wars?';
      overlayText.textContent = over ? game.message : roomReady ? 'Your room is connected. The host can start when at least two players are here.' : 'Choose a difficulty below to start a local match against an AI opponent.';
      q('[data-world-action="start"]').hidden = true;
    }
    pauseButton.textContent = paused ? 'Resume' : 'Pause';
    pauseButton.disabled = mode === 'bedwars' || game.status === 'ready';
    q('[data-world-action="buy"]').disabled = mode !== 'bedwars' || !running || (player?.iron || 0) < 4;
    q('[data-world-action="interact"]').textContent = mode === 'bedwars' ? '⚔ Attack / bed <kbd>F</kbd>' : '⛏ Mine block <kbd>F</kbd>';
    const aiStart = q('[data-ai-action="start"]');
    const difficulty = q('#bedwarsDifficulty');
    if (aiStart) aiStart.disabled = Boolean(room) || (running && game.isAIMatch);
    if (difficulty) difficulty.disabled = Boolean(room) || (running && game.isAIMatch);
    const onlinePanel = q('#bedwarsOnlinePanel');
    if (onlinePanel) onlinePanel.hidden = Boolean(running && game.isAIMatch);
    const aiStatus = q('#bedwarsAiStatus');
    if (aiStatus && game.isAIMatch) aiStatus.textContent = `Playing against ${game.aiName || 'Tide Bot'} · ${({chill:'Chill',standard:'Standard',sharp:'Sharp'})[game.aiDifficulty] || 'Standard'} difficulty.`;
    q('[data-room-action="create"]').disabled = Boolean(room) || !client || (running && game.isAIMatch);
    q('[data-room-action="join"]').disabled = Boolean(room) || !client || (running && game.isAIMatch);
    q('[data-room-action="start"]').disabled = !roomReady || !roomHostId || roomHostId !== localId || roomMembers.length < 2 || roomMembers.length > BEDWARS_MAX_PLAYERS || (running && game.isAIMatch);
    q('[data-room-action="leave"]').hidden = !room;
    q('#bedwarsRoomInfo').hidden = !room;
    if (room) setText(root, '#bedwarsRoomCodeDisplay', roomCode);
    updateRoster(root, roomMembers, roomHostId, localId);
    if (!viewport && game.status !== 'running') setStatus('3D rendering is unavailable in this browser. Try a device with WebGL enabled.');
  };
  const beginLoop = () => {
    if (frame !== null || destroyed) return;
    frame = win.requestAnimationFrame(loop);
  };
  const loop = timestamp => {
    frame = null;
    if (destroyed) return;
    const dt = lastFrame === null ? 0 : Math.min(.05, Math.max(0, (timestamp - lastFrame) / 1000));
    lastFrame = timestamp;
    if (game.status === 'running') {
      const controls = {...input, yaw: cameraYaw};
      if (mode === 'bedwars' && game.isAIMatch) stepBedwarsBots(game, dt, game.aiDifficulty);
      stepBlockbound3D(game, dt, controls);
      const player = localPlayer();
      if (room?.ready && mode === 'bedwars' && timestamp - lastBroadcast > 120 && player) {
        lastBroadcast = timestamp;
        room.send('position', {player: snapshotPlayer(player)});
      }
      if (game.status !== 'running') {
        clearInput(); releasePointerLock(); lockRequested = false;
      }
      if (game.status !== 'running' || timestamp - lastUiUpdate >= 120) {
        lastUiUpdate = timestamp;
        update();
      }
    }
    draw();
    if (game.status === 'running') frame = win.requestAnimationFrame(loop);
    else lastFrame = null;
  };
  const runSurvival = () => {
    if (mode !== 'survival') return;
    if (game.status === 'won' || game.status === 'lost') {
      game = createSurvivalGame({playerId: localId, playerName: localName, seed: (game.seed || 7212026) + 1});
      viewport?.setGame(game);
    }
    game.status = 'running';
    game.message = 'Explore, gather crystals, and build a safe route between the islands.';
    clearInput(); update(); draw(); focusCanvas(); lastFrame = null; beginLoop(); requestPointerLock();
  };
  const togglePause = () => {
    if (mode !== 'survival') return;
    if (game.status === 'running') { game.status = 'paused'; clearInput(); lastFrame = null; }
    else if (game.status === 'paused') { game.status = 'running'; lastFrame = null; beginLoop(); }
    update(); draw();
  };
  const startAiMatch = () => {
    if (mode !== 'bedwars') return;
    if (room) { setStatus('Leave the online room before starting a local AI match.'); return; }
    if (game.status === 'running') return;
    clearInput(); releasePointerLock(); lockRequested = false;
    const difficulty = q('#bedwarsDifficulty')?.value || 'standard';
    const botId = `${localId}-bot`;
    const botName = 'Tide Bot';
    game = createBedWarsGame({
      players: [
        {id:localId,name:localName,joinedAt:1,team:'red'},
        {id:botId,name:botName,joinedAt:2,team:'blue',isBot:true}
      ],
      localId,
      seed: Math.floor(Math.random() * 0xffffffff)
    });
    game.isAIMatch = true;
    game.aiDifficulty = ['chill','standard','sharp'].includes(difficulty) ? difficulty : 'standard';
    game.aiName = botName;
    startMatch(game);
    roomReady = false;
    roomMembers = [];
    roomHostId = '';
    viewport?.setGame(game);
    cameraYaw = localPlayer()?.yaw || 0;
    cameraPitch = 0;
    setStatus(`${botName} is ready. Move with W A S D, defend your bed, and bridge across the void.`);
    update(); draw(); focusCanvas(); lastFrame = null; beginLoop(); requestPointerLock();
  };
  const place = () => {
    if (game.status !== 'running') return;
    const block = placeBridgeBlock(game, game.localId);
    if (!block) { setStatus(localPlayer()?.blocks ? 'Stand next to the platform edge and face the gap to place a block.' : 'You need more bridge blocks.'); return; }
    if (room?.ready && mode === 'bedwars') room.send('place-block', {block: {x:block.x, y:block.y, z:block.z, kind:block.kind}});
    setStatus(`Block placed. ${localPlayer()?.blocks || 0} left.`); update(); draw();
  };
  const interact = () => {
    if (game.status !== 'running') return;
    if (mode === 'survival') {
      const target = viewport?.pickBlock();
      const mined = target && removeWorldBlock(game, target, game.localId);
      if (mined) {
        if (mined.kind === 'crystal') setStatus(`Crystal mined! You have ${localPlayer()?.crystals || 0}.`);
        else setStatus(`Mined ${mined.kind}. ${localPlayer()?.blocks || 0} build blocks ready.`);
      } else setStatus('Aim at a nearby block and press F to mine it.');
      update(); draw(); return;
    }
    const attacker = localPlayer();
    if (!attacker || game.time - lastAttack < .6) return;
    const opponent = nearestOpponent(game, game.localId);
    if (opponent) {
      lastAttack = game.time;
      const hit = applyPlayerHit(game, game.localId, opponent.id);
      if (hit) { room?.send('player-hit', {attackerId: game.localId, targetId: opponent.id}); setStatus(`Hit ${opponent.name}!`); }
      update(); draw(); return;
    }
    const bed = nearestEnemyBed(game, game.localId);
    if (bed && breakEnemyBed(game, game.localId, bed.team)) {
      lastAttack = game.time;
      room?.send('bed-break', {attackerId: game.localId, team: bed.team});
      setStatus(`${TEAM_INFO[bed.team].name} bed broken!`); update(); draw(); return;
    }
    setStatus('Get close to an opponent or the other team’s bed, then press F.');
  };
  const buy = () => {
    if (!buyBridgeBlocks(game, game.localId)) return;
    room?.send('buy-blocks', {playerId: game.localId});
    setStatus('Bought 8 wool blocks for 4 iron.'); update(); draw();
  };
  const startOnlineMatch = payload => {
    if (mode !== 'bedwars' || !Array.isArray(payload?.players) || payload.players.length < 2 || payload.players.length > BEDWARS_MAX_PLAYERS) return false;
    if (payload.hostId && payload.hostId !== roomHostId) return false;
    game = createBedWarsGame({players: payload.players, localId, seed: payload.seed});
    if (!startMatch(game)) return false;
    roomHostId = payload.hostId || roomHostId;
    roomReady = true;
    room?.setPresence({hostId: roomHostId, started: true});
    viewport?.setGame(game);
    cameraYaw = localPlayer()?.yaw || 0;
    setStatus('Match started! Gather iron, place wool blocks, and defend your bed.');
    update(); draw(); focusCanvas(); lastFrame = null; beginLoop(); requestPointerLock();
    return true;
  };
  const startHostMatch = () => {
    if (!roomReady || roomHostId !== localId || roomMembers.length < 2 || roomMembers.length > BEDWARS_MAX_PLAYERS) return;
    const players = roomMembers.map(member => ({id:member.id, name:member.name, joinedAt:member.joinedAt}));
    const payload = {players, hostId:localId, seed:Math.floor(Math.random() * 0xffffffff)};
    if (!startOnlineMatch(payload)) return;
    room?.send('match-start', payload);
  };
  const onRoomMembers = members => {
    if (destroyed || !room) return;
    roomMembers = members.slice(0, BEDWARS_MAX_PLAYERS + 1);
    const host = roomMembers.find(member => member.hostId && member.hostId === member.id) || roomMembers.find(member => member.hostId);
    if (creatingRoom) roomHostId = localId;
    else if (host?.hostId) roomHostId = host.hostId;
    if (host && roomHostId && roomHostId !== localId) {
      if (roomTimeout) { win.clearTimeout(roomTimeout); roomTimeout = null; }
      if (advertisedHostId !== roomHostId) { advertisedHostId = roomHostId; room.setPresence({hostId: roomHostId}); }
    }
    const startedMember = roomMembers.find(member => member.started);
    if (startedMember && !['running','won','lost'].includes(game.status)) {
      setStatus('This match has already started. Leave and join a new room for the next round.');
    }
    if (roomMembers.length > BEDWARS_MAX_PLAYERS) setStatus('This room is full. Bed Wars supports up to eight players.');
    updateRoster(root, roomMembers, roomHostId, localId);
    if (game.status === 'running' && mode === 'bedwars') {
      const present = new Set(roomMembers.map(member => member.id));
      for (const player of Object.values(game.players)) if (player.id !== localId && !present.has(player.id)) { player.alive = false; player.respawnAt = null; }
      for (const team of ['red','blue']) if (!roomMembers.some(member => game.players[member.id]?.team === team)) game.beds[team].alive = false;
    }
    if (roomReady && game.status === 'lobby') {
      game = createBedWarsGame({players: roomMembers.map(member => ({id:member.id,name:member.name,joinedAt:member.joinedAt})), localId});
      viewport?.setGame(game);
    }
    update(); draw();
  };
  const onRoomMessage = payload => {
    if (!payload || payload.from === localId || mode !== 'bedwars') return;
    if (payload.type === 'match-start') {
      if (payload.from === roomHostId) startOnlineMatch(payload);
      return;
    }
    if (game.status !== 'running') return;
    if (payload.type === 'position' && payload.player?.id === payload.from) applyRemotePlayer(game, payload.player);
    else if (payload.type === 'place-block' && payload.block) {
      const block = addWorldBlock(game, {...payload.block, owner:payload.from}, {consume:false, playerId:payload.from});
      if (block && game.players[payload.from]) game.players[payload.from].blocks = Math.max(0, game.players[payload.from].blocks - 1);
    } else if (payload.type === 'bed-break' && payload.attackerId === payload.from && game.beds[payload.team] && game.beds[payload.team].team !== game.players[payload.from]?.team) {
      game.beds[payload.team].alive = false;
      game.message = `${TEAM_INFO[payload.team].name} bed destroyed!`;
    } else if (payload.type === 'player-hit' && payload.attackerId === payload.from) applyPlayerHit(game, payload.attackerId, payload.targetId);
    else if (payload.type === 'buy-blocks' && payload.playerId === payload.from) {
      const buyer = game.players[payload.from];
      if (buyer?.iron >= 4) { buyer.iron -= 4; buyer.blocks += 8; }
    }
    update(); draw();
  };
  const leaveRoom = async (showMessage = true) => {
    if (roomTimeout) { win.clearTimeout(roomTimeout); roomTimeout = null; }
    const oldRoom = room; room = null; roomReady = false; roomMembers = []; roomHostId = ''; roomCode = ''; creatingRoom = false; advertisedHostId = '';
    if (oldRoom) await oldRoom.leave();
    if (mode === 'bedwars') {
      game = createBedWarsGame({players:[{id:localId,name:localName,joinedAt:Date.now()}],localId});
      viewport?.setGame(game);
    }
    q('[data-room-action="start"]').disabled = true;
    update(); draw();
    if (showMessage) setStatus('You left the Bed Wars room.');
  };
  const openRoom = async (code, isHost) => {
    if (game.status === 'running' && game.isAIMatch) { setStatus('Finish the AI match before opening an online room.'); return false; }
    if (!client?.channel) { setStatus('Online Bed Wars is not available. Check your connection and sign in again.'); return false; }
    if (room) { setStatus('Leave your current room before joining another.'); return false; }
    roomCode = cleanRoomCode(code);
    creatingRoom = isHost;
    roomHostId = isHost ? localId : '';
    roomMembers = [];
    q('#bedwarsRoomCode').value = roomCode;
    advertisedHostId = '';
    setStatus(isHost ? 'Creating your live room…' : 'Connecting to the room…');
    try {
      room = createBedWarsRoom({
        client, code: roomCode,
        player: {id:localId, name:localName, joinedAt:Date.now(), hostId:roomHostId},
        onMembers: onRoomMembers,
        onMessage: onRoomMessage,
        onStatus: (state, message) => {
          if (state === 'connected') { roomReady = true; setStatus(isHost ? 'Room ready. Share the code, then start when at least two players are here.' : 'Connected. Waiting for the room host…'); }
          else if (state === 'error') { roomReady = false; setStatus(message); }
          update();
        }, win
      });
      const connected = await room.whenReady();
      if (!connected || !room) { if (room) await leaveRoom(false); return false; }
      if (isHost) await room.setPresence({hostId:localId, started:false});
      else {
        roomTimeout = win.setTimeout(() => {
          if (!room || roomHostId || roomMembers.some(member => member.id !== localId)) return;
          setStatus('No host found with that code. Check the code or create a new room.');
          leaveRoom(false);
        }, 7000);
      }
      update(); draw(); return true;
    } catch (error) {
      room = null; roomReady = false; roomMembers = []; roomHostId = ''; roomCode = '';
      setStatus(error?.message || 'Could not join that room. Try again.'); update(); return false;
    }
  };
  const hitButton = (action, button) => {
    if (action === 'start') runSurvival();
    else if (action === 'pause') togglePause();
    else if (action === 'new-world') { game = createSurvivalGame({playerId:localId,playerName:localName,seed:(game.seed||7212026)+1}); viewport?.setGame(game); update(); draw(); }
    else if (action === 'place') place();
    else if (action === 'interact') interact();
    else if (action === 'jump') { if (game.status === 'running') jumpPlayer(game); update(); draw(); focusCanvas(); }
    else if (action === 'buy') buy();
    if (button?.dataset.worldHold && game.status === 'running') {
      game.players[game.localId].x += button.dataset.worldHold === 'left' ? -.6 : button.dataset.worldHold === 'right' ? .6 : 0;
      if (button.dataset.worldHold === 'forward') game.players[game.localId].z -= .6;
      if (button.dataset.worldHold === 'back') game.players[game.localId].z += .6;
      draw(); focusCanvas();
    }
  };
  const click = event => {
    const modeButton = event.target.closest('[data-world-mode]');
    if (modeButton) { setMode(modeButton.dataset.worldMode); return; }
    const actionButton = event.target.closest('[data-world-action]');
    if (actionButton) { hitButton(actionButton.dataset.worldAction, actionButton); return; }
    const aiButton = event.target.closest('[data-ai-action]');
    if (aiButton) { startAiMatch(); return; }
    const roomButton = event.target.closest('[data-room-action]');
    if (!roomButton) return;
    const action = roomButton.dataset.roomAction;
    if (action === 'create') openRoom(makeRoomCode(win), true);
    else if (action === 'join') {
      const code = cleanRoomCode(q('#bedwarsRoomCode').value);
      if (code.length !== 6) { setStatus('Enter all six characters from your friend’s room code.'); return; }
      openRoom(code, false);
    } else if (action === 'start') startHostMatch();
    else if (action === 'leave') leaveRoom();
  };
  let pointerButton = 0;
  const rotateCamera = (dx, dy) => {
    cameraYaw -= dx * .0028;
    cameraPitch = Math.max(-.85, Math.min(.85, cameraPitch + dy * .0025));
    viewport?.setCamera(cameraYaw, cameraPitch); draw();
  };
  const pointerDown = event => {
    const hold = event.target.closest('[data-world-hold]');
    if (hold && game.status === 'running') {
      event.preventDefault(); input[hold.dataset.worldHold] = true;
      try { hold.setPointerCapture(event.pointerId); } catch {}
      return;
    }
    if (event.target !== canvas || game.status !== 'running') return;
    event.preventDefault(); focusCanvas();
    if (hasPointerLock()) {
      if (event.button === 0) interact();
      else if (event.button === 2) place();
      return;
    }
    if (event.pointerType !== 'touch' && requestPointerLock()) {
      dragging = false;
      return;
    }
    dragging = true; dragMoved = false; pointerButton = event.button || 0;
    pointerX = event.clientX; pointerY = event.clientY;
    try { canvas.setPointerCapture(event.pointerId); } catch {}
  };
  const pointerMove = event => {
    if (hasPointerLock() && event.target === canvas) {
      rotateCamera(Number(event.movementX) || 0, Number(event.movementY) || 0);
      return;
    }
    if (!dragging || event.target !== canvas) return;
    const dx = event.clientX - pointerX, dy = event.clientY - pointerY;
    if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved = true;
    pointerX = event.clientX; pointerY = event.clientY;
    rotateCamera(dx, dy);
  };
  const pointerUp = event => {
    const hold = event.target.closest?.('[data-world-hold]');
    if (hold) input[hold.dataset.worldHold] = false;
    if (dragging && event.target === canvas) {
      dragging = false;
      if (!dragMoved) {
        if (pointerButton === 2) place();
        else if (pointerButton === 0) interact();
      }
    }
  };
  const contextMenu = event => { if (event.target === canvas) event.preventDefault(); };
  const pointerLockChange = () => {
    const locked = hasPointerLock();
    if (locked) {
      lockRequested = false; dragging = false;
      if (game.status === 'running') setStatus('Mouse locked. Move to look; left-click attacks or mines, right-click places, and Esc unlocks.');
    } else if (!lockRequested && game.status === 'running') {
      setStatus('Mouse unlocked. Click the game to lock it, or drag to look around.');
    }
  };
  const pointerLockError = () => {
    lockRequested = false; dragging = false;
    if (game.status === 'running') setStatus('Mouse lock is unavailable. Drag the game view to look around instead.');
  };
  const keyDown = event => {
    if (event.target.closest?.('input,textarea,select,[contenteditable="true"],a,button')) return;
    const key = event.key.toLowerCase();
    if (key === 'p' && mode === 'survival' && !event.repeat) { togglePause(); return; }
    if (game.status !== 'running') return;
    if (['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright',' ','e','f','shift'].includes(key)) event.preventDefault();
    if (key === 'w' || key === 'arrowup') input.forward = true;
    if (key === 's' || key === 'arrowdown') input.back = true;
    if (key === 'a' || key === 'arrowleft') input.left = true;
    if (key === 'd' || key === 'arrowright') input.right = true;
    if (key === 'shift') input.sprint = true;
    if (!event.repeat && (key === ' ')) jumpPlayer(game);
    if (!event.repeat && key === 'e') place();
    if (!event.repeat && key === 'f') interact();
  };
  const keyUp = event => {
    const key = event.key.toLowerCase();
    if (key === 'w' || key === 'arrowup') input.forward = false;
    if (key === 's' || key === 'arrowdown') input.back = false;
    if (key === 'a' || key === 'arrowleft') input.left = false;
    if (key === 'd' || key === 'arrowright') input.right = false;
    if (key === 'shift') input.sprint = false;
  };
  const visibility = () => { if (mode === 'survival' && win.document.hidden && game.status === 'running') togglePause(); else if (win.document.hidden) clearInput(); };
  const blur = () => { clearInput(); dragging = false; };
  root.addEventListener('click', click);
  root.addEventListener('pointerdown', pointerDown); root.addEventListener('pointermove', pointerMove);
  root.addEventListener('pointerup', pointerUp); root.addEventListener('pointercancel', pointerUp);
  canvas.addEventListener('contextmenu', contextMenu);
  win.document.addEventListener('pointerlockchange', pointerLockChange);
  win.document.addEventListener('pointerlockerror', pointerLockError);
  win.addEventListener('keydown', keyDown); win.addEventListener('keyup', keyUp);
  win.addEventListener('blur', blur); win.document.addEventListener('visibilitychange', visibility);
  if (!client) setStatus('Online play requires the connected account service. 3D Survival works offline.');
  if (viewport) viewport.setGame(game);
  update(); draw();
  return {
    get game() { return game; },
    get roomCode() { return roomCode; },
    get cameraYaw() { return cameraYaw; },
    get cameraPitch() { return cameraPitch; },
    destroy() {
      destroyed = true; clearInput();
      if (frame !== null) win.cancelAnimationFrame(frame);
      if (roomTimeout) win.clearTimeout(roomTimeout);
      room?.leave(); room = null;
      root.removeEventListener('click', click); root.removeEventListener('pointerdown', pointerDown);
      root.removeEventListener('pointermove', pointerMove); root.removeEventListener('pointerup', pointerUp);
      root.removeEventListener('pointercancel', pointerUp);
      canvas.removeEventListener('contextmenu', contextMenu);
      win.document.removeEventListener('pointerlockchange', pointerLockChange);
      win.document.removeEventListener('pointerlockerror', pointerLockError);
      releasePointerLock();
      win.removeEventListener('keydown', keyDown); win.removeEventListener('keyup', keyUp);
      win.removeEventListener('blur', blur); win.document.removeEventListener('visibilitychange', visibility);
      viewport?.destroy();
    }
  };
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
