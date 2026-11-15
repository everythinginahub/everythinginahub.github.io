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
