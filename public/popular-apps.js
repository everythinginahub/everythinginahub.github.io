export const popularMiniApps = {
  calculator: { name:'Calculator', description:'Do quick arithmetic with brackets and keyboard input.', kicker:'EVERYDAY TOOL', privacy:'Calculations happen only in this browser. Your expression and result are not saved.' },
  'unit-converter': { name:'Unit converter', description:'Convert everyday measures for length, weight, volume and temperature.', kicker:'EVERYDAY TOOL', privacy:'Conversions happen only in this browser. Your inputs and results are not saved.' },
  stopwatch: { name:'Stopwatch', description:'Time an activity and record laps, without a countdown or score.', kicker:'EVERYDAY TOOL', privacy:'The stopwatch runs only in this browser. Times are cleared when you leave.' },
  'word-scramble': { name:'Word scramble', description:'Unscramble a word or peek at a clue. Play at your own pace.', kicker:'JUST FOR FUN', privacy:'This word game has no timer, streak or score. Your guesses are not saved.' }
};

const unitGroups = Object.freeze({
  length: { label:'Length', units:{ mm:['Millimetres (mm)',0.001], cm:['Centimetres (cm)',0.01], m:['Metres (m)',1], km:['Kilometres (km)',1000], in:['Inches (in)',0.0254], ft:['Feet (ft)',0.3048], yd:['Yards (yd)',0.9144], mi:['Miles (mi)',1609.344] } },
  mass: { label:'Weight', units:{ mg:['Milligrams (mg)',0.000001], g:['Grams (g)',0.001], kg:['Kilograms (kg)',1], oz:['Ounces (oz)',0.028349523125], lb:['Pounds (lb)',0.45359237], st:['Stone (st)',6.35029318] } },
  volume: { label:'Volume', units:{ ml:['Millilitres (ml)',0.001], l:['Litres (l)',1], tsp:['Teaspoons (tsp)',0.00492892159], tbsp:['Tablespoons (tbsp)',0.0147867648], cup:['US cups',0.2365882365], gal:['US gallons',3.785411784] } },
  temperature: { label:'Temperature', units:{ C:['Celsius (°C)'], F:['Fahrenheit (°F)'], K:['Kelvin (K)'] } }
});

export function calculateExpression(expression) {
  const text=String(expression ?? '').replace(/[×]/g,'*').replace(/[÷]/g,'/').replace(/[−]/g,'-');
  if(!text.trim() || text.length>160) throw new Error('Enter a calculation up to 160 characters.');
  if(!/^[\d\s.+*/()\-]+$/.test(text)) throw new Error('Use numbers, brackets and +, −, × or ÷.');
  let index=0;
  const skip=()=>{while(/\s/.test(text[index]||'')&&index<text.length)index++;};
  const fail=()=>{throw new Error('Check the calculation and try again.');};
  const number=()=>{skip();const match=/^(?:\d+(?:\.\d*)?|\.\d+)/.exec(text.slice(index));if(!match)fail();index+=match[0].length;const value=Number(match[0]);if(!Number.isFinite(value))fail();return value;};
  const primary=()=>{skip();if(text[index]==='('){index++;const value=add();skip();if(text[index]!==')')fail();index++;return value;}return number();};
  const unary=()=>{skip();if(text[index]==='+'){index++;return unary();}if(text[index]==='-'){index++;return -unary();}return primary();};
  const multiply=()=>{let value=unary();while(true){skip();const operator=text[index];if(operator!=='*'&&operator!=='/')return value;index++;const next=unary();if(operator==='/'&&next===0)throw new Error('You cannot divide by zero.');value=operator==='*'?value*next:value/next;if(!Number.isFinite(value)||Math.abs(value)>1e15)throw new Error('That result is too large to display.');}};
  const add=()=>{let value=multiply();while(true){skip();const operator=text[index];if(operator!=='+'&&operator!=='-')return value;index++;const next=multiply();value=operator==='+'?value+next:value-next;if(!Number.isFinite(value)||Math.abs(value)>1e15)throw new Error('That result is too large to display.');}};
  const result=add();skip();if(index!==text.length)fail();return Number(result.toPrecision(12));
}

