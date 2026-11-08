import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {parseTime,wordsFromTsv,suggestLessons,validLesson,timetableImportPanel,mountTimetableImport} from '../public/timetable-import.js';
const w=(text,x,y)=>({text,x,y,h:14});
test('recognises weekdays, times and subjects from a timetable grid without inventing dates',()=>{
 const words=[w('Monday',150,20),w('Tuesday',250,20),w('Wednesday',350,20),w('09:00',20,70),w('10:30',20,130),w('Maths',150,70),w('Art',250,70),w('History',350,70),w('Science',150,130),w('English',250,130)];
 assert.deepEqual(suggestLessons(words),[{title:'Maths',day:0,time:'09:00',room:''},{title:'Art',day:1,time:'09:00',room:''},{title:'History',day:2,time:'09:00',room:''},{title:'Science',day:0,time:'10:30',room:''},{title:'English',day:1,time:'10:30',room:''}]);
 const missing=suggestLessons([w('Monday',100,10),w('Tuesday',200,10),w('Maths',100,50)]);assert.equal(missing[0].time,'');assert.equal(validLesson(missing[0]),false);
});
test('recognises simple lists and handles invalid times and OCR TSV',()=>{
 assert.equal(parseTime('9:05am'),'09:05');assert.equal(parseTime('1:30pm'),'13:30');assert.equal(parseTime('9am'),'09:00');assert.equal(parseTime('1:30pm-2:30pm'),'13:30');assert.equal(parseTime('25:00'),'');assert.equal(parseTime('12:60'),'');
 assert.deepEqual(suggestLessons([w('Monday',10,10),w('09:00',10,40),w('Maths',80,40),w('Tuesday',10,70),w('13:30',10,100),w('Art',80,100)]),[{title:'Maths',day:0,time:'09:00',room:''},{title:'Art',day:1,time:'13:30',room:''}]);
 assert.deepEqual(wordsFromTsv('level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n5\t1\t1\t1\t1\t1\t10\t20\t30\t10\t92\tMaths'),[{text:'Maths',x:25,y:25,h:10,conf:92}]);
});
test('scan requires explicit review, preserves existing lessons, skips duplicates and tears down',async()=>{
 const dom=new JSDOM(`<main>${timetableImportPanel()}</main>`,{url:'https://example.test/'}),win=dom.window,root=win.document.querySelector('main');let saved=0,rendered=0,terminated=0,toastMessage='';const state={schoolLessons:[{title:'Maths',day:0,time:'09:00',room:'A1'}]};
 const tsv=['level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext',...[[100,0,'Monday'],[200,0,'Tuesday'],[0,50,'09:00'],[100,50,'Maths'],[200,50,'Art']].map(([x,y,t])=>`5\t1\t1\t1\t1\t1\t${x}\t${y}\t20\t12\t95\t${t}`)].join('\n');
 const makeWorker=async()=>({setParameters:async()=>{},recognize:async()=>({data:{text:'Maths Art',tsv}}),terminate:async()=>{terminated++;}});const controller=mountTimetableImport({root,state,save:()=>saved++,render:()=>rendered++,toast:s=>toastMessage=s,win,makeWorker,prepare:async f=>f});
 const input=root.querySelector('#timetableImage');Object.defineProperty(input,'files',{value:[new win.File(['x'],'timetable.png',{type:'image/png'})]});root.querySelector('#scanTimetable').click();await new Promise(r=>setTimeout(r,20));assert.equal(state.schoolLessons.length,1);assert.equal(saved,0);assert.equal(root.querySelectorAll('.import-row').length,2);assert.equal(terminated,1);
 root.querySelector('#timetableImportReview').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));assert.equal(saved,1);assert.equal(rendered,1);assert.equal(state.schoolLessons.length,2);assert.deepEqual(state.schoolLessons[1],{title:'Art',day:1,time:'09:00',room:''});assert.match(toastMessage,/duplicate/);controller.destroy();dom.window.close();
});
test('scan handles failure and lesson limits without changing existing progress',async()=>{
 const dom=new JSDOM(`<main>${timetableImportPanel()}</main>`,{url:'https://example.test/'}),win=dom.window,root=win.document.querySelector('main');let saved=0;const state={schoolLessons:Array.from({length:60},(_,i)=>({title:`Lesson ${i}`,day:0,time:'09:00',room:''}))};const ctl=mountTimetableImport({root,state,save:()=>saved++,render:()=>{},toast:()=>{},win,prepare:async f=>f,makeWorker:async()=>{throw Error('network');}});Object.defineProperty(root.querySelector('#timetableImage'),'files',{value:[new win.File(['x'],'photo.jpg',{type:'image/jpeg'})]});root.querySelector('#scanTimetable').click();await new Promise(r=>setTimeout(r,10));assert.match(root.querySelector('#importStatus').textContent,/Could not read/);const row=root.querySelector('.import-row');row.querySelector('[name=title]').value='New lesson';row.querySelector('[name=day]').value='1';row.querySelector('[name=time]').value='12:30';root.querySelector('#timetableImportReview').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));assert.equal(saved,0);assert.equal(state.schoolLessons.length,60);assert.match(root.querySelector('#importStatus').textContent,/60-lesson limit/);ctl.destroy();dom.window.close();
});

test('recognises a transposed grid and separated am/pm times',()=>{
 const transposed=[w('09:00',150,10),w('10:00',250,10),w('Monday',20,70),w('Tuesday',20,130),w('Maths',150,70),w('Art',250,70),w('Science',150,130)];
 assert.deepEqual(suggestLessons(transposed),[{title:'Maths',day:0,time:'09:00',room:''},{title:'Art',day:0,time:'10:00',room:''},{title:'Science',day:1,time:'09:00',room:''}]);
 const tsv='level\tpage\tblock\tpar\tline\tword\tleft\ttop\twidth\theight\tconf\ttext\n5\t1\t1\t1\t1\t1\t10\t20\t40\t10\t96\t1:30\n5\t1\t1\t1\t1\t2\t55\t20\t20\t10\t90\tPM';const words=wordsFromTsv(tsv);assert.equal(words.length,1);assert.equal(parseTime(words[0].text),'13:30');
});
