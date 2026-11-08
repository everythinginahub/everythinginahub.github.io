import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {listsView,mountLists} from '../public/lists.js';
function setup(state){const dom=new JSDOM(`<main>${listsView(state)}</main>`,{url:'https://example.test/'}),w=dom.window,root=w.document.querySelector('main');let saves=0,rewards=0;w.confirm=()=>true;const controller=mountLists({root,state,save:()=>saves++,onReward:()=>{rewards++;return 5;},win:w});return {dom,w,root,controller,q:s=>root.querySelector(s),submit:f=>f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true})),counts:()=>({saves,rewards})};}
test('searches list names and items, filters status, retains focus and does not change saved data',()=>{
 const state={everydayLists:[{name:'Groceries',items:[{text:'Milk',done:false},{text:'Tea',done:true}]},{name:'Travel',items:[{text:'Passport',done:false}]}]},h=setup(state),{q,w,root}=h;try{
 q('#listsSearch').value='milk';q('#listsSearch').dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(root.querySelectorAll('[data-list-index]:not([hidden])').length,1);assert.equal(root.querySelectorAll('[data-list-item]:not([hidden])').length,1);assert.equal(h.counts().saves,0);
 q('#listsSearch').value='';q('#listsSearch').dispatchEvent(new w.Event('input',{bubbles:true}));q('[data-list-index="0"] [data-list-filter="open"]').click();assert.equal(root.querySelectorAll('[data-list-index="0"] [data-list-item]:not([hidden])').length,1);const check=q('[data-every-check="0:0"]');check.checked=true;check.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(h.counts().rewards,1);assert.equal(q('[data-list-index="0"] [data-list-filter="open"]').getAttribute('aria-pressed'),'true');assert.equal(w.document.activeElement.dataset.listFilter,'open');assert.equal(state.everydayLists[0].items[0].done,true);assert.equal(h.counts().saves,1);
 q('#listsSearch').value='not present';q('#listsSearch').dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(q('#listsNoResults').hidden,false);
 }finally{h.controller.destroy();h.dom.window.close();}
});
test('bulk add is atomic at limits; drafts, filters and unrelated data survive changes',()=>{
 const state={other:{keep:true},everydayLists:[{name:'One',items:[{text:'A',done:false}]},{name:'Two',items:[]}]},h=setup(state),{q,submit}=h;try{
 q('#listItem1').value='unfinished';q('[data-list-index="0"] .list-bulk').open=true;q('#listBulk0').value='One\n\nTwo\nThree';submit(q('[data-list-bulk="0"]'));assert.deepEqual(state.everydayLists[0].items.map(x=>x.text),['A','One','Two','Three']);assert.equal(q('#listItem1').value,'unfinished');assert.equal(q('[data-list-index="0"] .list-bulk').open,true);assert.equal(q('#listBulk0').value,'');
 q('#listBulk0').value='x'.repeat(101)+'\nValid';submit(q('[data-list-bulk="0"]'));assert.equal(state.everydayLists[0].items.length,4);assert.match(q('#listFeedback').textContent,/Nothing was added/);assert.ok(q('#listBulk0').value.includes('Valid'));
 q('#listBulk0').value=Array.from({length:37},(_,i)=>`item ${i}`).join('\n');submit(q('[data-list-bulk="0"]'));assert.equal(state.everydayLists[0].items.length,4);assert.match(q('#listFeedback').textContent,/36 spaces/);assert.deepEqual(state.other,{keep:true});
 }finally{h.controller.destroy();h.dom.window.close();}
});
test('reordering, duplication, reset, deletion and one-step undo preserve actual data and limits',()=>{
 const state={everydayLists:[{name:'Shop',items:[{text:'A',done:true},{text:'B',done:false},{text:'C',done:true}]},{name:'Other',items:[]}]},h=setup(state),{q,submit}=h;try{
 q('#listItem1').value='draft for other';q('[data-list-down="0:0"]').click();assert.deepEqual(state.everydayLists[0].items.map(x=>x.text),['B','A','C']);q('[data-every-clear="0"]').click();assert.deepEqual(state.everydayLists[0].items.map(x=>x.text),['B']);q('#listUndoButton').click();assert.deepEqual(state.everydayLists[0].items.map(x=>x.text),['B','A','C']);assert.equal(state.everydayLists[0].items[1].done,true);
 q('[data-list-duplicate="0"]').click();assert.equal(state.everydayLists[2].name,'Shop copy');assert.ok(state.everydayLists[2].items.every(x=>!x.done));q('[data-list-reset="0"]').click();assert.ok(state.everydayLists[0].items.every(x=>!x.done));assert.equal(h.counts().rewards,0);
 q('[data-every-delete-list="0"]').click();assert.equal(state.everydayLists[0].name,'Other');assert.equal(q('#listItem0').value,'draft for other');q('#listUndoButton').click();assert.equal(state.everydayLists[0].name,'Shop');assert.equal(q('#listItem1').value,'draft for other');q('[data-every-delete-item="0:0"]').click();q('#listUndoButton').click();assert.equal(state.everydayLists[0].items[0].text,'B');
 }finally{h.controller.destroy();h.dom.window.close();}
});
test('inline edits are escaped, draft is kept on other changes, clipboard success and failure are reported',async()=>{
 const state={everydayLists:[{name:'Shop',items:[{text:'A',done:false},{text:'B',done:false}]}]},h=setup(state),{q,w,submit}=h;try{
 q('[data-every-edit-item="0:0"]').click();q('[data-list-edit-form="0:0"] input').value='<img>';q('[data-list-down="0:1"]').click(); // disabled at boundary
 const check=q('[data-every-check="0:1"]');check.checked=true;check.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(q('[data-list-edit-form="0:0"] input').value,'<img>');assert.equal(q('[data-list-edit-form="0:0"]').hidden,false);submit(q('[data-list-edit-form="0:0"]'));assert.equal(state.everydayLists[0].items[0].text,'<img>');assert.equal(q('.list-items img'),null);
 let copied='';Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>{copied=text;}},configurable:true});q('[data-list-copy="0"]').click();await Promise.resolve();assert.match(copied,/\[ \] <img>/);assert.match(copied,/\[x\] B/);assert.match(q('#listFeedback').textContent,/copied/i);Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async()=>{throw Error('denied');}},configurable:true});q('[data-list-copy="0"]').click();await Promise.resolve();assert.match(q('#listFeedback').textContent,/Could not copy/);assert.equal(q('#listCopyFallback').hidden,false);assert.match(q('#listCopyText').value,/\[x\] B/);q('#listCopyClose').click();assert.equal(q('#listCopyFallback').hidden,true);
 }finally{h.controller.destroy();h.dom.window.close();}
});
test('list and item limits are enforced without losing data; event handlers detach',()=>{
 const state={everydayLists:Array.from({length:10},(_,i)=>({name:`List ${i}`,items:i===0?Array.from({length:40},(_,j)=>({text:`Item ${j}`,done:false})):[]}))},h=setup(state),{q,w,root}=h;try{
 assert.equal(q('#everyListName').disabled,true);assert.equal(q('#listItem0').disabled,true);q('[data-list-duplicate="1"]').click();assert.equal(state.everydayLists.length,10);assert.match(q('#listFeedback').textContent,/10 lists/);
 q('#listBulk0').value='One more';h.submit(q('[data-list-bulk="0"]'));assert.equal(state.everydayLists[0].items.length,40);assert.match(q('#listFeedback').textContent,/0 spaces/);
 h.controller.destroy();const before=h.counts().saves;const check=q('[data-every-check="0:0"]');check.checked=true;check.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(state.everydayLists[0].items[0].done,false);assert.equal(h.counts().saves,before);
 }finally{h.dom.window.close();}
});
