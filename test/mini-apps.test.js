import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
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
