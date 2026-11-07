import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCardLines } from '../public/card-import.js';
test('tab-separated cards are parsed without evaluating their contents',()=>{
  assert.deepEqual(parseCardLines(' Q1 \t A1 \r\n\r\n<img>\t<script> '),{cards:[['Q1','A1'],['<img>','<script>']],error:''});
});
test('invalid imports report errors without partial cards',()=>{
  for(const input of ['', 'one column', 'Question\t', '\tAnswer', Array(51).fill('a\tb').join('\n'), `${'x'.repeat(1001)}\tb`]){const result=parseCardLines(input);assert.ok(result.error);assert.deepEqual(result.cards,[]);}
});
