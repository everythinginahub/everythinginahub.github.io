// Classic script shared only by our locally hosted games. Opaque iframe origins
// cannot use localStorage, so the parent stores a bounded game-only dictionary.
(()=>{
 let cache=Object.create(null),ready=window.parent===window;
 const embedded=!ready;
 const valid=data=>data&&typeof data==='object'&&!Array.isArray(data)&&Object.keys(data).length<=20&&Object.values(data).every(value=>typeof value==='string')&&JSON.stringify(data).length<=2000000;
 function send(){if(embedded)parent.postMessage({type:'hub-game-write',data:cache},'*');}
 window.gameDeviceStorage={
  get ready(){return ready;},
  getItem(key){if(!embedded){try{return localStorage.getItem(key);}catch{return null;}}return cache[key]||null;},
  setItem(key,value){value=String(value);if(!embedded){localStorage.setItem(key,value);return;}if(!ready)throw Error('Save storage is still loading');const next={...cache,[key]:value};if(!valid(next))throw Error('Game save is too large');cache=next;send();},
  removeItem(key){if(!embedded){localStorage.removeItem(key);return;}delete cache[key];send();}
 };
 window.addEventListener('message',event=>{
  if(!embedded||event.source!==parent)return;
  if(event.data?.type==='hub-game-init'&&!ready){if(valid(event.data.data))cache=event.data.data;ready=true;window.dispatchEvent(new Event('game-save-ready'));}
  if(event.data?.type==='hub-game-save-error')window.dispatchEvent(new Event('game-save-error'));
  if(event.data?.type==='hub-game-flush')window.dispatchEvent(new Event('pagehide'));
 });
 if(embedded)parent.postMessage({type:'hub-game-ready'},'*');
})();
