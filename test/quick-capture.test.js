import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createQuickCapture,QUICK_CAPTURE_LIMITS} from '../public/quick-capture.js';

test('quick task capture trims content and validates a real calendar date',()=>{
  assert.deepEqual(createQuickCapture('task',{title:'  Finish biology  ',date:'2026-11-06'}),{
    value:{title:'Finish biology',date:'2026-11-06',done:false}
  });
  assert.match(createQuickCapture('task',{title:'Read',date:'2026-02-30'}).error,/valid due date/);
  assert.match(createQuickCapture('task',{title:'  '}).error,/task name/);
  assert.match(createQuickCapture('task',{title:'x'.repeat(QUICK_CAPTURE_LIMITS.taskTitle+1)}).error,/100 characters/);
});

test('quick note capture keeps the notes schema and enforces the shared note limit',()=>{
  assert.deepEqual(createQuickCapture('note',{title:'  Idea  ',body:'  Bring a sketchbook.  '}).value,{
    kind:'text',title:'Idea',body:'Bring a sketchbook.',labels:'',colour:'default'
  });
  assert.match(createQuickCapture('note',{title:'',body:'  '}).error,/title or a little note/);
  assert.match(createQuickCapture('note',{body:'x'.repeat(QUICK_CAPTURE_LIMITS.noteBody+1)}).error,/1,000 characters/);
  const archivedAndTrashed=Array.from({length:30},(_,index)=>({title:String(index),archived:index%2===0,trashed:index%3===0}));
  assert.match(createQuickCapture('checklist',{title:'Shopping',body:'Milk'}, {schoolNotes:archivedAndTrashed}).error,/30-note limit/);
});

test('quick checklist capture cleans lines and enforces item limits',()=>{
  assert.deepEqual(createQuickCapture('checklist',{title:' Errands ',body:'  Post letter\r\n\r\n Buy stamps  \n'}).value,{
    kind:'checklist',title:'Errands',body:'',labels:'',colour:'default',items:[
      {text:'Post letter',done:false},{text:'Buy stamps',done:false}
    ]
  });
  assert.match(createQuickCapture('checklist',{body:'\n  '}).error,/at least one checklist item/);
  assert.match(createQuickCapture('checklist',{body:Array(21).fill('item').join('\n')}).error,/up to 20 items/);
  assert.match(createQuickCapture('checklist',{body:'x'.repeat(101)}).error,/100 characters each/);
  assert.match(createQuickCapture('unknown',{}).error,/Choose a task/);
});
