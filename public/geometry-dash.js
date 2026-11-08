const url='https://www.geometrydash.com/';

// The official website includes a free browser demo, not the full game.
export function geometryDashView(){return `<div class="geometry-page"><a class="arcade-back" href="#arcade">← Back to Games</a><header class="geometry-heading"><div><p class="game-eyebrow">PLAY</p><h1>Geometry Dash</h1><p>Play the free browser demo from the official Geometry Dash website.</p></div><a class="geometry-open" href="${url}" target="_blank" rel="noopener noreferrer">Open in a new tab ↗</a></header><div class="geometry-screen"><iframe id="geometryFrame" title="Geometry Dash official website and browser demo" src="${url}" sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups" allow="fullscreen; autoplay; gamepad" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><div class="geometry-controls"><button type="button" id="geometryFullscreen">Fullscreen</button><button type="button" id="geometryReload">Reload game</button></div><p class="geometry-note">On the official site, choose <strong>Play Level 1</strong> to start the free demo. The full game is separate. If the game doesn’t appear or refuses to connect, <a href="${url}" target="_blank" rel="noopener noreferrer">open the official site in a new tab</a>. Game availability and device support are controlled by RobTop Games.</p><p id="geometryStatus" role="status" aria-live="polite" class="geometry-status"></p></div>`;}

export function mountGeometryDash(root){
 const frame=root.querySelector('#geometryFrame'),status=root.querySelector('#geometryStatus');
 function click(event){const button=event.target.closest('button');if(!button)return;
  if(button.id==='geometryReload'){frame.src=url;status.textContent='Reloading the game. Your current run may be lost.';}
  if(button.id==='geometryFullscreen'){
   if(!frame.requestFullscreen){status.textContent='Fullscreen is not available here. Try opening the game in a new tab.';return;}
   frame.requestFullscreen().catch(()=>{status.textContent='Fullscreen could not be opened. Try the new-tab link.';});
  }
 }
 root.addEventListener('click',click);
 return {destroy(){root.removeEventListener('click',click);frame.remove();}};
}
