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

export function youtubeWorkspace(videoList = []) {
 const count = Array.isArray(videoList) ? videoList.length : 0;
 return `<div class="youtube-workspace"><header class="youtube-heading"><div><p class="eyebrow">WATCH &amp; EXPLORE</p><h1>YouTube player</h1><p>Search selected lessons here or search all of YouTube and play a video below.</p></div><a href="#videos">Browse video lessons →</a></header>
 <div class="youtube-layout"><section class="youtube-main" aria-labelledby="youtubePlayerTitle"><div class="youtube-panel-heading"><div><p class="eyebrow">YOUR PLAYER</p><h2 id="youtubePlayerTitle">Watch a video</h2></div><span class="youtube-badge">▶ &nbsp; YouTube</span></div>
 <form id="youtubePlayForm"><label for="youtubeLink">YouTube video link or ID</label><div class="youtube-form-row"><input id="youtubeLink" name="video" type="text" placeholder="Paste a YouTube link here" autocomplete="off" maxlength="2048" aria-describedby="youtubeLinkHelp youtubeError" required><button class="btn dark" type="submit">Load video</button></div><p id="youtubeLinkHelp" class="youtube-hint">Supports watch links, youtu.be, Shorts and live video links.</p><p id="youtubeError" class="youtube-error" role="alert"></p></form>
 <div id="youtubePlayer" class="youtube-player"><div class="youtube-placeholder"><span aria-hidden="true">▶</span><strong>Your video will appear here</strong><p>Choose a result or paste a link above.</p></div></div>
 <div id="youtubeActions" class="youtube-actions" hidden><button type="button" id="youtubeStop">Stop video</button><a id="youtubeOpen" target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a></div><p class="youtube-hint">Some videos cannot be embedded. If a video does not play, use the YouTube link. Playback, ads and privacy are controlled by YouTube and the creator.</p></section>
 <aside class="youtube-search-panel"><p class="eyebrow">FIND SOMETHING</p><h2>Search videos</h2>
 <form id="youtubeLibrarySearchForm"><label for="youtubeLibraryQuery">Search selected video lessons</label><div class="youtube-search-row"><input id="youtubeLibraryQuery" type="search" maxlength="100" placeholder="Try biology, rivers, GCSE…" autocomplete="off" required><button class="btn dark" type="submit">Find lessons</button></div></form>
 <p id="youtubeLibraryStatus" class="youtube-search-status" role="status" aria-live="polite">Search ${count} selected lesson videos by title, topic, subject or creator. Search all of YouTube below for more.</p><div id="youtubeLibraryResults" class="youtube-library-results" aria-label="Selected video lesson results"></div>
 <section class="youtube-all-search" aria-labelledby="youtubeAllSearchTitle"><h3 id="youtubeAllSearchTitle">Search all of YouTube</h3><p>For videos outside the selected lesson collection, open YouTube’s official results.</p><form id="youtubeSearchForm" action="https://www.youtube.com/results" method="get" target="_blank" rel="noopener noreferrer"><label for="youtubeQuery">Search YouTube</label><div class="youtube-search-row"><input id="youtubeQuery" name="search_query" type="search" maxlength="200" placeholder="Search all YouTube…" autocomplete="off" required><button class="btn dark" type="submit">Search ↗</button></div><p id="youtubeSearchError" class="youtube-error" role="alert"></p></form></section>
 <div class="youtube-note"><strong>Good to know</strong><p>Lesson search filters this hub’s selected videos. Choosing a result loads its thumbnail and player from YouTube; all-YouTube search opens YouTube’s own results. YouTube may collect data when you search all of YouTube or play a video.</p></div></aside></div></div>`;
}

