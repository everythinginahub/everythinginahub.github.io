import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { initInteractionMotion, initScrollReveals } from '../public/motion.js';

function setup() {
  const dom = new JSDOM('<body><main id="app"><button id="action"><span id="label">Launch</span></button><button id="disabled" disabled>Wait</button><a href="#one">One</a><div id="role" role="button" tabindex="0">More</div></main></body>', { pretendToBeVisual: true });
  const { window: w } = dom;
  const doc = w.document;
  let listener;
  const media = {
    matches: false,
    addEventListener: (_, fn) => { listener = fn; },
    removeEventListener: () => { listener = null; }
  };
  w.matchMedia = () => media;
  const played = [];
  for (const target of doc.querySelectorAll('button, a, [role="button"]')) {
    target.animate = (keyframes, options) => {
      const animation = { cancelled: false, cancel() { this.cancelled = true; this.oncancel?.(); } };
      played.push({ target, keyframes, options, animation });
      return animation;
    };
  }
  return { dom, w, doc, media, played, change: () => listener?.() };
}

function setupScroll() {
  const dom = new JSDOM('<body><main><section class="video-discovery">Offscreen video suggestions</section><section class="watch-tip">Visible tip</section></main></body>', { pretendToBeVisual: true });
  const { window: w } = dom;
  const doc = w.document;
  let listener;
  const media = {
    matches: false,
    addEventListener: (_, fn) => { listener = fn; },
    removeEventListener: () => { listener = null; }
  };
  w.matchMedia = () => media;
  const observers = [];
  class Intersection {
    constructor(callback, options) { this.callback = callback; this.options = options; this.targets = new Set(); this.disconnected = false; observers.push(this); }
    observe(element) { this.targets.add(element); }
    unobserve(element) { this.targets.delete(element); }
    disconnect() { this.disconnected = true; this.targets.clear(); }
    enter(element) { this.callback([{ target: element, isIntersecting: true }]); }
  }
  w.IntersectionObserver = Intersection;
  const targets = [...doc.querySelectorAll('.video-discovery, .watch-tip')];
  targets.forEach((element, index) => {
    element.getClientRects = () => [{}];
    element.getBoundingClientRect = () => ({ top: index ? 120 : 1200 });
  });
  const played = [];
  targets[0].animate = (keyframes, options) => {
    const animation = { cancelled: false, cancel() { this.cancelled = true; this.oncancel?.(); } };
    played.push({ element: targets[0], keyframes, options, animation });
    return animation;
  };
  return { dom, w, doc, media, observers, targets, played, change: () => listener?.() };
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

test('click feedback covers nested button content, links, and role buttons', () => {
  const { dom, w, doc, played } = setup();
  const cleanup = initInteractionMotion(doc, w);
  doc.querySelector('#label').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  doc.querySelector('a').click();
  doc.querySelector('#role').click();
  assert.equal(played.length, 3);
  assert.equal(played[0].target.id, 'action');
  assert.equal(played[1].target.tagName, 'A');
  assert.equal(played[2].target.id, 'role');
  assert.equal(played[0].keyframes[1].scale, '.94');
  assert.equal(played[0].keyframes[2].scale, '1.04');
  assert.equal(played[0].options.duration, 300);
  cleanup();
  doc.querySelector('#role').click();
  assert.equal(played.length, 3, 'cleanup removes the delegated click listener');
  dom.window.close();
});

test('reduced motion prevents click feedback and cancels an animation if the preference changes', () => {
  const { dom, w, doc, media, played, change } = setup();
  const cleanup = initInteractionMotion(doc, w);
  doc.querySelector('#action').click();
  assert.equal(played.length, 1);
  media.matches = true;
  change();
  assert.equal(played[0].animation.cancelled, true);
  doc.querySelector('#action').click();
  assert.equal(played.length, 1);
  cleanup();
  dom.window.close();
});

test('reduced motion on startup, disabled controls, and unsupported matchMedia leave controls untouched', () => {
  const first = setup();
  first.media.matches = true;
  const cleanup = initInteractionMotion(first.doc, first.w);
  first.doc.querySelector('#action').click();
  first.doc.querySelector('#disabled').dispatchEvent(new first.w.MouseEvent('click', { bubbles: true }));
  assert.equal(first.played.length, 0);
  cleanup();
  first.dom.window.close();

  const second = setup();
  delete second.w.matchMedia;
  assert.doesNotThrow(() => initInteractionMotion(second.doc, second.w)());
  second.doc.querySelector('#action').click();
  assert.equal(second.played.length, 0);
  second.dom.window.close();
});

test('scroll reveals animate only offscreen eligible sections once without hiding visible content', () => {
  const { dom, w, doc, observers, targets, played } = setupScroll();
  const cleanup = initScrollReveals(doc, w);
  const observer = observers[0];
  assert.equal(observer.options.rootMargin, '0px 0px -24px 0px');
  assert.equal(observer.targets.has(targets[0]), true);
  assert.equal(observer.targets.has(targets[1]), false);
  assert.equal(targets[0].style.opacity, '');
  observer.enter(targets[0]);
  assert.equal(played.length, 1);
  assert.equal(played[0].keyframes[0].opacity, .08);
  assert.equal(played[0].keyframes[0].transform, 'translateY(42px) scale(.93) rotateX(4deg)');
  assert.equal(played[0].options.duration, 760);
  assert.equal(observer.targets.has(targets[0]), false);
  cleanup();
  dom.window.close();
});

test('scroll reveals observe dynamic sections and release removed or focused content', async () => {
  const { dom, w, doc, observers, targets, played } = setupScroll();
  const cleanup = initScrollReveals(doc, w);
  const observer = observers[0];
  targets[0].tabIndex = 0;
  targets[0].focus();
  observer.enter(targets[0]);
  assert.equal(played.length, 0, 'focused content is released without motion');

  const removed = doc.createElement('section');
  removed.className = 'watch-tip';
  removed.getClientRects = () => [{}];
  removed.getBoundingClientRect = () => ({ top: 1200 });
  doc.querySelector('main').append(removed);
  await flush();
  assert.equal(observer.targets.has(removed), true);
  removed.remove();
  await flush();
  assert.equal(observer.targets.has(removed), false);

  const next = doc.createElement('section');
  next.className = 'video-discovery';
  next.getClientRects = () => [{}];
  next.getBoundingClientRect = () => ({ top: 1200 });
  next.animate = (keyframes, options) => {
    const animation = { cancelled: false, cancel() { this.cancelled = true; this.oncancel?.(); } };
    played.push({ element: next, keyframes, options, animation });
    return animation;
  };
  doc.body.tabIndex = -1;
  doc.body.focus();
  doc.querySelector('main').append(next);
  await flush();
  assert.equal(observer.targets.has(next), true);
  observer.enter(next);
  assert.equal(played.length, 1);
  cleanup();
  dom.window.close();
});

test('reduced motion blocks scroll reveals and cancels active ones when preference changes', () => {
  const { dom, w, doc, media, observers, targets, played, change } = setupScroll();
  media.matches = true;
  const cleanup = initScrollReveals(doc, w);
  assert.equal(observers.length, 0);
  media.matches = false;
  change();
  const observer = observers[0];
  observer.enter(targets[0]);
  assert.equal(played.length, 1);
  media.matches = true;
  change();
  assert.equal(played[0].animation.cancelled, true);
  assert.equal(observer.disconnected, true);
  observer.enter(targets[0]);
  assert.equal(played.length, 1);
  cleanup();
  dom.window.close();
});

test('unsupported observers leave scroll content visible', () => {
  const { dom, w, doc, targets } = setupScroll();
  delete w.IntersectionObserver;
  assert.doesNotThrow(() => initScrollReveals(doc, w)());
  assert.equal(targets[0].style.opacity, '');
  dom.window.close();
});
