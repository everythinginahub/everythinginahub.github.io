import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPractice, submitPractice } from '../public/practice.js';
import { normalizeRewards, awardDaily, chooseReward, rewardsCatalog } from '../public/rewards.js';
const cards=Array.from({length:20},(_,i)=>[`Question ${i}`,`Answer ${i}`]);
const random=()=>.3;
test('practice tests use the requested length and distinct answers without mutating cards',()=>{
  const original=structuredClone(cards);
  for(const n of [5,10,20]){const test=createPractice(cards,n,random);assert.equal(test.questions.length,n);for(const q of test.questions){assert.equal(new Set(q.choices.map(c=>c.text)).size,q.choices.length);assert.ok(q.choices.some(c=>c.id===q.id));}}
  assert.deepEqual(cards,original);assert.equal(createPractice(cards,0,random),null);assert.equal(createPractice([['one','a']],5,random),null);assert.equal(createPractice(cards.slice(0,2),20,random).questions.length,2);
});
test('tests require one valid answer, count skipped answers, and cannot be submitted twice',()=>{
  const test=createPractice(cards,5,random);assert.equal(submitPractice(test,Array(5).fill(null)),false);assert.equal(submitPractice(test,[999,999,999,999,999]),false);assert.equal(submitPractice(test,[]),false);
  const answers=test.questions.map((q,i)=>i===0?q.id:i===1?q.choices.find(c=>c.id!==q.id).id:null);assert.equal(submitPractice(test,answers),true);assert.equal(test.score,1);assert.equal(test.answers.filter(x=>x===null).length,3);assert.equal(submitPractice(test,answers),false);
});
test('daily coins are awarded once per activity and reset on a new local day',()=>{
  let wallet;let result=awardDaily(wallet,'card','2026-11-07');wallet=result.wallet;assert.equal(result.gained,5);
  result=awardDaily(wallet,'card','2026-11-07');wallet=result.wallet;assert.equal(result.gained,0);
  for(const kind of ['game','test'])wallet=awardDaily(wallet,kind,'2026-11-07').wallet;
  assert.equal(wallet.coins,30);assert.equal(awardDaily(wallet,'unknown','2026-11-07').gained,0);assert.equal(awardDaily(wallet,'card','bad').gained,0);
  result=awardDaily(wallet,'card','2026-11-08');assert.equal(result.gained,5);assert.equal(result.wallet.coins,35);assert.deepEqual(result.wallet.daily.claimed,['card']);
});
test('badges require coins, do not double-charge and can be re-equipped',()=>{
  let wallet=normalizeRewards(null);assert.equal(chooseReward(wallet,'sun').status,'insufficient');wallet=awardDaily(wallet,'test','2026-11-07').wallet;wallet=awardDaily(wallet,'card','2026-11-07').wallet;
  let result=chooseReward(wallet,'sun');wallet=result.wallet;assert.equal(result.status,'purchased');assert.equal(wallet.coins,0);assert.equal(wallet.equipped,'sun');assert.ok(wallet.owned.includes('sun'));
  result=chooseReward(wallet,'sun');assert.equal(result.status,'equipped');assert.equal(result.wallet.coins,0);wallet=chooseReward(result.wallet,'leaf').wallet;result=chooseReward(wallet,'sun');assert.equal(result.status,'changed');assert.equal(result.wallet.coins,0);assert.equal(chooseReward(result.wallet,'unknown').status,'unknown');
});
test('malformed legacy reward data is handled safely and only known badges survive',()=>{
  const wallet=normalizeRewards({coins:-10,owned:['__proto__','sun','sun'],equipped:'__proto__',daily:{date:'bad',claimed:['game','game','invalid']}});
  assert.equal(wallet.coins,0);assert.deepEqual(wallet.owned,['leaf','sun']);assert.equal(wallet.equipped,'leaf');assert.deepEqual(wallet.daily.claimed,['game']);assert.ok(rewardsCatalog.every(item=>typeof item.price==='number'));
});

test('everyday activities award once a day without disturbing legacy balances or badges',()=>{
 let wallet={coins:42,owned:['leaf','sun'],equipped:'sun',daily:{date:'2026-11-07',claimed:['card']}};
 for(const [kind,amount] of [['task',5],['habit',5],['list',5],['reading',5],['arcade',10]]){let result=awardDaily(wallet,kind,'2026-11-07');assert.equal(result.gained,amount);wallet=result.wallet;assert.equal(awardDaily(wallet,kind,'2026-11-07').gained,0);}
 assert.equal(wallet.coins,72);assert.equal(wallet.equipped,'sun');assert.ok(wallet.owned.includes('sun'));assert.ok(wallet.daily.claimed.includes('card'));const next=awardDaily(wallet,'task','2026-11-08');assert.equal(next.gained,5);assert.deepEqual(next.wallet.daily.claimed,['task']);assert.equal(chooseReward(next.wallet,'wave').status,'purchased');
});
