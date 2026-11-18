import {deviceSaveKey,readDeviceSave,writeDeviceSave} from './device-saves.js?v=20261106-1';

// Only attach to bundled local games with opaque-origin iframe sandboxes.
export function mountLocalGameStorage({frame,kind,userId,win=window}){
  const key=deviceSaveKey(kind,userId);let storage;try{storage=win.localStorage;}catch{}
  const send=data=>frame?.contentWindow?.postMessage(data,'*');
  const valid=data=>data&&typeof data==='object'&&!Array.isArray(data)&&Object.keys(data).length<=20&&Object.values(data).every(value=>typeof value==='string')&&JSON.stringify(data).length<=2000000;
  const init=()=>{const data=readDeviceSave(storage,key,2100000);send({type:'hub-game-init',data:valid(data)?data:{}});};
  const receive=event=>{
   if(!frame||event.source!==frame.contentWindow||event.origin!=='null')return;
   if(event.data?.type==='hub-game-ready')init();
   if(event.data?.type==='hub-game-write'&&valid(event.data.data)&&!writeDeviceSave(storage,key,event.data.data,2100000))send({type:'hub-game-save-error'});
  };
  win.addEventListener('message',receive);frame?.addEventListener('load',init);
  return {destroy(){send({type:'hub-game-flush'});frame?.removeEventListener('load',init);win.setTimeout(()=>{win.removeEventListener('message',receive);frame?.remove();},100);}};
}
