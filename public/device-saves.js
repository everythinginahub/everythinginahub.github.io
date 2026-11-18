// Device-only, account-scoped saves. Never put credentials in this storage.
export const deviceSaveKey=(kind,userId)=>`everything-save-v1:${kind}:${encodeURIComponent(String(userId||'guest'))}`;
export function readDeviceSave(storage,key,maxBytes=2000000){
 try{const raw=storage.getItem(key);if(!raw||raw.length>maxBytes)return null;const value=JSON.parse(raw);return value?.version===1?value.data:null;}catch{return null;}
}
export function writeDeviceSave(storage,key,data,maxBytes=2000000){
 try{const raw=JSON.stringify({version:1,data});if(raw.length>maxBytes)return false;storage.setItem(key,raw);return true;}catch{return false;}
}
