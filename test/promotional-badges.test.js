import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('both landing pages show all three accessible, responsive promotional badges',async()=>{
  const [rootHtml,appHtml,css]=await Promise.all([
    read('../index.html'),
    read('../public/index.html'),
    read('../public/legal.css')
  ]);
  const pages=[['overview',new JSDOM(rootHtml).window.document],['workspace landing',new JSDOM(appHtml).window.document]];
  const expected={
    'partner-badge--launch-orbit':{
      href:'https://launchorbit.co',
      src:'https://launchorbit.co/api/badge?theme=dark&v=10',
      alt:'View this product on Launch Orbit',width:'240',height:'64'
    },
    'partner-badge--better-launch':{
      href:'https://www.betterlaunch.co/product/everything-in-a-hub',
      src:'https://www.betterlaunch.co/badge-live-dark.svg',
      alt:'Launching on Better Launch',width:'200',height:'56'
    },
    'partner-badge--codehype':{
      href:'https://www.codehype.ai/product/everything-hub?utm_source=codehype_badge',
      src:'https://www.codehype.ai/badges/everything-hub.svg?variant=find-us&v=20',
      alt:'Featured on CodeHype',width:'180',height:'65'
    }
  };

  for(const [name,document] of pages){
    const group=document.querySelector('.partner-badges');
    assert.ok(group,`${name} has a badge group`);
    assert.equal(group.getAttribute('role'),'group');
    assert.equal(group.getAttribute('aria-label'),'Featured on');
    assert.equal(group.querySelectorAll('a').length,3,`${name} keeps Launch Orbit and adds both new badges`);
    for(const [className,details] of Object.entries(expected)){
      const link=group.querySelector(`.${className}`);
      assert.ok(link,`${name} includes ${className}`);
      assert.equal(link.getAttribute('href'),details.href);
      assert.equal(link.target,'_blank');
      assert.match(link.rel,/noopener/);
      assert.match(link.rel,/noreferrer/);
      const image=link.querySelector('img');
      assert.ok(image,`${className} contains an image`);
      assert.equal(image.src,details.src);
      assert.equal(image.alt,details.alt);
      assert.equal(image.getAttribute('width'),details.width);
      assert.equal(image.getAttribute('height'),details.height);
      assert.equal(image.getAttribute('loading'),'lazy');
      assert.equal(image.getAttribute('decoding'),'async');
      assert.equal(image.hasAttribute('style'),false,'badge presentation stays in the CSP-compatible stylesheet');
    }
  }

  assert.match(css,/\.partner-badge img\{[^}]*max-width:100%[^}]*\}/,'badge images scale to their containing block');
  assert.match(css,/\.partner-badge img\{[^}]*height:auto[^}]*\}/,'responsive images retain their aspect ratio without inline styles');
});
