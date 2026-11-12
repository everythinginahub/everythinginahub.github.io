import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculateExpression,convertUnit,formatStopwatch,scrambleWord,scrambleWords,popularMiniApps} from '../public/popular-apps.js';

test('calculator safely evaluates arithmetic, unary signs and brackets without eval',()=>{
 assert.equal(calculateExpression('2 + 3 * 4'),14);
 assert.equal(calculateExpression('(12 + 4) / 2'),8);
 assert.equal(calculateExpression('12 ÷ 2 × 3 − 1'),17);
 assert.equal(calculateExpression('-4 + +2'),-2);
 assert.equal(calculateExpression('0.1 + 0.2'),0.3);
 for(const expression of ['', '1+', '(2+3', '2/0', 'window.alert(1)', '2**1000', '1.2.3'])assert.throws(()=>calculateExpression(expression));
});

test('unit converter covers common measures and rejects invalid or impossible values',()=>{
 assert.equal(convertUnit(100,'length','cm','m'),1);
 assert.equal(convertUnit(1,'mass','kg','lb'),2.20462262185);
 assert.ok(Math.abs(convertUnit(1,'volume','l','ml')-1000)<1e-8);
 assert.equal(convertUnit(100,'temperature','C','F'),212);
 assert.equal(convertUnit(32,'temperature','F','C'),0);
 assert.throws(()=>convertUnit(-274,'temperature','C','K'),/absolute zero/);
 assert.throws(()=>convertUnit('', 'length','m','cm'));
 assert.throws(()=>convertUnit(1,'length','cm','g'));
});

test('stopwatch formats elapsed time with centiseconds and resets negative values safely',()=>{
 assert.equal(formatStopwatch(0),'00:00:00.00');
 assert.equal(formatStopwatch(3661123),'01:01:01.12');
 assert.equal(formatStopwatch(1250),'00:00:01.25');
 assert.equal(formatStopwatch(-100),'00:00:00.00');
});

test('word scramble shuffles letters, and the standalone apps have helpful descriptions',()=>{
 const mixed=scrambleWord('planet',()=>0);
 assert.notEqual(mixed,'planet');assert.deepEqual([...mixed].sort(),[...'planet'].sort());
 assert.throws(()=>scrambleWord('x'));
 assert.equal(Object.keys(popularMiniApps).length,4);
 assert.match(popularMiniApps['word-scramble'].privacy,/no timer, streak or score/i);
 assert.ok(scrambleWords.length>=6);
});
