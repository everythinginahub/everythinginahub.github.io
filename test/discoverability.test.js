import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const canonical='https://everythinginahub.github.io/';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');

function visibleWordCount(element){
 const copy=element.cloneNode(true);
 copy.querySelectorAll('script,style,noscript,[hidden]').forEach(node=>node.remove());
 copy.querySelectorAll('details:not([open]) > :not(summary)').forEach(node=>node.remove());
 return (copy.textContent.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)||[]).length;
}
function structuredData(document){
 return [...document.querySelectorAll('script[type="application/ld+json"]')].map(script=>JSON.parse(script.textContent));
}

test('public entry and root overview have a keyword H1 and substantive, structured copy',async()=>{
 const [html,root,login,status]=await Promise.all([read('../public/index.html'),read('../index.html'),read('../public/login.html'),read('../public/status.html')]);
 const doc=new JSDOM(html).window.document,rootDoc=new JSDOM(root).window.document,loginDoc=new JSDOM(login).window.document,statusDoc=new JSDOM(status).window.document;
 assert.match(doc.title,/Study Planner, Flashcards & Everyday Tools/);
 assert.match(doc.title,/study planner/i);
 const description=doc.querySelector('meta[name="description"]').content;
 assert.ok(description.length>=70&&description.length<=160,`description length is ${description.length}`);
 assert.match(description,/study planner/i);
 assert.match(doc.querySelector('.entry-intro > p:not(.entry-kicker)').textContent,/study planner/i);
 assert.equal(doc.querySelector('link[rel="canonical"]').href,canonical);
 assert.equal(doc.querySelector('meta[property="og:url"]').content,canonical);
 assert.equal(doc.querySelector('meta[property="og:type"]').content,'website');
 assert.equal(doc.querySelector('meta[property="og:image"]').content,'https://everythinginahub.github.io/public/social-preview.png');
 assert.equal(doc.querySelector('meta[name="twitter:card"]').content,'summary_large_image');
 assert.equal(rootDoc.querySelector('link[rel="canonical"]').href,canonical);
 assert.equal(rootDoc.querySelector('meta[property="og:image"]').content,doc.querySelector('meta[property="og:image"]').content);
 assert.equal(loginDoc.querySelector('meta[name="robots"]').content,'noindex,nofollow');
 assert.equal(statusDoc.querySelector('meta[name="robots"]').content,'noindex,nofollow');

  for(const [name,page,copy] of [
  ['public landing',doc,doc.querySelector('#landing')],
  ['root overview',rootDoc,rootDoc.querySelector('main')]
 ]){
  assert.equal(page.querySelectorAll('h1').length,1,`${name} has exactly one H1`);
  assert.match(page.querySelector('h1').textContent,/study planner/i,`${name} H1 uses the target topic`);
  assert.ok(visibleWordCount(copy)>=300,`${name} has at least 300 visible words (found ${visibleWordCount(copy)})`);
  assert.ok(page.querySelectorAll('h2').length>=2,`${name} copy is divided with H2 headings`);
  assert.ok(page.querySelectorAll('h3').length>=1,`${name} copy includes H3 subheadings`);
  const website=structuredData(page).find(schema=>schema['@type']==='WebSite');
  assert.ok(website,`${name} has WebSite JSON-LD`);
  assert.equal(website.name,'Everything Hub');
  assert.equal(website.url,canonical);
  assert.match(website.description,/study planning|revision|everyday/i);
 }

 assert.match(doc.querySelector('.entry-index').textContent,/Flashcards, quizzes & books/);
 assert.match(doc.querySelector('.entry-note').textContent,/daily puzzle is optional and untimed/i);
 assert.match(doc.querySelector('.entry-note').textContent,/at your pace/i);
 const application=structuredData(doc).find(schema=>schema['@type']==='WebApplication');
 assert.ok(application,'the existing WebApplication schema is preserved');
 assert.equal(application.url,canonical);
 assert.ok(application.featureList.includes('Flashcards, quizzes and practice tests'));
});

test('SEO guides target distinct tasks with self-canonicals, useful copy and internal links',async()=>{
 const guides=[
  ['study-planner','study planner',/study planner/i],
  ['revision-tools','revision tools',/revision tools|flashcards/i],
  ['student-timetable','student timetable',/student timetable/i],
  ['everyday-tools','everyday tools',/everyday/i]
 ];
 for(const [slug,label,target] of guides){
  const html=await read(`../${slug}/index.html`);
  const doc=new JSDOM(html,{url:`${canonical}${slug}/`}).window.document;
  const expectedUrl=`${canonical}${slug}/`;
  const main=doc.querySelector('main');
  assert.equal(doc.querySelector('meta[name="robots"]').content,'index,follow',`${label} should be indexable`);
  assert.equal(doc.querySelector('link[rel="canonical"]').href,expectedUrl,`${label} should self-canonicalize`);
  assert.equal(doc.querySelector('meta[property="og:url"]').content,expectedUrl);
  assert.match(doc.title,target);
  assert.match(doc.querySelector('meta[name="description"]').content,target);
  assert.equal(main.querySelectorAll('h1').length,1,`${label} should have exactly one H1`);
  assert.match(main.querySelector('h1').textContent,target);
  assert.ok(visibleWordCount(main)>=350,`${label} should have substantive copy (found ${visibleWordCount(main)} words)`);
  assert.ok(main.querySelectorAll('h2').length>=3,`${label} should have useful sections`);
  assert.ok(doc.querySelector('nav[aria-label] a[href="/"]')||doc.querySelector('.seo-brand[href="/"]'),`${label} should link back to the root overview`);
  const internalGuideLinks=[...doc.querySelectorAll('a[href^="/"]')].map(link=>link.getAttribute('href')).filter(href=>guides.some(([path])=>href===`/${path}/`)&&href!==`/${slug}/`);
  assert.ok(internalGuideLinks.length>=2,`${label} should link to related guides`);
  assert.ok([...doc.querySelectorAll('a[href^="/public/"]')].length>=1,`${label} should link to the interactive workspace`);
  assert.match(doc.querySelector('footer').innerHTML,/href="\/privacy\/"/);
  const webPage=structuredData(doc).find(schema=>schema['@type']==='WebPage');
  assert.ok(webPage,`${label} should have WebPage structured data`);
  assert.equal(webPage.url,expectedUrl);
  assert.equal(webPage.isPartOf.url,canonical);
 }
});

test('robots and sitemap advertise the canonical overview and privacy page and social image is valid',async()=>{
 const [robots,sitemap,image]=await Promise.all([read('../robots.txt'),read('../sitemap.xml'),readFile(new URL('../public/social-preview.png',import.meta.url))]);
 assert.match(robots,/^User-agent: \*\s+Allow: \/\s+/);
 assert.match(robots,/Sitemap: https:\/\/everythinginahub\.github\.io\/sitemap\.xml/);
 assert.match(sitemap,/<loc>https:\/\/everythinginahub\.github\.io\/<\/loc>/);
 for(const path of ['study-planner','revision-tools','student-timetable','everyday-tools','privacy'])assert.match(sitemap,new RegExp(`<loc>https:\\/\\/everythinginahub\\.github\\.io\\/${path}\\/</loc>`));
 assert.doesNotMatch(sitemap,/public\/|status|login|#/i);
 assert.equal(image.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(image.readUInt32BE(16),1200);
 assert.equal(image.readUInt32BE(20),630);
});

test('repository README links directly to the canonical live site',async()=>{
 const readme=await read('../README.md');
 assert.match(readme,/\[Everything Hub\]\(https:\/\/everythinginahub\.github\.io\/\)/);
});
