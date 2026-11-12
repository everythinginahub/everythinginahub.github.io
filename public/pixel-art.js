const BASE_COLOUR='#ffffff';
const PALETTE=['#202447','#6254dd','#27bfb9','#f28b5b','#f0bf4b','#5388de','#d45279','#ffffff'];
const HEX=/^#[0-9a-f]{6}$/i;
const DEFAULT_SIZE=16;
export const PIXEL_GRID_SIZES=Object.freeze([8,12,16,24,32]);

function accountId(value='guest') {return String(value||'guest').replace(/[^\da-z_-]/gi,'').slice(0,100)||'guest';}
export function pixelArtKey(userId='guest') {return `everything-hub-pixel-art-v1-${accountId(userId)}`;}
export function makePixelGrid(size=DEFAULT_SIZE,colour=BASE_COLOUR) {
  if(!Number.isInteger(size)||size<4||size>32||!HEX.test(colour))throw new Error('Choose a supported grid size and colour.');
  return Array(size*size).fill(colour.toUpperCase());
}
export function pixelSvg(grid,size=DEFAULT_SIZE) {
  if(!Number.isInteger(size)||size<4||size>32||!Array.isArray(grid)||grid.length!==size*size||grid.some(colour=>typeof colour!=='string'||!HEX.test(colour)))throw new Error('The artwork is not valid.');
  const pixels=grid.map((colour,index)=>`<rect x="${index%size}" y="${Math.floor(index/size)}" width="1" height="1" fill="${colour.toUpperCase()}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size*24}" height="${size*24}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#ffffff"/>${pixels}</svg>`;
}
function isValidGrid(value) {return value&&Number.isInteger(value.size)&&value.size>=4&&value.size<=32&&Array.isArray(value.pixels)&&value.pixels.length===value.size*value.size&&value.pixels.every(colour=>typeof colour==='string'&&HEX.test(colour));}
function resizePixels(pixels,fromSize,toSize) {
  return Array.from({length:toSize*toSize},(_,index)=>{
    const row=Math.floor(index/toSize),column=index%toSize;
    const sourceRow=Math.round(row*(fromSize-1)/(toSize-1)),sourceColumn=Math.round(column*(fromSize-1)/(toSize-1));
    return pixels[sourceRow*fromSize+sourceColumn];
  });
}

export function mountPixelArt({root,win=window,userId='guest'}) {
  const $=selector=>root.querySelector(selector),board=$('#pixelBoard'),colourInput=$('#pixelColour'),sizeInput=$('#pixelSize');
  const key=pixelArtKey(userId);let storage=null;
  try{storage=win.localStorage;}catch{}
  let size=PIXEL_GRID_SIZES.includes(Number(sizeInput.value))?Number(sizeInput.value):DEFAULT_SIZE;
  let pixels=makePixelGrid(size),activeColour=colourInput.value.toUpperCase(),cursor=0,undoStack=[],redoStack=[];
  try{
    const saved=JSON.parse(storage.getItem(key)||'null');
    if(isValidGrid(saved)&&PIXEL_GRID_SIZES.includes(saved.size)){size=saved.size;pixels=saved.pixels.map(colour=>colour.toUpperCase());}
  }catch{}
  sizeInput.value=String(size);

  function snapshot(){return {size,pixels:pixels.slice(),cursor};}
  function render() {
    sizeInput.value=String(size);board.style.setProperty('--pixel-grid-size',String(size));board.setAttribute('aria-label',`${size} by ${size} pixel-art canvas`);board.replaceChildren();
    for(let row=0;row<size;row++){
      const rowNode=win.document.createElement('div');rowNode.setAttribute('role','row');
      for(let column=0;column<size;column++){
        const index=row*size+column,cell=win.document.createElement('button');
        cell.type='button';cell.className='pixel-cell';cell.dataset.pixelIndex=String(index);cell.setAttribute('role','gridcell');
        cell.setAttribute('aria-label',`Row ${row+1}, column ${column+1}, ${pixels[index]}`);cell.setAttribute('aria-selected',String(index===cursor));
        cell.tabIndex=index===cursor?0:-1;cell.style.backgroundColor=pixels[index];rowNode.append(cell);
      }
      board.append(rowNode);
    }
    $('#pixelUndo').disabled=!undoStack.length;$('#pixelRedo').disabled=!redoStack.length;
    $('#pixelStatus').textContent=`${size} by ${size} canvas · ${undoStack.length?`${undoStack.length} ${undoStack.length===1?'change':'changes'} to undo`:'Ready to create'}`;
  }
  function persist() {
    try{storage.setItem(key,JSON.stringify({size,pixels}));$('#pixelSaveNote').textContent='Artwork saved on this device.';return true;}
    catch{$('#pixelSaveNote').textContent='Could not save in this browser. Download your artwork to keep it.';return false;}
  }
  function pushUndo(){undoStack.push(snapshot());if(undoStack.length>40)undoStack.shift();redoStack=[];}
  function restore(saved){size=saved.size;pixels=saved.pixels.slice();cursor=Math.max(0,Math.min(saved.cursor,pixels.length-1));render();persist();}
  function commit(next) {
    if(next.length!==size*size||next.every((colour,index)=>colour===pixels[index]))return;
    pushUndo();pixels=next;render();persist();
  }
  function paint(index,colour=activeColour) {
    if(!Number.isInteger(index)||index<0||index>=pixels.length||!HEX.test(colour))return;
    const next=pixels.slice();next[index]=colour.toUpperCase();commit(next);
  }
  function undo() {if(!undoStack.length)return;redoStack.push(snapshot());restore(undoStack.pop());}
  function redo() {if(!redoStack.length)return;undoStack.push(snapshot());restore(redoStack.pop());}
  function clear() {commit(makePixelGrid(size));}
  function resize(newSize) {
    if(!PIXEL_GRID_SIZES.includes(newSize)||newSize===size){sizeInput.value=String(size);return;}
    pushUndo();
    const oldSize=size,oldRow=Math.floor(cursor/oldSize),oldColumn=cursor%oldSize;
    pixels=resizePixels(pixels,oldSize,newSize);size=newSize;
    const row=Math.round(oldRow*(newSize-1)/(oldSize-1)),column=Math.round(oldColumn*(newSize-1)/(oldSize-1));cursor=row*newSize+column;
    render();persist();
  }
  function preset(kind) {
    const next=makePixelGrid(size);
    if(kind==='checker')for(let row=0;row<size;row++)for(let column=0;column<size;column++)if((row+column)%2===0)next[row*size+column]=activeColour;
    if(kind==='smile'){
      const dark='#202447',gold='#f0bf4b',scale=value=>Math.round(value*(size-1)/15),start=scale(3),end=scale(12);
      for(let row=start;row<=end;row++)for(let column=start;column<=end;column++)next[row*size+column]=gold;
      [[5,5],[5,10],[10,5],[10,6],[10,7],[10,8],[10,9],[10,10]].forEach(([row,column])=>next[scale(row)*size+scale(column)]=dark);
    }
    commit(next);
  }
  function onClick(event) {
    const cell=event.target.closest('[data-pixel-index]');
    if(cell){cursor=Number(cell.dataset.pixelIndex);paint(cursor);render();board.querySelector(`[data-pixel-index="${cursor}"]`).focus();return;}
    const swatch=event.target.closest('[data-pixel-colour]');
    if(swatch){activeColour=swatch.dataset.pixelColour;colourInput.value=activeColour;updatePalette();return;}
    const button=event.target.closest('button');if(!button)return;
    if(button.id==='pixelUndo')undo();else if(button.id==='pixelRedo')redo();else if(button.id==='pixelClear')clear();
    else if(button.dataset.pixelPreset)preset(button.dataset.pixelPreset);
    else if(button.id==='pixelDownload')download();
  }
  function updatePalette(){root.querySelectorAll('[data-pixel-colour]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.pixelColour===activeColour)));}
  function download() {
    const svg=pixelSvg(pixels,size);const link=$('#pixelDownloadLink');
    link.href=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;link.download='my-pixel-art.svg';link.click();
    $('#pixelSaveNote').textContent='SVG download prepared. It stays sharp at any size.';
  }
  function onColourChange(){activeColour=colourInput.value.toUpperCase();updatePalette();}
  function onSizeChange(){resize(Number(sizeInput.value));}
  function onKeydown(event) {
    const cell=event.target.closest?.('[data-pixel-index]');if(!cell)return;
    const index=Number(cell.dataset.pixelIndex),row=Math.floor(index/size),column=index%size;
    const next={ArrowLeft:column?index-1:index,ArrowRight:column<size-1?index+1:index,ArrowUp:row?index-size:index,ArrowDown:row<size-1?index+size:index};
    if(next[event.key]!==undefined){event.preventDefault();cursor=next[event.key];render();board.querySelector(`[data-pixel-index="${cursor}"]`).focus();}
    else if(event.key===' '||event.key==='Enter'){event.preventDefault();paint(index);render();board.querySelector(`[data-pixel-index="${index}"]`).focus();}
  }
  board.addEventListener('keydown',onKeydown);root.addEventListener('click',onClick);colourInput.addEventListener('input',onColourChange);sizeInput.addEventListener('change',onSizeChange);
  render();updatePalette();$('#pixelSaveNote').textContent='Artwork saves on this device as you draw.';
  return {destroy(){board.removeEventListener('keydown',onKeydown);root.removeEventListener('click',onClick);colourInput.removeEventListener('input',onColourChange);sizeInput.removeEventListener('change',onSizeChange);},snapshot(){return pixels.slice();},get size(){return size;}};
}
