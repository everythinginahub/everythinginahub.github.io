import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import {CSP_DUNGEON,CSP_FEEDBACK} from '../scripts/security-headers.js';
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
  const home=await fetch(base+'/');assert.equal(home.status,200);const homeMarkup=await home.text();assert.match(homeMarkup,/public overview/);assert.doesNotMatch(homeMarkup,/<meta[^>]*http-equiv="refresh"/i);
  const privacy=await fetch(base+'/privacy/');assert.equal(privacy.status,200);assert.match(await privacy.text(),/Privacy Policy/);assert.match(privacy.headers.get('content-security-policy'),/frame-ancestors 'none'/);const feedback=await fetch(base+'/feedback/');assert.equal(feedback.status,200);assert.match(await feedback.text(),/verified site-owner account/);assert.equal(feedback.headers.get('content-security-policy'),CSP_FEEDBACK);const feedbackNoSlash=await fetch(base+'/feedback');assert.equal(feedbackNoSlash.status,200);
  for(const slug of ['study-planner','revision-tools','student-timetable','everyday-tools']){const guide=await fetch(`${base}/${slug}/`);assert.equal(guide.status,200,slug);assert.match(await guide.text(),/rel="canonical"/);}
  const appAlias=await fetch(base+'/public?from=landing',{redirect:'manual'});assert.equal(appAlias.status,308);assert.equal(appAlias.headers.get('location'),'/public/?from=landing');
  const app=await fetch(base+'/public/');assert.equal(app.status,200);const appMarkup=await app.text();assert.match(appMarkup,/YOUR STUDY &amp; EVERYDAY HUB/);assert.ok(appMarkup.includes('motion.css?v=20261106-2'));assert.ok(appMarkup.includes('src="motion.js?v=20261106-2"'));assert.match(app.headers.get('content-security-policy'),/https:\/\/tytcagbeucbugwjwgiog\.supabase\.co/);
  const appStyle=await fetch(base+'/public/style.css');assert.equal(appStyle.status,200);assert.match(appStyle.headers.get('content-type'),/text\/css/);
  const motionStyle=await fetch(base+'/public/motion.css?v=20261106-2');assert.equal(motionStyle.status,200);assert.ok(motionStyle.headers.get('content-type').includes('text/css'));assert.match(await motionStyle.text(),/@keyframes hub-title-pop/);
  const motionScript=await fetch(base+'/public/motion.js?v=20261106-2');assert.equal(motionScript.status,200);assert.ok(motionScript.headers.get('content-type').includes('javascript'));
  const robots=await fetch(base+'/robots.txt');assert.equal(robots.status,200);assert.match(robots.headers.get('content-type'),/text\/plain/);assert.match(await robots.text(),/Sitemap: https:\/\/everythinginahub\.github\.io\/sitemap\.xml/);
  const sitemap=await fetch(base+'/sitemap.xml');assert.equal(sitemap.status,200);assert.match(sitemap.headers.get('content-type'),/application\/xml/);const sitemapMarkup=await sitemap.text();assert.match(sitemapMarkup,/<loc>https:\/\/everythinginahub\.github\.io\/<\/loc>/);assert.match(sitemapMarkup,/<loc>https:\/\/everythinginahub\.github\.io\/privacy\/<\/loc>/);for(const slug of ['study-planner','revision-tools','student-timetable','everyday-tools'])assert.match(sitemapMarkup,new RegExp(`<loc>https:\\/\\/everythinginahub\\.github\\.io\\/${slug}\\/</loc>`));
  assert.equal(home.headers.get('x-content-type-options'),'nosniff');assert.equal(home.headers.get('x-frame-options'),'DENY');assert.equal(home.headers.get('referrer-policy'),'strict-origin-when-cross-origin');assert.match(home.headers.get('content-security-policy'),/object-src 'none'/);assert.equal(home.headers.get('strict-transport-security'),null);
  const voxelcraft=await fetch(base+'/voxelcraft-survival.html');assert.equal(voxelcraft.status,200);assert.equal(voxelcraft.headers.get('x-frame-options'),'SAMEORIGIN');assert.match(voxelcraft.headers.get('content-security-policy'),/frame-ancestors 'self'/);const voxelMarkup=await voxelcraft.text();assert.match(voxelMarkup,/VoxelCraft Survival/);assert.match(voxelMarkup,/\.\/vendor\/three-r128\.min\.js/);assert.doesNotMatch(voxelMarkup,/sites\.google\.com|cdnjs\.cloudflare\.com/);
  const dungeon=await fetch(base+'/dungeon-quest-3d.html');assert.equal(dungeon.status,200);assert.equal(dungeon.headers.get('x-frame-options'),'SAMEORIGIN');assert.equal(dungeon.headers.get('content-security-policy'),CSP_DUNGEON);const dungeonMarkup=await dungeon.text();assert.match(dungeonMarkup,/Dungeon Quest 3D/);assert.match(dungeonMarkup,/assets\/dungeon-quest-hero\.jpg/);
  const embeddedDungeon=await fetch(base+'/public/dungeon-quest-3d.html');assert.equal(embeddedDungeon.status,200);assert.equal(embeddedDungeon.headers.get('x-frame-options'),'SAMEORIGIN');assert.equal(embeddedDungeon.headers.get('content-security-policy'),CSP_DUNGEON);
  const dungeonArt=await fetch(base+'/assets/dungeon-quest-hero.jpg');assert.equal(dungeonArt.status,200);assert.match(dungeonArt.headers.get('content-type'),/image\/jpeg/);
  const voxelThree=await fetch(base+'/vendor/three-r128.min.js');assert.equal(voxelThree.status,200);assert.match(voxelThree.headers.get('content-type'),/javascript/);
  const secure=await fetch(base+'/api/health',{headers:{'x-forwarded-proto':'https'}});assert.match(secure.headers.get('strict-transport-security'),/max-age=31536000/);assert.equal(secure.headers.get('x-content-type-options'),'nosniff');assert.deepEqual(await secure.json(),{ok:true});
  assert.equal((await fetch(base+'/hero-art.jpg')).status,404);
  assert.equal((await fetch(base+'/logo.svg')).headers.get('content-type'),'image/svg+xml');
  const socialCard=await fetch(base+'/social-preview.png');assert.equal(socialCard.status,200);assert.match(socialCard.headers.get('content-type'),/image\/png/);
  assert.equal((await fetch(base+'/api/session')).status,200);
  assert.deepEqual(await (await fetch(base+'/api/health')).json(), {ok:true});
  assert.equal(home.headers.get('cache-control'),'no-cache');
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
