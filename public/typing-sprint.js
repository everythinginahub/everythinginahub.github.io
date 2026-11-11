const PASSAGES = [
  'Curiosity turns small questions into surprising discoveries. Notice the details, try a new idea, and keep going when the first answer is not quite right.',
  'A good plan leaves room for a little wonder. Choose one thing to practise, take a short break, then come back with fresh eyes and a kinder pace.',
  'The world is full of patterns: in music, in nature, in numbers, and in the stories people tell. Looking closely is the first step to understanding them.',
  'Make something, test it, and learn from what happens. Progress is built from tiny experiments, useful mistakes, and the courage to try once more.'
];
const HEX = /^#[\da-f]{6}$/i;

function safeAccount(value='guest') {
  return String(value||'guest').replace(/[^\da-z_-]/gi,'').slice(0,100)||'guest';
}

export function typingProgressKey(userId='guest') {
  return `everything-hub-typing-sprint-v1-${safeAccount(userId)}`;
}

export function scoreTyping(prompt,typed,elapsedSeconds) {
  const target=String(prompt??''),entry=String(typed??''),elapsed=Number(elapsedSeconds);
  let correctCharacters=0;
  for(let index=0;index<Math.min(target.length,entry.length);index++)if(target[index]===entry[index])correctCharacters++;
  const accuracy=entry.length?Math.round(correctCharacters/entry.length*100):0;
  const wpm=Number.isFinite(elapsed)&&elapsed>0?Math.min(1000,Math.round(correctCharacters/5/(elapsed/60))):0;
  return {wpm,accuracy,correctCharacters,typedCharacters:entry.length};
}

function readBest(storage,userId) {
  try {
    const value=JSON.parse(storage.getItem(typingProgressKey(userId))||'null');
    if(!value||typeof value!=='object')return {wpm:0,accuracy:0,attempts:0};
    return {
      wpm:Number.isInteger(value.wpm)&&value.wpm>=0&&value.wpm<=1000?value.wpm:0,
      accuracy:Number.isInteger(value.accuracy)&&value.accuracy>=0&&value.accuracy<=100?value.accuracy:0,
      attempts:Number.isInteger(value.attempts)&&value.attempts>=0&&value.attempts<=100000?value.attempts:0
    };
  } catch { return {wpm:0,accuracy:0,attempts:0}; }
}

