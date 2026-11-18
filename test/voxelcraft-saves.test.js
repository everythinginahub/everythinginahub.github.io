import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../public/voxelcraft-survival.html',import.meta.url),'utf8');
const fn=(name,next)=>html.slice(html.indexOf(`        function ${name}(`),html.indexOf(`        function ${next}(`));
test('VoxelCraft records placement and mining edits per dimension and reapplies on regeneration',()=>{
 const context=vm.createContext({});
 vm.runInContext(`const CHUNK_SIZE=16,CHUNK_HEIGHT=64,chunks=new Map(),worldEdits=new Map();let currentDimension='overworld';
 function generateChunkBase(cx,cz){if(!chunks.has(chunkKey(cx,cz)))chunks.set(chunkKey(cx,cz),{data:new Uint8Array(16*64*16)});}
 function markChunkDirty(){}
 ${fn('chunkKey','getTerrainHeight')}
 ${fn('getBlockIndex','generateChunkBase')}
 ${fn('generateChunkData','getRawBlock')}
 ${fn('setBlockAt','markChunkDirty')}
 setBlockAt(-1,20,2,7);setBlockAt(-1,21,2,0);currentDimension='nether';setBlockAt(-1,20,2,8);
 currentDimension='overworld';chunks.clear();generateChunkData(-1,0);
 globalThis.placed=chunks.get('overworld:-1,0').data[getBlockIndex(15,20,2)];
 globalThis.mined=worldEdits.get('overworld:-1,0').get(getBlockIndex(15,21,2));
 globalThis.nether=worldEdits.get('nether:-1,0').get(getBlockIndex(15,20,2));`,context);
 assert.equal(context.placed,7);assert.equal(context.mined,0);assert.equal(context.nether,8);
});
test('VoxelCraft saves seed, edits, inventory, position and world clock without scene objects',()=>{
 const map=new Map(),context=vm.createContext({window:{gameDeviceStorage:{getItem:key=>map.get(key),setItem:(key,value)=>map.set(key,value)}},showToast:()=>{}});
 const code=html.slice(html.indexOf('        function readWorldSave()'),html.indexOf('        function restoreWorldPlayer('));
 vm.runInContext(`const worldSaveKey='test',gameRunning=true,noise={seed:42},gameMode='survival',currentDimension='end',player={x:150,y:40,z:-220,hotbar:[{id:7,count:12}]},worldTime=.6,dayCount=4,furnaceState={},craftingGrid=[],cursorItem=null,worldEdits=new Map([['end:9,-14',new Map([[4,7]])]]);${code}saveWorldProgress();globalThis.saved=readWorldSave();`,context);
 assert.equal(context.saved.seed,42);assert.equal(context.saved.player.x,150);assert.equal(context.saved.player.hotbar[0].count,12);assert.equal(context.saved.dayCount,4);assert.equal(context.saved.edits[0][0],'end:9,-14');
 const start=html.slice(html.indexOf('        function startGame()'),html.indexOf('        function animate('));
 assert.ok(start.indexOf('restoreWorldPlayer(saved)')<start.indexOf('const pcx ='),'restore position before generating surrounding chunks');
 assert.doesNotMatch(fn('switchDimension','findSafeSpawnY'),/if\(saved\)/,'dimension travel must not depend on startGame locals');
});
