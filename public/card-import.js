// Parse manually pasted tab-separated Q&A pairs. Never execute or upload input.
export function parseCardLines(text) {
  if(typeof text!=='string') return {cards:[],error:'Paste some question-and-answer pairs.'};
  const lines=text.split(/\r?\n/).filter(line=>line.trim());
  if(!lines.length) return {cards:[],error:'Paste at least one line.'};
  if(lines.length>50) return {cards:[],error:'A set can have at most 50 cards.'};
  const cards=[];
  for(let i=0;i<lines.length;i++){
    const tab=lines[i].indexOf('\t');
    if(tab<0) return {cards:[],error:`Line ${i+1} needs a tab between question and answer.`};
    const question=lines[i].slice(0,tab).trim(),answer=lines[i].slice(tab+1).trim();
    if(!question || !answer) return {cards:[],error:`Line ${i+1} needs both a question and an answer.`};
    if(question.length>1000 || answer.length>1000) return {cards:[],error:`Line ${i+1} is longer than 1,000 characters per side.`};
    cards.push([question,answer]);
  }
  return {cards,error:''};
}
