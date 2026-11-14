const OBBY_3D_STAR_COUNT = 5;
const buttonMode = (mode, active) => `<button type="button" data-world-mode="${mode}" aria-pressed="${active}" class="${active ? 'is-active' : ''}">${mode === 'survival' ? '⛏ 3D Survival' : '⚔ Bed Wars vs AI'}</button>`;

export function blockWorld3DView() {
  return `<div class="creative-game builder-game builder-3d-game">
    <a class="arcade-back" href="#arcade">← Games home</a>
    <header class="creative-heading">
      <div><p class="game-eyebrow">BLOCKBOUND · FIRST-PERSON 3D</p><h1>Blockbound 3D</h1><p>Explore floating islands or take on an AI opponent in Bed Wars. Build block bridges over every gap.</p></div>
      <div class="creative-heading-actions"><button type="button" class="creative-secondary" data-world-action="pause">Pause</button><button type="button" class="creative-primary" data-world-action="new-world">↻ New survival world</button></div>
    </header>
    <div class="creative-mode-switch" role="group" aria-label="Choose a game mode">${buttonMode('survival', true)}${buttonMode('bedwars', false)}</div>
    <div class="creative-layout">
      <section class="creative-main">
        <div class="creative-hud builder-3d-hud" aria-label="Game progress">
          <div><span id="worldClockLabel">CRYSTALS</span><strong id="worldCrystals">0</strong></div><div><span id="worldBlocksLabel">BUILD BLOCKS</span><strong id="worldBlocks">32</strong></div><div><span>ELIMINATIONS</span><strong id="worldKills">0</strong></div><div><span>HEALTH</span><strong id="worldHealth">100</strong></div>
          <p id="worldStatus" role="status" aria-live="polite">Loading your 3D island…</p>
        </div>
        <div class="creative-screen builder-screen creative-3d-screen">
          <canvas id="blockWorldCanvas" width="960" height="540" tabindex="0" role="img" aria-label="Blockbound three-dimensional game. Move using W A S D or the arrow keys, jump with Space, look around with the mouse, place blocks with E or right-click, and interact with F or left-click."></canvas>
          <div class="creative-overlay" id="worldOverlay"><div><span class="creative-overlay-kicker">SURVIVAL · BED WARS · BRIDGES</span><h2 id="worldOverlayTitle">Ready to explore?</h2><p id="worldOverlayText">Choose 3D Survival for a solo island challenge, or switch to Bed Wars to play against AI.</p><button type="button" class="creative-primary" data-world-action="start">Start Survival →</button></div></div>
          <div class="creative-crosshair" aria-hidden="true">＋</div>
        </div>
        <section class="bedwars-lobby" id="bedwarsLobby" hidden aria-labelledby="bedwarsLobbyTitle">
          <div class="bedwars-lobby-copy"><p class="game-eyebrow">PLAY SOLO · NO ROOM NEEDED</p><h2 id="bedwarsLobbyTitle">Bed Wars vs AI</h2><p>Protect your bed, collect iron, build a bridge and take on a local AI opponent. The match runs in your browser.</p></div>
          <div class="bedwars-room-controls">
            <div class="bedwars-ai-setup">
              <label for="bedwarsDifficulty">Opponent difficulty</label>
              <div class="bedwars-code-row"><select id="bedwarsDifficulty" aria-label="Choose AI opponent difficulty"><option value="chill">Chill</option><option value="standard" selected>Standard</option><option value="sharp">Sharp</option></select><button type="button" class="creative-primary" data-ai-action="start">Start match vs AI →</button></div>
              <p id="bedwarsAiStatus" class="bedwars-ai-note">One AI opponent. No sign-in, internet room or other player required.</p>
            </div>
            <details class="bedwars-online-option" id="bedwarsOnlinePanel">
              <summary>Or play online with friends (optional)</summary>
              <div class="bedwars-online-content">
                <label for="bedwarsRoomCode">Room code</label>
                <div class="bedwars-code-row"><input id="bedwarsRoomCode" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" maxlength="6" placeholder="ABC123" aria-describedby="bedwarsRoomStatus"><button type="button" class="creative-secondary" data-room-action="join">Join room</button></div>
                <div class="bedwars-room-actions"><button type="button" class="creative-primary" data-room-action="create">Create a room</button><button type="button" class="creative-primary" data-room-action="start" disabled>Start online match</button><button type="button" class="creative-secondary" data-room-action="leave" hidden>Leave room</button></div>
                <p id="bedwarsRoomStatus" role="status" aria-live="polite">Online play uses a live room. Anyone with its code can join.</p>
                <div class="bedwars-room-code-display" id="bedwarsRoomInfo" hidden>ROOM CODE <strong id="bedwarsRoomCodeDisplay"></strong><span>Share this code with friends.</span></div>
                <ul class="bedwars-player-list" id="bedwarsPlayerList" aria-label="Players in the room"></ul>
              </div>
            </details>
          </div>
        </section>
        <div class="builder-toolbar builder-3d-toolbar"><div class="builder-tools" role="group" aria-label="Actions"><button type="button" data-world-action="place" aria-label="Place a bridge block">▧ Place block <kbd>E</kbd></button><button type="button" data-world-action="interact" aria-label="Mine, attack or break a nearby bed">⛏ Interact <kbd>F</kbd></button><button type="button" data-world-action="jump">Jump <kbd>Space</kbd></button><button type="button" data-world-action="buy" hidden>Buy 8 blocks · 4 iron</button><span class="bedwars-iron" hidden><span>IRON</span><strong id="worldIron">0</strong></span></div></div>
        <div class="creative-touch-controls bedwars-touch-controls" aria-label="Touch movement controls"><button type="button" data-world-hold="forward" aria-label="Move forward">↑</button><button type="button" data-world-hold="left" aria-label="Move left">←</button><button type="button" data-world-hold="back" aria-label="Move back">↓</button><button type="button" data-world-hold="right" aria-label="Move right">→</button><button type="button" data-world-action="jump">Jump</button><button type="button" data-world-action="place">Place</button></div>
        <p class="creative-hint">W A S D / arrows move · Space jumps · E or right-click places a block · F or left-click interacts · Click the game to lock the mouse; Esc unlocks it. Drag to look if mouse lock is unavailable.</p>
      </section>
      <aside class="creative-guide"><p class="game-eyebrow">HOW TO PLAY</p><h2 id="worldGuideTitle">A little island. A lot to do.</h2><ol id="worldGuideSteps"><li><strong>Explore</strong><span>Walk, jump and look around the floating survival islands.</span></li><li><strong>Build</strong><span>Press E to place a block and bridge the gaps.</span></li><li><strong>Collect</strong><span>Mine glowing crystals and bring them back to your island.</span></li></ol><div class="creative-guide-note"><strong id="worldGuideNoteTitle">Survival mode</strong><p id="worldGuideNote">This solo world runs in your browser. Your blocks are local.</p></div><div class="bedwars-team-board" id="bedwarsTeamBoard" hidden><strong>BED STATUS</strong><span id="redBedStatus">Ember bed: safe</span><span id="blueBedStatus">Tide bed: safe</span></div></aside>
    </div>
  </div>`;
}

