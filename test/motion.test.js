import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { initInteractionMotion } from '../public/motion.js';

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
      const animation = {
        cancelled: false,
        cancel() { this.cancelled = true; this.oncancel?.(); }
      };
      played.push({ target, keyframes, options, animation });
      return animation;
    };
  }
  return { dom, w, doc, media, played, change: () => listener?.() };
}

test('click feedback covers nested button content, links, and role buttons without viewport observers', () => {
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
