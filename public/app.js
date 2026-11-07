import { localDate, currentStreak, sortedTasks, taskDateLabel } from './study-utils.js?v=20261106-4';
import { supabaseConfig } from './config.js?v=20261106-4';
import { createAccountBackend, validateConfig } from './account-backend.js?v=20261106-6';
import { createClient } from './supabase-client.js?v=20261106-4';
import { extraDecks, searchDecks } from './decks.js?v=20261107-1';
import { subjects, starterDecks } from './starter-decks.js?v=20261107-2';
import { videos, filterVideos } from './videos.js?v=20261107-2';
import { subjectCatalog, cleanSubjects } from './subject-catalog.js?v=20261106-6';
let communityDecks = [];
const allDecks = () => [...starterDecks, ...communityDecks];
const $ = s => document.querySelector(s);
const escapeHTML = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defaultState = () => ({ completed: {}, reviews: {}, tasks: [], activity: [], subjects: [] });
const guestKey = 'revisepro-state';
const readState = key => { try { return { ...defaultState(), ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { return defaultState(); } };
let state = defaultState();
let user = null, cardIndex = 0, cardFlipped = false, selectedDeck = '', deckQuery = '', deckSubject = 'My subjects', videoQuery = '', videoSubject = 'My subjects';
const confirmationReturn = new URL(location.href).searchParams.get('auth') === 'confirmed';
const confirmationHadToken = new URLSearchParams(location.hash.slice(1)).has('access_token');
const config = validateConfig(supabaseConfig);
const backend = config.configured ? createAccountBackend(createClient(config.url, config.key)) : null;
let syncReady = false, cloudProgress = null, syncQueue = Promise.resolve();
const userKey = id => `revisepro-state-user-${id}`;
const pendingKey = id => `${userKey(id)}-pending`;
const toast = text => { const el=$('#toast'); el.textContent=text; el.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),5000); };
$('#date').textContent = new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
const save = () => {
  const snapshot = JSON.stringify(state);
  const id = user?.id;
  localStorage.setItem(id ? userKey(id) : guestKey, snapshot);
  if (!id) return;
  localStorage.setItem(pendingKey(id), '1');
  updateAccount();
  if (!syncReady) { toast('Changes are saved on this device. Open your account to resolve syncing.'); return; }
  syncQueue = syncQueue.then(async () => {
    await backend.save(id, JSON.parse(snapshot));
    if (localStorage.getItem(userKey(id)) === snapshot) localStorage.removeItem(pendingKey(id));
    updateAccount();
  }).catch(() => { updateAccount(); toast('Could not sync. Changes are saved on this device; open your account to resolve syncing.'); });
};
async function enterAccount(accountUser) {
  // Load first. Never overwrite a cloud row when the network or schema is unavailable.
  const id = accountUser.id;
  const remote = await backend.load(id);
  user = { id, name: String(accountUser.user_metadata?.name || accountUser.email?.split('@')[0] || 'Learner'), email: accountUser.email || '' };
  cloudProgress = remote;
  const hasPending = localStorage.getItem(pendingKey(id)) === '1';
  syncReady = !hasPending;
  state = hasPending ? readState(userKey(id)) : { ...defaultState(), ...(remote || {}) };
  if (!Array.isArray(state.subjects) || !state.subjects.length) state.subjects = cleanSubjects(accountUser.user_metadata?.subjects);
  localStorage.setItem(userKey(id), JSON.stringify(state));
  try { await loadCommunitySets(); } catch { toast('Could not load shared sets. Please refresh to try again.'); }
  showWorkspace(); updateAccount(); render();
  if (hasPending) toast('You have unsynced changes. Open your account to choose which progress to keep.');
}
const record = () => { const today=localDate(); if (!state.activity.includes(today)) state.activity.push(today); };
const streak = () => currentStreak(state.activity);
const progress = s => state.completed[s.id] ? 100 : 0;
const selectedSubjects = () => cleanSubjects(state.subjects);
function showWorkspace(){ $('#landing').hidden=true; document.querySelector('.app-shell').hidden=false; }
function showLanding(){ $('#landing').hidden=false; document.querySelector('.app-shell').hidden=true; }
const icons = {
  biology: '<path d="M12 21c-5-2-7-6-7-10 4 0 7 2 7 6M12 21c0-7 3-11 7-13 1 6-1 10-7 13ZM12 17c-1-5-1-9 1-13 3 3 4 6 3 9"/>',
  maths: '<path d="M18 5H6l6 7-6 7h12M17 5v3M17 16v3"/>',
  chemistry: '<path d="M9 3h6M10 3v6l-5.5 9A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-3L14 9V3M8 15h8"/>',
  physics: '<path d="M13 2 5 13h6l-1 9 9-12h-6z"/>',
  english: '<path d="M4 5c3-1 5-.5 8 1.5C15 4.5 17 4 20 5v14c-3-1-5-.5-8 1.5C9 18.5 7 18 4 19zM12 6.5v14"/>',
  history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
const subjectIcon = s => `<span class="subject-icon ${s.color}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[s.id]}</svg></span>`;
const subjectCard = s => `<a href="#subject/${s.id}" class="subject-card"><div class="subject-top">${subjectIcon(s)}<span class="subject-arrow" aria-hidden="true">↗</span></div><h3>${s.name}</h3><p>${s.description}</p><div class="progress-label"><span>Starter topic progress</span><b>${progress(s)}%</b></div><div class="bar"><span style="width:${progress(s)}%"></span></div></a>`;
const head = (title,subtitle) => `<div class="view-intro"><p class="eyebrow">YOUR STUDY SPACE</p><h1>${title}</h1><p>${subtitle}</p></div>`;
function taskHTML(task,index){return `<div class="task"><button class="task-check ${task.done?'done':''}" data-task="${index}" aria-label="${task.done?'Mark incomplete':'Mark complete'}: ${escapeHTML(task.title)}" aria-pressed="${!!task.done}">${task.done?'✓':''}</button><div><strong>${escapeHTML(task.title)}</strong><small>${task.done?'Completed':'Your study plan'}</small></div><span class="task-time ${!task.done && task.date && task.date < localDate()?'overdue':''}">${escapeHTML(taskDateLabel(task.date))}</span><button class="text-link" data-delete="${index}" aria-label="Delete task">×</button></div>`;}
function dashboard(){const completed=Object.values(state.completed).filter(Boolean).length; const cards=Object.keys(state.reviews).length; const mine=selectedSubjects(); const first=subjects.find(s=>mine.includes(s.name)&&!state.completed[s.id]); return `<div class="page-heading"><div><p class="eyebrow">YOUR LEARNING DASHBOARD</p><h1>Hey${user?', '+escapeHTML(user.name.split(' ')[0]):' there'} 👋</h1><p>A clearer path to the results you want.</p></div><div class="heading-date">✳ &nbsp; A little better every day</div></div>
<div class="hero"><div class="hero-image" aria-hidden="true"></div><div class="hero-content"><span class="hero-label"><span class="hero-dot"></span> YOUR NEXT STUDY SESSION</span><h2>Make progress.<br><em>Make it yours.</em></h2><p>Big results begin with a little focus. Pick up a topic and give your future self a head start.</p><a class="btn" href="${first?`#subject/${first.id}`:'#flashcards'}">Start revising <span>↗</span></a></div><div class="hero-index" aria-hidden="true">THE STUDY EDIT &nbsp; / &nbsp; 01</div></div>
<div class="section-head"><div><h2>Your progress at a glance</h2><p>Every little bit counts. Here's how you're doing.</p></div></div><div class="stats"><div class="stat"><span class="stat-icon mint">▤</span><div><small>Topics practised</small><strong>${completed} <span>starter topics</span></strong></div></div><div class="stat"><span class="stat-icon peach">✦</span><div><small>Study streak</small><strong>${streak()} <span>days</span></strong></div></div><div class="stat"><span class="stat-icon lilac">▧</span><div><small>Flashcards reviewed</small><strong>${cards} <span>cards</span></strong></div></div></div>
<div class="dashboard-grid"><section><div class="section-head"><div><h2>Pick up a subject</h2><p>Choose a topic and get into the flow.</p></div><a href="#subjects" class="text-link">All subjects &nbsp; →</a></div><div class="subjects">${subjectTiles().slice(0,4).join('')}</div></section><section><div class="section-head"><div><h2>Your study plan</h2><p>A little structure goes a long way.</p></div><a href="#planner" class="text-link">Open planner &nbsp; →</a></div><div class="card right-card">${state.tasks.length?sortedTasks(state.tasks).slice(0,3).map(({task,index})=>taskHTML(task,index)).join(''):'<div class="empty-plan"><span class="stat-icon mint">▣</span><h3>Make a little plan</h3><p>Your study sessions will appear here. Start with one small goal.</p><a class="text-link" href="#planner">Add a study session →</a></div>'}</div><a href="#flashcards" class="dashboard-discover"><div><span class="discover-kicker">THE FLASHCARD LIBRARY</span><strong>Make it stick.</strong><p>Find your next set and test what you know.</p><span>Explore flashcards &nbsp; ↗</span></div></a><a href="#videos" class="dashboard-video"><span class="dashboard-video-play" aria-hidden="true">▶</span><span><strong>Video lessons</strong><small>Find another way to learn</small></span><span aria-hidden="true">↗</span></a></section></div><p class="footer-note">Made for progress, not perfection. &nbsp; ♡</p>`;}
function subjectView(id){const s=subjects.find(x=>x.id===id); if(!s)return head('Subject not found','Choose a subject to get started.'); return `${head(s.name,'A small start is still a start. Explore your starter topic below.')}<div class="content-card">${subjectIcon(s)}<p class="eyebrow" style="margin-top:20px">STARTER TOPIC</p><h2>${s.topic}</h2><p>${s.note}</p><div class="topic-list"><div class="topic-row"><div><strong>Quick knowledge check</strong><small>One question · instant explanation</small></div><a class="btn dark" href="#quiz/${s.id}">${state.completed[s.id]?'Try again':'Start quiz'} →</a></div><div class="topic-row"><div><strong>Recall flashcards</strong><small>${starterDecks.find(deck=>deck.id===s.id).cards.length} cards · flip and review</small></div><button class="btn outline" data-deck="${s.id}">Review cards →</button></div><div class="topic-row"><div><strong>More ${s.name} flashcards</strong><small>Browse all available sets</small></div><button class="btn outline" data-open-subject="${s.name}">Browse sets →</button></div><div class="topic-row"><div><strong>Video lessons</strong><small>Explore external video resources</small></div><button class="btn outline" data-open-video-subject="${s.name}">Find videos →</button></div></div><p style="font-size:11px;margin-top:20px">These are introductory revision materials, not a complete exam specification. Check your exam board for full coverage.</p></div>`;}
function quizView(id){const s=subjects.find(x=>x.id===id); if(!s)return '';return `${head('Quick knowledge check',`${s.name} · ${s.topic}`)}<div class="content-card"><p class="eyebrow">QUESTION 1 OF 1</p><h2>${s.question}</h2><div id="answers">${s.options.map((o,i)=>`<button class="quiz-option" data-answer="${i}" data-subject="${s.id}">${String.fromCharCode(65+i)} &nbsp; ${o}</button>`).join('')}</div><div id="feedback" role="status" aria-live="polite"></div><a href="#subject/${s.id}" class="text-link">← Back to topic</a></div>`;}
function subjectTiles() {
  return selectedSubjects().map(name=>{
    const existing=subjects.find(s=>s.name===name);
    const count=allDecks().filter(d=>d.subject===name).length;
    if(existing) return subjectCard(existing);
    return `<button class="subject-card" data-open-subject="${escapeHTML(name)}"><div class="subject-top"><span class="subject-icon mint" aria-hidden="true">▧</span><span class="subject-arrow">↗</span></div><h3>${escapeHTML(name)}</h3><p>${count ? `${count} flashcard ${count===1?'set':'sets'} available` : 'No ready-made sets yet'}</p><div class="progress-label"><span>${count?'Browse your sets':'Create the first set'}</span></div></button>`;
  });
}
function subjectChooser(selected = []) {
  const choices=[...new Set([...subjectCatalog,...selected])];
  return `<div class="subject-picker"><label class="field">Search subjects<input type="search" class="subject-search" placeholder="Search subjects..." autocomplete="off"></label><div class="subject-options">${choices.map(name=>`<label class="subject-option" data-subject-label="${escapeHTML(name.toLowerCase())}"><input type="checkbox" name="subjects" value="${escapeHTML(name)}" ${selected.includes(name)?'checked':''}><span>${escapeHTML(name)}</span></label>`).join('')}</div><label class="field">Can't find yours? Add a subject<input type="text" name="customSubject" maxlength="80" placeholder="e.g. Film Studies"></label><p class="subject-help">Choose at least one subject. You can change these later. Some subjects don't have starter sets yet.</p></div>`;
}
function subjectsPage() {
  return `${head('My subjects','Your workspace, shaped around what you study.')}<div class="subjects all-subjects">${subjectTiles().join('')}</div><div class="content-card subject-settings"><h2>Choose your subjects</h2><p>Select the subjects you study. Your choices are saved to your account.</p><form id="subjectsForm">${subjectChooser(selectedSubjects())}<p class="error" id="subjectsError" role="alert"></p><button class="btn dark" type="submit">Save my subjects →</button></form></div>`;
}
function onboarding() {
  return `${head('Make this space yours','Choose the subjects you study. You can change these any time.')}<div class="content-card subject-settings"><form id="subjectsForm">${subjectChooser(selectedSubjects())}<p class="error" id="subjectsError" role="alert"></p><button class="btn dark" type="submit">Build my workspace →</button></form></div>`;
}
function normalizeSet(row) {
  if (!row || typeof row.id!=='string' || !/^[0-9a-f-]{36}$/i.test(row.id) || typeof row.title!=='string' || typeof row.subject!=='string' || !Array.isArray(row.cards)) return null;
  const cards=row.cards.filter(c=>Array.isArray(c)&&c.length===2&&c.every(v=>typeof v==='string'&&v.trim())).slice(0,50).map(c=>c.map(v=>v.slice(0,1000)));
  if(!cards.length)return null;
  return {id:`set-${row.id}`, databaseId:row.id, ownerId:row.owner_id, title:row.title.slice(0,100),subject:row.subject.slice(0,80),description:typeof row.description==='string'?row.description.slice(0,300):'',color:'mint',cards,isPublic:!!row.is_public,community:true};
}
async function loadCommunitySets() { communityDecks=(await backend.listSets(user.id)).map(normalizeSet).filter(Boolean); }
function createSetPage() {
  return `${head('Create a flashcard set','Make a set for yourself, or share it with other signed-in learners.')}<div class="content-card creator"><form id="createSetForm"><label class="field">Set title<input name="title" required maxlength="100" placeholder="e.g. French food vocabulary"></label><label class="field">Subject<select name="subject" required>${selectedSubjects().map(x=>`<option value="${escapeHTML(x)}">${escapeHTML(x)}</option>`).join('')}</select></label><label class="field">Description (optional)<input name="description" maxlength="300" placeholder="What will this set cover?"></label><div class="creator-head"><h2>Your cards</h2><span>Up to 50 cards</span></div><p>Add a question and answer for each card.</p><div id="creatorCards">${creatorCard(1)}${creatorCard(2)}</div><button type="button" class="btn outline" id="addCreatorCard">+ Add a card</button><label class="visibility-choice"><input type="checkbox" name="isPublic"><span><strong>Make this set public</strong><small>Other signed-in learners can see and use it. Leave unchecked to keep it private.</small></span></label><p class="error" id="createError" role="alert"></p><button class="btn dark" type="submit">Create set →</button></form></div>`;
}
function creatorCard(index) { return `<div class="creator-card"><div><strong>Card ${index}</strong><button type="button" class="remove-creator-card" aria-label="Remove card">Remove</button></div><label class="field">Question<textarea name="question" rows="2" maxlength="1000" required placeholder="Write a question"></textarea></label><label class="field">Answer<textarea name="answer" rows="2" maxlength="1000" required placeholder="Write the answer"></textarea></label></div>`; }
function deckCard(deck) {
  const done=deck.cards.filter((_,i)=>state.reviews[`${deck.id}-${i}`]).length;
  return `<a class="deck-card" href="#flashcards/${deck.id}"><div class="deck-card-top"><span class="deck-symbol ${deck.color}" aria-hidden="true">▧</span><span class="deck-open" aria-hidden="true">↗</span></div><p class="deck-subject">${escapeHTML(deck.subject)}</p><h3>${escapeHTML(deck.title)}</h3><p class="deck-description">${escapeHTML(deck.description)}</p><div class="deck-meta"><span>${deck.cards.length} cards</span><span>${deck.community ? (deck.isPublic?'Community · public':'Your private set') : (done ? `${done} reviewed` : 'Ready to study')}</span></div></a>`;
}
function deckResults() {
  const available=deckSubject==='My subjects'?allDecks().filter(d=>selectedSubjects().includes(d.subject)):allDecks();
  const results=searchDecks(available,deckQuery,['My subjects','All subjects'].includes(deckSubject)?'All':deckSubject);
  const grid=$('#deckResults'); if(!grid)return;
  $('#resultsCount').textContent=`${results.length} ${results.length===1?'set':'sets'}`;
  grid.innerHTML=results.length?results.map(deckCard).join(''):'<div class="deck-empty"><strong>No sets found</strong><p>Try a different word or choose another subject.</p><button class="btn outline" id="clearSearch">Clear filters</button></div>';
  document.querySelectorAll('[data-filter]').forEach(b=>{const active=b.dataset.filter===deckSubject;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
}
function flashcardLibrary() {
  const categories=['My subjects','All subjects',...selectedSubjects()];
  return `<div class="library-heading"><div><p class="eyebrow">YOUR REVISION LIBRARY</p><h1>Find your focus.</h1><p>Choose a set, flip a card, and make your knowledge stick.</p><span class="library-count">${allDecks().length} sets &nbsp; · &nbsp; ${allDecks().reduce((total,deck)=>total+deck.cards.length,0)} cards</span></div><div class="library-art" role="img" aria-label="A stack of study cards and a notebook"></div></div>
  <div class="library-actions"><a class="btn dark" href="#create-set">+ Create a set</a><span>Shows up to 100 of your sets and 100 public sets. Community sets are not reviewed.</span></div><div class="library-tools"><label class="search-label" for="deckSearch">Search flashcard sets</label><div class="search-wrap"><span aria-hidden="true">⌕</span><input id="deckSearch" type="search" placeholder="Search a subject, topic or keyword..." value="${escapeHTML(deckQuery)}" autocomplete="off"></div><div class="filter-row" aria-label="Filter by subject">${categories.map(c=>`<button class="filter-chip ${deckSubject===c?'selected':''}" data-filter="${escapeHTML(c)}" aria-pressed="${deckSubject===c}">${escapeHTML(c)}</button>`).join('')}</div></div>
  <div class="section-head library-section"><div><h2>Explore flashcard sets</h2><p>Original introductory cards · check your exam specification for full coverage.</p></div><span id="resultsCount" class="results-count" aria-live="polite"></span></div><div class="deck-grid" id="deckResults"></div>`;
}
function flashcards(id) {
  const deck=allDecks().find(d=>d.id===id);
  if(!deck) return `${head('Set not found','Choose another flashcard set to get started.')}<a class="btn dark" href="#flashcards">Browse sets →</a>`;
  if(selectedDeck!==id){selectedDeck=id;cardIndex=0;cardFlipped=false;}
  const card=deck.cards[cardIndex] || deck.cards[0];
  const done=deck.cards.filter((_,i)=>state.reviews[`${deck.id}-${i}`]).length;
  return `<div class="study-heading"><a class="back-link" href="#flashcards">← All flashcard sets</a><p class="eyebrow">${escapeHTML(deck.subject)} · FLASHCARDS</p><h1>${escapeHTML(deck.title)}</h1><p>${escapeHTML(deck.description)}</p>${deck.community?`<p class="set-visibility">${deck.isPublic?'Community set · public to signed-in learners':'Your private set'}</p>${deck.ownerId===user.id?`<button class="text-link" data-set-id="${escapeHTML(deck.databaseId)}" data-set-visibility="${!deck.isPublic}">${deck.isPublic?'Make private':'Make public'}</button> <button class="text-link delete-set" data-delete-set="${escapeHTML(deck.databaseId)}">Delete this set</button>`:''}`:''}</div><div class="study-layout"><div class="content-card flashcard"><div class="study-progress"><span>Card ${cardIndex+1} of ${deck.cards.length}</span><strong>${done} / ${deck.cards.length} reviewed</strong></div><div class="bar"><span style="width:${Math.round(done/deck.cards.length*100)}%"></span></div><p class="eyebrow card-side">${cardFlipped?'ANSWER':'QUESTION'} <span>· TAP TO FLIP</span></p><button class="flashcard-face" id="flipCard"><span>${escapeHTML(cardFlipped?card[1]:card[0])}</span><span class="sr-only">${cardFlipped?'Show question':'Reveal answer'}</span></button><p class="flip-hint">${cardFlipped?'Think you have it? Mark it reviewed.':'Think of your answer, then tap the card to reveal it.'}</p><div class="flashcard-controls"><button class="btn outline" id="prevCard">← Previous</button><button class="btn dark" id="reviewCard">${state.reviews[`${deck.id}-${cardIndex}`]?'Reviewed ✓':'Mark reviewed ✓'}</button><button class="btn outline" id="nextCard">Next →</button></div></div><aside class="card-list"><div class="card-list-head"><h2>In this set</h2><span>${deck.cards.length} cards</span></div><p>Jump to any card below.</p><div class="card-list-scroll">${deck.cards.map((c,i)=>`<button class="card-list-item ${i===cardIndex?'current':''}" data-card-index="${i}" ${i===cardIndex?'aria-current="true"':''}><span class="card-number">${String(i+1).padStart(2,'0')}</span><span>${escapeHTML(c[0])}</span><span class="card-done">${state.reviews[`${deck.id}-${i}`]?'✓':''}</span></button>`).join('')}</div></aside></div>`;
}
function planner(){return `${head('Study planner','Make a plan that works for you, one session at a time.')}<div class="content-card"><h2>Add a study session</h2><p>Keep it manageable. A short, focused session is a great place to start.</p><form id="planForm" class="planner-form"><label class="field">What will you study?<input name="title" required maxlength="100" placeholder="e.g. Biology: cell structure"></label><label class="field">Date (optional)<input name="date" type="date"></label><button class="btn dark" type="submit">Add to plan +</button></form></div><div class="section-head"><h2>Your sessions</h2><span class="text-link">${state.tasks.filter(t=>!t.done).length} to do</span></div><div>${state.tasks.length?sortedTasks(state.tasks).map(({task,index})=>taskHTML(task,index)).join(''):'<div class="content-card"><p>No sessions yet. Add your first one above.</p></div>'}</div>`;}
function videosPage() {
  const categories=['My subjects','All subjects',...selectedSubjects()];
  if(!categories.includes(videoSubject)) categories.push(videoSubject);
  const discoveries=selectedSubjects().map(subject=>`<a class="video-discovery-link" href="https://www.youtube.com/results?${new URLSearchParams({search_query:subject+' revision tutorial'}).toString()}" target="_blank" rel="noopener noreferrer">${escapeHTML(subject)} <span aria-hidden="true">↗</span></a>`).join('');
  return `<div class="video-hero"><div><p class="eyebrow">WATCH &amp; LEARN</p><h1>A fresh perspective,<br><em>one video at a time.</em></h1><p>Find a helpful explanation for your next revision session, then put it into practice.</p><span class="video-hero-note">▶ &nbsp; ${videos.length} selected video links · external sites</span></div><div class="video-hero-art" aria-hidden="true"><div class="video-screen"><span>▶</span></div><span class="video-spark">✳</span></div></div>
  <div class="library-tools video-tools"><label class="search-label" for="videoSearch">Search selected videos</label><div class="search-wrap"><span aria-hidden="true">⌕</span><input id="videoSearch" type="search" placeholder="Search a subject, topic or creator..." value="${escapeHTML(videoQuery)}" autocomplete="off" aria-controls="videoGrid"></div><div class="filter-row" aria-label="Filter videos by subject">${categories.map(c=>`<button class="filter-chip ${videoSubject===c?'selected':''}" data-video-filter="${escapeHTML(c)}" aria-pressed="${videoSubject===c}">${escapeHTML(c)}</button>`).join('')}</div></div>
  <div class="section-head video-section"><div><h2>Selected video lessons</h2><p>Links open on YouTube. Check your exam board and the video's publication date.</p></div><span id="videoCount" class="results-count" aria-live="polite"></span></div><div id="videoGrid" class="video-grid"></div>
  <section class="video-discovery"><div><p class="eyebrow">LOOKING FOR MORE?</p><h2>Explore your subjects</h2><p>Search YouTube for more lessons in your subjects. Search results are not selected or reviewed by RevisePro and may include adverts or paid services.</p></div><div class="video-discovery-links">${discoveries}</div></section>`;
}
function videoResults(){
  const grid=$('#videoGrid'); if(!grid)return;
  const results=filterVideos(videos,videoQuery,videoSubject,selectedSubjects());
  $('#videoCount').textContent=`${results.length} ${results.length===1?'video':'videos'}`;
  grid.innerHTML=results.length?results.map(v=>`<a class="video-card" href="${escapeHTML(v.url)}" target="_blank" rel="noopener noreferrer"><div class="video-card-art"><span class="video-play" aria-hidden="true">▶</span><span class="video-level">${escapeHTML(v.level)}</span><span class="video-open" aria-hidden="true">↗</span></div><div class="video-card-body"><p class="video-subject">${escapeHTML(v.subjects[0])}</p><h3>${escapeHTML(v.title)}</h3><p>${escapeHTML(v.description)}</p><div class="video-card-meta"><span>${escapeHTML(v.creator)}</span><strong>Watch on YouTube ↗</strong></div></div></a>`).join(''):'<div class="deck-empty"><strong>No selected videos found</strong><p>Try another search or subject, or explore the YouTube searches below.</p><button class="btn outline" id="clearVideoSearch">Clear filters</button></div>';
  document.querySelectorAll('[data-video-filter]').forEach(button=>{const active=button.dataset.videoFilter===videoSubject;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));});
}
const resources=[['BBC Bitesize','Clear explanations, revision guides and quizzes across subjects.','https://www.bbc.co.uk/bitesize'],['Physics & Maths Tutor','Find topic questions and past papers by subject and exam board.','https://www.physicsandmathstutor.com/'],['Seneca Learning','Work through interactive courses and recall questions.','https://senecalearning.com/'],['Cognito','Explore science and maths lessons, quizzes and exam practice.','https://cognitoedu.org/'],['Save My Exams','Browse revision notes and exam-style questions; some resources require a subscription.','https://www.savemyexams.com/'],['Quizlet','Create and study flashcard sets. Some features require a subscription.','https://quizlet.com/'],['Anki','Build your own spaced-repetition flashcards.','https://apps.ankiweb.net/'],['Get Revising','Explore study planning tools and community resources.','https://getrevising.co.uk/'],['Maths Genie','Find maths revision by topic and past papers.','https://www.mathsgenie.co.uk/'],['Corbettmaths','Explore maths videos, worksheets and practice questions.','https://corbettmaths.com/']];
function render(){if(!user)return;const focusedId=document.activeElement?.id; const [page,id]=(location.hash.slice(1)||'home').split('/'); const active=['subject','quiz'].includes(page)?'subjects':page==='create-set'?'flashcards':page; document.querySelectorAll('[data-nav]').forEach(a=>{const selected=a.dataset.nav===active;a.classList.toggle('active',selected);if(selected)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}); $('#crumb').textContent=({home:'Dashboard',subjects:'My subjects',subject:'My subjects',quiz:'Knowledge check',flashcards:'Flashcards',planner:'Study planner',videos:'Video lessons',resources:'Resources'})[page]||'Dashboard'; let html; if(!selectedSubjects().length)html=onboarding(); else if(page==='home')html=dashboard(); else if(page==='subjects')html=subjectsPage(); else if(page==='create-set')html=createSetPage(); else if(page==='subject')html=subjectView(id); else if(page==='quiz')html=quizView(id); else if(page==='flashcards')html=id?flashcards(id):flashcardLibrary(); else if(page==='planner')html=planner(); else if(page==='videos')html=videosPage(); else if(page==='resources')html=head('Revision resources','A hand-picked collection of places to take your revision further.')+`<div class="resource-grid">${resources.map(r=>`<a class="resource-card" href="${r[2]}" target="_blank" rel="noopener noreferrer"><h3>${r[0]} ↗</h3><p>${r[1]}</p><span>Visit resource →</span></a>`).join('')}</div>`; else html=dashboard(); $('#app').innerHTML=html; if(page==='flashcards' && !id)deckResults(); if(page==='videos')videoResults(); if(focusedId && focusedId!=='app') document.getElementById(focusedId)?.focus(); }
function updateAccount(){const name=user?user.name:'Guest learner';const pending=user && localStorage.getItem(pendingKey(user.id))==='1';document.querySelectorAll('.avatar,.top-avatar').forEach(e=>e.textContent=name[0].toUpperCase());$('#accountButton strong').textContent=name;$('#accountButton small').textContent=user?(pending?'Changes not synced':'Account & sync'):'Save your progress';$('#topAccount').setAttribute('aria-label',pending?'Account: changes not synced':'Account');}
function modal(content){$('#modalContent').innerHTML=`<div class="modal-inner"><div class="modal-top"><h2>${content.title}</h2><button class="close" aria-label="Close">×</button></div>${content.body}</div>`;$('#modal').showModal();}
function account(mode='login') {
  if(user) {
    const pending = localStorage.getItem(pendingKey(user.id)) === '1';
    modal({title:'Your account',body:`<p>Signed in as ${escapeHTML(user.name)} (${escapeHTML(user.email)}).</p>${pending ? `<p class="error">There are changes on this device that have not synced. Choose which copy to keep. Uploading replaces your cloud progress; using cloud progress discards local changes.</p><button class="btn dark" id="useLocal">Upload local progress</button><button class="btn outline" id="useCloud">Use cloud progress</button>` : '<p>Your account progress is saved to Supabase when you make changes. Choose your subjects and keep your progress together.</p>'}<p id="accountError" class="error" role="alert"></p><button class="btn outline" id="logout">Sign out</button>`});
    return;
  }
  modal({title:mode==='login'?'Welcome back':'Create your account',body:`<p>${backend?'Sign in to sync your revision progress across devices. Choose your subjects and keep your progress together.':'Account setup is not complete yet. Please try again later.'}</p>${backend?`<form id="authForm" data-mode="${mode}">${mode==='register'?'<label class="field">Name<input name="name" required maxlength="60" autocomplete="name"></label>':''}<label class="field">Email<input name="email" type="email" required autocomplete="email"></label><label class="field">Password<input name="password" type="password" minlength="8" maxlength="128" required autocomplete="${mode==='login'?'current-password':'new-password'}"></label>${mode==='register'?`<h3 class="signup-subject-title">What are you studying?</h3>${subjectChooser()}`:''}<p class="error" id="authError" role="alert"></p><button class="btn dark" type="submit">${mode==='login'?'Sign in':'Create account'}</button>${mode==='login'?'<button class="switch resend-confirmation" type="button" id="resendConfirmation">Resend confirmation email</button>':''}</form><p>${mode==='login'?'New here?':'Already have an account?'} <button class="switch" data-auth-mode="${mode==='login'?'register':'login'}">${mode==='login'?'Create an account':'Sign in'}</button></p>`:'<p>The site owner can follow the Supabase setup guide in the project README.</p>'}`});
}
window.addEventListener('hashchange',()=>{if(!user)return;render();$('#app').focus({preventScroll:true});window.scrollTo(0,0);});
document.querySelector('.skip-link').addEventListener('click',e=>{e.preventDefault();$('#app').focus();});
document.querySelectorAll('[data-open-auth]').forEach(button=>button.addEventListener('click',()=>account(button.dataset.openAuth)));
$('#accountButton').onclick=()=>account();$('#topAccount').onclick=()=>account();$('#helpButton').onclick=()=>modal({title:'A little help',body:'<p>Pick a subject to read a short refresher and answer a question. Use flashcards to practise recall, find video lessons, and add sessions to your planner.</p><p>Sign in to access your subjects, flashcards and progress.</p>'});
$('#modal').addEventListener('click',async e=>{
  if(e.target.classList.contains('close')) $('#modal').close();
  if(e.target.dataset.authMode){$('#modal').close();account(e.target.dataset.authMode);}
  if(e.target.id==='resendConfirmation'){
    const email=$('#authForm [name="email"]');const message=$('#authError');
    if(!email.checkValidity()){message.textContent='Enter a valid email address first.';email.focus();return;}
    e.target.disabled=true;message.textContent='';
    try { await backend.resendConfirmation(email.value.trim(),new URL('login.html',location.href).href); message.textContent='If this address needs confirmation, check your email for a link.'; }
    catch(error){message.textContent=error.message||'Could not send the confirmation email.';}
    finally {e.target.disabled=false;}
  }
  if(e.target.id==='logout') {
    e.target.disabled=true;
    try { await syncQueue; await backend.signOut(); user=null;syncReady=false;cloudProgress=null;communityDecks=[];state=defaultState();videoQuery='';videoSubject='My subjects';updateAccount();$('#modal').close();location.hash='';showLanding();toast('Signed out'); }
    catch(err){$('#accountError').textContent=err.message||'Could not sign out.';e.target.disabled=false;}
  }
  if(e.target.id==='useLocal' || e.target.id==='useCloud') {
    e.target.disabled=true;
    try {
      await syncQueue;
      if(e.target.id==='useLocal') { await backend.save(user.id, state); cloudProgress=state; }
      else { const remote=await backend.load(user.id); state={...defaultState(),...(remote||{})}; localStorage.setItem(userKey(user.id),JSON.stringify(state)); cloudProgress=remote; }
      localStorage.removeItem(pendingKey(user.id));syncReady=true;updateAccount();$('#modal').close();render();toast('Progress updated.');
    } catch(err) { $('#accountError').textContent=err.message||'Could not resolve syncing. Please try again.';e.target.disabled=false; }
  }
});
$('#modal').addEventListener('submit',async e=>{
  if(e.target.id!=='authForm')return;
  e.preventDefault();const form=e.target;const input=Object.fromEntries(new FormData(form));const button=form.querySelector('[type="submit"]');button.disabled=true;
  try {
    if(form.dataset.mode==='register') {
      const chosen=subjectChoices(form); if(!chosen.length){$('#authError').textContent='Please select at least one subject.';button.disabled=false;return;}
      const result=await backend.signUp(input.name.trim(),input.email.trim(),input.password,new URL('login.html',location.href).href,chosen);
      if(!result.session){$('#modal').close();modal({title:'Check your email',body:'<p>If signup is available for this email, you will receive a confirmation link. Follow it, then return here to sign in. If you don’t receive it, check spam or contact the site owner.</p>'});return;}
      await backend.signOut();$('#authError').textContent='Email verification is not configured correctly. Please contact the site owner.';button.disabled=false;return;
    } else { await enterAccount(await backend.signIn(input.email.trim(),input.password)); }
    $('#modal').close();toast('Welcome, '+user.name+'!');
  } catch(err) { $('#authError').textContent=err.message||'Could not connect to the account service.';button.disabled=false; }
});
$('#app').addEventListener('click',e=>{const target=e.target.closest('button');if(!target)return;if(target.dataset.task!==undefined){const t=state.tasks[Number(target.dataset.task)];t.done=!t.done;if(t.done)record();save();render();document.querySelector(`[data-task="${target.dataset.task}"]`)?.focus();}if(target.dataset.delete!==undefined){state.tasks.splice(Number(target.dataset.delete),1);save();render();}if(target.dataset.openSubject){deckSubject=target.dataset.openSubject;deckQuery='';location.hash='flashcards';}
if(target.dataset.openVideoSubject){videoSubject=target.dataset.openVideoSubject;videoQuery='';location.hash='videos';}
if(target.dataset.videoFilter){videoSubject=target.dataset.videoFilter;videoResults();}
if(target.id==='clearVideoSearch'){videoQuery='';videoSubject='My subjects';$('#videoSearch').value='';videoResults();$('#videoSearch').focus();}
if(target.id==='addCreatorCard'){const list=$('#creatorCards');if(list.children.length>=50){toast('A set can have at most 50 cards.');return;}list.insertAdjacentHTML('beforeend',creatorCard(list.children.length+1));}
if(target.classList.contains('remove-creator-card')){const list=$('#creatorCards');if(list.children.length<=1){toast('Keep at least one card.');return;}target.closest('.creator-card').remove();}
if(target.dataset.setVisibility){const makePublic=target.dataset.setVisibility==='true';if(makePublic&&!confirm('Make this set visible to all signed-in learners?'))return;target.disabled=true;backend.setVisibility(target.dataset.setId,makePublic).then(()=>loadCommunitySets()).then(()=>{render();toast(makePublic?'Set is public':'Set is private');}).catch(()=>{target.disabled=false;toast('Could not update visibility.');});}
if(target.dataset.deleteSet){if(!confirm('Delete this flashcard set? This cannot be undone.'))return;target.disabled=true;backend.deleteSet(target.dataset.deleteSet).then(()=>loadCommunitySets()).then(()=>{location.hash='flashcards';toast('Set deleted.');}).catch(()=>{target.disabled=false;toast('Could not delete this set.');});}
if(target.dataset.deck){cardIndex=0;cardFlipped=false;location.hash=`flashcards/${target.dataset.deck}`;}if(target.dataset.filter){deckSubject=target.dataset.filter;deckResults();}if(target.id==='clearSearch'){deckQuery='';deckSubject='My subjects';$('#deckSearch').value='';deckResults();$('#deckSearch').focus();}if(target.dataset.cardIndex!==undefined){cardIndex=Number(target.dataset.cardIndex);cardFlipped=false;render();document.querySelector(`[data-card-index="${cardIndex}"]`)?.focus();}if(target.dataset.answer!==undefined){const s=subjects.find(x=>x.id===target.dataset.subject);const correct=Number(target.dataset.answer)===s.answer;state.completed[s.id]=correct||!!state.completed[s.id];record();save();$('#answers').querySelectorAll('button').forEach(b=>b.disabled=true);$('#feedback').innerHTML=`<div class="feedback"><strong>${correct?'That’s right!':'Not quite yet.'}</strong> ${s.explanation}</div><a class="btn dark" href="#subject/${s.id}">Back to topic →</a>`;}if(target.id==='flipCard'){cardFlipped=!cardFlipped;render();}if(target.id==='prevCard'){const total=allDecks().find(d=>d.id===selectedDeck).cards.length;cardIndex=(cardIndex+total-1)%total;cardFlipped=false;render();}if(target.id==='nextCard'){const total=allDecks().find(d=>d.id===selectedDeck).cards.length;cardIndex=(cardIndex+1)%total;cardFlipped=false;render();}if(target.id==='reviewCard'){state.reviews[`${selectedDeck}-${cardIndex}`]=localDate();record();save();toast('Card marked as reviewed');cardIndex=(cardIndex+1)%allDecks().find(d=>d.id===selectedDeck).cards.length;cardFlipped=false;render();}});
function filterSubjectOptions(input){const term=input.value.toLowerCase().trim();input.closest('.subject-picker').querySelectorAll('[data-subject-label]').forEach(label=>label.hidden=!label.dataset.subjectLabel.includes(term));}
function subjectChoices(form){return cleanSubjects([...form.querySelectorAll('input[name=subjects]:checked')].map(x=>x.value).concat(form.elements.customSubject?.value||[]));}
$('#modal').addEventListener('input',e=>{if(e.target.classList.contains('subject-search'))filterSubjectOptions(e.target);});
$('#app').addEventListener('input',e=>{if(e.target.id==='deckSearch'){deckQuery=e.target.value;deckResults();}if(e.target.id==='videoSearch'){videoQuery=e.target.value;videoResults();}if(e.target.classList.contains('subject-search'))filterSubjectOptions(e.target);});
$('#app').addEventListener('submit',async e=>{
if(e.target.id==='subjectsForm'){e.preventDefault();const chosen=subjectChoices(e.target);if(!chosen.length){$('#subjectsError').textContent='Please select at least one subject.';return;}state.subjects=chosen;deckSubject='My subjects';videoSubject='My subjects';videoQuery='';save();if(location.hash==='#subjects')render();else location.hash='home';if(location.hash==='#home')render();toast('Subjects saved');return;}
if(e.target.id==='createSetForm'){e.preventDefault();const form=e.target;const data=new FormData(form);const qs=data.getAll('question');const answers=data.getAll('answer');const cards=qs.map((q,i)=>[String(q).trim(),String(answers[i]).trim()]);if(!cards.length||cards.length>50||cards.some(c=>!c[0]||!c[1])){$('#createError').textContent='Add a question and answer for every card.';return;}const title=String(data.get('title')).trim(),subject=String(data.get('subject'));if(!title||!selectedSubjects().includes(subject)){$('#createError').textContent='Add a title and choose one of your subjects.';return;}const button=form.querySelector('[type=submit]');button.disabled=true;try{const created=await backend.createSet({title,subject,description:String(data.get('description')).trim(),is_public:data.has('isPublic'),cards});await loadCommunitySets();location.hash=`flashcards/set-${created.id}`;toast('Flashcard set created');}catch(err){$('#createError').textContent=err.message||'Could not create your set.';button.disabled=false;}return;}
if(e.target.id!=='planForm')return;e.preventDefault();const data=new FormData(e.target);const title=String(data.get('title')).trim();if(!title){toast('Please enter a study session');return;}state.tasks.push({title,date:String(data.get('date')),done:false});save();render();toast('Study session added');});
updateAccount();
if (backend) {
  try {
    const sessionUser=await backend.session();
    if (confirmationReturn) {
      if(confirmationHadToken && sessionUser) await backend.signOut();
      history.replaceState(null,'',location.pathname);
      showLanding();account('login');
      const msg=document.createElement('p');msg.className=confirmationHadToken && sessionUser?'auth-success':'error';msg.textContent=confirmationHadToken && sessionUser?'Email confirmed. Please sign in to continue.':'We could not confirm this link. Please try signing in or request a new confirmation email.';$('#authForm')?.prepend(msg);
    } else if(sessionUser) await enterAccount(sessionUser);
    else showLanding();
  } catch { showLanding(); if(confirmationReturn){history.replaceState(null,'',location.pathname);account('login');const msg=document.createElement('p');msg.className='error';msg.textContent='We could not verify this link. Please try signing in or request a new confirmation email.';$('#authForm')?.prepend(msg);}else toast('Could not connect to your account. Please try again.'); }
} else { showLanding(); }
document.querySelectorAll('[data-open-auth]').forEach(button=>button.disabled=false);