export function mountYouTubeWorkspace({root,win=window,videos=[]}) {
 const play=root.querySelector('#youtubePlayForm'), search=root.querySelector('#youtubeSearchForm'), librarySearch=root.querySelector('#youtubeLibrarySearchForm');
 const input=root.querySelector('#youtubeLink'), error=root.querySelector('#youtubeError'), player=root.querySelector('#youtubePlayer'), actions=root.querySelector('#youtubeActions'), open=root.querySelector('#youtubeOpen');
 const libraryInput=root.querySelector('#youtubeLibraryQuery'), libraryStatus=root.querySelector('#youtubeLibraryStatus'), libraryResults=root.querySelector('#youtubeLibraryResults'), youtubeQuery=root.querySelector('#youtubeQuery');
 const selectedVideos=Array.isArray(videos)?videos:[];
 const placeholder=player.innerHTML, maxResults=12;
 function loadVideo(id){
  input.value=id;error.textContent='';input.removeAttribute('aria-invalid');
  const frame=win.document.createElement('iframe');frame.src=`https://www.youtube-nocookie.com/embed/${id}?rel=0`;frame.title='YouTube video player';frame.setAttribute('referrerpolicy','strict-origin-when-cross-origin');frame.setAttribute('allow','accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen');frame.setAttribute('allowfullscreen','');
  player.replaceChildren(frame);open.href=`https://www.youtube.com/watch?v=${id}`;actions.hidden=false;
 }
 function playVideo(event){
  event.preventDefault();
  const id=parseYouTubeVideo(input.value);
  if(!id){error.textContent='Enter a valid YouTube video link or 11-character video ID.';input.setAttribute('aria-invalid','true');return;}
  loadVideo(id);
 }
 function searchLessons(event){
  event.preventDefault();
  const term=libraryInput.value.trim().toLowerCase();libraryInput.value=libraryInput.value.trim();libraryResults.replaceChildren();
  if(!term){libraryInput.setAttribute('aria-invalid','true');libraryStatus.textContent='Enter a title, subject or topic to search the selected lessons.';return;}
  libraryInput.removeAttribute('aria-invalid');youtubeQuery.value=libraryInput.value;
  const matches=selectedVideos.filter(video=>[video.title,video.creator,video.level,video.description,...(Array.isArray(video.subjects)?video.subjects:[])].map(value=>String(value||'')).join(' ').toLowerCase().includes(term));
  const cards=[];
  for(const video of matches){
   const id=parseYouTubeVideo(video.url);if(!id)continue;
   const card=win.document.createElement('button');card.type='button';card.className='youtube-result-card';card.dataset.youtubeVideo=id;card.setAttribute('aria-label',`Play video: ${video.title}`);
   const thumbnail=win.document.createElement('img');thumbnail.src=`https://i.ytimg.com/vi/${id}/mqdefault.jpg`;thumbnail.alt='';thumbnail.loading='lazy';thumbnail.referrerPolicy='no-referrer';
   const copy=win.document.createElement('span');copy.className='youtube-result-copy';
   const title=win.document.createElement('strong');title.textContent=String(video.title||'Untitled video');
   const details=win.document.createElement('span');details.className='youtube-result-details';details.textContent=[video.creator,(Array.isArray(video.subjects)?video.subjects.slice(0,2):[]).join(' · ')].filter(Boolean).join(' · ');
   const description=win.document.createElement('small');description.textContent=String(video.description||'');
   copy.append(title,details,description);card.append(thumbnail,copy);cards.push(card);
  }
  const shown=cards.slice(0,maxResults);libraryResults.replaceChildren(...shown);
  if(!cards.length)libraryStatus.textContent='No selected lesson videos match. Search all of YouTube below for broader results.';
  else libraryStatus.textContent=`${cards.length} selected lesson video${cards.length===1?'':'s'} found. ${cards.length>maxResults?`Showing the first ${maxResults}; refine your search for more.`:'Select a result to play it here.'}`;
 }
 function selectLesson(event){
  const card=event.target.closest?.('[data-youtube-video]');if(!card||!libraryResults.contains(card))return;
  const id=parseYouTubeVideo(card.dataset.youtubeVideo);if(!id)return;
  loadVideo(id);player.scrollIntoView?.({behavior:'smooth',block:'start'});
 }
 function checkSearch(event){if(!youtubeQuery.value.trim()){event.preventDefault();root.querySelector('#youtubeSearchError').textContent='Enter something to search for.';youtubeQuery.setAttribute('aria-invalid','true');youtubeQuery.focus();}else{youtubeQuery.value=youtubeQuery.value.trim();root.querySelector('#youtubeSearchError').textContent='';youtubeQuery.removeAttribute('aria-invalid');}}
 function stop(){player.innerHTML=placeholder;actions.hidden=true;open.removeAttribute('href');}
 play.addEventListener('submit',playVideo);search.addEventListener('submit',checkSearch);librarySearch.addEventListener('submit',searchLessons);libraryResults.addEventListener('click',selectLesson);root.querySelector('#youtubeStop').addEventListener('click',stop);
 return {destroy(){play.removeEventListener('submit',playVideo);search.removeEventListener('submit',checkSearch);librarySearch.removeEventListener('submit',searchLessons);libraryResults.removeEventListener('click',selectLesson);root.querySelector('#youtubeStop')?.removeEventListener('click',stop);player.replaceChildren();libraryResults.replaceChildren();}};
}