export function mountTypingSprint({root,win=window,userId='guest',now=()=>win.performance.now()}) {
  const $=selector=>root.querySelector(selector);
  const passage=$('#typingPassage'),durationSelect=$('#typingDuration'),promptNode=$('#typingPrompt'),input=$('#typingInput');
  const startButton=$('#typingStart'),finishButton=$('#typingFinish'),resetButton=$('#typingReset'),status=$('#typingStatus');
  const timeNode=$('#typingTime'),result=$('#typingResult'),bestNode=$('#typingBest'),copyButton=$('#typingCopy');
  let storage=null;try{storage=win.localStorage;}catch{}
  let best=readBest(storage,userId),timer=null,startedAt=0,active=false,lastScore=null;

  function saveBest() {
    try{storage.setItem(typingProgressKey(userId),JSON.stringify(best));return true;}
    catch{return false;}
  }

  function currentPassage() {
    const selected=Number(passage.value);
    return PASSAGES[Number.isInteger(selected)&&PASSAGES[selected]?selected:0];
  }

  function drawPrompt() {
    const text=currentPassage(),typed=input.value;
    promptNode.replaceChildren();
    for(let index=0;index<text.length;index++){
      const character=win.document.createElement('span');
      character.textContent=text[index];
      if(index<typed.length)character.className=typed[index]===text[index]?'is-correct':'is-incorrect';
      else if(index===typed.length)character.className='is-current';
      promptNode.append(character);
    }
    $('#typingCharacterCount').textContent=`${typed.length} / ${text.length} characters`;
  }

  function renderBest() {
    bestNode.textContent=best.wpm?`Personal best: ${best.wpm} WPM · ${best.accuracy}% accuracy · ${best.attempts} ${best.attempts===1?'attempt':'attempts'}`:'Your personal best will appear here.';
  }

  function stopTimer() { if(timer!==null){win.clearInterval(timer);timer=null;} }

  function updateClock() {
    if(!active)return;
    const duration=Number(durationSelect.value)||30;
    const remaining=Math.max(0,Math.ceil(duration-(now()-startedAt)/1000));
    timeNode.textContent=`${remaining}s`;
    if(remaining===0)finish();
  }

  function start() {
    stopTimer();active=true;startedAt=now();lastScore=null;
    result.hidden=true;input.value='';input.disabled=false;passage.disabled=true;durationSelect.disabled=true;
    startButton.hidden=true;finishButton.hidden=false;resetButton.hidden=false;
    timeNode.textContent=`${Number(durationSelect.value)||30}s`;
    status.textContent='Type the passage as accurately as you can. The clock is running.';
    drawPrompt();input.focus();timer=win.setInterval(updateClock,200);
  }

  function finish() {
    if(!active)return;
    active=false;stopTimer();input.disabled=true;passage.disabled=false;durationSelect.disabled=false;
    startButton.hidden=false;finishButton.hidden=true;resetButton.hidden=false;
    const elapsed=Math.min(Number(durationSelect.value)||30,Math.max(.5,(now()-startedAt)/1000));
    const score=scoreTyping(currentPassage(),input.value,elapsed);lastScore=score;
    const improved=score.wpm>best.wpm||(score.wpm===best.wpm&&score.accuracy>best.accuracy);
    best={wpm:Math.max(best.wpm,score.wpm),accuracy:improved?score.accuracy:best.accuracy,attempts:Math.min(best.attempts+1,100000)};
    const saved=saveBest();
    $('#typingWpm').textContent=String(score.wpm);$('#typingAccuracy').textContent=`${score.accuracy}%`;
    $('#typingCorrect').textContent=`${score.correctCharacters} / ${score.typedCharacters}`;
    result.hidden=false;
    status.textContent=`Test finished. ${score.wpm} words per minute, ${score.accuracy} percent accuracy.${improved?' New personal best!':''}`;
    $('#typingSaveNote').textContent=saved?'Best speed saved on this device.':'Could not save your best speed in this browser.';
    renderBest();drawPrompt();
  }

  function reset() {
    stopTimer();active=false;input.value='';input.disabled=true;passage.disabled=false;durationSelect.disabled=false;
    startButton.hidden=false;finishButton.hidden=true;resetButton.hidden=true;timeNode.textContent=`${Number(durationSelect.value)||30}s`;
    status.textContent='Choose a passage and time, then start when you are ready.';result.hidden=true;lastScore=null;drawPrompt();
  }

  function onInput(){if(active){drawPrompt();if(input.value.length>=currentPassage().length)finish();}}
  function onSelectChange(){reset();}
  async function copyResult(){
    if(!lastScore)return;
    const text=`Typing Sprint: ${lastScore.wpm} WPM · ${lastScore.accuracy}% accuracy`;
    try{if(!win.navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await win.navigator.clipboard.writeText(text);$('#typingShareStatus').textContent='Result copied. Challenge a friend to beat it!';}
    catch{$('#typingShareStatus').textContent=text;}
  }

  passage.addEventListener('change',onSelectChange);durationSelect.addEventListener('change',reset);
  startButton.addEventListener('click',start);finishButton.addEventListener('click',finish);resetButton.addEventListener('click',reset);
  input.addEventListener('input',onInput);copyButton.addEventListener('click',copyResult);
  renderBest();drawPrompt();reset();
  return {destroy(){active=false;stopTimer();passage.removeEventListener('change',onSelectChange);durationSelect.removeEventListener('change',reset);startButton.removeEventListener('click',start);finishButton.removeEventListener('click',finish);resetButton.removeEventListener('click',reset);input.removeEventListener('input',onInput);copyButton.removeEventListener('click',copyResult);}};
}
