import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [html,css,motion,motionScript]=await Promise.all([
  readFile(new URL('../public/index.html',import.meta.url),'utf8'),
  readFile(new URL('../public/site-polish.css',import.meta.url),'utf8'),
  readFile(new URL('../public/motion.css',import.meta.url),'utf8'),
  readFile(new URL('../public/motion.js',import.meta.url),'utf8')
]);

test('shared visual layer loads after structural styles and honors motion preferences',()=>{
  const base=html.indexOf('href="style.css?');
  const structure=html.indexOf('href="site-design.css?');
  const polish=html.indexOf('href="site-polish.css?');
  const finalStyle=html.indexOf('href="seo-pages.css"');
  const motionLink=html.indexOf('href="motion.css?');
  const motionScriptTag=html.indexOf('src="motion.js?');
  const appScript=html.indexOf('src="app.js?');
  assert.ok(base>=0&&structure>base&&polish>structure,'visual layers should load after the base app stylesheet');
  assert.ok(finalStyle>polish&&motionLink>finalStyle,'motion overrides should load after all component styles');
  assert.ok(motionScriptTag>0&&appScript>motionScriptTag,'interaction motion should initialize before app views render');
  assert.match(css,/:where\([^)]*\):focus-visible/);
  assert.match(css,/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css,/scroll-behavior:\s*auto/);
  assert.match(css,/animation-duration:\s*\.01ms\s*!important/);
  assert.doesNotMatch(css,/backdrop-filter\s*:/);
  assert.doesNotMatch(css,/will-change\s*:/);
});

test('the motion layer provides entrances and interactions while respecting reduced motion',()=>{
  assert.match(motion,/@media\s*\(prefers-reduced-motion:\s*no-preference\)/);
  assert.match(motion,/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(motion,/@keyframes hub-workspace-arrive/);
  assert.match(motion,/@keyframes hub-item-arrive/);
  assert.match(motion,/@keyframes hub-dialog-arrive/);
  assert.match(motion,/@keyframes hub-toast-arrive/);
  assert.match(motion,/@keyframes hub-scroll-reveal/);
  assert.match(motion,/@keyframes hub-video-preview/);
  assert.match(motion,/@keyframes hub-spin-3d/);
  assert.match(motion,/@supports\s*\(animation-timeline:\s*view\(\)\)/);
  assert.match(motionScript,/IntersectionObserver/,'selected offscreen sections should regain progressive scroll reveals');
  assert.doesNotMatch(motion,/will-change\s*:/);
  assert.doesNotMatch(motion,/backdrop-filter\s*:/);
  const keyframes=[...motion.matchAll(/@keyframes\s+([\w-]+)/g)].map(match=>match[1]);
  assert.equal(new Set(keyframes).size,keyframes.length,'each motion keyframe should have one definition');
});

test('micro-interactions avoid transitions that animate layout or heavy paint',()=>{
  const transitions=[...`${css}${String.fromCharCode(10)}${motion}`.matchAll(/transition\s*:[^;]+;/g)].map(match=>match[0]).join(' ');
  assert.ok(transitions.length>0,'the visual layer should provide interactive feedback');
  assert.doesNotMatch(transitions,/\b(?:width|height|margin|padding|top|left|box-shadow|filter)\b/);
  assert.match(css,/@keyframes hub-page-enter/);
  assert.match(css,/@keyframes hub-card-enter/);
});
