import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {miniApps,miniAppView,mountMiniApp} from '../public/mini-apps.js';
import {generatePassword,secureRandomInteger,mountPasswordGenerator} from '../public/password-generator.js';
import {fitImageDimensions,validateImageFile,imageDownloadName,mountImageResizer,MAX_IMAGE_BYTES,MAX_IMAGE_PIXELS} from '../public/image-resizer.js';

function deterministicCrypto(values=[0]){
 let index=0;
 return {getRandomValues(array){array[0]=values[index++]??values.at(-1)??0;return array;}};
}
const wait=()=>new Promise(resolve=>setTimeout(resolve,10));

test('password generator uses secure unbiased indices and includes each selected group',()=>{
 const values=[0xffffffff,17];
 assert.equal(secureRandomInteger(10,deterministicCrypto(values)),7,'out-of-range random values are rejected rather than biased');
 const password=generatePassword(24,{},deterministicCrypto());
 assert.equal(password.length,24);
 assert.match(password,/[A-Z]/);
 assert.match(password,/[a-z]/);
 assert.match(password,/[2-9]/);
 assert.match(password,/[^A-Za-z0-9]/);
 assert.doesNotMatch(password,/[Il1O0]/,'ambiguous characters are excluded by default');
 assert.throws(()=>generatePassword(7,{},deterministicCrypto()),/8 to 64/);
 assert.throws(()=>generatePassword(65,{},deterministicCrypto()),/8 to 64/);
 assert.throws(()=>generatePassword(16,{uppercase:false,lowercase:false,numbers:false,symbols:false},deterministicCrypto()),/at least one/);
 assert.throws(()=>generatePassword(8,{uppercase:true,lowercase:true,numbers:true,symbols:true},null),/Secure random/);
});

test('password generator UI creates and copies a password without saving it',async()=>{
 const dom=new JSDOM(`<main>${miniAppView('password-generator')}</main>`,{url:'https://example.test/'});
 const win=dom.window,root=win.document.querySelector('main'),query=selector=>root.querySelector(selector);
 try{
  Object.defineProperty(win.crypto,'getRandomValues',{configurable:true,value:deterministicCrypto().getRandomValues});
  let copied='';
  Object.defineProperty(win.navigator,'clipboard',{configurable:true,value:{writeText:async value=>{copied=value;}}});
  const controller=mountPasswordGenerator({root,win});
  query('#passwordGeneratorForm').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
  const value=query('#generatedPassword').value;
  assert.equal(value.length,20);
  assert.match(query('#passwordGeneratorStatus').textContent,/not been saved or sent/i);
  assert.equal(win.localStorage.length,0);
  query('#copyGeneratedPassword').click();await wait();
  assert.equal(copied,value);
  assert.match(query('#passwordGeneratorStatus').textContent,/copied/i);
  controller.destroy();
  assert.equal(query('#generatedPassword').value,'');
 }finally{dom.window.close();}
});

test('image-resizer dimensions keep aspect ratio, avoid enlargement and enforce bounds',()=>{
 assert.deepEqual(fitImageDimensions(4000,2000,1600,1600),{width:1600,height:800});
 assert.deepEqual(fitImageDimensions(320,200,1600,1600),{width:320,height:200});
 assert.deepEqual(fitImageDimensions(2000,4000,1000,1200),{width:600,height:1200});
 for(const dimensions of [[0,20,100,100],[Infinity,20,100,100],[10001,1,100,100],[5000,5000,100,100],[100,100,0,100],[100,100,100,6001]])assert.throws(()=>fitImageDimensions(...dimensions));
 assert.equal(MAX_IMAGE_BYTES,12*1024*1024);
 assert.equal(MAX_IMAGE_PIXELS,24_000_000);
 assert.equal(imageDownloadName('../../family portrait.PNG','image/webp'),'family-portrait-resized.webp');
 assert.equal(imageDownloadName('image.png','image/jpeg'),'image-resized.jpg');
 assert.throws(()=>imageDownloadName('image.png','image/gif'),/PNG, JPEG or WebP/);
});

test('image-resizer accepts only bounded image files and keeps processing local',async()=>{
 assert.equal(validateImageFile({type:'image/png',size:10}).type,'image/png');
 assert.throws(()=>validateImageFile({type:'image/gif',size:10}),/JPG, PNG or WebP/);
 assert.throws(()=>validateImageFile({type:'image/jpeg',size:MAX_IMAGE_BYTES+1}),/12 MB/);

 const dom=new JSDOM(`<main>${miniAppView('image-resizer')}</main>`,{url:'https://example.test/'});
 const win=dom.window,root=win.document.querySelector('main'),query=selector=>root.querySelector(selector);
 let closed=false,drawn=null,encoded=null,revoked=[];
 try{
  Object.defineProperty(win,'createImageBitmap',{configurable:true,value:async()=>({width:4000,height:2000,close(){closed=true;}})});
  Object.defineProperty(win.URL,'createObjectURL',{configurable:true,value:()=>`blob:https://example.test/${Math.random()}`});
  Object.defineProperty(win.URL,'revokeObjectURL',{configurable:true,value:url=>revoked.push(url)});
  Object.defineProperty(win.HTMLCanvasElement.prototype,'getContext',{configurable:true,value(){return {imageSmoothingEnabled:false,imageSmoothingQuality:'',fillRect(){},drawImage(_source,_x,_y,width,height){drawn={width,height};}};}});
  Object.defineProperty(win.HTMLCanvasElement.prototype,'toBlob',{configurable:true,value(callback,type,quality){encoded={type,quality,width:this.width,height:this.height};callback(new win.Blob(['resized'],{type}));}});
  const file=new win.File(['source'], 'family photo.png',{type:'image/png'});
  Object.defineProperty(query('#imageFile'),'files',{configurable:true,value:[file]});
  const controller=mountImageResizer({root,win});
  query('#imageResizerForm').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
  await wait();
  assert.deepEqual(drawn,{width:1600,height:800});
  assert.equal(encoded.type,'image/webp');
  assert.equal(encoded.quality,0.85);
  assert.equal(query('#imageResizerDownload').download,'family-photo-resized.webp');
  assert.equal(query('#imageResizerDownload').hidden,false);
  assert.equal(query('#imageResizerPreviewFrame').hidden,false);
  assert.match(query('#imageResizerStatus').textContent,/1600 × 800 pixels/);
  assert.equal(closed,true);
  assert.equal(win.localStorage.length,0);
  controller.destroy();
  assert.equal(revoked.length,1,'the generated browser object URL is released on exit');
 }finally{dom.window.close();}
});

test('local-first tools are in the app catalogue and render privacy and usage notes',()=>{
 assert.equal(Object.keys(miniApps).length,18);
 assert.equal(miniApps['password-generator'].name,'Password generator');
 assert.equal(miniApps['image-resizer'].name,'Image resizer');
 assert.equal(miniApps['life-hacks'].name,'Life Hacks');
 assert.equal(miniApps['meal-planner'].name,'Meal planner');
 const password=new JSDOM(`<main>${miniAppView('password-generator')}</main>`).window.document;
 const image=new JSDOM(`<main>${miniAppView('image-resizer')}</main>`).window.document;
 assert.match(password.querySelector('.mini-privacy').textContent,/not saved or sent/i);
 assert.match(password.querySelector('.mini-footnote').textContent,/not a password manager/i);
 assert.match(image.querySelector('.mini-privacy').textContent,/not uploaded/i);
 assert.match(image.querySelector('#imageFile').accept,/image\/webp/);
});
