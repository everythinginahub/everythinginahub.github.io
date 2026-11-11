const WORDS = [
  ['adventure','A journey with something unexpected.'],
  ['asteroid','A small rocky object in space.'],
  ['backpack','You carry books in this.'],
  ['balloon','A colourful thing filled with air.'],
  ['bicycle','A two-wheeled way to travel.'],
  ['blizzard','A strong snowstorm.'],
  ['bluebird','A small bird with bright feathers.'],
  ['bookshop','A place to browse stories.'],
  ['butterfly','An insect with colourful wings.'],
  ['campsite','A place to pitch a tent.'],
  ['cinnamon','A warm spice often used in baking.'],
  ['compass','A tool that can point north.'],
  ['dolphin','A clever animal that lives in the sea.'],
  ['firework','A bright burst in the night sky.'],
  ['forest','A place filled with trees.'],
  ['galaxy','A huge collection of stars and planets.'],
  ['garden','A place where people grow plants.'],
  ['glacier','A very large, slow-moving mass of ice.'],
  ['horizon','Where the sky seems to meet the land.'],
  ['journey','A trip from one place to another.'],
  ['keyboard','You type on this.'],
  ['lantern','A portable light with a handle.'],
  ['library','A place to borrow books.'],
  ['meadow','An open field of grass and flowers.'],
  ['moonlight','The light we see reflected from the moon.'],
  ['mountain','A very high area of land.'],
  ['museum','A place to discover art or history.'],
  ['notebook','A book for writing down ideas.'],
  ['octopus','A sea animal with eight arms.'],
  ['orchard','A place where fruit trees grow.'],
  ['planet','A world that travels around a star.'],
  ['puzzle','A problem made to be solved.'],
  ['rainbow','A colourful arc that can appear after rain.'],
  ['sandwich','A meal made with fillings between bread.'],
  ['starlight','A tiny point of light in the night sky.'],
  ['sunshine','Bright light from the sun.'],
  ['triangle','A shape with three sides.'],
  ['waterfall','Water flowing over a steep edge.'],
  ['whisper','A very quiet way of speaking.'],
  ['wildlife','Animals living in their natural homes.']
];

const isDateKey = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;

