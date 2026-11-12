import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProfilePicture,prepareProfilePicture,PROFILE_PICTURE_MAX_DATA_URL_LENGTH,PROFILE_PICTURE_MAX_FILE_BYTES} from '../public/profile-picture.js';

const jpeg='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2w==';

test('profile picture normalization accepts only small JPEG data URLs with a JPEG signature',()=>{
 assert.equal(normalizeProfilePicture(jpeg),jpeg);
 for(const value of [null,{},'https://example.test/photo.jpg','data:image/svg+xml;base64,PHN2Zy8+','data:image/jpeg;base64,AAAA','data:image/jpeg;base64,/9j/not base64'])assert.equal(normalizeProfilePicture(value),'');
 assert.equal(normalizeProfilePicture(`data:image/jpeg;base64,/9j/${'A'.repeat(PROFILE_PICTURE_MAX_DATA_URL_LENGTH)}`),'');
});

test('profile photos are validated, centre-cropped and re-encoded as a small JPEG',async()=>{
 const file={type:'image/png',size:1024};let bitmap,drawArgs,quality;
 const win={createImageBitmap:async value=>(bitmap={width:400,height:200,close(){this.closed=true;}}),URL:{},document:{createElement:tag=>{assert.equal(tag,'canvas');return {width:0,height:0,getContext:kind=>{assert.equal(kind,'2d');return {drawImage:(...args)=>{drawArgs=args;}};},toDataURL:(type,q)=>{assert.equal(type,'image/jpeg');quality=q;return jpeg;}};}}};
 assert.equal(await prepareProfilePicture(file,win),jpeg);assert.equal(bitmap.closed,true);assert.deepEqual(drawArgs.slice(1),[100,0,200,200,0,0,192,192]);assert.equal(quality,.76);
});

test('profile photos reject unsupported formats, empty files and oversized uploads before decoding',async()=>{
 let decoded=0;const win={createImageBitmap:async()=>{decoded++;},URL:{},document:{}};
 await assert.rejects(prepareProfilePicture({type:'image/svg+xml',size:10},win),/SVG files are not supported/);
 await assert.rejects(prepareProfilePicture({type:'image/png',size:0},win),/smaller than 5 MB/);
 await assert.rejects(prepareProfilePicture({type:'image/jpeg',size:PROFILE_PICTURE_MAX_FILE_BYTES+1},win),/smaller than 5 MB/);
 assert.equal(decoded,0);
});
