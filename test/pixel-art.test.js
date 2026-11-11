import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {miniAppView} from '../public/mini-apps.js';
import {makePixelGrid,mountPixelArt,pixelArtKey,pixelSvg} from '../public/pixel-art.js';

function fixture() {
  const dom=new JSDOM(`<main>${miniAppView('pixel-art')}</main>`,{url:'https://example.test'}),win=dom.window,root=win.document.querySelector('main');
  const controller=mountPixelArt({root,win,userId:'artist'}),q=selector=>root.querySelector(selector);
  return {dom,win,root,controller,q};
}

test('pixel grids and SVG exports validate dimensions and safe colours',()=>{
  assert.equal(makePixelGrid().length,256);assert.equal(makePixelGrid()[0],'#FFFFFF');
  const svg=pixelSvg(makePixelGrid(4,'#27bfb9'),4);assert.match(svg,/<svg[^>]+viewBox="0 0 4 4"/);assert.match(svg,/fill="#27BFB9"/);
  assert.throws(()=>pixelSvg(['url(javascript:alert(1))'],4));assert.throws(()=>makePixelGrid(100));
  assert.notEqual(pixelArtKey('artist'),pixelArtKey('another'));
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
