import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
let server, dir, base, port;
async function startServer() {
  server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port),DATA_DIR:dir},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{server.stdout.on('data',resolve);server.on('exit',code=>reject(Error(`Server exited ${code}`)));setTimeout(()=>reject(Error('Server startup timed out')),5000).unref();});
}
async function stopServer() { if (!server || server.exitCode !== null) return; const exiting=new Promise(resolve=>server.once('exit',resolve)); server.kill(); await exiting; }
before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'revisepro-'));
  const probe = createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve)); port = probe.address().port; await new Promise(resolve=>probe.close(resolve));
  base=`http://127.0.0.1:${port}`;
  await startServer();
});
after(async()=>{await stopServer(); if(dir)await rm(dir,{recursive:true,force:true});});
const post=(path,data,cookie)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(data)});
test('static app and full account flow',async()=>{
  assert.equal((await fetch(base+'/')).status,200);
  assert.equal((await fetch(base+'/hero-art.jpg')).status,404);
  assert.equal((await fetch(base+'/logo.svg')).headers.get('content-type'),'image/svg+xml');
  assert.equal((await fetch(base+'/api/session')).status,200);
  assert.deepEqual(await (await fetch(base+'/api/health')).json(), {ok:true});
  assert.equal((await fetch(base+'/')).headers.get('cache-control'),'no-cache');
  assert.equal((await post('/api/register',{name:'Alex',email:'alex@example.com',password:'short'})).status,400);
  let r=await post('/api/register',{name:'Alex',email:'alex@example.com',password:'a-long-password'});assert.equal(r.status,200); const cookie=r.headers.get('set-cookie').split(';')[0];assert.equal((await r.json()).user.name,'Alex');
  r=await fetch(base+'/api/progress',{method:'PUT',headers:{'Content-Type':'application/json',cookie},body:JSON.stringify({completed:{biology:true}})});assert.equal(r.status,200);
  r=await fetch(base+'/api/session',{headers:{cookie}});assert.equal((await r.json()).progress.completed.biology,true);
  assert.equal((await post('/api/login',{email:'alex@example.com',password:'wrong-password'})).status,401);
  assert.equal((await post('/api/login',{email:'alex@example.com',password:'a-long-password'})).status,200);
  assert.equal((await post('/api/logout',{},cookie)).status,200);
  assert.equal((await fetch(base+'/api/session',{headers:{cookie}}).then(r=>r.json())).user,null);
  assert.equal((await fetch(base+'/api/progress',{method:'PUT',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
  assert.equal((await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json',origin:'https://evil.example'},body:'{}'})).status,403);
});

test('accounts and progress persist across server restarts', async () => {
  await stopServer();
  await startServer();
  const r=await post('/api/login',{email:'alex@example.com',password:'a-long-password'});
  assert.equal(r.status,200);
  const result=await r.json();
  assert.equal(result.user.name,'Alex');
  assert.equal(result.progress.completed.biology,true);
});
