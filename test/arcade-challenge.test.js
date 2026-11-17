import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dailyArcadeChallenge,seededRandom} from '../public/arcade-challenge.js';

test('the daily arcade challenge rotates deterministically through all three originals',()=>{
 const days=['2026-11-06','2026-11-07','2026-11-08'].map(dailyArcadeChallenge);
 assert.equal(new Set(days.map(challenge=>challenge.gameId)).size,3);
 assert.deepEqual(days.map(challenge=>challenge.date),['2026-11-06','2026-11-07','2026-11-08']);
 for(const challenge of days){
  assert.equal(dailyArcadeChallenge(challenge.date).gameId,challenge.gameId);
  assert.equal(challenge.seed,`${challenge.date}:${challenge.gameId}`);
  assert.ok(challenge.goal&&challenge.instructions);
 }
 assert.equal(days.find(challenge=>challenge.targetMeters)?.goal,'Reach 500 m');
 assert.equal(days.find(challenge=>challenge.targetWave)?.goal,'Clear two waves');
 assert.equal(days.find(challenge=>challenge.targetLevel)?.goal,'Clear level one');
});

test('daily seeded randomness repeats for a challenge and changes with its seed',()=>{
 const values=seed=>Array.from({length:8},seededRandom(seed));
 assert.deepEqual(values('2026-11-06:skyline'),values('2026-11-06:skyline'));
 assert.notDeepEqual(values('2026-11-06:skyline'),values('2026-11-07:skyline'));
 assert.ok(values('2026-11-06:skyline').every(value=>value>=0&&value<1));
});
