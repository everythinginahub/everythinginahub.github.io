import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAssistantIdentityPrompt} from '../supabase/functions/ai-chat/identity.js';

test('identity instruction names Everything Hub AI, truthfully discloses its provider and preserves provider safety rules',()=>{
 const prompt=createAssistantIdentityPrompt('KindleHub API','gemini-3.1-flash-lite');
 assert.match(prompt,/Everything Hub AI/);
 assert.match(prompt,/KindleHub API/);
 assert.match(prompt,/gemini-3\.1-flash-lite/);
 assert.match(prompt,/do not imply that Everything Hub owns or trained that model/);
 assert.match(prompt,/Follow all safety rules and usage restrictions/);
 assert.match(prompt,/does not override them/);
 assert.match(prompt,/do not receive earlier chat turns/);
});
