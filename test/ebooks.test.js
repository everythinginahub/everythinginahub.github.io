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
 assert.doesNotMatch(ebookLibrary(),/<iframe/);const html=ebookReader('wonderfulwizardo00baumiala');assert.match(html,/data-archive-url="https:\/\/archive.org\/embed\/wonderfulwizardo00baumiala"/);assert.doesNotMatch(html,/<iframe/);assert.match(html,/href="https:\/\/archive.org\/details\/wonderfulwizardo00baumiala"/);assert.doesNotMatch(ebookReader('evil" onload="alert(1)'),/<iframe/);
});

test('all featured books have locally hosted text with Project Gutenberg attribution',async()=>{
 const {localEditions,paginateBook}=await import('../public/ebooks.js');const {readFile}=await import('node:fs/promises');
 for(const book of books){assert.ok(localEditions[book.id],book.id);const text=await readFile(`public/books/${localEditions[book.id]}.txt`,'utf8');assert.match(text,/PROJECT GUTENBERG/i);assert.ok(text.length>5000);assert.ok(paginateBook(text).length>2);}
});
test('pagination keeps content available, handles long blocks, and bounds each page',async()=>{
 const {paginateBook}=await import('../public/ebooks.js');const text='First paragraph\nline two\n\n'+('word '.repeat(1500))+'\n\nLast paragraph';const pages=paginateBook(text,500);assert.ok(pages.length>2);assert.ok(pages.every(page=>page.length<=500));assert.match(pages[0],/First paragraph/);assert.match(pages.at(-1),/Last paragraph/);
});

test('special property names are treated as Archive IDs, never as local files',()=>{
 assert.doesNotMatch(ebookReader('constructor'),/id="schoolReader"/);assert.match(ebookReader('constructor'),/archive.org\/embed\/constructor/);
});
