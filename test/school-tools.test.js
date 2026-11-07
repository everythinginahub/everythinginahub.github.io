import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculateExpression,schoolNotes,schoolTimetable} from '../public/school-tools.js';
test('calculator honours precedence, parentheses and unary operators without evaluating code',()=>{
 assert.equal(calculateExpression('2+3*4'),14);assert.equal(calculateExpression('-(2+3)*4'),-20);assert.equal(calculateExpression('1/3'),0.333333333333);assert.throws(()=>calculateExpression('1/0'));assert.throws(()=>calculateExpression('alert(1)'));assert.throws(()=>calculateExpression('1+'));assert.throws(()=>calculateExpression('('.repeat(21)+'1'+')'.repeat(21)));
});
test('notes and timetable escape user content',()=>{
 assert.doesNotMatch(schoolNotes({schoolNotes:[{title:'<img>',body:'<script>'}]}),/<img>|<script>/);assert.doesNotMatch(schoolTimetable({schoolLessons:[{title:'<img>',room:'<svg>',time:'09:00',day:0}]}),/<img>|<svg>/);
});
