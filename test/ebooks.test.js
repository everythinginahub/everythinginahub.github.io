import {test} from 'node:test';
import assert from 'node:assert/strict';
import {books,archiveIdentifier,searchBooks,ebookLibrary,ebookReader} from '../public/ebooks.js';

test('accepts only Internet Archive book links or safe item IDs',()=>{
 assert.equal(archiveIdentifier(' wonderfulwizardo00baumiala '),'wonderfulwizardo00baumiala');
 assert.equal(archiveIdentifier('https://archive.org/details/prideprejudice00aust/page/n10/mode/2up?view=theater'),'prideprejudice00aust');
 assert.equal(archiveIdentifier('archive.org/embed/secretgarden00burn'),'secretgarden00burn');
 for(const value of ['https://archive.org.evil.test/details/abc','https://archive.org@evil.test/details/abc','http://archive.org/details/abc','https://archive.org/search.php?q=abc','../abc','<script>','a/b','https://archive.org:444/details/abc',''])assert.equal(archiveIdentifier(value),null,value);
});
test('curated shelf searches title, author and category',()=>{
 assert.ok(books.length>=8);assert.equal(new Set(books.map(x=>x.id)).size,books.length);assert.ok(searchBooks('carroll').some(x=>x.id==='alicesadventures00carr_13'));assert.ok(searchBooks('','Nature').every(x=>x.category==='Nature'));assert.equal(searchBooks('not-a-book').length,0);
});
test('readers use fixed trusted host, load only after selection and include fallback',()=>{
 assert.doesNotMatch(ebookLibrary(),/<iframe/);const html=ebookReader('wonderfulwizardo00baumiala');assert.match(html,/src="https:\/\/archive.org\/embed\/wonderfulwizardo00baumiala"/);assert.match(html,/href="https:\/\/archive.org\/details\/wonderfulwizardo00baumiala"/);assert.doesNotMatch(ebookReader('evil" onload="alert(1)'),/<iframe/);
});
