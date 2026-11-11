import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SECURITY_HEADERS,securityHeadersForRequest} from '../scripts/security-headers.js';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('self-hosted server emits baseline security headers and HTTPS-only HSTS',()=>{
  const http=securityHeadersForRequest({headers:{},socket:{encrypted:false}});
  assert.equal(http['X-Content-Type-Options'],'nosniff');
  assert.equal(http['X-Frame-Options'],'DENY');
  assert.equal(http['Referrer-Policy'],'strict-origin-when-cross-origin');
  assert.match(http['Content-Security-Policy'],/object-src 'none'/);
  assert.match(http['Content-Security-Policy'],/base-uri 'self' https:\/\/cdn\.jsdelivr\.net/);
  assert.match(http['Content-Security-Policy'],/frame-ancestors 'none'/);
  assert.equal(http['Strict-Transport-Security'],undefined);
  const https=securityHeadersForRequest({headers:{'x-forwarded-proto':'https'},socket:{encrypted:false}});
  assert.match(https['Strict-Transport-Security'],/max-age=31536000/);
  assert.equal(securityHeadersForRequest({headers:{'x-forwarded-proto':'http'},socket:{encrypted:true}})['Strict-Transport-Security'],'max-age=31536000');
  assert.match(SECURITY_HEADERS['Permissions-Policy'],/camera=\(\), microphone=\(\), geolocation=\(\)/);
});

test('static-host response-header configuration and GitHub Pages meta fallbacks are documented in source',async()=>{
  const [headers,readme,...pages]=await Promise.all([
    read('../_headers'),read('../README.md'),read('../index.html'),read('../public/index.html'),read('../public/login.html'),read('../public/status.html'),read('../status/index.html')
  ]);
  for(const name of ['Content-Security-Policy','X-Content-Type-Options','X-Frame-Options','Referrer-Policy','Permissions-Policy','Strict-Transport-Security'])assert.match(headers,new RegExp(`^\\s+${name}:`,'m'));
  assert.match(headers,/^\s+Strict-Transport-Security: max-age=31536000\s*$/m);
  assert.doesNotMatch(headers,/includeSubDomains/i);
  assert.match(pages[0],/url=public\/\?v=20261106-8/,'the root redirect cache-busts the entry page');
  for(const page of pages)assert.match(page,/Content-Security-Policy/);
  assert.match(pages[1],/name="referrer" content="strict-origin-when-cross-origin"/);
  assert.match(pages[4],/name="referrer" content="no-referrer"/);
  assert.match(readme,/GitHub Pages[^\n]*(?:cannot|does not|ignores)[^\n]*(?:custom|_headers|response)/i);
});
