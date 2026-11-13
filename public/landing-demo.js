function usable(question){
 return question&&typeof question.name==='string'&&typeof question.topic==='string'&&typeof question.question==='string'&&Array.isArray(question.options)&&question.options.length>=2&&question.options.every(option=>typeof option==='string'&&option.trim())&&Number.isInteger(question.answer)&&question.answer>=0&&question.answer<question.options.length;
}

function dayIndex(date,count){
 const seed=date.getFullYear()*12+date.getMonth()+date.getDate();
 return ((seed%count)+count)%count;
}

export function mountLandingDemo({root,questions=[],date=new Date(),win=globalThis.window}={}){
 const panel=root?.querySelector('#entryDemo');
 if(!panel)return {destroy(){}};
 const topic=panel.querySelector('#entryDemoTopic'),prompt=panel.querySelector('#entryDemoQuestion'),options=panel.querySelector('#entryDemoOptions'),feedback=panel.querySelector('#entryDemoFeedback'),next=panel.querySelector('#entryDemoNext');
 const pool=Array.isArray(questions)?questions.filter(usable):[];
 let position=pool.length?dayIndex(date,pool.length):0,answered=false;

 function draw(){
  const question=pool[position];
  if(!question){panel.hidden=true;return;}
  panel.hidden=false;answered=false;
  topic.textContent=`${question.name} · ${question.topic}`;
  prompt.textContent=question.question;
  options.replaceChildren();
  question.options.forEach((answer,index)=>{
   const button=win.document.createElement('button');
   button.type='button';button.className='entry-demo-option';button.dataset.entryDemoAnswer=String(index);button.textContent=answer;
   options.append(button);
  });
  feedback.textContent='Choose an answer to see a quick explanation.';
  feedback.dataset.outcome='';
  next.disabled=true;
 }

 function choose(button){
  if(answered)return;
  const selected=Number(button.dataset.entryDemoAnswer),question=pool[position];
  if(!question||!Number.isInteger(selected)||selected<0||selected>=question.options.length)return;
  answered=true;
  options.querySelectorAll('[data-entry-demo-answer]').forEach((option,index)=>{
   option.disabled=true;
   if(index===question.answer)option.classList.add('is-correct');
   else if(index===selected)option.classList.add('is-incorrect');
   option.setAttribute('aria-pressed',String(index===selected));
  });
  const explanation=question.explanation||'Keep going — a little practice adds up.';
  const correct=selected===question.answer;
  feedback.dataset.outcome=correct?'correct':'try-again';
  feedback.textContent=correct?`That’s right! ${explanation}`:`Not quite. The answer is ${question.options[question.answer]}. ${explanation}`;
  next.disabled=false;
 }

 function onClick(event){
  const button=event.target instanceof win.Element?event.target.closest('button'):null;
  if(!button||!panel.contains(button))return;
  if(button===next){if(!answered||!pool.length)return;position=(position+1)%pool.length;draw();prompt.focus();return;}
  if(button.hasAttribute('data-entry-demo-answer'))choose(button);
 }

 panel.addEventListener('click',onClick);
 draw();
 return {destroy(){panel.removeEventListener('click',onClick);}};
}
