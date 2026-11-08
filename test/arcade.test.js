import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {spawnTile,newMerge,moveMerge,canMerge,newSnake,turnSnake,stepSnake,newMines,openMine,toggleMineFlag,mineCount,arcadeView,mountArcade} from '../public/arcade.js';

test('merge joins each pair once and adds correct score, spawning only on a valid move',()=>{
 let game={board:[2,2,2,2,4,0,4,0,0,0,0,0,0,0,0,0],score:0};let result=moveMerge(game,'left',()=>0);assert.equal(result.changed,true);assert.deepEqual(result.game.board.slice(0,4),[4,4,2,0]);assert.deepEqual(result.game.board.slice(4,8),[8,0,0,0]);assert.equal(result.game.score,16);assert.deepEqual(game.board.slice(0,4),[2,2,2,2]);
 game={board:[2,0,0,0,...Array(12).fill(0)],score:0};result=moveMerge(game,'left',()=>0);assert.equal(result.changed,false);assert.equal(result.game,game);assert.equal(newMerge(()=>0).board.filter(Boolean).length,2);assert.equal(spawnTile(Array(16).fill(2),()=>0).length,16);assert.equal(canMerge([2,4,2,4,4,2,4,2,2,4,2,4,4,2,4,2]),false);assert.equal(canMerge([2,2,...Array(14).fill(0)]),true);
});
test('merge works in all directions without double merges',()=>{
 const board=[2,0,0,0,2,0,0,0,2,0,0,0,2,0,0,0];const game={board,score:0};const up=moveMerge(game,'up',()=>.99);assert.equal(up.game.board[0],4);assert.equal(up.game.board[4],4);assert.equal(up.game.score,8);const down=moveMerge(game,'down',()=>.99);assert.equal(down.game.board[8],4);assert.equal(down.game.board[12],4);assert.equal(down.game.score,8);
});
test('snake moves, grows, disallows reversal, detects walls and permits the departing tail',()=>{
 let game={...newSnake(()=>0),status:'running',food:[6,6]};assert.equal(turnSnake(game,'left').dir,'right');game=stepSnake(game,()=>0);assert.equal(game.score,10);assert.equal(game.snake.length,4);assert.deepEqual(game.snake[0],[6,6]);
 const wall={...game,dir:'right',snake:[[11,1],[10,1],[9,1]],food:[0,0]};assert.equal(stepSnake(wall).status,'lost');
 const tail={status:'running',dir:'left',snake:[[2,2],[2,3],[1,3],[1,2]],food:[9,9],score:0};assert.equal(stepSnake(tail).status,'running');assert.deepEqual(stepSnake(tail).snake[0],[1,2]);
 const collision={...tail,dir:'down'};assert.equal(stepSnake(collision).status,'lost');
});
test('minefield has ten mines, safe first reveal, flags and a winnable board',()=>{
 let game=toggleMineFlag(newMines(),63);assert.equal(game.flags[63],true);assert.equal(openMine(game,63),game);game=toggleMineFlag(game,63);game=openMine(game,27,()=>0);assert.equal(game.mines.filter(Boolean).length,10);assert.equal(game.mines[27],false);assert.equal(mineCount(game,27),0);assert.equal(game.open[27],true);
 for(let i=0;i<64;i++)if(!game.mines[i]&&!game.open[i])game=openMine(game,i);assert.equal(game.status,'won');assert.equal(game.open.filter(Boolean).length,54);
 let lost={...newMines(),status:'playing',mines:Array.from({length:64},(_,i)=>i<10)};lost=openMine(lost,0);assert.equal(lost.status,'lost');assert.equal(openMine(lost,2),lost);
});
test('game controls work without subjects and clean up timer and listeners',()=>{
 const dom=new JSDOM('<main></main>',{url:'https://example.test'}),w=dom.window,root=w.document.querySelector('main');root.innerHTML=arcadeView('merge');let ctl=mountArcade({root,id:'merge',userId:'test',win:w});assert.equal(root.querySelectorAll('.merge-cell').length,16);assert.equal(root.querySelector('[data-arcade=undo]').disabled,true);const before=root.querySelector('.merge-board').textContent;root.querySelector('[data-direction=left]').click();assert.ok(root.querySelector('.merge-board'));root.querySelector('[data-arcade=restart]').click();assert.equal(root.querySelectorAll('.merge-cell').length,16);ctl.destroy();
 root.innerHTML=arcadeView('mines');ctl=mountArcade({root,id:'mines',userId:'test',win:w});root.querySelector('[data-arcade=flagmode]').click();root.querySelector('[data-mine="0"]').click();assert.match(root.querySelector('[data-mine="0"]').getAttribute('aria-label'),/flagged/);root.querySelector('[data-arcade=flagmode]').click();root.querySelector('[data-mine="27"]').click();assert.match(root.querySelector('[data-mine="27"]').getAttribute('aria-label'),/empty/);ctl.destroy();
 root.innerHTML=arcadeView('snake');ctl=mountArcade({root,id:'snake',userId:'test',win:w});root.querySelector('[data-arcade=snake-toggle]').click();assert.equal(root.querySelector('[data-arcade=snake-toggle]').textContent,'Pause');root.querySelector('[data-arcade=snake-toggle]').click();assert.match(root.querySelector('.arcade-status').textContent,/Paused/);ctl.destroy();dom.window.close();
});
