import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {cleanLevel,starterLevel,createRun,jump,stepRun,FLOOR,PLAYER} from '../public/level-engine.js';
import {designerView,mountDesigner} from '../public/level-designer.js';

const blank=()=>({name:'Test',length:40,speed:'normal',theme:'dusk',cells:[]});
const advance=(run,limit=1000)=>{for(let i=0;i<limit&&run.status==='running';i++)stepRun(run,.025);};
test('level validation bounds coordinates, tile types and duplicate cells',()=>{
 const result=cleanLevel({...blank(),cells:[{x:4,y:0,type:'spike'},{x:4,y:0,type:'block'},{x:1,y:0,type:'spike'},{x:39,y:0,type:'pad'},{x:3,y:6,type:'coin'},{x:3,y:1,type:'javascript'}]});assert.deepEqual(result.cells,[{x:4,y:0,type:'spike'}]);assert.equal(cleanLevel({...blank(),length:999}),null);assert.equal(cleanLevel(null),null);assert.ok(cleanLevel(starterLevel()));
});
test('playtest wins an empty course, crashes on spikes and blocks, and can jump over them',()=>{
 const empty=createRun(blank());empty.status='running';advance(empty);assert.equal(empty.status,'won');
 for(const type of ['spike','block']){const run=createRun({...blank(),cells:[{x:5,y:0,type}]});run.status='running';advance(run);assert.equal(run.status,'lost');}
 const run=createRun({...blank(),cells:[{x:5,y:0,type:'spike'}]});run.status='running';while(run.x<170)stepRun(run,.01);assert.equal(jump(run),true);assert.equal(jump(run),false);advance(run);assert.equal(run.status,'won');
});
test('pads launch, blocks can be landed on, and coins collect only once',()=>{
 const pad=createRun({...blank(),cells:[{x:4,y:0,type:'pad'}]});pad.status='running';for(let i=0;i<100&&pad.vy>=0;i++)stepRun(pad,.01);assert.ok(pad.vy<0);assert.ok(pad.y<=FLOOR-PLAYER);
 const coin=createRun({...blank(),cells:[{x:4,y:0,type:'coin'}]});coin.status='running';advance(coin);assert.equal(coin.status,'won');assert.equal(coin.coins,1);assert.equal(coin.collected.size,1);
 const block=createRun({...blank(),cells:[{x:5,y:0,type:'block'}]});block.status='running';while(block.x<120)stepRun(block,.01);jump(block);let landed=false;for(let i=0;i<150&&block.status==='running';i++){stepRun(block,.01);if(block.grounded&&Math.abs(block.y-(FLOOR-48-PLAYER))<1){landed=true;break;}}assert.equal(landed,true);
});
test('editor places, erases, undoes, saves and reloads without overwriting other progress',()=>{
 const dom=new JSDOM(`<main>${designerView()}</main>`,{url:'https://example.test'}),w=dom.window,root=w.document.querySelector('main'),state={tasks:[{title:'keep'}],designerLevels:[]},snapshots=[];w.confirm=()=>true;w.HTMLCanvasElement.prototype.getContext=()=>null;w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};let controller=mountDesigner({root,state,userId:'one',save:()=>snapshots.push(structuredClone(state)),toast:()=>{},win:w});const q=s=>root.querySelector(s);
 assert.equal(q('[data-x="0"][data-y="0"]').disabled,true);q('[data-x="4"][data-y="0"]').click();assert.match(q('[data-x="4"][data-y="0"]').className,/spike/);q('#makerUndo').click();assert.doesNotMatch(q('[data-x="4"][data-y="0"]').className,/spike/);q('[data-maker-tool="block"]').click();q('[data-x="4"][data-y="0"]').click();q('#makerName').value='A <course>';q('#makerName').dispatchEvent(new w.Event('input',{bubbles:true}));q('#makerSave').click();assert.equal(state.designerLevels.length,1);assert.equal(state.designerLevels[0].level.name,'A <course>');assert.deepEqual(snapshots.at(-1).tasks,[{title:'keep'}]);assert.equal(q('#makerSaved option[value]').textContent,'Select a saved level');assert.equal(root.querySelector('#makerSaved course'),null);
 q('[data-maker-tool="erase"]').click();q('[data-x="4"][data-y="0"]').click();assert.doesNotMatch(q('[data-x="4"][data-y="0"]').className,/block/);q('#makerSave').click();assert.equal(state.designerLevels.length,1);assert.ok(!state.designerLevels[0].level.cells.some(c=>c.x===4&&c.y===0));controller.destroy();root.innerHTML=designerView();controller=mountDesigner({root,state,userId:'one',save:()=>{},toast:()=>{},win:w});assert.equal(q('#makerName').value,'A <course>');assert.equal(q('#makerSaved').value,state.designerLevels[0].id);q('#makerPlay').click();assert.equal(q('#makerPlayPanel').hidden,false);q('#makerStart').click();assert.equal(q('#makerOverlay').hidden,true);q('#makerPause').click();assert.match(q('#makerOverlayTitle').textContent,/Paused/);q('#makerClosePlay').click();assert.equal(q('#makerPlayPanel').hidden,true);controller.destroy();dom.window.close();
});
test('shortening a level is confirmable and undo restores removed tiles',()=>{
 const dom=new JSDOM(`<main>${designerView()}</main>`,{url:'https://example.test'}),w=dom.window,root=w.document.querySelector('main'),state={};w.confirm=()=>false;const ctl=mountDesigner({root,state,userId:'two',save:()=>{},toast:()=>{},win:w}),q=s=>root.querySelector(s);q('#makerLength').value='40';q('#makerLength').dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(q('#makerLength').value,'64');w.confirm=()=>true;q('#makerLength').value='40';q('#makerLength').dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(q('[data-x="54"][data-y="0"]'),null);q('#makerUndo').click();assert.ok(q('[data-x="54"][data-y="0"].spike'));ctl.destroy();dom.window.close();
});

