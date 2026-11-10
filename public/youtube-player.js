// Only accept actual YouTube video IDs and well-known YouTube URL forms.
export function parseYouTubeVideo(value) {
 const input = String(value || '').trim();
 if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
 try {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  let id;
  if (host === 'youtu.be') {
   const match = url.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/);
   id = match?.[1];
  } else if (['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host)) {
   if (url.pathname === '/watch') id = url.searchParams.get('v');
   else id = url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
  }
  return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? id : null;
 } catch { return null; }
}

export function youtubeWorkspace() {
 return `<div class="youtube-workspace"><header class="youtube-heading"><div><p class="eyebrow">WATCH &amp; EXPLORE</p><h1>YouTube player</h1><p>Find a video on YouTube, then paste its link here to watch.</p></div><a href="#videos">Browse video lessons →</a></header>
 <div class="youtube-layout"><section class="youtube-main" aria-labelledby="youtubePlayerTitle"><div class="youtube-panel-heading"><div><p class="eyebrow">YOUR PLAYER</p><h2 id="youtubePlayerTitle">Watch a video</h2></div><span class="youtube-badge">▶ &nbsp; YouTube</span></div>
 <form id="youtubePlayForm"><label for="youtubeLink">YouTube video link or ID</label><div class="youtube-form-row"><input id="youtubeLink" name="video" type="text" placeholder="Paste a YouTube link here" autocomplete="off" maxlength="2048" aria-describedby="youtubeLinkHelp youtubeError" required><button class="btn dark" type="submit">Load video</button></div><p id="youtubeLinkHelp" class="youtube-hint">Supports watch links, youtu.be, Shorts and live video links.</p><p id="youtubeError" class="youtube-error" role="alert"></p></form>
 <div id="youtubePlayer" class="youtube-player"><div class="youtube-placeholder"><span aria-hidden="true">▶</span><strong>Your video will appear here</strong><p>Paste a link above to get started.</p></div></div>
 <div id="youtubeActions" class="youtube-actions" hidden><button type="button" id="youtubeStop">Stop video</button><a id="youtubeOpen" target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a></div><p class="youtube-hint">Some videos cannot be embedded. If a video does not play, use the YouTube link. Playback, ads and privacy are controlled by YouTube and the creator.</p></section>
 <aside class="youtube-search-panel"><p class="eyebrow">FIND SOMETHING</p><h2>Search YouTube</h2><p>Search opens YouTube in a new tab. Copy a video link and paste it into the player to watch here.</p><form id="youtubeSearchForm" action="https://www.youtube.com/results" method="get" target="_blank" rel="noopener noreferrer"><label for="youtubeQuery">Search for videos</label><div class="youtube-search-row"><input id="youtubeQuery" name="search_query" type="search" maxlength="200" placeholder="Search YouTube…" autocomplete="off" required><button class="btn dark" type="submit">Search ↗</button></div><p id="youtubeSearchError" class="youtube-error" role="alert"></p></form><div class="youtube-note"><strong>Good to know</strong><p>Search results are provided by YouTube and are not reviewed by Everything Hub. YouTube may collect data when you search or play a video.</p></div></aside></div></div>`;
}

export function mountYouTubeWorkspace({root,win=window}) {
 const play=root.querySelector('#youtubePlayForm'), search=root.querySelector('#youtubeSearchForm');
 const input=root.querySelector('#youtubeLink'), error=root.querySelector('#youtubeError'), player=root.querySelector('#youtubePlayer'), actions=root.querySelector('#youtubeActions'), open=root.querySelector('#youtubeOpen');
 const placeholder=player.innerHTML;
 function playVideo(event){
  event.preventDefault();
  const id=parseYouTubeVideo(input.value);
  if(!id){error.textContent='Enter a valid YouTube video link or 11-character video ID.';input.setAttribute('aria-invalid','true');return;}
  error.textContent='';input.removeAttribute('aria-invalid');
  const frame=win.document.createElement('iframe');frame.src=`https://www.youtube-nocookie.com/embed/${id}?rel=0`;frame.title='YouTube video player';frame.setAttribute('referrerpolicy','strict-origin-when-cross-origin');frame.setAttribute('allow','accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen');frame.setAttribute('allowfullscreen','');
  player.replaceChildren(frame);open.href=`https://www.youtube.com/watch?v=${id}`;actions.hidden=false;
 }
 function checkSearch(event){const query=root.querySelector('#youtubeQuery');const message=root.querySelector('#youtubeSearchError');if(!query.value.trim()){event.preventDefault();message.textContent='Enter something to search for.';query.setAttribute('aria-invalid','true');query.focus();}else{query.value=query.value.trim();message.textContent='';query.removeAttribute('aria-invalid');}}
 function stop(){player.innerHTML=placeholder;actions.hidden=true;open.removeAttribute('href');}
 play.addEventListener('submit',playVideo);search.addEventListener('submit',checkSearch);root.querySelector('#youtubeStop').addEventListener('click',stop);
 return {destroy(){play.removeEventListener('submit',playVideo);search.removeEventListener('submit',checkSearch);root.querySelector('#youtubeStop')?.removeEventListener('click',stop);player.replaceChildren();}};
}
