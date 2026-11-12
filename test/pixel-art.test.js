import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {miniAppView} from '../public/mini-apps.js';
import {makePixelGrid,mountPixelArt,pixelArtKey,pixelSvg} from '../public/pixel-art.js';

function fixture(savedState=null) {
  const dom=new JSDOM(`<main>${miniAppView('pixel-art')}</main>`,{url:'https://example.test'}),win=dom.window,root=win.document.querySelector('main');
  if(savedState)win.localStorage.setItem(pixelArtKey('artist'),JSON.stringify(savedState));
  const controller=mountPixelArt({root,win,userId:'artist'}),q=selector=>root.querySelector(selector);
  return {dom,win,root,controller,q};
}

test('pixel grids and SVG exports validate dimensions and safe colours',()=>{
  assert.equal(makePixelGrid().length,256);assert.equal(makePixelGrid()[0],'#FFFFFF');
  const svg=pixelSvg(makePixelGrid(4,'#27bfb9'),4);assert.match(svg,/<svg[^>]+viewBox="0 0 4 4"/);assert.match(svg,/fill="#27BFB9"/);
  assert.throws(()=>pixelSvg(['url(javascript:alert(1))'],4));assert.throws(()=>makePixelGrid(100));
  assert.notEqual(pixelArtKey('artist'),pixelArtKey('another'));
});

test('Pixel Art Studio lets you resize the canvas, scale artwork, and undo or redo size changes',()=>{
  const {dom,q,controller}=fixture();try{
    const size=q('#pixelSize');assert.deepEqual([...size.options].map(option=>Number(option.value)),[8,12,16,24,32]);assert.equal(controller.size,16);
    q('[data-pixel-colour="#d45279"]').click();q('[data-pixel-index="0"]').click();size.value='8';size.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
    assert.equal(controller.size,8);assert.equal(q('#pixelBoard').querySelectorAll('[role="gridcell"]').length,64);assert.equal(controller.snapshot()[0],'#D45279');assert.equal(size.value,'8');assert.match(q('#pixelBoard').getAttribute('aria-label'),/8 by 8/);assert.match(q('#pixelStatus').textContent,/8 by 8/);
    const saved=JSON.parse(dom.window.localStorage.getItem(pixelArtKey('artist')));assert.equal(saved.size,8);assert.equal(saved.pixels.length,64);
    const download=q('#pixelDownloadLink');download.click=()=>{};q('#pixelDownload').click();assert.match(decodeURIComponent(download.href),/viewBox="0 0 8 8"/);
    q('#pixelUndo').click();assert.equal(controller.size,16);assert.equal(size.value,'16');assert.equal(q('#pixelBoard').querySelectorAll('[role="gridcell"]').length,256);assert.equal(controller.snapshot()[0],'#D45279');
    q('#pixelRedo').click();assert.equal(controller.size,8);assert.equal(size.value,'8');assert.equal(q('#pixelBoard').querySelectorAll('[role="gridcell"]').length,64);
  }finally{controller.destroy();dom.window.close();}
});

test('Pixel Art Studio restores a saved grid size and adapts presets to it',()=>{
  const saved={size:8,pixels:makePixelGrid(8,'#27bfb9')};const {dom,q,controller}=fixture(saved);try{
    assert.equal(controller.size,8);assert.equal(q('#pixelSize').value,'8');assert.equal(q('#pixelBoard').querySelectorAll('[role="gridcell"]').length,64);
    q('[data-pixel-preset="smile"]').click();assert.equal(controller.snapshot().length,64);assert.ok(controller.snapshot().includes('#202447'));
    q('#pixelSize').value='32';q('#pixelSize').dispatchEvent(new dom.window.Event('change',{bubbles:true}));assert.equal(controller.size,32);assert.equal(q('#pixelBoard').querySelectorAll('[role="gridcell"]').length,1024);
  }finally{controller.destroy();dom.window.close();}
});

test('Pixel Art Studio paints with a palette, supports undo/redo, presets and local saves',()=>{
  const {dom,q,controller}=fixture();try{
    assert.equal(q('#pixelBoard').querySelectorAll('[role="gridcell"]').length,256);
    q('[data-pixel-colour="#d45279"]').click();q('[data-pixel-index="0"]').click();
    assert.equal(controller.snapshot()[0],'#D45279');assert.equal(q('#pixelUndo').disabled,false);
    q('#pixelUndo').click();assert.equal(controller.snapshot()[0],'#FFFFFF');
    q('#pixelRedo').click();assert.equal(controller.snapshot()[0],'#D45279');
    q('[data-pixel-preset="smile"]').click();assert.equal(controller.snapshot()[5*16+5],'#202447');
    const download=q('#pixelDownloadLink');download.click=()=>{};q('#pixelDownload').click();assert.equal(download.download,'my-pixel-art.svg');assert.match(decodeURIComponent(download.href),/<svg[^>]+shape-rendering="crispEdges"/);
    const saved=JSON.parse(dom.window.localStorage.getItem(pixelArtKey('artist')));assert.deepEqual(saved.pixels,controller.snapshot());
    const cell=q('[data-pixel-index="0"]');cell.focus();cell.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
    assert.equal(dom.window.document.activeElement.dataset.pixelIndex,'1');
    assert.match(q('#pixelStatus').textContent,/16 by 16/);
  }finally{controller.destroy();dom.window.close();}
});
