import {classroomCards, classroomView, mountClassroom} from './classroom-games.js?v=20261106-3';
import {spotlightView, mountSpotlight} from './featured-games.js?v=20261114-8';
import {geometryDashView, mountGeometryDash} from './geometry-dash.js?v=20261114-7';
import {libraryView, embedView, mountLibrary, mountEmbeddedGame} from './embedded-games.js?v=20261114-13';
import {newRunner,newOrbit,newReef,jumpRunner,launchReef,stepGame,WIDTH,HEIGHT} from './arcade-engine.js?v=20261113-1';
import {drawArcade} from './arcade-render.js?v=20261113-1';
import {blockWorld3DView,skyparkObby3DView} from './arcade-3d-views.js?v=20261106-2';

const originalGames=[
 {slug:'skyline',name:'Skyline Sprint',category:'ENDLESS RUNNER',description:'Leap across rooftops, dodge obstacles and chase your best run.',image:'assets/game-screenshots/skyline.png'},
 {slug:'orbit',name:'Orbit Defender',category:'SPACE ACTION',description:'Take on waves of drones in a fast, colourful space battle.',image:'assets/game-screenshots/orbit.png'},
 {slug:'reef',name:'Reef Breaker',category:'ACTION PUZZLE',description:'Bounce through an underwater world and smash every crystal.',image:'assets/game-screenshots/reef.png'},
 {slug:'block-world',name:'Blockbound 3D',category:'SURVIVAL + BED WARS',description:'Explore the islands or battle an AI rival in first-person 3D.',art:'blockworld'},
 {slug:'skypark-obby',name:'Skypark Obby 3D',category:'3D PARKOUR CHALLENGE',description:'Jump across floating platforms, collect stars and try not to fall.',art:'obby'}
];
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function originalGameCards(){return originalGames.map(game=>`<a class="arcade-game-card" href="#arcade/${game.slug}"><div class="arcade-card-art ${game.art?`arcade-card-art-${game.art}`:''}" aria-hidden="true">${game.image?`<img src="${game.image}" alt="" loading="lazy" width="960" height="540">`:game.art==='blockworld'?'<span class="block-art-sun">☀</span><span class="block-art-tree">▥</span><span class="block-art-ground">▰ ▰ ▰</span>':'<span class="obby-art-star">✦</span><span class="obby-art-portal">◉</span><span class="obby-art-platform">━━━━</span>'}<span class="arcade-card-badge">PLAY HERE</span></div><div class="arcade-card-copy"><small>${game.category}</small><h3>${game.name}</h3><p>${game.description}</p><strong>Play now <span aria-hidden="true">→</span></strong></div></a>`).join('');}

