// Accept only real YouTube IDs and well-known HTTPS video URL forms. These
// links are used to build safe YouTube destinations, never embedded players.
export function parseYouTubeVideo(value) {
 const input=String(value||'').trim();
 if(/^[A-Za-z0-9_-]{11}$/.test(input))return input;
 try{
  const url=new URL(input);
  if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
  const host=url.hostname.toLowerCase();let id;
  if(host==='youtu.be')id=url.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
  else if(['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host)){
   if(url.pathname==='/watch')id=url.searchParams.get('v');
   else id=url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
  }
  return /^[A-Za-z0-9_-]{11}$/.test(id||'')?id:null;
 }catch{return null;}
}

export function youtubeWorkspace(videoList=[]) {
 const count=Array.isArray(videoList)?videoList.length:0;
 return `<div class="youtube-workspace"><header class="youtube-heading"><div><p class="eyebrow">WATCH &amp; EXPLORE</p><h1>Bing Videos</h1><p>Search this hub’s selected video lessons, or find more with Bing Videos.</p></div><a href="#videos">Browse video lessons →</a></header>
 <div class="youtube-layout"><section class="youtube-main" aria-labelledby="youtubeLibraryTitle"><div class="youtube-panel-heading"><div><p class="eyebrow">SELECTED LESSONS</p><h2 id="youtubeLibraryTitle">Search video lessons</h2></div></div>
 <p class="youtube-hint">Find lessons from this hub’s selected videos. Open a result to watch it on YouTube in a new tab.</p>
 <form id="youtubeLibrarySearchForm"><label for="youtubeLibraryQuery">Search selected video lessons</label><div class="youtube-search-row"><input id="youtubeLibraryQuery" type="search" maxlength="100" placeholder="Try biology, rivers, GCSE…" autocomplete="off" required><button class="btn dark" type="submit">Find lessons</button></div></form>
 <p id="youtubeLibraryStatus" class="youtube-search-status" role="status" aria-live="polite">Search ${count} selected lesson videos by title, topic, subject or creator.</p><div id="youtubeLibraryResults" class="youtube-library-results" aria-label="Selected video lesson results"></div>
 </section></div>
 <section class="youtube-all-search bing-videos-search" aria-labelledby="bingVideosTitle"><p class="eyebrow">SEARCH THE WEB</p><h2 id="bingVideosTitle">Search Bing Videos on this page</h2><p>Submit a topic to load Bing’s video results in the panel below. If Bing does not allow its results page to be embedded, use the direct Bing link.</p>
 <form id="bingVideosSearchForm" action="https://www.bing.com/videos/search" method="get" target="bingVideosFrame"><label for="bingVideosQuery">Search Bing Videos</label><div class="youtube-search-row"><input id="bingVideosQuery" name="q" type="search" maxlength="200" placeholder="Search videos on Bing…" autocomplete="off" required><input type="hidden" name="mkt" value="en-GB"><button class="btn dark" type="submit">Search Bing</button></div><p id="bingVideosSearchError" class="youtube-error" role="alert"></p></form>
 <p id="bingVideosStatus" class="youtube-search-status" role="status" aria-live="polite">Your search will load Bing Videos here. Bing controls whether its results page can be embedded.</p><a id="bingVideosOpen" class="bing-videos-open" target="_blank" rel="noopener noreferrer" hidden>Open Bing results in a new tab ↗</a>
 <div id="bingVideosFrameWrap" class="bing-videos-frame-wrap" hidden><iframe id="bingVideosFrame" name="bingVideosFrame" src="about:blank" title="Bing Videos search results" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>
 <div class="youtube-note"><strong>Good to know</strong><p>Lesson search filters this hub’s selected videos; opening a lesson takes you to YouTube. Bing search loads Bing’s video-results page here if Bing allows it. Searches and playback are handled by each video provider and may involve their cookies or privacy settings.</p></div></section>
 </div>`;
}

export function mountYouTubeWorkspace({root,win=window,videos=[]}) {
 const bingSearch=root.querySelector('#bingVideosSearchForm'),librarySearch=root.querySelector('#youtubeLibrarySearchForm');
 const libraryInput=root.querySelector('#youtubeLibraryQuery'),libraryStatus=root.querySelector('#youtubeLibraryStatus'),libraryResults=root.querySelector('#youtubeLibraryResults');
 const bingQuery=root.querySelector('#bingVideosQuery'),bingStatus=root.querySelector('#bingVideosStatus'),bingError=root.querySelector('#bingVideosSearchError'),bingFrame=root.querySelector('#bingVideosFrame'),bingFrameWrap=root.querySelector('#bingVideosFrameWrap'),bingOpen=root.querySelector('#bingVideosOpen');
 const selectedVideos=Array.isArray(videos)?videos:[];
 const maxResults=12;
 function searchLessons(event){
  event.preventDefault();
  const term=libraryInput.value.trim().toLowerCase();libraryInput.value=libraryInput.value.trim();libraryResults.replaceChildren();
  if(!term){libraryInput.setAttribute('aria-invalid','true');libraryStatus.textContent='Enter a title, subject or topic to search the selected lessons.';return;}
  libraryInput.removeAttribute('aria-invalid');bingQuery.value=libraryInput.value;
  const cards=[];
  for(const video of selectedVideos){
   const haystack=[video.title,video.creator,video.level,video.description,...(Array.isArray(video.subjects)?video.subjects:[])].map(value=>String(value||'')).join(' ').toLowerCase();
   if(!haystack.includes(term))continue;
   const id=parseYouTubeVideo(video.url);if(!id)continue;
   const titleText=String(video.title||'Untitled video');
   const card=win.document.createElement('a');card.className='youtube-result-card';card.href=`https://www.youtube.com/watch?v=${id}`;card.target='_blank';card.rel='noopener noreferrer';card.dataset.youtubeVideo=id;card.setAttribute('aria-label',`Watch ${titleText} on YouTube (opens in a new tab)`);
   const thumbnail=win.document.createElement('img');thumbnail.src=`https://i.ytimg.com/vi/${id}/mqdefault.jpg`;thumbnail.alt='';thumbnail.loading='lazy';thumbnail.referrerPolicy='no-referrer';
   const copy=win.document.createElement('span');copy.className='youtube-result-copy';
   const title=win.document.createElement('strong');title.textContent=titleText;
   const details=win.document.createElement('span');details.className='youtube-result-details';details.textContent=[video.creator,(Array.isArray(video.subjects)?video.subjects.slice(0,2):[]).join(' · ')].filter(Boolean).join(' · ');
   const description=win.document.createElement('small');description.textContent=String(video.description||'');
   copy.append(title,details,description);card.append(thumbnail,copy);cards.push(card);
  }
  const shown=cards.slice(0,maxResults);libraryResults.replaceChildren(...shown);
  if(!cards.length)libraryStatus.textContent='No selected lesson videos match. Search Bing Videos below for broader results.';
  else libraryStatus.textContent=`${cards.length} selected lesson video${cards.length===1?'':'s'} found. ${cards.length>maxResults?`Showing the first ${maxResults}; refine your search for more.`:'Open a result to watch it on YouTube.'}`;
 }
 function searchBingVideos(event){
  event.preventDefault();
  const query=bingQuery.value.trim();
  if(!query){bingError.textContent='Enter something to search for.';bingQuery.setAttribute('aria-invalid','true');bingQuery.focus();return;}
  bingQuery.value=query;bingQuery.removeAttribute('aria-invalid');bingError.textContent='';
  const url=new URL('https://www.bing.com/videos/search');url.searchParams.set('q',query);url.searchParams.set('mkt','en-GB');
  bingFrame.src=url.href;bingFrameWrap.hidden=false;bingOpen.href=url.href;bingOpen.hidden=false;
  bingStatus.textContent=`Loading Bing Videos results for “${query}” inside this page. If the panel is blocked or blank, open the results in Bing.`;
 }
 function stopBingFrame(){bingFrame.src='about:blank';}
 bingSearch.addEventListener('submit',searchBingVideos);librarySearch.addEventListener('submit',searchLessons);
 return {destroy(){bingSearch.removeEventListener('submit',searchBingVideos);librarySearch.removeEventListener('submit',searchLessons);libraryResults.replaceChildren();stopBingFrame();}};
}
