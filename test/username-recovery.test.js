import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { generateRecoveryCodes, normalizeRecoveryCode, hashRecoveryCode } from '../supabase/functions/username-auth/recovery.js';

test('recovery code helpers generate separate 128-bit codes and normalize their representation', async () => {
 const codes = generateRecoveryCodes(webcrypto);
 assert.equal(codes.length,5);assert.equal(new Set(codes).size,5);
 for (const code of codes) {
  assert.match(code,/^[0-9A-F]{8}(?:-[0-9A-F]{8}){3}$/);
  assert.equal(await hashRecoveryCode(webcrypto,code),await hashRecoveryCode(webcrypto,code.toLowerCase().replaceAll('-','')));
  assert.notEqual(await hashRecoveryCode(webcrypto,code),code);
 }
 assert.equal(normalizeRecoveryCode('abcd'),null);
 await assert.rejects(hashRecoveryCode(webcrypto,'not a code'),/Invalid/);
});
