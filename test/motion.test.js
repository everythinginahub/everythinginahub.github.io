import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { initScrollReveals } from '../public/motion.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));
function setup() {
  const dom = new JSDOM('<body><main><a class="deck-card" href="#one">One</a><a class="deck-card" href="#two">Two</a></main></body>', { pretendToBeVisual:true });
  const { window: w } = dom;
  const doc=w.document, cards=[...doc.querySelectorAll('.deck-card')];
  let listener;
  const media={matches:false,addEventListener:(_,fn)=>{listener=fn;},removeEventListener:()=>{listener=null;}};
  const observers=[];
  class Intersection {
    constructor(callback,options){this.callback=callback;this.options=options;this.targets=new Set();this.disconnected=false;observers.push(this);}
    observe(el){this.targets.add(el);} unobserve(el){this.targets.delete(el);} disconnect(){this.disconnected=true;this.targets.clear();}
    enter(el){this.callback([{target:el,isIntersecting:true}]);}
  }
  w.IntersectionObserver=Intersection;w.matchMedia=()=>media;
  for(const [index,card] of cards.entries()){
    card.getClientRects=()=>[{}];card.getBoundingClientRect=()=>({top:index?1200:100});
  }
  const played=[];
  cards[1].animate=(keyframes,options)=>{const animation={cancelled:false,cancel(){this.cancelled=true;this.oncancel?.();}};played.push({keyframes,options,animation});return animation;};
  return {dom,w,doc,cards,media,observers,played,change:()=>listener()};
}

test('scroll reveals animate only offscreen content, once, without hiding other content',()=>{
  const {dom,w,doc,cards,observers,played}=setup();const cleanup=initScrollReveals(doc,w), observer=observers[0];
  assert.equal(observer.targets.has(cards[0]),false);assert.equal(observer.targets.has(cards[1]),true);
  assert.equal(cards[1].style.opacity,'');observer.enter(cards[1]);assert.equal(played.length,1);assert.equal(observer.targets.has(cards[1]),false);
  assert.equal(played[0].keyframes[0].opacity,.8);assert.equal(played[0].options.duration,420);cleanup();dom.window.close();
});
test('dynamic content is observed, focused content is not animated, and removed content is released',async()=>{
  const {dom,w,doc,cards,observers,played}=setup();const cleanup=initScrollReveals(doc,w), observer=observers[0];
  cards[1].focus();observer.enter(cards[1]);assert.equal(played.length,0);
  const next=doc.createElement('a');next.className='deck-card';next.getClientRects=()=>[{}];next.getBoundingClientRect=()=>({top:1200});doc.querySelector('main').append(next);await flush();assert.equal(observer.targets.has(next),true);
  next.remove();await flush();assert.equal(observer.targets.has(next),false);cleanup();dom.window.close();
});
test('reduced motion prevents animation and cancels ongoing effects when changed',()=>{
  const {dom,w,doc,cards,media,observers,played,change}=setup();media.matches=true;const cleanup=initScrollReveals(doc,w);assert.equal(observers.length,0);
  media.matches=false;change();observers[0].enter(cards[1]);assert.equal(played.length,1);
  media.matches=true;change();assert.equal(played[0].animation.cancelled,true);assert.equal(observers[0].disconnected,true);observers[0].enter(cards[1]);assert.equal(played.length,1);
  cleanup();dom.window.close();
});
test('unsupported observers leave the page untouched',()=>{
  const {dom,w,doc,cards}=setup();delete w.IntersectionObserver;
  assert.doesNotThrow(()=>initScrollReveals(doc,w)());assert.equal(cards[1].style.opacity,'');dom.window.close();
});
