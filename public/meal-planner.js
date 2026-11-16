export const mealDays=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
export const mealSlots=['Breakfast','Lunch','Dinner'];
const storagePrefix='everything-hub-meal-plan-v1-';

export function emptyMealPlan(){return Object.fromEntries(mealDays.map(day=>[day,Object.fromEntries(mealSlots.map(slot=>[slot,'']))]));}

export function normalizeMealPlan(value){
 const plan=emptyMealPlan();
 if(!value||typeof value!=='object'||Array.isArray(value))return plan;
 for(const day of mealDays){
  const entries=value[day];
  if(!entries||typeof entries!=='object'||Array.isArray(entries))continue;
  for(const slot of mealSlots)if(typeof entries[slot]==='string')plan[day][slot]=entries[slot].trim().slice(0,80);
 }
 return plan;
}

export function mealPlannerView(){
 const days=mealDays.map(day=>`<option value="${day}">${day}</option>`).join('');
 const slots=mealSlots.map(slot=>`<option value="${slot}">${slot}</option>`).join('');
 return `<div class="meal-planner-app"><p>Plan meal ideas for the week using foods you choose. This is a simple organiser, not nutrition or allergy advice.</p><form id="mealPlannerForm"><div class="mini-fields"><div><label for="mealPlannerDay">Day</label><select id="mealPlannerDay" name="day">${days}</select></div><div><label for="mealPlannerSlot">Meal</label><select id="mealPlannerSlot" name="slot">${slots}</select></div></div><label for="mealPlannerIdea">Meal idea</label><input id="mealPlannerIdea" name="idea" maxlength="80" required autocomplete="off" placeholder="For example, vegetable pasta"><div class="meal-planner-actions"><button class="btn dark" type="submit">Save meal idea</button><button id="mealPlannerClear" class="btn outline" type="button">Clear week</button></div></form><p id="mealPlannerStatus" class="mini-result" role="status" aria-live="polite">Choose a day and meal to get started.</p><div id="mealPlannerWeek" class="meal-week" aria-label="Weekly meal ideas"></div><p class="mini-footnote">Your plan is saved only in this browser for this account; it is not synced to the Everything Hub account. Check ingredients and food-safety guidance for your own needs.</p></div>`;
}

export function mountMealPlanner({root,win=window,userId='guest'}={}){
 const form=root.querySelector('#mealPlannerForm'),daySelect=root.querySelector('#mealPlannerDay'),slotSelect=root.querySelector('#mealPlannerSlot'),ideaInput=root.querySelector('#mealPlannerIdea'),week=root.querySelector('#mealPlannerWeek'),status=root.querySelector('#mealPlannerStatus');
 if(!form||!daySelect||!slotSelect||!ideaInput||!week||!status)return {destroy(){}};
 const key=`${storagePrefix}${String(userId||'guest')}`;
 let plan=emptyMealPlan();
 try{plan=normalizeMealPlan(JSON.parse(win.localStorage.getItem(key)||'{}'));}catch{}
 function save(){
  try{win.localStorage.setItem(key,JSON.stringify(plan));return true;}catch{return false;}
 }
 function render(){
  week.replaceChildren();
  for(const day of mealDays){
   const card=win.document.createElement('section'),heading=win.document.createElement('h2');card.className='meal-day-card';heading.textContent=day;card.append(heading);
   for(const slot of mealSlots){
    const row=win.document.createElement('div'),name=win.document.createElement('strong'),value=win.document.createElement('p'),button=win.document.createElement('button');
    row.className='meal-plan-slot';name.textContent=slot;value.className='meal-plan-value';value.textContent=plan[day][slot]||'Not planned';
    button.type='button';button.className='meal-slot-edit';button.dataset.mealDay=day;button.dataset.mealSlot=slot;button.textContent=plan[day][slot]?'Edit':'Add idea';
    row.append(name,value,button);card.append(row);
   }
   week.append(card);
  }
 }
 function submit(event){
  if(event.target!==form)return;event.preventDefault();
  const day=daySelect.value,slot=slotSelect.value,idea=ideaInput.value.trim();
  if(!mealDays.includes(day)||!mealSlots.includes(slot)||!idea||idea.length>80){status.textContent='Enter a meal idea of up to 80 characters and choose a valid day and meal.';return;}
  plan[day][slot]=idea;render();status.textContent=save()?`${slot} for ${day} saved on this browser.`:'Updated for this visit, but browser storage is unavailable so it could not be saved.';ideaInput.value='';
 }
 function click(event){
  const button=event.target.closest('button');if(!button)return;
  if(button.id==='mealPlannerClear'){plan=emptyMealPlan();try{win.localStorage.removeItem(key);}catch{}render();status.textContent='The weekly meal plan has been cleared from this browser.';return;}
  if(button.dataset.mealDay&&button.dataset.mealSlot){daySelect.value=button.dataset.mealDay;slotSelect.value=button.dataset.mealSlot;ideaInput.value=plan[daySelect.value][slotSelect.value];ideaInput.focus();}
 }
 form.addEventListener('submit',submit);root.addEventListener('click',click);render();
 return {destroy(){form.removeEventListener('submit',submit);root.removeEventListener('click',click);}};
}