export function convertUnit(value, category, from, to) {
  const input=Number(value), group=unitGroups[category];
  if(String(value).trim()===''||!Number.isFinite(input)||Math.abs(input)>1e12||!group||!Object.hasOwn(group.units,from)||!Object.hasOwn(group.units,to)) throw new Error('Enter a valid value and choose supported units.');
  if(category==='temperature'){
    const celsius=from==='C'?input:from==='F'?(input-32)*5/9:input-273.15;
    if(celsius < -273.15-1e-10) throw new Error('Temperature cannot be below absolute zero.');
    const result=to==='C'?celsius:to==='F'?celsius*9/5+32:celsius+273.15;
    return Number(result.toPrecision(12));
  }
  const result=input*group.units[from][1]/group.units[to][1];
  if(!Number.isFinite(result)) throw new Error('That result is outside the supported range.');
  return Number(result.toPrecision(12));
}

export function formatStopwatch(milliseconds) {
  const total=Math.max(0,Math.floor(Number(milliseconds)||0));
  const centiseconds=Math.floor(total/10)%100,seconds=Math.floor(total/1000)%60,minutes=Math.floor(total/60000)%60,hours=Math.floor(total/3600000);
  return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}.${String(centiseconds).padStart(2,'0')}`;
}

export const scrambleWords = Object.freeze([
  {word:'planet', clue:'A world that travels around a star.'},
  {word:'garden', clue:'A place where flowers and vegetables grow.'},
  {word:'puzzle', clue:'A game or problem that needs a little thinking.'},
  {word:'rainbow', clue:'A colourful arc that can appear after rain.'},
  {word:'library', clue:'A place to borrow books and find information.'},
  {word:'lantern', clue:'A portable light, often used outdoors.'},
  {word:'curious', clue:'Eager to learn or discover something.'},
  {word:'journey', clue:'A trip from one place to another.'}
]);

export function scrambleWord(word, random=Math.random) {
  const letters=[...String(word)];
  if(letters.length<2||letters.length>20) throw new Error('Choose a word with 2 to 20 letters.');
  for(let i=letters.length-1;i>0;i--){const value=random();if(!Number.isFinite(value)||value<0||value>=1)throw new Error('Could not mix the letters.');const j=Math.floor(value*(i+1));[letters[i],letters[j]]=[letters[j],letters[i]];}
  if(letters.join('').toLocaleLowerCase()===String(word).toLocaleLowerCase()) letters.push(letters.shift());
  return letters.join('');
}

function calculatorMarkup(){
  const keys=[['7','7'],['8','8'],['9','9'],['/','÷','Divide'],['4','4'],['5','5'],['6','6'],['*','×','Multiply'],['1','1'],['2','2'],['3','3'],['-','−','Subtract'],['0','0'],['.','.'],['(','('],['+','+','Add'],[')',')'],['clear','Clear'],['backspace','⌫','Delete last character']];
  return `<form id="calculatorForm"><label for="calculatorExpression">Calculation</label><input id="calculatorExpression" name="expression" maxlength="160" inputmode="decimal" autocomplete="off" placeholder="For example: (12 + 4) ÷ 2" aria-describedby="calculatorHelp"><p id="calculatorHelp" class="popular-help">Type on your keyboard or use the buttons below. Brackets are supported.</p><div class="calculator-keypad" aria-label="Calculator keys">${keys.map(([value,label,aria])=>value==='clear'?'<button type="button" data-calc-clear>Clear</button>':value==='backspace'?`<button type="button" data-calc-backspace aria-label="${aria}">${label}</button>`:`<button type="button" data-calc-insert="${value}" ${aria?`aria-label="${aria}"`:''}>${label}</button>`).join('')}<button type="submit" class="calculator-equals">=</button></div><p id="calculatorResult" class="mini-result" role="status" aria-live="polite">Your answer will appear here.</p></form>`;
}
function unitMarkup(){
  const groups=Object.entries(unitGroups).map(([key,group])=>`<option value="${key}">${group.label}</option>`).join('');
  const options=Object.entries(unitGroups.length.units).map(([key,[label]])=>`<option value="${key}">${label}</option>`).join('');
  return `<form id="unitConverterForm"><label for="unitCategory">Measure</label><select id="unitCategory" name="category">${groups}</select><label for="unitValue">Value</label><input id="unitValue" name="value" type="number" step="any" value="1" required><div class="popular-fields"><label for="unitFrom">From<select id="unitFrom" name="from">${options}</select></label><label for="unitTo">To<select id="unitTo" name="to">${options}</select></label></div><button class="btn dark" type="submit">Convert</button><p id="unitResult" class="mini-result" role="status" aria-live="polite">Choose units to get a conversion.</p></form><p class="mini-footnote">Temperature checks respect absolute zero. Volume units are US measures; results are estimates for everyday use.</p>`;
}
function stopwatchMarkup(){return `<div class="stopwatch-app"><p>Start, pause, record a lap or reset whenever you like.</p><output id="stopwatchDisplay" class="stopwatch-display" role="timer" aria-label="Elapsed time">00:00:00.00</output><div class="stopwatch-actions"><button id="stopwatchToggle" class="btn dark" type="button">Start</button><button id="stopwatchLap" class="btn outline" type="button" disabled>Lap</button><button id="stopwatchReset" class="btn outline" type="button" disabled>Reset</button></div><ol id="stopwatchLaps" class="stopwatch-laps" aria-label="Stopwatch laps"></ol><p class="mini-footnote">Elapsed time stays in this page; leaving resets it.</p></div>`;}
function wordScrambleMarkup(){return `<div class="word-scramble-app"><p id="scrambleClue" class="scramble-clue"></p><p id="scrambleLetters" class="scramble-letters" aria-label="Scrambled word"></p><form id="scrambleForm"><label for="scrambleGuess">Your answer</label><input id="scrambleGuess" name="guess" type="text" maxlength="20" autocomplete="off" required placeholder="Type the word…"><button class="btn dark" type="submit">Check word</button></form><p id="scrambleStatus" class="mini-result" role="status" aria-live="polite">Take your time; there’s no timer or score.</p><div class="scramble-actions"><button id="scrambleNew" class="btn outline" type="button">Another word</button><button id="scrambleReveal" class="btn outline" type="button">Show answer</button></div></div>`;}

export function popularMiniAppMarkup(id) {
  if(id==='calculator') return calculatorMarkup();
  if(id==='unit-converter') return unitMarkup();
  if(id==='stopwatch') return stopwatchMarkup();
  if(id==='word-scramble') return wordScrambleMarkup();
  return '';
}

export function mountPopularMiniApp({root,id,win=window}) {
  let interval=null,elapsed=0,startedAt=0,lastLap=0,running=false,currentWord=null,currentScramble=null,alive=true;
  const $=selector=>root.querySelector(selector);
  const now=()=>typeof win.performance?.now==='function'?win.performance.now():Date.now();
  const clearTimer=()=>{if(interval!==null){win.clearInterval(interval);interval=null;}};
  function drawStopwatch(){const time=elapsed+(running?now()-startedAt:0);$('#stopwatchDisplay').textContent=formatStopwatch(time);$('#stopwatchDisplay').setAttribute('aria-label',`Elapsed time ${formatStopwatch(time)}`);}
  function stopwatchClick(event){
    const button=event.target.closest('button');if(!button)return;
    if(button.id==='stopwatchToggle'){
      if(running){elapsed+=now()-startedAt;running=false;clearTimer();button.textContent='Resume';$('#stopwatchLap').disabled=true;}
      else{startedAt=now();running=true;button.textContent='Pause';$('#stopwatchLap').disabled=false;$('#stopwatchReset').disabled=false;if(interval===null)interval=win.setInterval(drawStopwatch,40);}
      drawStopwatch();
    }else if(button.id==='stopwatchLap'&&running){const total=elapsed+now()-startedAt,split=total-lastLap;lastLap=total;const item=win.document.createElement('li');item.textContent=`Lap ${$('#stopwatchLaps').children.length+1} · ${formatStopwatch(split)} split · ${formatStopwatch(total)} total`;$('#stopwatchLaps').prepend(item);while($('#stopwatchLaps').children.length>50)$('#stopwatchLaps').lastElementChild.remove();}
    else if(button.id==='stopwatchReset'){clearTimer();running=false;elapsed=0;startedAt=0;lastLap=0;$('#stopwatchToggle').textContent='Start';$('#stopwatchLap').disabled=true;$('#stopwatchReset').disabled=true;$('#stopwatchLaps').replaceChildren();drawStopwatch();}
  }
  function calculatorSubmit(event){
    if(event.target.id!=='calculatorForm')return;event.preventDefault();const output=$('#calculatorResult');
    try{const result=calculateExpression($('#calculatorExpression').value);output.textContent=`Answer: ${result}`;output.dataset.result='valid';}
    catch(error){output.textContent=error.message;delete output.dataset.result;}
  }
  function calculatorClick(event){
    const button=event.target.closest('button');if(!button)return;const input=$('#calculatorExpression');
    if(button.hasAttribute('data-calc-clear')){input.value='';$('#calculatorResult').textContent='Your answer will appear here.';delete $('#calculatorResult').dataset.result;input.focus();return;}
    if(button.hasAttribute('data-calc-backspace')){const start=input.selectionStart??input.value.length,end=input.selectionEnd??input.value.length;if(start===end&&start>0)input.setRangeText('',start-1,start,'end');else input.setRangeText('',start,end,'end');input.focus();return;}
    if(button.dataset.calcInsert!==undefined){const start=input.selectionStart??input.value.length,end=input.selectionEnd??input.value.length;input.setRangeText(button.dataset.calcInsert,start,end,'end');input.focus();}
  }
  function unitChange(){
    const category=$('#unitCategory')?.value,group=unitGroups[category];if(!group)return;
    const from=$('#unitFrom'),to=$('#unitTo');from.replaceChildren();to.replaceChildren();
    for(const [key,[label]] of Object.entries(group.units)){for(const select of [from,to]){const option=win.document.createElement('option');option.value=key;option.textContent=label;select.append(option);}}
    if(Object.hasOwn(group.units,'cm')){from.value='cm';to.value='m';}else if(Object.hasOwn(group.units,'C')){from.value='C';to.value='F';}else{from.selectedIndex=0;to.selectedIndex=Math.min(1,to.options.length-1);}
    $('#unitResult').textContent='Choose units to get a conversion.';
  }
  function unitSubmit(event){if(event.target.id!=='unitConverterForm')return;event.preventDefault();try{const value=convertUnit(new win.FormData(event.target).get('value'),new win.FormData(event.target).get('category'),new win.FormData(event.target).get('from'),new win.FormData(event.target).get('to'));const formatter=new Intl.NumberFormat('en-GB',{maximumFractionDigits:8});$('#unitResult').textContent=`${formatter.format(Number(new win.FormData(event.target).get('value')))} ${$('#unitFrom').selectedOptions[0]?.textContent} = ${formatter.format(value)} ${$('#unitTo').selectedOptions[0]?.textContent}`;}catch(error){$('#unitResult').textContent=error.message;}}
  function change(event){if(event.target.id==='unitCategory')unitChange();}
  function drawScramble(){
    let next=Math.floor(win.Math.random()*scrambleWords.length);if(next===currentWord)next=(next+1)%scrambleWords.length;currentWord=next;const entry=scrambleWords[currentWord];currentScramble=scrambleWord(entry.word,()=>win.Math.random());
    $('#scrambleClue').textContent=`Clue: ${entry.clue}`;$('#scrambleLetters').textContent=[...currentScramble].join('  ');$('#scrambleGuess').value='';$('#scrambleStatus').textContent='Take your time; there’s no timer or score.';$('#scrambleGuess').focus();
  }
  function scrambleSubmit(event){if(event.target.id!=='scrambleForm')return;event.preventDefault();const guess=$('#scrambleGuess').value.trim().toLocaleLowerCase(),answer=scrambleWords[currentWord].word;if(guess===answer)$('#scrambleStatus').textContent='That’s it! Nice solving. Try another word whenever you like.';else $('#scrambleStatus').textContent='Not quite. Try another arrangement or reveal the answer when you’re ready.';}
  function scrambleClick(event){const button=event.target.closest('button');if(!button)return;if(button.id==='scrambleNew')drawScramble();else if(button.id==='scrambleReveal')$('#scrambleStatus').textContent=`The word is “${scrambleWords[currentWord].word}”. Tap Another word whenever you like.`;}
  function submit(event){calculatorSubmit(event);unitSubmit(event);scrambleSubmit(event);}
  function click(event){calculatorClick(event);if(id==='stopwatch')stopwatchClick(event);if(id==='word-scramble')scrambleClick(event);}
  root.addEventListener('submit',submit);root.addEventListener('click',click);root.addEventListener('change',change);
  if(id==='unit-converter')unitChange();
  if(id==='stopwatch')drawStopwatch();
  if(id==='word-scramble')drawScramble();
  return {destroy(){alive=false;clearTimer();root.removeEventListener('submit',submit);root.removeEventListener('click',click);root.removeEventListener('change',change);}};
}
