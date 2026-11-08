import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {featuredGames,featuredCards,spotlightView,mountSpotlight} from '../public/featured-games.js';
import {arcadeView,mountArcade} from '../public/arcade.js';

test('featured titles use local files, genuine image assets and sandboxed playable routes',async()=>{
 assert.equal(featuredGames.length,3);assert.equal(new Set(featuredGames.map(g=>g.slug)).size,3);
 for(const game of featuredGames){const html=await readFile(`public/${game.path}`,'utf8');assert.match(html,/<html/i);const image=await readFile(`public/assets/game-screenshots/${game.image}`);assert.equal(image.subarray(0,8).toString('hex'),'89504e470d0a1a0a');const dom=new JSDOM(`<main>${arcadeView('spotlight',game.slug)}</main>`,{url:'https://example.test/public/'});const root=dom.window.document.querySelector('main'),frame=root.querySelector('iframe');assert.equal(frame.getAttribute('src'),game.path);assert.equal(frame.getAttribute('sandbox'),'allow-scripts allow-pointer-lock');assert.match(root.textContent,/Controls/);assert.ok(root.querySelector('a[target="_blank"]'));const controller=mountArcade({root,id:'spotlight',view:game.slug,win:dom.window});root.querySelector('#spotlightReload').click();assert.match(root.querySelector('#spotlightStatus').textContent,/restarted/);controller.destroy();assert.equal(root.querySelector('iframe'),null);dom.window.close();}
 assert.doesNotMatch(spotlightView('../../etc/passwd'),/<iframe/);assert.match(featuredCards(),/Radius Raid/);
});

test('fallbacks preserve local game usability in an opaque sandbox',async()=>{
 const storage=await readFile('public/games/radius-raid/js/storage.js','utf8'),audio=await readFile('public/games/radius-raid/js/audio.js','utf8'),racer=await readFile('public/games/pseudo-racer/common.js','utf8'),racePage=await readFile('public/games/pseudo-racer/v4.final.html','utf8'),maze=await readFile('public/games/cant-get-back/index.html','utf8');
 assert.match(storage,/catch/);assert.match(audio,/html5: true/);assert.match(racer,/catch/);assert.match(racePage,/data-drive="38"/);assert.match(maze,/started = 1/);
});
