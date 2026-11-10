import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {miniApps,miniAppView,mountMiniApp,daysBetween,addDays,loanPayment,shades,rollDice} from '../public/mini-apps.js';

test('date calculator respects leap years, signed days and invalid dates',()=>{
 assert.equal(addDays('2024-02-28',2),'2024-03-01');assert.equal(addDays('2024-03-01',-2),'2024-02-28');assert.equal(daysBetween('2024-02-28','2024-03-01'),2);assert.equal(daysBetween('2024-03-01','2024-02-28'),-2);
 for(const invalid of ['2023-02-29','2024-13-01','0000-01-01','not-a-date'])assert.throws(()=>addDays(invalid,1));assert.throws(()=>addDays('2024-01-01',''));assert.throws(()=>addDays('2024-01-01',100001));
});
test('loan estimate handles zero interest, validates inputs and rounds only for display',()=>{
 assert.equal(loanPayment(1200,0,1).payment,100);const result=loanPayment(10000,5,5);assert.ok(Math.abs(result.payment-188.7123)<0.001);assert.ok(Math.abs(result.interest-1322.74)<.01);for(const args of [[0,5,1],[100,-1,1],[100,2,0],[100,2,1.5],['',0,1],[100,101,1]])assert.throws(()=>loanPayment(...args));
});
test('dice and colours produce valid and bounded values',()=>{
 assert.deepEqual(rollDice(3,6,()=>0),[1,1,1]);assert.deepEqual(rollDice(2,20,()=>.9999),[20,20]);assert.throws(()=>rollDice(11,6));assert.throws(()=>rollDice(2,7));assert.equal(shades('#34556a')[2],'#34556A');assert.equal(shades('#000000').length,5);assert.throws(()=>shades('red'));
});
test('all five apps mount, function and clean up',()=>{
 assert.equal(Object.keys(miniApps).length,5);
 for(const id of Object.keys(miniApps)){
  const dom=new JSDOM(`<main>${miniAppView(id)}</main>`,{url:'https://example.test/'});try{
   const win=dom.window,root=win.document.querySelector('main'),q=s=>root.querySelector(s),ctl=mountMiniApp({root,id,win});
   const submit=selector=>q(selector).dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
   if(id==='world-clock'){assert.notEqual(q('#miniWorldClock').textContent,'—');q('#miniZone').value='Asia/Tokyo';q('#miniZone').dispatchEvent(new win.Event('change',{bubbles:true}));assert.equal(q('#miniCity').textContent,'Tokyo');}
   if(id==='dice-roller'){submit('#miniDiceForm');assert.match(q('#miniResult').textContent,/Total:/);}
   if(id==='colour-palette'){assert.equal(q('#miniPalette').children.length,5);q('#miniColour').value='#ff0000';submit('#miniColourForm');assert.equal(q('#miniPalette').children[2].textContent,'#FF0000');}
   if(id==='date-calculator'){q('#miniStart').value='2024-02-28';q('#miniDays').value='2';submit('#miniDateAdd');assert.match(q('#miniDateResult').textContent,/2024-03-01/);q('#miniFrom').value='2024-03-01';q('#miniTo').value='2024-02-28';submit('#miniDateDiff');assert.match(q('#miniDiffResult').textContent,/-2 days/);}
   if(id==='loan-calculator'){submit('#miniLoanForm');assert.match(q('#miniResult').textContent,/Monthly: 188\.71/);}
   ctl.destroy();
  }finally{dom.window.close();}
 }
});

