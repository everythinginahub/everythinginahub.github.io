import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {embeddedGames} from '../public/embedded-games-data.js';
import {libraryView,embedView,embedUrl,mountLibrary} from '../public/embedded-games.js';

test('catalogue has distinct, fixed-host game paths and no missing upstream entry',()=>{
 assert.ok(embeddedGames.length>=90);assert.equal(new Set(embeddedGames.map(g=>g.slug)).size,embeddedGames.length);
 for(const game of embeddedGames){assert.match(game.slug,/^[a-z0-9-]+$/);assert.match(game.path,/^games\/[a-z0-9-]+\/[a-z0-9-]+\/index\.html$/);assert.equal(new URL(embedUrl(game)).origin,'https://sausi-7.github.io');}
 assert.ok(!embeddedGames.some(g=>g.slug==='fruit-merge'));
});
test('library filters without loading third-party games; selected game has a sandbox and fallback',()=>{
 const dom=new JSDOM('<main></main>',{url:'https://example.test'}),root=dom.window.document.querySelector('main');root.innerHTML=libraryView();let controller=mountLibrary(root);assert.equal(root.querySelectorAll('.embed-card').length,embeddedGames.length);assert.equal(root.querySelector('iframe'),null);
 const search=root.querySelector('#embedSearch');search.value='chess';search.dispatchEvent(new dom.window.Event('input'));assert.equal(root.querySelectorAll('.embed-card').length,1);assert.match(root.textContent,/1 game/);
 search.value='';search.dispatchEvent(new dom.window.Event('input'));root.querySelector('[data-embed-filter="board"]').click();assert.ok(root.querySelectorAll('.embed-card').length>0);assert.equal(root.querySelector('[data-embed-filter="board"]').getAttribute('aria-pressed'),'true');assert.equal(root.querySelector('.embed-puzzle'),null);
 search.value='nothing matches this';search.dispatchEvent(new dom.window.Event('input'));assert.match(root.textContent,/No games match/);controller.destroy();
 root.innerHTML=embedView('sudoku');let frame=root.querySelector('iframe');assert.equal(frame.src,'https://sausi-7.github.io/games/games/puzzle/sudoku/index.html');assert.equal(frame.getAttribute('sandbox'),'allow-scripts allow-same-origin');assert.equal(frame.getAttribute('referrerpolicy'),'no-referrer');assert.equal(root.querySelector('[target="_blank"]').rel,'noopener noreferrer');assert.match(root.textContent,/may not work|If the game stays blank/);
 root.innerHTML=embedView('../../evil');assert.equal(root.querySelector('iframe'),null);assert.match(root.textContent,/Game not found/);dom.window.close();
});