export function skyparkObby3DView() {
  return `<div class="creative-game obby-game obby-3d-game"><a class="arcade-back" href="#arcade">← Games home</a><header class="creative-heading"><div><p class="game-eyebrow">SKYPARK · 3D PARKOUR</p><h1>Skypark Obby 3D</h1><p>Run in depth, jump between floating platforms, and watch out for the gaps below.</p></div><div class="creative-heading-actions"><button type="button" class="creative-secondary" data-obby-action="pause">Pause</button><button type="button" class="creative-primary" data-obby-action="restart">↻ Restart course</button></div></header><div class="creative-layout"><section class="creative-main"><div class="creative-hud obby-hud" aria-label="Course progress"><div><span>STARS</span><strong id="obbyStars">0 / ${OBBY_3D_STAR_COUNT}</strong></div><div><span>CHECKPOINT</span><strong id="obbyCheckpoint">1 / 6</strong></div><div><span>TIME</span><strong id="obbyTime">00:00</strong></div><div><span>BEST</span><strong id="obbyBest">—</strong></div><div><span>FALLS</span><strong id="obbyFalls">0</strong></div><p id="obbyStatus" role="status" aria-live="polite">Reach the portal. Fall safely and restart from the latest checkpoint.</p></div><div class="creative-screen obby-screen creative-3d-screen"><canvas id="obbyCanvas" width="960" height="540" tabindex="0" role="img" aria-label="Skypark three-dimensional obstacle course. Use W A S D to move, Space to jump, and avoid falling between platforms."></canvas><div class="creative-overlay" id="obbyOverlay"><div><span class="creative-overlay-kicker">RUN · JUMP · LAND</span><h2 id="obbyOverlayTitle">Ready for the 3D course?</h2><p id="obbyOverlayText">Run forward and jump across the floating platforms. If you fall, you return to the last checkpoint.</p><button type="button" class="creative-primary" data-obby-action="start">Start the obby →</button></div></div><div class="creative-crosshair" aria-hidden="true">＋</div></div><div class="creative-touch-controls obby-3d-touch" aria-label="Touch movement controls"><button type="button" data-obby-hold="forward" aria-label="Move forward">↑</button><button type="button" data-obby-hold="left" aria-label="Move left">←</button><button type="button" data-obby-hold="back" aria-label="Move back">↓</button><button type="button" data-obby-hold="right" aria-label="Move right">→</button><button type="button" data-obby-action="jump">Jump</button></div><p class="creative-hint">W A S D / arrows to move · Space / Jump to leap · Drag to look around · Falling returns you to the last checkpoint</p></section><aside class="creative-guide"><p class="game-eyebrow">YOUR ROUTE</p><h2>Jump, land, keep going.</h2><ol><li><strong>Look ahead</strong><span>Turn the camera to line up the next platform.</span></li><li><strong>Take a leap</strong><span>Hold forward and press Space to cross the gaps.</span></li><li><strong>Reach the portal</strong><span>Touch a checkpoint flag before heading to the finish.</span></li></ol><div class="creative-guide-note"><strong>Falling is part of the game</strong><p>Miss a landing and you respawn at your most recent checkpoint. Your best finish time stays on this device.</p></div></aside></div></div>`;
}
