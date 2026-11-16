import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {emptyMealPlan,mealDays,mealPlannerView,mealSlots,mountMealPlanner,normalizeMealPlan} from '../public/meal-planner.js';

const wait=()=>new Promise(resolve=>setTimeout(resolve,0));

test('meal-plan normalisation accepts only known days and slots and bounds saved text',()=>{
 const raw={Monday:{Dinner:'  Pasta  ',Unknown:'ignore'},Friday:{Lunch:'x'.repeat(120)},NotADay:{Dinner:'ignore'}};
 const plan=normalizeMealPlan(raw);
 assert.deepEqual(Object.keys(plan),mealDays);
 assert.deepEqual(Object.keys(plan.Monday),mealSlots);
 assert.equal(plan.Monday.Dinner,'Pasta');
 assert.equal(plan.Friday.Lunch,'x'.repeat(80));
 assert.equal(plan.NotADay,undefined);
 assert.deepEqual(normalizeMealPlan(null),emptyMealPlan());
});

test('weekly meal planner saves locally per account, safely renders ideas, edits slots and clears',async()=>{
 const dom=new JSDOM(`<main>${mealPlannerView()}</main>`,{url:'https://example.test/'});
 try{
  const win=dom.window,root=win.document.querySelector('main'),q=selector=>root.querySelector(selector),controller=mountMealPlanner({root,win,userId:'learner-1'});
  assert.equal(root.querySelectorAll('.meal-day-card').length,7);
  assert.equal(root.querySelectorAll('.meal-plan-slot').length,21);
  q('#mealPlannerDay').value='Monday';q('#mealPlannerSlot').value='Dinner';q('#mealPlannerIdea').value='Pasta & salad';
  q('#mealPlannerForm').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
  assert.match(q('.meal-day-card').textContent,/Pasta & salad/);
  assert.equal(JSON.parse(win.localStorage.getItem('everything-hub-meal-plan-v1-learner-1')).Monday.Dinner,'Pasta & salad');
  assert.match(q('#mealPlannerStatus').textContent,/saved on this browser/i);
  q('[data-meal-day="Monday"][data-meal-slot="Dinner"]').click();
  assert.equal(q('#mealPlannerIdea').value,'Pasta & salad');
  q('#mealPlannerIdea').value='<img src=x onerror=alert(1)>';
  q('#mealPlannerForm').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
  await wait();
  assert.equal(root.querySelector('img'),null);
  assert.match(q('.meal-day-card').textContent,/<img src=x onerror=alert\(1\)>/);
  controller.destroy();

  const secondRoot=win.document.createElement('main');secondRoot.innerHTML=mealPlannerView();win.document.body.append(secondRoot);
  const other=mountMealPlanner({root:secondRoot,win,userId:'learner-2'});
  assert.match(secondRoot.querySelector('.meal-day-card').textContent,/Not planned/);
  other.destroy();

  const thirdRoot=win.document.createElement('main');thirdRoot.innerHTML=mealPlannerView();win.document.body.append(thirdRoot);
  const restored=mountMealPlanner({root:thirdRoot,win,userId:'learner-1'});
  assert.match(thirdRoot.querySelector('.meal-day-card').textContent,/<img src=x onerror=alert\(1\)>/);
  thirdRoot.querySelector('#mealPlannerClear').click();
  assert.equal(win.localStorage.getItem('everything-hub-meal-plan-v1-learner-1'),null);
  assert.match(thirdRoot.querySelector('.meal-day-card').textContent,/Not planned/);
  restored.destroy();
 }finally{dom.window.close();}
});
