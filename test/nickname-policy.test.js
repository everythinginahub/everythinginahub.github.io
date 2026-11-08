import {test} from 'node:test';
import assert from 'node:assert/strict';
import {restrictedNickname} from '../public/nickname-policy.js';

test('restricted nicknames cover Shay spellings, embedded names, separators and common lookalikes',()=>{
 for(const name of ['Shay','superShAyFan','s.h.a.y','Sh4y','5һау','Ｓｈａｙ','Sháy','Shhaayy','shai','Shae','Shea','shey'])assert.equal(restrictedNickname(name),true,name);
});
test('reserved role titles and obvious variants cannot be used as a nickname',()=>{
 for(const name of ['owner','The_Owner','0wn3r','ADMIN123','Moderator','Staff','support','creator','official','founder','developer','mod','boss','ceo'])assert.equal(restrictedNickname(name),true,name);
 for(const name of ['Alex','Sky Fox','Reader','Sunny','Sally','Guest'])assert.equal(restrictedNickname(name),false,name);
});
