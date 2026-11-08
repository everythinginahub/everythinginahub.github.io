import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {safeBookmarkURL, localDay, habitDays, listsView, habitsView, bookmarksView, mountEveryday} from '../public/everyday.js';
import {splitBill,convertTemperature,pickOption,formatText} from '../public/everyday-tools.js';

test('saved links accept only safe web addresses without credentials',()=>{
 assert.equal(safeBookmarkURL('https://example.com/a?q=1'),'https://example.com/a?q=1');
 for(const url of ['javascript:alert(1)','data:text/html,x','file:///etc/passwd','https://user:pass@example.com','not a url'])assert.equal(safeBookmarkURL(url),'');
 const html=bookmarksView({everydayBookmarks:[{name:'<img>',url:'javascript:alert(1)',note:'<script>'}]});assert.doesNotMatch(html,/<img>|<script>|href="javascript:/);assert.match(html,/invalid address/);
});
test('lists and habits escape user content and use local calendar days',()=>{
 const d=new Date(2024,2,1,12);assert.equal(localDay(d),'2024-03-01');assert.equal(habitDays(d)[5].date,'2024-02-29');assert.equal(habitDays(d).length,7);
 assert.doesNotMatch(listsView({everydayLists:[{name:'<img>',items:[{text:'<script>',done:false}]}]}),/<img>|<script>/);
 assert.doesNotMatch(habitsView({everydayHabits:[{name:'<img>',days:[]}]},d),/<img>/);
});
test('bill and temperature calculations validate bounds and round fairly',()=>{
 assert.deepEqual(splitBill('45','10','2'),{total:49.5,each:24.75});assert.deepEqual(splitBill('0.07','0','1'),{total:0.07,each:0.07});assert.deepEqual(splitBill('10','0','3'),{total:10,each:3.34});assert.throws(()=>splitBill('10','0','0'));assert.throws(()=>splitBill('','0','2'));assert.equal(convertTemperature('0','C','F'),32);assert.equal(convertTemperature('32','F','C'),0);assert.equal(convertTemperature('0','K','C'),-273.15);assert.throws(()=>convertTemperature('-1','K','C'));assert.throws(()=>convertTemperature('','C','F'));
});
test('lists, habits and bookmarks mutate account data and survive rerender',()=>{
 const dom=new JSDOM('<main id="root"></main>',{url:'https://example.test'}),w=dom.window,root=w.document.querySelector('#root'),state={completed:{biology:true}},saves=[];w.confirm=()=>true;w.prompt=()=> 'Renamed';let controller,page='lists';
 const save=()=>saves.push(JSON.parse(JSON.stringify(state)));const render=()=>{controller?.destroy();root.innerHTML=page==='lists'?listsView(state):page==='habits'?habitsView(state):bookmarksView(state);controller=mountEveryday({root,state,save,render,toast:()=>{},win:w});};
 const submit=form=>form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));const q=s=>root.querySelector(s);render();q('#everyListName').value='Groceries';submit(q('#everyListForm'));assert.equal(state.everydayLists[0].name,'Groceries');q('[name="item"]').value='Milk';submit(q('[data-every-list-form]'));assert.equal(state.everydayLists[0].items[0].text,'Milk');q('[data-every-check]').checked=true;q('[data-every-check]').dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(state.everydayLists[0].items[0].done,true);q('[data-every-rename-list]').click();assert.equal(state.everydayLists[0].name,'Renamed');q('[data-every-clear]').click();assert.equal(state.everydayLists[0].items.length,0);
 page='habits';render();q('#everyHabitName').value='Read';submit(q('#everyHabitForm'));q('[data-every-habit]').click();assert.deepEqual(state.everydayHabits[0].days,[localDay()]);q('[data-every-habit]').click();assert.deepEqual(state.everydayHabits[0].days,[]);
 page='bookmarks';render();q('[name="name"]').value='Library';q('[name="url"]').value='https://example.com';submit(q('#everyBookmarkForm'));assert.equal(state.everydayBookmarks[0].url,'https://example.com/');assert.equal(q('.bookmark-row a').getAttribute('rel'),'noopener noreferrer');q('[data-every-delete-bookmark]').click();assert.equal(state.everydayBookmarks.length,0);assert.equal(saves.at(-1).completed.biology,true);controller.destroy();dom.window.close();
});

test('editing items and links validates input, preserves data and rejects unsafe URLs',()=>{
 const dom=new JSDOM('<main></main>',{url:'https://example.test'}),w=dom.window,root=w.document.querySelector('main');const state={everydayLists:[{name:'A',items:[{text:'Old',done:false}]}],everydayBookmarks:[{name:'Old',url:'https://example.com/',note:''}]};let page='lists',controller,count=0;w.prompt=()=>'<b>New</b>';w.confirm=()=>true;const render=()=>{controller?.destroy();root.innerHTML=page==='lists'?listsView(state):bookmarksView(state);controller=mountEveryday({root,state,save:()=>count++,render,toast:()=>{},win:w});};const q=s=>root.querySelector(s);const submit=form=>form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));render();q('[data-every-edit-item]').click();assert.equal(state.everydayLists[0].items[0].text,'<b>New</b>');assert.equal(q('.everyday-items b'),null);
 page='bookmarks';render();q('[data-every-edit-bookmark]').click();q('[name="name"]').value='Changed';q('[name="url"]').value='javascript:alert(1)';submit(q('#everyBookmarkForm'));assert.match(q('#everyBookmarkError').textContent,/valid http/);assert.equal(state.everydayBookmarks[0].name,'Old');q('[name="url"]').value='https://example.org/new';submit(q('#everyBookmarkForm'));assert.equal(state.everydayBookmarks[0].name,'Changed');assert.equal(state.everydayBookmarks[0].url,'https://example.org/new');assert.equal(count,2);controller.destroy();dom.window.close();
});


test('random choice and text formatting validate inputs without evaluating content',()=>{
 assert.equal(pickOption('tea\ncoffee',()=>0.75),'coffee');assert.equal(pickOption('<img>\nTea',()=>0),'<img>');assert.throws(()=>pickOption('one'));assert.throws(()=>pickOption('a\nb',()=>1));assert.equal(formatText(' hello   there \n  next  line ','spaces'),'hello there\nnext line');assert.equal(formatText('Hi!','lower'),'hi!');assert.equal(formatText('Hi!','upper'),'HI!');assert.throws(()=>formatText('a','unknown'));
});

test('everyday tool controls show results as plain text and detach listeners',async()=>{
 const {everydayToolPanels,mountEverydayTools}=await import('../public/everyday-tools.js');const dom=new JSDOM(`<main>${everydayToolPanels()}</main>`),w=dom.window,root=w.document.querySelector('main'),ctl=mountEverydayTools({root,win:w});const q=s=>root.querySelector(s);const submit=form=>form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 q('#billForm [name=total]').value='10';q('#billForm [name=people]').value='3';submit(q('#billForm'));assert.match(q('#billResult').textContent,/3.34/);
 q('#temperatureForm [name=value]').value='0';submit(q('#temperatureForm'));assert.equal(q('#temperatureResult').textContent.trim(),'32 °F');
 q('#pickForm [name=options]').value='<img>\n<img>';submit(q('#pickForm'));assert.equal(q('#pickResult').textContent,'<img>');assert.equal(q('#pickResult img'),null);
 q('#formatForm [name=text]').value='<img>';submit(q('#formatForm'));assert.equal(q('#formatResult').textContent,'<IMG>');assert.equal(q('#formatResult img'),null);ctl.destroy();dom.window.close();
});
