import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {miniAppView} from '../public/mini-apps.js';
import {contrastRatio,mountQrMaker} from '../scripts/qr-maker.js';
import {mountQrMaker as mountBundledQrMaker} from '../public/qr-maker.js';

function qrFixture(encoder,mount=mountQrMaker) {
  const dom=new JSDOM(`<main>${miniAppView('qr-maker')}</main>`,{url:'https://example.test'});
  const win=dom.window,root=win.document.querySelector('main'),controller=mount({root,win,...(encoder?{encoder}:{})});
  const q=selector=>root.querySelector(selector);
  const submit=()=>q('#miniQrForm').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
  return {dom,win,root,controller,q,submit};
}

test('QR contrast follows WCAG luminance and rejects invalid colours',()=>{
  assert.equal(contrastRatio('#000000','#ffffff'),21);
  assert.ok(contrastRatio('#202447','#ffffff')>11.8);
  assert.ok(contrastRatio('#777777','#ffffff')<4.5);
  assert.throws(()=>contrastRatio('navy','#ffffff'));
});

test('QR maker builds a real local PNG and offers an accessible download',async()=>{
  const fixture=qrFixture();try{
    const {q,submit}=fixture;
    q('#miniQrText').value='https://example.org/study';
    submit();await fixture.controller.whenIdle();
    assert.equal(q('#miniQrOutput').hidden,false);
    assert.match(q('#miniQrImage').src,/^data:image\/png;base64,/);
    assert.equal(q('#miniQrEncoded').textContent,'https://example.org/study');
    assert.match(q('#miniQrImage').alt,/QR code preview/);
    assert.match(q('#miniQrDownload').href,/^data:image\/png;base64,/);
    assert.equal(q('#miniQrDownload').download,'everything-hub-qr.png');
    assert.match(q('#miniQrStatus').textContent,/QR code ready/i);
    q('#miniQrText').dispatchEvent(new fixture.win.Event('input',{bubbles:true}));
    assert.equal(q('#miniQrOutput').hidden,true);
    assert.match(q('#miniQrStatus').textContent,/Generate a new QR code/);
  }finally{fixture.controller.destroy();fixture.dom.window.close();}
});

test('checked-in QR bundle mounts and creates a local PNG download',async()=>{
  const png='data:image/png;base64,cXVpY2stcmVzcG9uc2U=';
  const encoder={toDataURL:async()=>png};
  const fixture=qrFixture(encoder,mountBundledQrMaker);try{
    const {q,submit}=fixture;q('#miniQrText').value='bundle test';submit();await fixture.controller.whenIdle();
    assert.equal(q('#miniQrImage').src,png);assert.equal(q('#miniQrDownload').href,png);
    assert.equal(q('#miniQrOutput').hidden,false);assert.match(q('#miniQrStatus').textContent,/QR code ready/i);
  }finally{fixture.controller.destroy();fixture.dom.window.close();}
});

test('QR edits cancel stale work before an outdated preview can appear',async()=>{
  let resolveImage;
  const encoder={toDataURL:()=>new Promise(resolve=>{resolveImage=resolve;})};
  const fixture=qrFixture(encoder);try{
    const {q,submit,win,controller}=fixture;q('#miniQrText').value='first';submit();
    assert.equal(q('#miniQrStatus').textContent,'Creating your QR code…');
    q('#miniQrText').value='edited';q('#miniQrText').dispatchEvent(new win.Event('input',{bubbles:true}));
    assert.equal(q('#miniQrForm button[type="submit"]').disabled,false);
    assert.match(q('#miniQrStatus').textContent,/edits changed/i);
    resolveImage('data:image/png;base64,b2xk');await controller.whenIdle();
    assert.equal(q('#miniQrOutput').hidden,true);assert.equal(q('#miniQrImage').getAttribute('src'),null);
    assert.match(q('#miniQrStatus').textContent,/edits changed/i);
  }finally{fixture.controller.destroy();fixture.dom.window.close();}
});

test('QR maker blocks low contrast before encoding and reports encoder failures',async()=>{
  let calls=0;
  const encoder={toDataURL:async()=>{calls++;throw new Error('private encoder details');}};
  const fixture=qrFixture(encoder);try{
    const {q,submit}=fixture;
    q('#miniQrText').value='Hello';q('#miniQrForeground').value='#eeeeee';submit();
    assert.equal(calls,0);assert.match(q('#miniQrStatus').textContent,/too similar/i);
    q('#miniQrForeground').value='#202447';submit();await fixture.controller.whenIdle();
    assert.equal(calls,1);assert.match(q('#miniQrStatus').textContent,/Could not create/i);
    assert.doesNotMatch(q('#miniQrStatus').textContent,/private encoder details/);
  }finally{fixture.controller.destroy();fixture.dom.window.close();}
});
