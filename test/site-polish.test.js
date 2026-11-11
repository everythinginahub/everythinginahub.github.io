import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [html,css]=await Promise.all([
  readFile(new URL('../public/index.html',import.meta.url),'utf8'),
  readFile(new URL('../public/site-polish.css',import.meta.url),'utf8')
]);

test('shared visual layer loads after structural styles and honors motion preferences',()=>{
  const base=html.indexOf('href="style.css?');
  const structure=html.indexOf('href="site-design.css?');
  const polish=html.indexOf('href="site-polish.css?');
  assert.ok(base>=0&&structure>base&&polish>structure,'visual layers should load after the base app stylesheet');
  assert.match(css,/:where\([^)]*\):focus-visible/);
  assert.match(css,/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css,/scroll-behavior:\s*auto/);
  assert.match(css,/animation-duration:\s*\.01ms\s*!important/);
  assert.doesNotMatch(css,/backdrop-filter\s*:/);
  assert.doesNotMatch(css,/will-change\s*:/);
});

test('micro-interactions avoid transitions that animate layout or heavy paint',()=>{
  const transitions=[...css.matchAll(/transition\s*:[^;]+;/g)].map(match=>match[0]).join('\n');
  assert.ok(transitions.length>0,'the visual layer should provide interactive feedback');
  assert.doesNotMatch(transitions,/\b(?:width|height|margin|padding|top|left|box-shadow|filter)\b/);
  assert.match(css,/@keyframes hub-page-enter/);
  assert.match(css,/@keyframes hub-card-enter/);
});
