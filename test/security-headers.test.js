import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CSP_APP,CSP_DUNGEON,CSP_PRIVACY,CSP_REPORT_ONLY,CSP_SITE,CSP_STATUS,SECURITY_HEADERS,securityHeadersForRequest} from '../scripts/security-headers.js';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('self-hosted server applies page-specific CSP, report-only and HTTPS-only HSTS',()=>{
  const http=securityHeadersForRequest({url:'/legacy-game.html',headers:{},socket:{encrypted:false}});
  assert.equal(http['X-Content-Type-Options'],'nosniff');
  assert.equal(http['X-Frame-Options'],'DENY');
  assert.equal(http['Referrer-Policy'],'strict-origin-when-cross-origin');
  assert.match(http['Content-Security-Policy'],/object-src 'none'/);
  assert.match(http['Content-Security-Policy'],/base-uri 'self' https:\/\/cdn\.jsdelivr\.net/);
  assert.match(http['Content-Security-Policy'],/frame-ancestors 'none'/);
  assert.equal(http['Content-Security-Policy-Report-Only'],CSP_REPORT_ONLY);
  assert.doesNotMatch(CSP_REPORT_ONLY,/unsafe-inline|unsafe-eval/i);
  for(const policy of [CSP_SITE,CSP_PRIVACY,CSP_STATUS])assert.doesNotMatch(policy,/unsafe-inline|unsafe-eval/i);
  assert.match(CSP_REPORT_ONLY,/script-src 'self'/);
  assert.equal(http['Strict-Transport-Security'],undefined);
  const root=securityHeadersForRequest({url:'/',headers:{},socket:{encrypted:false}});
  assert.equal(root['Content-Security-Policy'],CSP_SITE);
  const app=securityHeadersForRequest({url:'/public/',headers:{},socket:{encrypted:false}});
  assert.equal(app['Content-Security-Policy'],CSP_APP);
  assert.match(CSP_APP,/script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https:\/\/cdn\.jsdelivr\.net/);
  assert.match(CSP_APP,/form-action 'self' https:\/\/www\.youtube\.com https:\/\/www\.bing\.com/,'the app CSP allows the Bing Videos search form and YouTube links');
  assert.match(CSP_APP,/frame-src[^;]*https:\/\/www\.bing\.com/,'the app CSP allows the in-page Bing Videos frame');
  const privacy=securityHeadersForRequest({url:'/privacy/',headers:{},socket:{encrypted:false}});
  assert.equal(privacy['Content-Security-Policy'],CSP_PRIVACY);
  const status=securityHeadersForRequest({url:'/status/',headers:{},socket:{encrypted:false}});
  assert.equal(status['Content-Security-Policy'],CSP_STATUS);
  const embeddedGame=securityHeadersForRequest({url:'/voxelcraft-survival.html?test=1',headers:{},socket:{encrypted:false}});
  assert.equal(embeddedGame['X-Frame-Options'],'SAMEORIGIN');
  assert.match(embeddedGame['Content-Security-Policy'],/frame-ancestors 'self'/);
  assert.match(embeddedGame['Content-Security-Policy-Report-Only'],/frame-ancestors 'self'/);
  const https=securityHeadersForRequest({url:'/',headers:{'x-forwarded-proto':'https'},socket:{encrypted:false}});
  assert.match(https['Strict-Transport-Security'],/max-age=31536000/);
  assert.equal(securityHeadersForRequest({url:'/',headers:{'x-forwarded-proto':'http'},socket:{encrypted:true}})['Strict-Transport-Security'],'max-age=31536000');
  assert.match(SECURITY_HEADERS['Permissions-Policy'],/camera=\(\), microphone=\(\), geolocation=\(\)/);
});

test('interactive CSP permits the Bing Videos search form and in-page result frame',async()=>{
  const [headers,appMarkup,youtube]=await Promise.all([read('../_headers'),read('../public/index.html'),read('../public/youtube-player.js')]);
  const appRules=headers.split(/\n\s*\n/).filter(rule=>rule.startsWith('/public/\n')||rule.startsWith('/public/index.html\n'));
  assert.equal(appRules.length,2);
  for(const rule of appRules){assert.match(rule,/form-action 'self' https:\/\/www\.youtube\.com https:\/\/www\.bing\.com/);const policy=rule.match(/Content-Security-Policy: ([^\n]+)/)?.[1];assert.match(policy,/frame-src[^;]*https:\/\/www\.bing\.com/);}
  assert.match(appMarkup,/form-action 'self' https:\/\/www\.youtube\.com https:\/\/www\.bing\.com/);
  assert.match(appMarkup,/frame-src 'self' https:\/\/www\.youtube-nocookie\.com https:\/\/www\.bing\.com/);
  assert.match(youtube,/action="https:\/\/www\.bing\.com\/videos\/search"/);
  assert.match(youtube,/name="bingVideosFrame"/);
  assert.doesNotMatch(youtube,/action="https:\/\/www\.youtube\.com\/results"/);
  assert.doesNotMatch(CSP_SITE,/form-action 'self' https:/,'the root overview does not need the app’s external form allowance');
});

