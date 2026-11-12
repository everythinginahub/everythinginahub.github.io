import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const canonical='https://everythinginahub.github.io/public/';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('public entry page has accurate search, canonical and social metadata',async()=>{
 const [html,root,login,status]=await Promise.all([read('../public/index.html'),read('../index.html'),read('../public/login.html'),read('../public/status.html')]);
 const doc=new JSDOM(html).window.document,rootDoc=new JSDOM(root).window.document,loginDoc=new JSDOM(login).window.document,statusDoc=new JSDOM(status).window.document;
 assert.match(doc.title,/Study Planner, Flashcards & Everyday Tools/);
 assert.match(doc.querySelector('meta[name="description"]').content,/study planner and revision hub/i);
 assert.equal(doc.querySelector('link[rel="canonical"]').href,canonical);
 assert.equal(doc.querySelector('meta[property="og:url"]').content,canonical);
 assert.equal(doc.querySelector('meta[property="og:type"]').content,'website');
 assert.equal(doc.querySelector('meta[property="og:image"]').content,'https://everythinginahub.github.io/public/social-preview.png');
 assert.equal(doc.querySelector('meta[name="twitter:card"]').content,'summary_large_image');
 assert.equal(rootDoc.querySelector('link[rel="canonical"]').href,canonical);
 assert.equal(rootDoc.querySelector('meta[property="og:image"]').content,doc.querySelector('meta[property="og:image"]').content);
 assert.equal(loginDoc.querySelector('meta[name="robots"]').content,'noindex,nofollow');
 assert.equal(statusDoc.querySelector('meta[name="robots"]').content,'noindex,nofollow');
 assert.match(doc.querySelector('h1').innerHTML,/Study, plan<br>and make room for life/);
 assert.match(doc.querySelector('.entry-index').textContent,/Flashcards, quizzes & books/);
 assert.match(doc.querySelector('.entry-note').textContent,/daily puzzle is optional and untimed/i);
 assert.match(doc.querySelector('.entry-note').textContent,/at your pace/i);
 const structured=JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent);
 assert.equal(structured['@type'],'WebApplication');
 assert.equal(structured.url,canonical);
 assert.ok(structured.featureList.includes('Flashcards, quizzes and practice tests'));
});

test('robots and sitemap advertise only the public landing page and social image is a valid 1200 by 630 PNG',async()=>{
 const [robots,sitemap,image]=await Promise.all([read('../robots.txt'),read('../sitemap.xml'),readFile(new URL('../public/social-preview.png',import.meta.url))]);
 assert.match(robots,/^User-agent: \*\s+Allow: \/\s+/);
 assert.match(robots,/Sitemap: https:\/\/everythinginahub\.github\.io\/sitemap\.xml/);
 assert.match(sitemap,/<loc>https:\/\/everythinginahub\.github\.io\/public\/<\/loc>/);
 assert.doesNotMatch(sitemap,/status|login|#/i);
 assert.equal(image.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(image.readUInt32BE(16),1200);
 assert.equal(image.readUInt32BE(20),630);
});