const games={
 skyline:{name:'Skyline Sprint',category:'ENDLESS RUNNER',description:'Leap across the rooftops, dodge obstacles and chase your best run.',image:'skyline.png',controls:'Space, ↑, tap the screen or use Jump to leap. Jump again in mid-air for a double jump. Every 8 coins restores a heart.',goal:'Run as far as you can. You have three hearts.'},
 orbit:{name:'Orbit Defender',category:'SPACE ARCADE',description:'Pilot your ship through waves of drones in a fast-paced space battle.',image:'orbit.png',controls:'Use ← / →, A / D, the on-screen buttons or drag the ship. Your ship fires automatically; wave 2 unlocks twin shots. Chain hits for bonus points.',goal:'Clear waves, dodge enemy fire and protect your three shields.'},
 reef:{name:'Reef Breaker',category:'ACTION PUZZLE',description:'Bounce through a glowing underwater world and smash every crystal.',image:'reef.png',controls:'Use ← / →, A / D, the on-screen buttons or drag to move. Press Space or Launch to serve. Catch glowing drops to widen your paddle.',goal:'Clear three levels. Keep the pearl in play—you have three lives.'}
};
const factory={skyline:newRunner,orbit:newOrbit,reef:newReef};
export function arcadeView(id, view){
 if(id==='geometry-dash'||id==='designer')return geometryDashView();
 if(id==='library')return libraryView();
 if(id==='spotlight')return spotlightView(view);
 if(id==='classroom')return classroomView(view);
 if(id==='play')return embedView(view);
 if(id==='block-world')return blockWorld3DView();
 if(id==='skypark-obby')return skyparkObby3DView();
 if(!games[id])return `<div class="game-hub games-home"><section class="games-home-hero"><div class="games-home-copy"><p class="game-eyebrow">THE PLAYGROUND</p><h1>Make, move<br><em>and play.</em></h1><p>Build a little world, take on a floating parkour course, or pick a quick arcade favourite. Start playing right here.</p><div class="games-home-actions"><a href="#arcade/block-world">Build a world <span aria-hidden="true">→</span></a><a href="#arcade/skypark-obby">Try the obby</a></div><div class="games-home-proof"><span><strong>5</strong> original games</span><span><strong>0</strong> downloads needed</span><span><strong>1</strong> place to play</span></div></div><div class="games-home-art" aria-hidden="true"><span class="games-art-spark games-art-spark-one">✦</span><span class="games-art-spark games-art-spark-two">✦</span><div class="games-art-block games-art-block-back"></div><div class="games-art-block games-art-block-mid"></div><div class="games-art-block games-art-block-front"></div><div class="games-art-avatar"><i></i><b></b><span></span></div><div class="games-art-orbit"></div></div></section><div class="game-type-grid"><a href="#games" class="game-type study-type"><span class="type-icon">✦</span><div><small>LEARN AND PLAY</small><h2>Study games</h2><p>Practise with flashcards, challenge yourself, or play live with friends.</p><strong>Choose a study game →</strong></div></a><a href="#arcade/library" class="game-type library-type"><span class="type-icon">▦</span><div><small>THE WIDER COLLECTION</small><h2>Browse more games</h2><p>Search an independent collection of browser games by name or genre.</p><strong>Open the game collection →</strong></div></a></div><section class="games-original-section" aria-labelledby="gamesOriginalTitle"><header class="game-feature-heading"><div><p class="game-eyebrow">PLAY HERE · MADE FOR THIS HUB</p><h2 id="gamesOriginalTitle">Your next adventure</h2><p>Original, locally hosted games. No downloads, third-party sign-in or external game host required.</p></div><span>5 games</span></header><div class="arcade-game-shelf">${originalGameCards()}</div></section><section class="games-classroom-section"><div class="featured-heading"><div><p class="game-eyebrow">PLAY FOR FUN · THIRD-PARTY GAMES</p><h2>Classroom favourites</h2><p>These games use sources recovered from their Classroom Resources pages. Hosts may show ads or stop working.</p><p>More games are available on the <a href="https://sites.google.com/view/drive-u-7-home/home" target="_blank" rel="noopener noreferrer">Classroom Resources home page ↗</a>; not all are available in this collection yet.</p></div></div><div class="featured-grid">${classroomCards()}</div></section></div>`;
 const g=games[id];return `<div class="arcade-play adventure-play"><a class="arcade-back" href="#arcade">← Back to games</a><div class="adventure-title"><div><p class="game-eyebrow">${g.category}</p><h1>${g.name}</h1><p>${g.description}</p></div><button class="adventure-utility" type="button" data-action="restart">↻ &nbsp; Restart</button></div><div class="adventure-layout"><div class="adventure-main"><div class="adventure-hud"><div><span>SCORE</span><strong id="arcadeScore">0</strong></div><div><span>BEST</span><strong id="arcadeBest">0</strong></div><div><span id="arcadeProgressLabel">${id==='orbit'?'WAVE':id==='reef'?'LEVEL':'DISTANCE'}</span><strong id="arcadeProgress">${id==='skyline'?'0 m':'1'}</strong></div><div><span>${id==='orbit'?'SHIELDS':'LIVES'}</span><strong id="arcadeLives">♥ ♥ ♥</strong></div><button class="adventure-utility" type="button" data-action="pause" disabled>Pause</button></div><div class="adventure-screen"><canvas id="gameCanvas" width="960" height="540" tabindex="0" role="img" aria-label="${g.name} game area. ${g.controls}"></canvas><div class="adventure-overlay" id="gameOverlay"><div><span class="overlay-tag">${g.category}</span><h2 id="overlayTitle">Ready to play?</h2><p id="overlayText">${g.goal}</p><button type="button" class="adventure-start" data-action="start">Start game →</button></div></div></div><p class="adventure-status" id="gameStatus" role="status" aria-live="polite">${g.goal}</p><div class="adventure-controls" aria-label="Game controls">${id==='skyline'?'<button type="button" data-action="jump">↑ &nbsp; Jump</button>':'<button type="button" data-hold="left" aria-label="Move left">←</button><button type="button" data-hold="right" aria-label="Move right">→</button>'}${id==='reef'?'<button type="button" data-action="launch">Launch pearl</button>':''}</div></div><aside class="adventure-guide"><p class="game-eyebrow">HOW TO PLAY</p><h2>${g.name}</h2><p>${g.goal}</p><div class="guide-divider"></div><h3>Controls</h3><p>${g.controls}</p><p class="guide-note">Pause anytime. Your best score is saved on this device, not to your account.</p></aside></div></div>`;
}
function mountLazy3DGame({root, mountName, ...options}){
 let destroyed=false,controller=null;
 const obby=mountName==='mountSkyparkObby3D',pending=[];
 const controls=obby?'[data-obby-action]':'[data-world-action],[data-world-mode],[data-room-action],[data-ai-action]';
 const startSelector=obby?'[data-obby-action="start"]':'[data-world-action="start"]';
 const capture=event=>{
  const button=event.target.closest?.(controls);
  if(!button||controller)return;
  pending.push(button);
  if(button.matches(startSelector)){
   const overlay=root.querySelector(obby?'#obbyOverlay':'#worldOverlay');
   const status=root.querySelector(obby?'#obbyStatus':'#worldStatus');
   if(overlay)overlay.hidden=true;
   if(status)status.textContent='Loading the 3D game…';
  }
 };
 root.addEventListener('click',capture,true);
 import('./arcade-3d-game.js?v=20261106-2').then(module=>{
  if(destroyed)return;
  root.removeEventListener('click',capture,true);
  controller=module[mountName]({...options,root});
  for(const button of pending)if(button.isConnected)button.click();
  pending.length=0;
 }).catch(()=>{
  root.removeEventListener('click',capture,true);
  if(destroyed)return;
  const overlay=root.querySelector(obby?'#obbyOverlay':'#worldOverlay');
  const status=root.querySelector(obby?'#obbyStatus':'#worldStatus');
  if(overlay&&pending.some(button=>button.matches(startSelector)))overlay.hidden=false;
  if(status)status.textContent='The 3D game could not load. Refresh the page and try again.';
 });
 return {destroy(){destroyed=true;root.removeEventListener('click',capture,true);pending.length=0;controller?.destroy();}};
}
export function mountArcade({root,id,view,userId,playerName,client,state,save,toast,onReward=()=>{},win=window}){
 if(id==='geometry-dash'||id==='designer')return mountGeometryDash(root);
 if(id==='library')return mountLibrary(root);
 if(id==='spotlight')return mountSpotlight(root);
 if(id==='classroom')return mountClassroom(root,view,win);
 if(id==='block-world')return mountLazy3DGame({root,mountName:'mountBlockWorld3D',userId,playerName,client,win});
 if(id==='skypark-obby')return mountLazy3DGame({root,mountName:'mountSkyparkObby3D',userId,playerName,onReward,win});
 if(id==='play')return mountEmbeddedGame(root,view,win);
 if(!games[id])return {destroy(){}};
 const q=s=>root.querySelector(s),canvas=q('#gameCanvas'),overlay=q('#gameOverlay'),score=q('#arcadeScore'),bestEl=q('#arcadeBest'),lives=q('#arcadeLives'),progress=q('#arcadeProgress'),status=q('#gameStatus'),pause=q('[data-action=pause]'),overlayTitle=q('#overlayTitle'),overlayText=q('#overlayText'),start=q('[data-action=start]');
 const key=`everything-arcade-v2-${id}-${userId}`;let best=0;try{best=Math.max(0,Number(win.localStorage.getItem(key))||0);}catch{}let game=factory[id](),frame=null,last=null,input={left:false,right:false,pointerX:null},pointerId=null,lastMessage='';const background=new win.Image();background.src=`assets/arcade/${id}-bg.jpg`;background.onload=()=>draw();
 const saveBest=()=>{best=Math.max(best,game.score);};
 const persistBest=()=>{saveBest();try{win.localStorage.setItem(key,String(best));}catch{}};
 function update(){saveBest();score.textContent=String(game.score);bestEl.textContent=String(best);lives.textContent='♥ '.repeat(Math.max(0,game.lives)).trim()||'—';progress.textContent=id==='skyline'?`${Math.floor(game.distance/10)} m`:String(id==='orbit'?game.wave:game.level);pause.disabled=game.status==='ready'||game.status==='lost'||game.status==='won';pause.textContent=game.status==='paused'?'Resume':'Pause';const shown=game.status!=='running';overlay.hidden=!shown;
 let message=game.status==='ready'?games[id].goal:game.status==='paused'?'Paused. Take your time.':game.status==='lost'?'Game over. Ready for another go?':game.status==='won'?'All three levels cleared. You win!':id==='reef'&&!game.launched?'Press Space or Launch pearl to serve.':id==='orbit'?`Wave ${game.wave}${game.wave>=2?" · Twin shots active":""}${game.combo>1?` · ${game.combo} hit chain`:""}. Move to dodge incoming fire.`:id==='skyline'?'Double jump over obstacles; every 8 coins restores a heart.':`Level ${game.level}${game.wideTimer>0?" · Wide paddle active":""}. Catch drops and chain crystal hits for bonus points.`;
 if(message!==lastMessage){status.textContent=message;lastMessage=message;}if(shown){overlayTitle.textContent=game.status==='ready'?'Ready to play?':game.status==='paused'?'Paused':game.status==='won'?'You cleared the reef!':'Game over';overlayText.textContent=message;start.textContent=game.status==='paused'?'Resume →':game.status==='ready'?'Start game →':'Play again →';}}
 function draw(){try{drawArcade(canvas,game,background);}catch(error){if(!/not implemented/i.test(String(error)))throw error;}}
 function stop(){persistBest();if(frame!==null)win.cancelAnimationFrame(frame);frame=null;last=null;input={left:false,right:false,pointerX:null};pointerId=null;}
 function loop(t){if(game.status!=='running'){stop();update();draw();return;}if(last!==null)stepGame(game,(t-last)/1000,input);last=t;draw();update();if(game.status==='running')frame=win.requestAnimationFrame(loop);else{stop();if(game.status==='lost'||game.status==='won')onReward('arcade');}}
 function run(){if(game.status==='lost'||game.status==='won')game=factory[id]();if(game.status==='ready'||game.status==='paused'){game.status='running';if(id==='reef'&&!game.launched)launchReef(game);update();canvas.focus({preventScroll:true});if(frame===null)frame=win.requestAnimationFrame(loop);}}
 function pauseGame(){if(game.status==='running'){game.status='paused';stop();update();draw();}else if(game.status==='paused')run();}
 function restart(){stop();game=factory[id]();lastMessage='';update();draw();}
 function click(e){const b=e.target.closest('button');if(!b)return;const action=b.dataset.action;if(action==='start')run();else if(action==='pause')pauseGame();else if(action==='restart')restart();else if(action==='jump'){jumpRunner(game);canvas.focus({preventScroll:true});}else if(action==='launch'){launchReef(game);update();canvas.focus({preventScroll:true});}else if(b.dataset.hold&&e.detail===0&&game.status==='running'){const delta=b.dataset.hold==='left'?-65:65;if(id==='orbit')game.x=Math.max(35,Math.min(WIDTH-35,game.x+delta));else game.paddle=Math.max(82,Math.min(WIDTH-82,game.paddle+delta));draw();}}
 function keyDown(e){if(e.target.closest?.('input,textarea,select,[contenteditable=true],a,button:not([data-hold])'))return;const k=e.key.toLowerCase();if(['arrowleft','a','arrowright','d','arrowup',' ','p'].includes(k)&&game.status==='running'){if(k!=='p')e.preventDefault();if(k==='arrowleft'||k==='a')input.left=true;if(k==='arrowright'||k==='d')input.right=true;if((k===' '||k==='arrowup')&&!e.repeat){if(id==='skyline')jumpRunner(game);if(id==='reef')launchReef(game);}if(k==='p'&&!e.repeat)pauseGame();}}
 function keyUp(e){const k=e.key.toLowerCase();if(k==='arrowleft'||k==='a')input.left=false;if(k==='arrowright'||k==='d')input.right=false;}
 function position(e){const rect=canvas.getBoundingClientRect();return (e.clientX-rect.left)/rect.width*WIDTH;}
 function down(e){const hold=e.target.closest('[data-hold]');if(hold&&game.status==='running'){e.preventDefault();input[hold.dataset.hold]=true;hold.setPointerCapture?.(e.pointerId);return;}if(e.target!==canvas||game.status!=='running')return;e.preventDefault();canvas.focus({preventScroll:true});if(id==='skyline')jumpRunner(game);else{pointerId=e.pointerId;input.pointerX=position(e);canvas.setPointerCapture?.(pointerId);if(id==='reef'&&!game.launched)launchReef(game);}}
 function move(e){if(pointerId===e.pointerId&&e.target===canvas)input.pointerX=position(e);}
 function up(e){const hold=e.target.closest('[data-hold]');if(hold)input[hold.dataset.hold]=false;if(pointerId===e.pointerId){pointerId=null;input.pointerX=null;}}
 function visibility(){if(win.document.hidden&&game.status==='running')pauseGame();}
 function blur(){if(game.status==='running')pauseGame();}
 root.addEventListener('click',click);root.addEventListener('pointerdown',down);root.addEventListener('pointermove',move);root.addEventListener('pointerup',up);root.addEventListener('pointercancel',up);win.addEventListener('keydown',keyDown);win.addEventListener('keyup',keyUp);win.document.addEventListener('visibilitychange',visibility);win.addEventListener('blur',blur);update();draw();return {destroy(){background.onload=null;stop();root.removeEventListener('click',click);root.removeEventListener('pointerdown',down);root.removeEventListener('pointermove',move);root.removeEventListener('pointerup',up);root.removeEventListener('pointercancel',up);win.removeEventListener('keydown',keyDown);win.removeEventListener('keyup',keyUp);win.document.removeEventListener('visibilitychange',visibility);win.removeEventListener('blur',blur);}};
}