export function localDateKey(date = new Date()) {
  return `${String(date.getFullYear()).padStart(4,'0')}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function seedFor(date) {
  let seed = 2166136261;
  for (const character of date) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  return seed >>> 0 || 1;
}

function randomFrom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

const integer = (random, min, max) => min + Math.floor(random() * (max - min + 1));

function scrambled(word, random) {
  const letters = [...word];
  for (let i=letters.length-1;i>0;i--) {
    const j=Math.floor(random()*(i+1));
    [letters[i],letters[j]]=[letters[j],letters[i]];
  }
  if (letters.join('') === word) letters.push(letters.shift());
  return letters.join('');
}

export function dailyChallenges(date) {
  if (!isDateKey(date)) throw new Error('Enter a real date in YYYY-MM-DD format.');
  const random=randomFrom(seedFor(date));
  const start=integer(random,2,14),step=integer(random,2,9);
  const sequence={
    type:'number', title:'Pattern spotter',
    prompt:`${start}  ·  ${start+step}  ·  ${start+step*2}  ·  ?`,
    instruction:'What number comes next?', answer:String(start+step*3), placeholder:'Next number'
  };
  const operation=integer(random,0,2);
  let left,right,symbol,answer;
  if(operation===0){left=integer(random,18,79);right=integer(random,11,39);symbol='+';answer=left+right;}
  else if(operation===1){left=integer(random,42,99);right=integer(random,8,37);symbol='−';answer=left-right;}
  else{left=integer(random,3,12);right=integer(random,3,9);symbol='×';answer=left*right;}
  const maths={
    type:'number', title:'Quick maths', prompt:`${left} ${symbol} ${right} = ?`,
    instruction:'Take a moment, then enter your answer.', answer:String(answer), placeholder:'Your answer'
  };
  const [word,hint]=WORDS[integer(random,0,WORDS.length-1)];
  const letters={
    type:'word', title:'Word shuffle', prompt:`Unscramble: ${scrambled(word,random).toUpperCase()}`,
    instruction:hint, answer:word, placeholder:'Your word'
  };
  const puzzles=[sequence,maths,letters];
  for(let i=puzzles.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[puzzles[i],puzzles[j]]=[puzzles[j],puzzles[i]];}
  return puzzles;
}

export function normalizeDailyAnswer(value) {
  return String(value??'').trim().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/[^a-z0-9]/g,'');
}

export function dailyProgressKey(userId='guest') {
  const account=String(userId||'guest').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,100)||'guest';
  return `everything-hub-daily-challenge-v1-${account}`;
}

function emptyProgress() { return {lastDate:'',streak:0,results:[]}; }

export function readDailyProgress(storage,userId='guest') {
  try {
    const value=JSON.parse(storage.getItem(dailyProgressKey(userId))||'null');
    if(!value||typeof value!=='object'||Array.isArray(value))return emptyProgress();
    const results=Array.isArray(value.results)?value.results.filter(item=>item&&isDateKey(item.date)&&Number.isInteger(item.score)&&item.score>=0&&item.score<=3).slice(-90):[];
    return {
      lastDate:isDateKey(value.lastDate)?value.lastDate:'',
      streak:Number.isInteger(value.streak)&&value.streak>=0&&value.streak<=10000?value.streak:0,
      results
    };
  } catch { return emptyProgress(); }
}

export function writeDailyProgress(storage,userId,progress) {
  try { storage.setItem(dailyProgressKey(userId),JSON.stringify(progress));return true; }
  catch { return false; }
}

function daysBetweenKeys(first,second) {
  return (Date.parse(`${second}T00:00:00Z`)-Date.parse(`${first}T00:00:00Z`))/86400000;
}

export function recordDailyScore(progress,date,score) {
  if(!isDateKey(date)||!Number.isInteger(score)||score<0||score>3)throw new Error('Invalid daily challenge result.');
  const existing=progress.results.find(item=>item.date===date);
  let streak=progress.streak;
  let lastDate=progress.lastDate;
  if(!existing&&(!lastDate||date>lastDate)){
    streak=lastDate&&daysBetweenKeys(lastDate,date)===1?streak+1:1;
    lastDate=date;
  }else if(!existing&&!lastDate){
    streak=1;lastDate=date;
  }
  const bestScore=Math.max(score,existing?.score||0);
  const results=[...progress.results.filter(item=>item.date!==date),{date,score:bestScore}].sort((a,b)=>a.date.localeCompare(b.date)).slice(-90);
  return {progress:{lastDate,streak,results},bestScore,streak};
}

function show(element,visible) { if(element)element.hidden=!visible; }

export function mountDailyChallenge({root,win=window,userId='guest'}) {
  const $=selector=>root.querySelector(selector);
  const welcome=$('#dailyWelcome'),game=$('#dailyGame'),done=$('#dailyDone');
  const form=$('#dailyAnswerForm'),input=$('#dailyAnswer'),feedback=$('#dailyFeedback'),submit=$('#dailySubmit');
  const today=localDateKey(),puzzles=dailyChallenges(today);
  let storage=null;try{storage=win.localStorage;}catch{}
  let progress=readDailyProgress(storage,userId),index=0,score=0,answered=false;
  let currentBest=progress.results.find(item=>item.date===today);

  function updateWelcome() {
    const date=$('#dailyDate');
    if(date)date.textContent=new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long'}).format(new Date(`${today}T12:00:00`));
    const streak=$('#dailyStreak');if(streak)streak.textContent=`${progress.streak} ${progress.streak===1?'day':'days'}`;
    const summary=$('#dailySavedSummary');
    if(summary)summary.textContent=currentBest?`Today's best: ${currentBest.score}/3 · ${progress.streak}-day streak.`:progress.streak?`You're on a ${progress.streak}-day streak. Keep it going with three fresh puzzles.`:'Three fresh, locally generated puzzles. A new set is ready each day.';
    const start=$('#dailyStart');if(start){start.textContent=currentBest?"Play today's set again":"Start today's challenge";start.disabled=false;}
  }

  function showQuestion() {
    const puzzle=puzzles[index];answered=false;
    $('#dailyRound').textContent=`PUZZLE ${index+1} OF ${puzzles.length}`;
    $('#dailyTitle').textContent=puzzle.title;
    $('#dailyPrompt').textContent=puzzle.prompt;
    $('#dailyInstruction').textContent=puzzle.instruction;
    $('#dailyAnswerLabel').textContent=puzzle.type==='word'?'Your word':'Your answer';
    input.type='text';input.inputMode=puzzle.type==='number'?'numeric':'text';
    input.autocomplete='off';input.spellcheck=puzzle.type==='word';input.placeholder=puzzle.placeholder;input.value='';input.disabled=false;
    feedback.textContent='';feedback.classList.remove('is-correct','is-incorrect');
    submit.textContent='Check answer';
    const meter=$('#dailyMeter');if(meter){meter.setAttribute('aria-valuenow',String(index));meter.setAttribute('aria-valuetext',`Puzzle ${index+1} of ${puzzles.length}`);meter.firstElementChild.style.transform=`scaleX(${index/puzzles.length})`;}
  }

  function finish() {
    const result=recordDailyScore(progress,today,score);progress=result.progress;currentBest=progress.results.find(item=>item.date===today);
    const saved=writeDailyProgress(storage,userId,progress);
    show(game,false);show(done,true);show(welcome,false);
    $('#dailyFinalScore').textContent=`${score} / ${puzzles.length}`;
    $('#dailyBestScore').textContent=`Best today: ${result.bestScore} / ${puzzles.length}`;
    $('#dailyFinalStreak').textContent=`${progress.streak} ${progress.streak===1?'day':'days'} in a row`;
    $('#dailyShareLine').textContent=`Daily Brain Break · ${result.bestScore}/${puzzles.length} · ${progress.streak}-day streak`;
    $('#dailySaveNote').textContent=saved?'Your score and streak are saved on this device.':'Your score is shown here, but this browser could not save it.';
    updateWelcome();
  }

  function onSubmit(event) {
    if(event.target!==form)return;
    event.preventDefault();
    if(answered){if(index<puzzles.length-1){index++;showQuestion();input.focus();}else finish();return;}
    const value=normalizeDailyAnswer(input.value);
    if(!value){feedback.textContent='Enter an answer to continue.';input.focus();return;}
    const correct=value===normalizeDailyAnswer(puzzles[index].answer);
    if(correct)score++;
    answered=true;input.disabled=true;
    feedback.textContent=correct?'That’s right! Nice work.':`Not quite — the answer was ${puzzles[index].answer}. Keep going!`;
    feedback.classList.toggle('is-correct',correct);feedback.classList.toggle('is-incorrect',!correct);
    submit.textContent=index<puzzles.length-1?'Next puzzle':'See my score';
    const meter=$('#dailyMeter');if(meter){meter.setAttribute('aria-valuenow',String(index+1));meter.setAttribute('aria-valuetext',`Puzzle ${index+1} of ${puzzles.length} answered`);meter.firstElementChild.style.transform=`scaleX(${(index+1)/puzzles.length})`;}
  }

  async function onClick(event) {
    const button=event.target.closest('button');if(!button)return;
    if(button.id==='dailyStart'){
      score=0;index=0;show(welcome,false);show(done,false);show(game,true);showQuestion();input.focus();
    }else if(button.id==='dailyReplay'){
      score=0;index=0;show(done,false);show(game,true);showQuestion();input.focus();
    }else if(button.id==='dailyCopyResult'){
      const text=$('#dailyShareLine').textContent;
      try{if(!win.navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await win.navigator.clipboard.writeText(text);$('#dailyShareStatus').textContent='Result copied. Share it with a friend!';}
      catch{$('#dailyShareStatus').textContent=`You can share: ${text}`;}
    }
  }

  form.addEventListener('submit',onSubmit);root.addEventListener('click',onClick);updateWelcome();
  return {destroy(){form.removeEventListener('submit',onSubmit);root.removeEventListener('click',onClick);}};
}
