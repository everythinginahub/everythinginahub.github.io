import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deviceSaveKey,readDeviceSave,writeDeviceSave} from '../public/device-saves.js';
import {restoreObbyProgress} from '../public/blockbound-engine.js';
test('device saves are bounded, versioned and account scoped',()=>{
 const map=new Map(),storage={getItem:key=>map.get(key),setItem:(key,value)=>map.set(key,value)};
 const key=deviceSaveKey('chat','one');assert.notEqual(key,deviceSaveKey('chat','two'));
 assert.equal(writeDeviceSave(storage,key,{value:5}),true);assert.deepEqual(readDeviceSave(storage,key),{value:5});assert.equal(writeDeviceSave(storage,key,'x'.repeat(100),20),false);assert.deepEqual(readDeviceSave(storage,key),{value:5});
 storage.setItem(key,'broken');assert.equal(readDeviceSave(storage,key),null);assert.equal(writeDeviceSave(null,key,{}),false);
});
test('Skypark checkpoint restores stars, falls and time without trusting coordinates',()=>{
 const game=restoreObbyProgress({checkpoint:2,stars:['obby-star-0','fake','obby-star-0'],elapsed:30,falls:3,x:Infinity},{playerId:'new-user'});
 assert.equal(game.status,'paused');assert.equal(game.checkpoint,2);assert.deepEqual(game.stars,['obby-star-0']);assert.equal(game.crystals.length,4);assert.equal(game.elapsed,30);assert.equal(game.falls,3);assert.ok(Number.isFinite(game.players['new-user'].x));assert.equal(restoreObbyProgress({checkpoint:100,elapsed:1}),null);
});
