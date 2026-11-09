import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUsername, isRestrictedUsername, isValidNewPassword } from '../supabase/functions/username-auth/policy.js';

test('username normalization uses one canonical case and a restricted alphabet', () => {
  assert.equal(normalizeUsername('  Alex_42 '), 'alex_42');
  for (const value of ['', 'a', 'two words', 'a@b', 'a.b', 'あい', '9alex', 'a'.repeat(25), null]) assert.equal(normalizeUsername(value), null);
});

test('owner and impersonation variants are reserved for ordinary users', () => {
  for (const value of ['Shay','sHaY','s_h_a_y','sh4y','owner','admin','moderator','founder','support']) assert.equal(isRestrictedUsername(value), true, value);
  for (const value of ['alex','learn_42','kim']) assert.equal(isRestrictedUsername(value), false, value);
});

test('new passwords need at least eight characters and fit in bcrypt without truncation', () => {
  assert.equal(isValidNewPassword('1234567'), false);
  assert.equal(isValidNewPassword('12345678'), true);
  assert.equal(isValidNewPassword('a'.repeat(72)), true);
  assert.equal(isValidNewPassword('a'.repeat(73)), false);
  assert.equal(isValidNewPassword('🔐'.repeat(4)), false);
  assert.equal(isValidNewPassword('🔐'.repeat(8)), true);
  assert.equal(isValidNewPassword('🔐'.repeat(37)), false);
  assert.equal(isValidNewPassword(null), false);
});
