export const lifeHacks=[
 {category:'Study',title:'Turn a vague task into a tiny first step',tip:'Replace “revise science” with one action, such as answering three questions on one topic. A clear starting point makes it easier to begin.'},
 {category:'Study',title:'Recall before you reread',tip:'Close your notes and jot down what you remember, then check a reliable source and correct any gaps.'},
 {category:'Study',title:'Leave yourself a restart note',tip:'At the end of a study session, write one specific question or task to begin with next time.'},
 {category:'Study',title:'Keep a short mistake log',tip:'Note the question, the step that went wrong and the corrected method. Revisit it later rather than copying a whole page of notes.'},
 {category:'Study',title:'Match the task to the time you have',tip:'Use a short gap for a few flashcards or one worked example; save a longer block for an essay plan or a full practice set.'},
 {category:'Planning',title:'Pick one next action',tip:'When a list feels too long, choose the next useful action and leave the rest visible for later.'},
 {category:'Planning',title:'Add a buffer to your plan',tip:'Leave space between commitments for travel, setup or overruns. A plan with breathing room is easier to adjust.'},
 {category:'Planning',title:'Make a reusable leaving-home checklist',tip:'Write down the items you often need, such as keys, travel card, water bottle or charger, then keep the checklist by your bag.'},
 {category:'Planning',title:'Use one place for things you must remember',tip:'Put appointments in a calendar and one-off tasks in a list, instead of relying on several scattered notes.'},
 {category:'Planning',title:'Do a quick weekly reset',tip:'Look at the week ahead, move outdated tasks and choose a few priorities. You do not need to plan every hour.'},
 {category:'Home',title:'Give everyday items a home',tip:'Choose one easy-to-reach place for items you often misplace, such as keys or your school pass.'},
 {category:'Home',title:'Keep a small essentials kit together',tip:'Group useful items for a regular activity—like a pencil, charger or reusable bag—so you can check them at a glance.'},
 {category:'Home',title:'Reset one small surface',tip:'When a room feels cluttered, return a few items to where they belong rather than trying to organise everything at once.'},
 {category:'Digital',title:'Save links with useful names',tip:'Use a short title that explains why a page matters, so you can find it again without reopening every bookmark.'},
 {category:'Digital',title:'Find a word before scrolling',tip:'Use your browser’s Find command to jump to a name or topic on a long page, then read the surrounding context.'},
 {category:'Digital',title:'Quiet non-essential notifications',tip:'Review notification settings and turn off alerts that do not need an immediate response. Keep safety and account alerts enabled.'},
 {category:'Digital',title:'Close tabs you can replace',tip:'Bookmark a page you need later, then close the tab if you no longer need it open right now.'},
 {category:'Digital',title:'Use unique passwords with a password manager',tip:'A trusted password manager can help you keep separate passwords for different accounts. Never share a password or recovery code.'}
];

export const lifeHackCategories=['All',...new Set(lifeHacks.map(item=>item.category))];

export function filterLifeHacks(query='',category='All'){
 const search=String(query??'').trim().toLocaleLowerCase();
 return lifeHacks.filter(item=>(category==='All'||item.category===category)&&(!search||`${item.title} ${item.tip} ${item.category}`.toLocaleLowerCase().includes(search)));
}

function escapeHTML(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}

export function lifeHacksView(){
 return `<div class="life-hacks-app"><p>Small, practical ideas for studying, organising a week and making everyday tasks easier. Pick what suits you and leave the rest.</p><div class="life-hacks-controls"><label for="lifeHacksSearch">Search tips<input id="lifeHacksSearch" type="search" placeholder="Try “notes” or “planning”…" autocomplete="off"></label><label for="lifeHacksCategory">Category<select id="lifeHacksCategory">${lifeHackCategories.map(category=>`<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`).join('')}</select></label></div><div class="life-hacks-toolbar"><button id="lifeHacksPick" class="btn dark" type="button">Pick a random tip</button><span id="lifeHacksCount" role="status" aria-live="polite"></span></div><p id="lifeHacksSpotlight" class="life-hacks-spotlight" role="status" aria-live="polite">Choose a tip for a small idea to try.</p><div id="lifeHacksGrid" class="life-hacks-grid"></div><p id="lifeHacksEmpty" class="mini-result" hidden>No tips match those filters. Try another word or choose All categories.</p><p class="mini-footnote">These are general suggestions, not guarantees. Adapt them to your own routine and follow trusted guidance for safety, health or finances.</p></div>`;
}

export function mountLifeHacks({root,win=window}={}){
 const search=root.querySelector('#lifeHacksSearch'),category=root.querySelector('#lifeHacksCategory'),grid=root.querySelector('#lifeHacksGrid'),count=root.querySelector('#lifeHacksCount'),empty=root.querySelector('#lifeHacksEmpty'),spotlight=root.querySelector('#lifeHacksSpotlight');
 if(!search||!category||!grid||!count||!empty||!spotlight)return {destroy(){}};
 let visible=[];
 function render(){
  visible=filterLifeHacks(search.value,category.value);
  count.textContent=`${visible.length} ${visible.length===1?'tip':'tips'}`;
  empty.hidden=visible.length>0;
  grid.replaceChildren();
  for(const item of visible){
   const card=win.document.createElement('article'),label=win.document.createElement('p'),title=win.document.createElement('h2'),tip=win.document.createElement('p');
   card.className='life-hack-card';label.className='life-hack-category';label.textContent=item.category;title.textContent=item.title;tip.textContent=item.tip;card.append(label,title,tip);grid.append(card);
  }
 }
 function onInput(){render();}
 function onClick(event){
  if(!event.target.closest('#lifeHacksPick'))return;
  if(!visible.length){spotlight.textContent='There are no matching tips to pick. Change your filters first.';return;}
  const index=Math.min(visible.length-1,Math.floor(win.Math.random()*visible.length));const item=visible[index];
  spotlight.textContent=`${item.title}: ${item.tip}`;
 }
 search.addEventListener('input',onInput);category.addEventListener('change',onInput);root.addEventListener('click',onClick);render();
 return {destroy(){search.removeEventListener('input',onInput);category.removeEventListener('change',onInput);root.removeEventListener('click',onClick);}};
}
