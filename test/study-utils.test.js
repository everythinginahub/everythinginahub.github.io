import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDate, currentStreak, sortedTasks, taskDateLabel } from '../public/study-utils.js';

test('streak stays active from yesterday and handles month boundaries', () => {
  const now = new Date(2026, 2, 1, 9);
  assert.equal(localDate(now), '2026-03-01');
  assert.equal(currentStreak(['2026-02-27', '2026-02-28'], now), 2);
  assert.equal(currentStreak(['2026-02-27'], now), 0);
  assert.equal(currentStreak(['2026-02-28', '2026-03-01'], now), 2);
});
test('planner sorts incomplete sessions by date without losing original indexes', () => {
  const tasks=[{date:'',done:false},{date:'2026-05-12',done:true},{date:'2026-05-10',done:false},{date:'2026-05-09',done:false}];
  assert.deepEqual(sortedTasks(tasks).map(x=>x.index), [3,2,0,1]);
  assert.equal(taskDateLabel('2026-05-09','2026-05-10'), 'Overdue · 9 May');
  assert.equal(taskDateLabel('2026-05-10','2026-05-10'), 'Today');
  assert.equal(taskDateLabel('','2026-05-10'), 'No date');
});
