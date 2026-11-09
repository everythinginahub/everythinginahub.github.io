// Calendar calculations always use local noon, avoiding DST/midnight shifts.
export function localDay(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function dateFromKey(key) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(key)))return null;
 const [y,m,d]=key.split('-').map(Number),date=new Date(y,m-1,d,12);
 return localDay(date)===key?date:null;
}
export function shiftDay(date,offset){return new Date(date.getFullYear(),date.getMonth(),date.getDate()+offset,12);}
export function habitDays(today = new Date()) {return Array.from({length:7},(_,i)=>{const d=shiftDay(today,i-6);return {date:localDay(d),label:d.toLocaleDateString('en-GB',{weekday:'short'})};});}
export const habitMarks=habit=>new Set((Array.isArray(habit?.days)?habit.days:[]).filter(x=>dateFromKey(x)));
export function habitSchedule(habit){
 const s=habit?.schedule;if(s?.type==='days'&&Array.isArray(s.days)){const days=[...new Set(s.days.filter(d=>Number.isInteger(d)&&d>=0&&d<=6))].sort();if(days.length)return {type:'days',days};}
 if(s?.type==='weekly'&&Number.isInteger(s.goal)&&s.goal>=1&&s.goal<=7)return {type:'weekly',goal:s.goal};
 return {type:'daily'};
}
export function startOfWeek(date){return shiftDay(date,-((date.getDay()+6)%7));}
export function isScheduled(habit,date){const s=habitSchedule(habit);return s.type!=='days'||s.days.includes(date.getDay());}
export function weeklyProgress(habit,date=new Date()){
 const s=habitSchedule(habit),marks=habitMarks(habit),start=startOfWeek(date);
 const goal=s.type==='weekly'?s.goal:s.type==='days'?s.days.length:7;
 const done=Array.from({length:7},(_,i)=>shiftDay(start,i)).filter(d=>localDay(d)<=localDay(date)&&isScheduled(habit,d)&&marks.has(localDay(d))).length;
 return {done,goal};
}
export function isHabitDue(habit,date=new Date()){
 if(habit?.archived)return false;const s=habitSchedule(habit),marks=habitMarks(habit);
 if(s.type==='weekly')return marks.has(localDay(date))||weeklyProgress(habit,date).done<s.goal;
 return isScheduled(habit,date);
}
// Streaks describe the retained history only, not all-time records. Current
// periods stay alive until the next scheduled day/week has actually passed.
export function habitStreaks(habit,now=new Date()){
 const s=habitSchedule(habit),unit=s.type==='weekly'?'weeks':'days',today=localDay(now);
 const dates=[...habitMarks(habit)].filter(key=>key<=today).sort();
 if(!dates.length)return {current:0,best:0,unit};
 let count=0,best=0,last=null;
 if(s.type==='weekly'){
  const totals=new Map();
  for(const key of dates){const week=localDay(startOfWeek(dateFromKey(key)));totals.set(week,(totals.get(week)||0)+1);}
  const completed=[...totals].filter(([,n])=>n>=s.goal).map(([week])=>week).sort();
  for(const week of completed){count=last&&localDay(shiftDay(dateFromKey(last),7))===week?count+1:1;best=Math.max(best,count);last=week;}
  const thisWeek=localDay(startOfWeek(now)),previous=localDay(shiftDay(startOfWeek(now),-7));
  return {current:last===thisWeek||last===previous?count:0,best,unit};
 }
 for(const key of dates){const d=dateFromKey(key);if(!isScheduled(habit,d))continue;let next=last&&shiftDay(dateFromKey(last),1);while(next&&!isScheduled(habit,next))next=shiftDay(next,1);count=next&&localDay(next)===key?count+1:1;best=Math.max(best,count);last=key;}
 let previous=shiftDay(now,-1);while(!isScheduled(habit,previous))previous=shiftDay(previous,-1);
 return {current:last&&(last===today||last===localDay(previous))?count:0,best,unit};
}