test('the starter course is finishable with well-timed jumps',()=>{
 const run=createRun(starterLevel());run.status='running';for(let i=0;i<4000&&run.status==='running';i++){const nearest=run.level.cells.filter(cell=>['spike','block'].includes(cell.type)&&cell.y===0).map(cell=>cell.x*48-run.x).filter(distance=>distance>0).sort((a,b)=>a-b)[0];if(run.grounded&&nearest<60&&nearest>30)jump(run);stepRun(run,.01);}assert.equal(run.status,'won');
});

test('oversized account progress is not overwritten when saving a level',()=>{
 const dom=new JSDOM(`<main>${designerView()}</main>`,{url:'https://example.test'}),w=dom.window,root=w.document.querySelector('main'),state={important:'x'.repeat(91000)};let saves=0;const ctl=mountDesigner({root,state,userId:'full',save:()=>saves++,toast:()=>{},win:w});root.querySelector('#makerSave').click();assert.equal(saves,0);assert.equal(state.designerLevels,undefined);assert.equal(state.important.length,91000);assert.match(root.querySelector('#makerStatus').textContent,/Not enough account progress space/);assert.ok(w.localStorage.getItem('everything-level-draft-full'));ctl.destroy();dom.window.close();
});

test('external game is opt-in, separate from the editor, and stops when playtesting',()=>{
 const dom=new JSDOM(`<main>${designerView()}</main>`,{url:'https://example.test'}),w=dom.window,root=w.document.querySelector('main');w.HTMLCanvasElement.prototype.getContext=()=>null;w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};
 const ctl=mountDesigner({root,state:{},userId:'embed',save:()=>{},toast:()=>{},win:w}),q=s=>root.querySelector(s);
 assert.equal(q('#dashFrame'),null);assert.ok(q('#dashGameTitle').compareDocumentPosition(q('#makerGrid')) & w.Node.DOCUMENT_POSITION_FOLLOWING);assert.match(q('.dash-separation').textContent,/cannot be imported/);
 q('#dashLoad').click();const frame=q('#dashFrame');assert.equal(frame.src,'https://arcadino.com/game/geometry-dash-lite/embed/');assert.equal(frame.getAttribute('referrerpolicy'),'no-referrer');assert.ok(frame.getAttribute('sandbox').includes('allow-scripts'));assert.equal(q('#dashPlaceholder').hidden,true);
 q('#makerPlay').click();assert.equal(q('#dashFrame'),null);assert.equal(q('#dashPlaceholder').hidden,false);assert.equal(q('#makerPlayPanel').hidden,false);assert.match(q('#dashStatus').textContent,/stopped/);
 q('#makerStart').click();q('#dashLoad').click();assert.match(q('#makerOverlayTitle').textContent,/Paused/);q('#dashStop').click();assert.equal(q('#dashFrame'),null);assert.equal(q('#dashStop').hidden,true);ctl.destroy();w.close();
});

test('enhanced playtest renderer handles each theme and object without changing the level',async()=>{
 const {drawLevel}=await import('../public/level-render.js');const calls=[];const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})}, {get(target,key){return key in target?target[key]:(...args)=>calls.push([key,...args]);},set(target,key,val){target[key]=val;return true;}});
 for(const theme of ['dusk','ocean','sunset']){const level={...blank(),theme,cells:['block','spike','pad','coin'].map((type,i)=>({x:i+4,y:0,type}))};const run=createRun(level),before=JSON.stringify(run.level);drawLevel(ctx,run,640,360,{reducedMotion:true});assert.equal(JSON.stringify(run.level),before);}
 assert.ok(calls.some(c=>c[0]==='arc'));assert.ok(calls.some(c=>c[0]==='fillText'));
});