test('clock format, recent dice history, and date defaults are convenient and local',()=>{
 for(const id of ['world-clock','dice-roller','date-calculator']){
  const dom=new JSDOM(`<main>${miniAppView(id)}</main>`);try{
   const w=dom.window,root=w.document.querySelector('main'),q=s=>root.querySelector(s),ctl=mountMiniApp({root,id,win:w});
   if(id==='world-clock'){q('#mini12Hour').checked=true;q('#mini12Hour').dispatchEvent(new w.Event('change',{bubbles:true}));assert.match(q('#miniWorldClock').textContent,/am|pm/i);}
   if(id==='dice-roller'){for(let i=0;i<7;i++)q('#miniDiceForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(q('#miniRollHistory').hidden,false);assert.equal(root.querySelectorAll('#miniRollHistory li').length,5);q('#miniClearHistory').click();assert.equal(q('#miniRollHistory').hidden,true);}
   if(id==='date-calculator'){assert.match(q('#miniStart').value,/^\d{4}-\d\d-\d\d$/);assert.equal(q('#miniFrom').value,q('#miniTo').value);}
   ctl.destroy();
  }finally{dom.window.close();}
 }
});
test('palette copies chosen hex codes and reports unavailable clipboard',async()=>{
 const dom=new JSDOM(`<main>${miniAppView('colour-palette')}</main>`);try{
  const w=dom.window,root=w.document.querySelector('main'),ctl=mountMiniApp({root,id:'colour-palette',win:w});let copied='';Object.defineProperty(w.navigator,'clipboard',{configurable:true,value:{writeText:async text=>{copied=text;}}});root.querySelector('[data-copy-colour="#34556A"]').click();await Promise.resolve();assert.equal(copied,'#34556A');assert.match(root.querySelector('#miniColourStatus').textContent,/Copied/);
  Object.defineProperty(w.navigator,'clipboard',{configurable:true,value:undefined});root.querySelector('[data-copy-colour="#34556A"]').click();assert.match(root.querySelector('#miniColourStatus').textContent,/Could not copy/);ctl.destroy();
 }finally{dom.window.close();}
});

test('dice tumble as staggered 3D cubes and announce one accessible result',()=>{
 const dom=new JSDOM(`<main>${miniAppView('dice-roller')}</main>`);try{
  const w=dom.window,root=w.document.querySelector('main'),q=s=>root.querySelector(s),ctl=mountMiniApp({root,id:'dice-roller',win:w}),faceNames=['front','back','right','left','top','bottom'],poses={front:[0,0],back:[0,180],right:[0,-90],left:[0,90],top:[-90,0],bottom:[90,0]};
  q('#miniDiceCount').value='10';q('#miniDiceSides').value='100';q('#miniDiceForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  const dice=[...q('#miniDiceDisplay').children],match=q('#miniResult').textContent.match(/^Rolled: (.*?)  \|  Total:/),values=match[1].split(' · ').map(Number);assert.equal(dice.length,10);assert.ok(values.every(value=>Number.isInteger(value)&&value>=1&&value<=100));assert.equal(q('#miniDiceDisplay').getAttribute('aria-hidden'),'true');assert.equal(q('#miniResult').getAttribute('aria-live'),'polite');
  dice.forEach((die,index)=>{const value=values[index],target=faceNames[(value-1)%6],cube=die.querySelector('.mini-die-cube'),face=die.querySelector(`.mini-die-face-${target}`);assert.equal(die.querySelectorAll('.mini-die-face').length,6);assert.equal(face.querySelector('.mini-die-number').textContent,String(value));assert.equal(die.style.getPropertyValue('--die-delay'),`${index*45}ms`);assert.equal(die.style.getPropertyValue('--die-end-x'),`${poses[target][0]}deg`);assert.equal(die.style.getPropertyValue('--die-end-y'),`${poses[target][1]}deg`);assert.ok(cube);});
  const previous=dice[0];q('#miniDiceForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.notEqual(q('#miniDiceDisplay').firstElementChild,previous);
  q('#miniDiceCount').value='11';q('#miniDiceForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(q('#miniDiceDisplay').children.length,0);assert.match(q('#miniResult').textContent,/Choose 1–10 dice/);
  q('#miniDiceCount').value='1';q('#miniDiceSides').value='6';q('#miniDiceForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));const value6=Number(q('#miniResult').textContent.match(/^Rolled: (\d+)/)[1]),d6Face={1:'front',6:'back',5:'right',2:'left',3:'top',4:'bottom'}[value6];assert.equal(q(`.mini-die-face-${d6Face}`).querySelectorAll('.mini-die-pip').length,value6);
  const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');assert.match(css,/transform-style:preserve-3d/);assert.match(css,/@keyframes mini-die-roll/);assert.match(css,/@media\(prefers-reduced-motion:reduce\).*mini-die-cube/s);ctl.destroy();
 }finally{dom.window.close();}
});
