import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHandler as createAiHandler} from '../supabase/functions/ai-chat/handler.js';
import {createUsernameHandler} from '../supabase/functions/username-auth/handler.js';

const trustedOrigin='https://everythinginahub.github.io';
const endpoint='https://project.supabase.co/functions/v1/test';

function options(origin){
 return new Request(endpoint,{method:'OPTIONS',headers:{...(origin===undefined?{}:{Origin:origin}),'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization, content-type'}});
}

test('Supabase function CORS allows the site and local development origins only',async()=>{
 const handlers=[
  createAiHandler({configured:false}),
  createUsernameHandler({configured:false})
 ];
 for(const handler of handlers){
  const allowed=await handler(options(trustedOrigin));
  assert.equal(allowed.status,204);
  assert.equal(allowed.headers.get('access-control-allow-origin'),trustedOrigin);
  assert.equal(allowed.headers.get('access-control-allow-methods'),'POST, OPTIONS');
  assert.match(allowed.headers.get('access-control-allow-headers'),/authorization/);
  assert.match(allowed.headers.get('vary'),/Origin/i);

  const local=await handler(options('http://localhost:3000'));
  assert.equal(local.status,204);
  assert.equal(local.headers.get('access-control-allow-origin'),'http://localhost:3000');

  const denied=await handler(options('https://everythinginahub.github.io.attacker.example'));
  assert.equal(denied.status,403);
  assert.equal(denied.headers.get('access-control-allow-origin'),null);

  const opaque=await handler(options('null'));
  assert.equal(opaque.status,403);
  assert.equal(opaque.headers.get('access-control-allow-origin'),null);

  const noOrigin=await handler(options());
  assert.equal(noOrigin.status,204);
  assert.equal(noOrigin.headers.get('access-control-allow-origin'),null);
 }
});

test('actual Supabase function responses echo only an exact trusted origin',async()=>{
 const handlers=[
  createAiHandler({configured:false}),
  createUsernameHandler({configured:false})
 ];
 for(const handler of handlers){
  const trusted=await handler(new Request(endpoint,{method:'POST',headers:{Origin:trustedOrigin,'Content-Type':'application/json'},body:'{}'}));
  assert.equal(trusted.headers.get('access-control-allow-origin'),trustedOrigin);
  const untrusted=await handler(new Request(endpoint,{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json'},body:'{}'}));
  assert.equal(untrusted.headers.get('access-control-allow-origin'),null);
  assert.notEqual(untrusted.headers.get('access-control-allow-origin'),'*');
 }
});
