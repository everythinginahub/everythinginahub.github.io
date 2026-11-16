import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
async function htmlFiles(dir=root){
  const entries=await readdir(dir,{withFileTypes:true});
  const files=[];
  for(const entry of entries){
    if(entry.name==='.git'||entry.name==='node_modules')continue;
    const path=resolve(dir,entry.name);
    if(entry.isDirectory())files.push(...await htmlFiles(path));
    else if(entry.isFile()&&entry.name.endsWith('.html'))files.push(path);
  }
  return files;
}
const text=path=>readFile(resolve(root,path),'utf8');

test('every HTML page has a visible footer link to the privacy policy',async()=>{
  const pages=await htmlFiles();
  assert.ok(pages.length>=10,`expected the known site pages, found ${pages.length}`);
  for(const path of pages){
    const html=await readFile(path,'utf8');
    assert.match(html,/<footer\b[^>]*>[\s\S]*?<a\b[^>]*href="\/privacy\/"[^>]*>Privacy Policy<\/a>[\s\S]*?<\/footer>/i,`${relative(root,path)} needs a footer Privacy Policy link`);
  }
});

test('root is the canonical landing URL and sitemap avoids the public alias',async()=>{
  const [rootPage,appPage,sitemap]=await Promise.all([text('index.html'),text('public/index.html'),text('sitemap.xml')]);
  assert.match(rootPage,/rel="canonical" href="https:\/\/everythinginahub\.github\.io\/"/);
  assert.match(appPage,/rel="canonical" href="https:\/\/everythinginahub\.github\.io\/"/);
  assert.match(rootPage,/property="og:url" content="https:\/\/everythinginahub\.github\.io\/"/);
  assert.doesNotMatch(rootPage,/<meta[^>]*http-equiv="refresh"/i);
  assert.match(rootPage,/href="\/public\/"/,'the workspace remains directly reachable from the root overview');
  assert.match(sitemap,/<loc>https:\/\/everythinginahub\.github\.io\/<\/loc>/);
  assert.match(sitemap,/<loc>https:\/\/everythinginahub\.github\.io\/privacy\/<\/loc>/);
  assert.doesNotMatch(sitemap,/https:\/\/everythinginahub\.github\.io\/public\//);
});

test('anonymous feedback disclosures match the form and private storage behavior',async()=>{
  const [policy,app,script]=await Promise.all([text('privacy/index.html'),text('public/index.html'),text('public/feedback.js')]);
  for(const phrase of [
    'Website feedback','without signing in','category you select, your message and the app section','does not attach your signed-in account credentials, ask for or store your email address',
    'private to the site team','source IP address','keyed, one-way hash','five submissions per hour','more than 24 hours old',
    'kept in the project until the site operator deletes them','does not promise a personal response'
  ])assert.ok(policy.toLowerCase().includes(phrase.toLowerCase()),`policy should explain feedback: ${phrase}`);
  assert.match(app,/feedbackPrivacyNote/);
  assert.match(app,/maxlength="3000"/,'the client allows 1,500 supplementary Unicode characters by UTF-16 code units');
  assert.match(script,/\/functions\/v1\/site-feedback/);
  assert.match(script,/credentials:'omit'/);
  assert.doesNotMatch(script,/Authorization/i,'the anonymous feedback client does not transmit signed-in authorization');
});

test('privacy policy reflects the current accounts, progress, activity and third-party implementations',async()=>{
  const policy=await text('privacy/index.html');
  for(const phrase of [
    'Supabase Auth','100,000 bytes','not end-to-end encrypted','random browser identifier',
    'older than one day','no automatic expiry','kindlehub-api.arancool3000.workers.dev',"share the key owner's daily AI allowance",'Google Gemini','provider keys remain server-side',
    'latest short-term request window','no per-account daily site cap','12 attempts per account in a fixed 60-second window','may incur charges',
    'Launch Orbit','Better Launch','CodeHype','YouTube','Internet Archive','24 hours','two hours',
    'does not store page paths','ordinary request metadata','self-service account deletion control','GitHub issues are public'
  ])assert.ok(policy.toLowerCase().includes(phrase.toLowerCase()),`policy should explain ${phrase}`);
});