test('static-host response-header configuration and GitHub Pages meta limits are documented',async()=>{
  const [headers,readme,...pages]=await Promise.all([
    read('../_headers'),read('../README.md'),read('../index.html'),read('../public/index.html'),read('../public/login.html'),read('../public/status.html'),read('../status/index.html'),read('../privacy/index.html')
  ]);
  for(const name of ['Content-Security-Policy','Content-Security-Policy-Report-Only','X-Content-Type-Options','X-Frame-Options','Referrer-Policy','Permissions-Policy','Strict-Transport-Security'])assert.match(headers,new RegExp(`^\\s+${name}:`,'m'));
  assert.match(headers,/\/public\/voxelcraft-survival\.html[\s\S]*?Content-Security-Policy: [^\n]*frame-ancestors 'self'/);
  assert.match(headers,/\/public\/voxelcraft-survival\.html[\s\S]*?Content-Security-Policy-Report-Only: [^\n]*frame-ancestors 'self'/);
  assert.match(headers,/\/public\/voxelcraft-survival\.html[\s\S]*?X-Frame-Options: SAMEORIGIN/);
  assert.match(headers,/\/public\/dungeon-quest-3d\.html[\s\S]*?Content-Security-Policy: [^\n]*frame-ancestors 'self'/);
  assert.match(headers,/\/public\/dungeon-quest-3d\.html[\s\S]*?Content-Security-Policy-Report-Only: [^\n]*frame-ancestors 'self'/);
  assert.match(headers,/\/public\/dungeon-quest-3d\.html[\s\S]*?X-Frame-Options: SAMEORIGIN/);
  const dungeonHeaderCsp=headers.match(/\/public\/dungeon-quest-3d\.html\n\s+Content-Security-Policy: ([^\n]+)/);
  assert.equal(dungeonHeaderCsp?.[1],CSP_DUNGEON,'static hosts use the same enforceable game policy as the self-hosted server');
  const dungeonPage=await read('../public/dungeon-quest-3d.html');
  const dungeonMetaCsp=dungeonPage.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/);
  assert.ok(dungeonMetaCsp,'the standalone page has a fallback CSP for hosts that do not set response headers');
  assert.equal(dungeonMetaCsp[1],CSP_DUNGEON.replace("frame-ancestors 'self'; ",''),'meta CSP mirrors the response policy except for the header-only framing directive');
  assert.match(headers,/^\s+Strict-Transport-Security: max-age=31536000\s*$/m);
  assert.doesNotMatch(headers,/includeSubDomains/i);
  assert.doesNotMatch(headers,/Content-Security-Policy-Report-Only:[^\n]*(?:unsafe-inline|unsafe-eval)/i);
  assert.doesNotMatch(pages[0],/<meta[^>]*http-equiv="refresh"/i,'the root must not recreate the soft redirect');
  assert.match(pages[0],/rel="canonical" href="https:\/\/everythinginahub\.github\.io\/"/);
  assert.match(pages[1],/rel="canonical" href="https:\/\/everythinginahub\.github\.io\/"/);
  assert.match(pages[0],/default-src 'self'; img-src 'self' data: https:\/\/launchorbit\.co https:\/\/www\.betterlaunch\.co https:\/\/www\.codehype\.ai; script-src 'self'/);
  assert.match(pages[1],/img-src 'self' data: blob: https:\/\/launchorbit\.co https:\/\/www\.betterlaunch\.co https:\/\/www\.codehype\.ai/);
  for(const policy of [CSP_SITE,CSP_APP])for(const host of ['https://www.betterlaunch.co','https://www.codehype.ai'])assert.match(policy,new RegExp(host.replaceAll('.','\\.')+'(?:\\s|;)'));
  assert.match(pages[1],/connect-src 'self' https:\/\/tytcagbeucbugwjwgiog\.supabase\.co wss:\/\/tytcagbeucbugwjwgiog\.supabase\.co/);
  assert.match(pages[5],/rel="canonical" href="https:\/\/everythinginahub\.github\.io\/privacy\/"/);
  for(const page of pages)assert.match(page,/Content-Security-Policy/);
  assert.match(pages[1],/name="referrer" content="strict-origin-when-cross-origin"/);
  assert.match(pages[2],/name="referrer" content="no-referrer"/);
  assert.match(readme,/GitHub Pages[^\n]*(?:cannot|does not|ignores)[^\n]*(?:custom|_headers|response)/i);
  assert.match(readme,/meta CSP cannot run in Report-Only mode/i);
});
