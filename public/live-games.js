import { createQuiz } from './games.js?v=20261107-5';
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const codePattern = /^[0-9A-F]{10}$/;
export function liveQuestions(cards, length = 10, random = Math.random) {
  const quiz = createQuiz(cards, random, length);
  return quiz?.questions.map(q=>({question:q.question,choices:q.choices.map(c=>c.text),correct:q.choices.findIndex(c=>c.id===q.id)})) || null;
}
export function liveHub(decks, preferredDeck = '') {
  return `<div class="live-hero"><div><p class="eyebrow">PLAY TOGETHER</p><h1>Live games</h1><p>Host a quiz or race with friends using a flashcard set. Everyone needs a signed-in account.</p></div><div class="live-hero-symbol" aria-hidden="true">▦</div></div>
  <div class="live-modes"><article><span>01</span><h2>Host-led quiz</h2><p>Answer together. The host reveals each answer and moves everyone on.</p></article><article><span>02</span><h2>Flashcard race</h2><p>Work through questions at your own pace. Correct answers earn points; finishing time breaks ties.</p></article></div>
  <div class="live-setup-grid"><section class="live-panel"><h2>Join a game</h2><p>Ask the host for the 10-character code.</p><form id="liveJoin"><label class="field">Game code<input name="code" maxlength="10" minlength="10" pattern="[0-9A-Fa-f]{10}" required autocomplete="off" autocapitalize="characters" placeholder="e.g. A1B2C3D4E5"></label><label class="field">Nickname<input name="nickname" maxlength="24" minlength="2" required autocomplete="off" placeholder="Choose a nickname"></label><p class="live-error error" role="alert"></p><button class="btn dark" type="submit">Join game →</button></form></section>
  <section class="live-panel"><h2>Host a game</h2><p>Choose a set and invite up to 29 other players.</p><form id="liveCreate"><label class="field">Flashcard set<select name="deck" required>${decks.map(d=>`<option value="${esc(d.id)}" ${d.id===preferredDeck?'selected':''}>${esc(d.subject)} · ${esc(d.title)}${d.community&&!d.isPublic?' · private':''}</option>`).join('')}</select></label><label class="field">Game mode<select name="mode"><option value="hosted">Host-led quiz</option><option value="race">Flashcard race</option></select></label><label class="field">Questions<select name="length"><option value="5">Up to 5</option><option value="10" selected>Up to 10</option><option value="20">Up to 20</option></select></label><label class="field">Your nickname<input name="nickname" maxlength="24" minlength="2" required autocomplete="off" placeholder="Choose a nickname"></label><label class="live-share-consent"><input type="checkbox" name="share" required> <span>I understand this shares questions and answers from this set with everyone who joins, including from private sets.</span></label><p class="live-error error" role="alert"></p><button class="btn dark" type="submit" ${decks.length?'':'disabled'}>Create lobby →</button></form></section></div><p class="live-footnote">Games are for signed-in players, last up to two hours and update every few seconds. The host can remove players. Codes are invitations, not a substitute for moderation; use nicknames without personal information.</p>`;
}
export function liveJoinPage(code) {
  return `<div class="live-page-heading"><a class="back-link" href="#live">← Live games</a><h1>Join a live game</h1><p>Game code <strong>${esc(code)}</strong></p></div><section class="live-panel live-join-panel"><p>Choose a nickname to join. Use a name that does not include personal information.</p><form id="liveJoin"><input type="hidden" name="code" value="${esc(code)}"><label class="field">Nickname<input name="nickname" minlength="2" maxlength="24" required autocomplete="off"></label><p class="live-error error" role="alert"></p><button class="btn dark" type="submit">Join game →</button></form></section>`;
}
export function liveRoomView(s, url) {
  const players=[...s.players].sort((a,b)=>b.score-a.score || (s.mode==='race' ? (a.finishedAt ? (b.finishedAt ? Date.parse(a.finishedAt)-Date.parse(b.finishedAt) : -1) : b.finishedAt ? 1 : 0) : 0) || a.name.localeCompare(b.name));
  const board=`<section class="live-panel live-board"><div class="live-board-title"><h2>Players</h2><span>${s.players.length} / 30</span></div><ol>${players.map((p,i)=>`<li><span class="live-rank">${i+1}</span><span class="live-player-name">${esc(p.name)}${p.host?' <small>HOST</small>':''}</span><strong>${p.score} pts${s.mode==='race'?` <small>${p.finishedAt?'· Finished':`· ${p.progress}/${s.total}`}</small>`:''}</strong>${s.isHost&&!p.host&&s.status!=='finished'?`<button id="liveKick-${esc(p.id)}" class="live-remove" data-live-kick="${esc(p.id)}" aria-label="Remove ${esc(p.name)}">Remove</button>`:''}</li>`).join('')}</ol></section>`;
  let content='';
  if(s.status==='lobby') content=`<section class="live-panel live-lobby"><p class="eyebrow">WAITING ROOM</p><h2>Invite your players</h2><p>Everyone needs to sign in, then enter this code or open the link.</p><div class="live-code">${esc(s.code)}</div><label class="field">Invite link<input id="liveInvite" readonly value="${esc(url)}"></label><button class="btn outline" id="liveCopy" type="button">Copy invite link</button><p class="live-note">${s.players.length} ${s.players.length===1?'player':'players'} joined · At least 2 needed · ${s.total} questions</p>${s.isHost?`<button id="liveControl-start" class="btn dark" data-live-control="start" ${s.players.length<2?'disabled':''}>Start game →</button>`:'<p class="live-wait">Waiting for the host to start.</p>'}</section>`;
  else if(s.status==='finished') content=`<section class="live-panel live-finished"><p class="eyebrow">GAME COMPLETE</p><h2 id="liveQuestionHeading" tabindex="-1">Final scores</h2><p>Each correct answer earns one point.${s.mode==='race'?' Finishing time breaks ties.':''} Scores are only for this game.</p>${s.lastAnswer?`<p class="live-feedback">Last answer: ${s.lastAnswer.correct?'Correct':'Not quite'} · ${esc(s.lastAnswer.answer)}</p>`:''}<a class="btn dark" href="#live">Play again →</a></section>`;
  else {
    const q=s.question;
    const question=q?`<section class="live-panel live-question"><p class="eyebrow">QUESTION ${q.number+1} OF ${s.total}</p><h2 id="liveQuestionHeading" tabindex="-1">${esc(q.text)}</h2>${s.mode==='hosted'?`<p class="live-note">${q.answered} / ${s.players.length} answered</p>`:''}<div class="live-choices">${q.choices.map((choice,i)=>`<button id="liveAnswer-${q.number}-${i}" class="live-choice ${q.selected===i?'selected':''} ${q.correct===i?'correct':''}" data-live-answer="${i}" data-question="${q.number}" ${q.selected!==null||s.status==='reveal'?'disabled':''}><span>${String.fromCharCode(65+i)}</span>${esc(choice)}${q.correct===i?' <strong>✓ Correct</strong>':''}</button>`).join('')}</div>${q.selected!==null&&s.status==='question'?'<p class="live-wait">Answer received. Waiting for the host.</p>':''}${s.status==='reveal'?`<p class="live-feedback">${q.selected===null?'You did not answer.':q.selected===q.correct?'Correct!':'Not quite.'} Correct answer: ${esc(q.choices[q.correct])}</p>`:''}</section>`:`<section class="live-panel"><h2 id="liveQuestionHeading" tabindex="-1">You finished your questions</h2><p>Waiting for the other players to finish.</p></section>`;
    content=(s.mode==='race'&&s.lastAnswer?`<div class="live-feedback" role="status">${s.lastAnswer.correct?'Correct!':'Not quite.'} Answer: ${esc(s.lastAnswer.answer)}</div>`:'')+question;
    if(s.isHost) content+=`<div class="live-host-controls">${s.mode==='hosted'?`<button id="liveControl-${s.status==='question'?'reveal':'next'}" class="btn dark" data-live-control="${s.status==='question'?'reveal':'next'}">${s.status==='question'?'Reveal answer':'Next question'} →</button>`:''}<button id="liveControl-finish" class="btn outline" data-live-control="finish">End game</button></div>`;
  }
  return `<div class="live-page-heading"><a id="liveBack" class="back-link" href="#live">← Live games</a><p class="eyebrow">${s.mode==='hosted'?'HOST-LED QUIZ':'FLASHCARD RACE'} · ${esc(s.code)}</p><h1>${esc(s.title)}</h1><p>Playing as ${esc(s.nickname)} · ${s.status==='lobby'?'Waiting room':s.status==='finished'?'Finished':'In progress'}</p></div><div class="live-layout"><div>${content}</div>${board}</div><p class="live-footnote">Updates every few seconds · Scores are game-only · Games expire after two hours.</p>${s.isHost&&s.status==='lobby'?'<button class="text-link" data-live-control="finish">Close lobby</button>':''}`;
}
export function mountLive({root,client,decks,code,session,preferredDeck='',win=window}) {
  let disposed=false, timer=null, roomId=null, polling=false, busy=false, fatal=false, last='', lastState=null, errors=0;
  const setStatus=text=>{const el=root.querySelector('#liveConnection');if(el)el.textContent=text;};
  const storageKey=c=>`revisepro-live-${c}`;
  const remember=(c,n)=>{try{session.setItem(storageKey(c),n);}catch{}};
  const stored=c=>{try{return session.getItem(storageKey(c));}catch{return null;}};
  const rpc=async(name,args)=>{const result=await client.rpc(name,args);if(result.error)throw result.error;return result.data;};
  function showHub(){root.innerHTML=liveHub(decks,preferredDeck);}
  function showJoin(c){root.innerHTML=liveJoinPage(c);}
  function showRoom(state){
    const next=JSON.stringify(state);if(next===last)return;
    const previous=lastState;last=next;lastState=state;
    const stage=s=>`${s.status}:${s.question?.number ?? 'none'}`;
    if(previous && stage(previous)!==stage(state)){
      const announcer=win.document.getElementById('gameAnnouncer');
      if(announcer)announcer.textContent=state.status==='finished'?'Game finished. Final scores are ready.':state.status==='reveal'?'The host revealed the answer.':state.question?`Question ${state.question.number+1} of ${state.total}.`:'Waiting for other players.';
    }
    const active=win.document.activeElement;const focused=root.contains(active)?active?.id:null;
    const url=new URL(win.location.href);url.hash=`live/${state.code}`;
    root.innerHTML=`<p id="liveConnection" class="live-connection" role="status">Connected</p>${liveRoomView(state,url.href)}`;
    if(focused){const el=win.document.getElementById(focused);if(el&&root.contains(el)&&!el.disabled)el.focus({preventScroll:true});else root.querySelector('#liveQuestionHeading')?.focus({preventScroll:true});}
  }
  async function poll(){
    if(disposed||!roomId||polling)return;polling=true;
    try{const state=await rpc('live_state',{p_room:roomId});if(disposed)return;errors=0;showRoom(state);setStatus('Connected · updates every few seconds');}
    catch(err){if(disposed)return;errors++;const msg=String(err.message||'Connection interrupted');if(/not in this game|not found or expired/i.test(msg)){fatal=true;win.clearInterval(timer);timer=null;root.innerHTML=`<section class="live-panel"><h1>Game unavailable</h1><p>${esc(msg)}</p><a class="btn dark" href="#live">Back to live games</a></section>`;}else setStatus(errors>1?'Connection interrupted. Retrying…':'Reconnecting…');}
    finally{polling=false;}
  }
  async function join(c,n){const data=await rpc('live_join',{p_code:c,p_nickname:n});if(disposed)return;remember(data.code,n);if(win.location.hash!==`#live/${data.code}`){win.location.hash=`live/${data.code}`;return;}roomId=data.id;root.innerHTML='<p id="liveConnection" class="live-connection" role="status">Connecting…</p>';await poll();if(!disposed&&!fatal&&!timer)timer=win.setInterval(poll,2500);}
  root.addEventListener('submit',async e=>{
    if(!['liveJoin','liveCreate'].includes(e.target.id))return;e.preventDefault();if(busy)return;busy=true;const form=e.target, button=form.querySelector('[type=submit]'), error=form.querySelector('.live-error');button.disabled=true;error.textContent='';
    try{const data=new win.FormData(form),nickname=String(data.get('nickname')||'').trim();if(nickname.length<2||nickname.length>24)throw new Error('Choose a nickname between 2 and 24 characters.');
      if(form.id==='liveJoin'){const c=String(data.get('code')||'').trim().toUpperCase();if(!codePattern.test(c))throw new Error('Enter the 10-character game code.');await join(c,nickname);}
      else {const deck=decks.find(d=>d.id===data.get('deck'));if(!deck)throw new Error('Choose a set.');if(!data.has('share'))throw new Error('Confirm that the questions will be shared.');const questions=liveQuestions(deck.cards,Number(data.get('length')));if(!questions)throw new Error('This set needs at least two different questions and answers.');const result=await rpc('live_create',{p_title:deck.title,p_mode:String(data.get('mode')),p_questions:questions,p_nickname:nickname});if(disposed)return;remember(result.code,nickname);win.location.hash=`live/${result.code}`;}
    }catch(err){if(!disposed)error.textContent=err.message||'Could not connect. Please try again.';}finally{busy=false;if(button.isConnected)button.disabled=false;}
  });
  root.addEventListener('click',async e=>{
    const button=e.target.closest('button');if(!button||busy)return;
    if(button.id==='liveCopy'){try{await win.navigator.clipboard.writeText(root.querySelector('#liveInvite').value);button.textContent='Copied';}catch{root.querySelector('#liveInvite').focus();root.querySelector('#liveInvite').select();setStatus('Select and copy the link.');}return;}
    const action=button.dataset.liveControl,kick=button.dataset.liveKick,answer=button.dataset.liveAnswer;if(!action&&!kick&&answer===undefined)return;
    if((kick||action==='finish')&&!win.confirm(kick?'Remove this player? They cannot rejoin this game.':'End this game for everyone?'))return;
    busy=true;button.disabled=true;
    try{if(answer!==undefined)await rpc('live_answer',{p_room:roomId,p_question:Number(button.dataset.question),p_choice:Number(answer)});else await rpc('live_control',{p_room:roomId,p_action:kick?'kick':action,p_player:kick||null});await poll();}
    catch(err){await poll();setStatus(err.message||'Could not update game. Retrying…');}finally{busy=false;if(button.isConnected)button.disabled=false;}
  });
  if(!code)showHub();else if(!codePattern.test(code))root.innerHTML='<section class="live-panel"><h1>Invalid code</h1><a class="btn dark" href="#live">Back to live games</a></section>';else {const nickname=stored(code);if(nickname){root.innerHTML='<p id="liveConnection" class="live-connection" role="status">Connecting…</p>';join(code,nickname).catch(err=>{if(!disposed){showJoin(code);root.querySelector('.live-error').textContent=err.message||'Could not reconnect.';}});}else showJoin(code);}
  return {destroy(){disposed=true;if(timer)win.clearInterval(timer);},getState:()=>lastState};
}
