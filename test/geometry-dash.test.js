import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {geometryDashView,mountGeometryDash} from '../public/geometry-dash.js';
import {arcadeView} from '../public/arcade.js';

test('Geometry Dash shows the official demo, fallback and no editor',()=>{
 const dom=new JSDOM(`<main>${geometryDashView()}</main>`,{url:'https://example.test'}),root=dom.window.document.querySelector('main'),q=s=>root.querySelector(s);
 assert.equal(q('h1').textContent,'Geometry Dash');assert.equal(q('#geometryFrame').src,'https://www.geometrydash.com/');assert.ok(q('#geometryFrame').getAttribute('sandbox').includes('allow-scripts'));assert.ok(q('a[target="_blank"][href="https://www.geometrydash.com/"]'));assert.match(q('.geometry-note').textContent,/Play Level 1/);assert.doesNotMatch(root.textContent,/level maker|level editor/i);assert.equal(q('#makerGrid'),null);
 const ctl=mountGeometryDash(root);q('#geometryReload').click();assert.match(q('#geometryStatus').textContent,/Reloading/);q('#geometryFullscreen').click();assert.match(q('#geometryStatus').textContent,/not available/);ctl.destroy();assert.equal(q('#geometryFrame'),null);dom.window.close();
});
test('Games links to Geometry Dash and old designer links still work',()=>{
 assert.match(arcadeView(),/#arcade\/geometry-dash/);assert.doesNotMatch(arcadeView(),/Level maker/);assert.match(arcadeView('designer'),/Geometry Dash/);assert.equal(arcadeView('designer'),arcadeView('geometry-dash'));
});
