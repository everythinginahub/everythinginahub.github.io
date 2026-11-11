import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {miniAppView} from '../public/mini-apps.js';
import {
  dailyChallenges,localDateKey,normalizeDailyAnswer,dailyProgressKey,
  readDailyProgress,writeDailyProgress,recordDailyScore,mountDailyChallenge
} from '../public/daily-challenge.js';

test('daily puzzles are date-seeded, varied, bounded and safe to normalize',()=>{
  const today=dailyChallenges('2026-11-06');
  assert.deepEqual(today,dailyChallenges('2026-11-06'));
  assert.notDeepEqual(today,dailyChallenges('2026-11-07'));
  assert.equal(today.length,3);
  assert.equal(new Set(today.map(puzzle=>puzzle.title)).size,3);
  assert.ok(today.some(puzzle=>puzzle.title==='Pattern spotter'));
  assert.ok(today.some(puzzle=>puzzle.title==='Quick maths'));
  assert.ok(today.some(puzzle=>puzzle.title==='Word shuffle'));
  for(const puzzle of today){assert.ok(puzzle.prompt);assert.ok(puzzle.answer);assert.ok(puzzle.instruction);}
  assert.equal(normalizeDailyAnswer('  Café! '),'cafe');
  for(const date of ['2026-02-29','2026-13-01','not-a-date'])assert.throws(()=>dailyChallenges(date));
});

test('daily scores keep a best result, advance consecutive streaks and reset after a gap',()=>{
  let result=recordDailyScore({lastDate:'',streak:0,results:[]},'2026-11-04',2);
  assert.equal(result.streak,1);assert.equal(result.bestScore,2);
  result=recordDailyScore(result.progress,'2026-11-04',1);
  assert.equal(result.streak,1);assert.equal(result.bestScore,2);
  result=recordDailyScore(result.progress,'2026-11-05',3);
  assert.equal(result.streak,2);assert.equal(result.bestScore,3);
  result=recordDailyScore(result.progress,'2026-11-08',0);
  assert.equal(result.streak,1);assert.equal(result.bestScore,0);
  assert.throws(()=>recordDailyScore(result.progress,'2026-11-09',4));
});

test('daily progress is local, account-scoped and tolerant of corrupt or blocked storage',()=>{
  const dom=new JSDOM('',{url:'https://example.test'});try{
    const storage=dom.window.localStorage,key=dailyProgressKey('student-a');
    const result=recordDailyScore(readDailyProgress(storage,'student-a'),'2026-11-06',2);
    assert.equal(writeDailyProgress(storage,'student-a',result.progress),true);
    assert.equal(readDailyProgress(storage,'student-a').streak,1);
    assert.equal(readDailyProgress(storage,'student-b').streak,0);
    storage.setItem(key,'not json');assert.equal(readDailyProgress(storage,'student-a').streak,0);
    assert.equal(readDailyProgress(null,'student-a').streak,0);
    assert.equal(writeDailyProgress(null,'student-a',result.progress),false);
  }finally{dom.window.close();}
});

test('daily challenge accepts answers, saves a streak and can be replayed without double-counting',()=>{
  const dom=new JSDOM(`<main>${miniAppView('daily-challenge')}</main>`,{url:'https://example.test'});try{
    const win=dom.window,root=win.document.querySelector('main'),q=selector=>root.querySelector(selector);
    const controller=mountDailyChallenge({root,win,userId:'learner-1'});
    const form=q('#dailyAnswerForm'),today=localDateKey(),puzzles=dailyChallenges(today);
    q('#dailyStart').click();assert.equal(q('#dailyGame').hidden,false);
    for(let index=0;index<puzzles.length;index++){
      q('#dailyAnswer').value=puzzles[index].answer;
      form.dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
      assert.match(q('#dailyFeedback').textContent,/That’s right/);
      form.dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
    }
    assert.equal(q('#dailyDone').hidden,false);
    assert.equal(q('#dailyFinalScore').textContent,'3 / 3');
    assert.equal(readDailyProgress(win.localStorage,'learner-1').streak,1);
    q('#dailyReplay').click();
    for(let index=0;index<puzzles.length;index++){
      q('#dailyAnswer').value='not-the-answer';
      form.dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
      form.dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
    }
    const progress=readDailyProgress(win.localStorage,'learner-1');
    assert.equal(progress.streak,1);assert.equal(progress.results.find(item=>item.date===today).score,3);
    controller.destroy();
  }finally{dom.window.close();}
});
