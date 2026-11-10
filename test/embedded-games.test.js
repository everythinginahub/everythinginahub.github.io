import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFile} from 'node:fs/promises';
import {embeddedGames} from '../public/embedded-games-data.js';
import {libraryView,embedView,embedUrl,mountLibrary} from '../public/embedded-games.js';
import {arcadeView} from '../public/arcade.js';
import {gameChooser} from '../public/game-views.js';
import {liveHub} from '../public/live-games.js';

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


test('featured games use real local screenshots while older games remain text cards',async()=>{
 const dom=new JSDOM('<main></main>',{url:'https://example.test'}),root=dom.window.document.querySelector('main');root.innerHTML=libraryView();const controller=mountLibrary(root);
 const old=[...root.querySelectorAll('.embed-card')];assert.equal(old.length,embeddedGames.length);assert.ok(old.every(card=>!card.querySelector('img')));
 const cards=[...root.querySelectorAll('.featured-card')];assert.equal(cards.length,3);for(const card of cards){const img=card.querySelector('img');assert.match(img.getAttribute('src'),/^assets\/game-screenshots\/[a-z-]+\.png$/);assert.equal(img.getAttribute('loading'),'lazy');const file=await readFile('public/'+img.getAttribute('src'));assert.equal(file.subarray(0,8).toString('hex'),'89504e470d0a1a0a');}
 controller.destroy();dom.window.close();
});

test('original adventures are hidden from Games home; study/live modes use icons',async()=>{
 const originals=arcadeView(),study=gameChooser({id:'test',subject:'Subject',title:'Set'},3),live=liveHub([]);
 for(const slug of ['skyline','orbit','reef']){assert.doesNotMatch(originals,new RegExp(`assets/game-screenshots/${slug}\\.png`));const file=await readFile(`public/assets/game-screenshots/${slug}.png`);assert.equal(file.subarray(0,8).toString('hex'),'89504e470d0a1a0a');}
 assert.doesNotMatch(study,/assets\/game-thumbnails/);assert.doesNotMatch(live,/assets\/game-thumbnails/);assert.match(study,/study-game-icon/);assert.match(live,/live-mode-icon/);
});
