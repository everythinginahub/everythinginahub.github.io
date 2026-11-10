import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {parseYouTubeVideo,youtubeWorkspace,mountYouTubeWorkspace} from '../public/youtube-player.js';

const id='vCJVXYmXkzM';
test('only valid YouTube IDs and supported HTTPS URLs are accepted',()=>{
 for(const input of [id,` https://www.youtube.com/watch?v=${id}&t=3 `,`https://youtube.com/watch?v=${id}`,`https://m.youtube.com/shorts/${id}`,`https://youtu.be/${id}?si=abc`,`https://www.youtube.com/live/${id}`,`https://www.youtube-nocookie.com/embed/${id}`])assert.equal(parseYouTubeVideo(input),id,input);
 for(const input of ['', 'short',`http://www.youtube.com/watch?v=${id}`,`https://youtube.com.evil.test/watch?v=${id}`,`https://evil.test/${id}`,`https://youtu.be/${id}/extra`,`https://user@youtube.com/watch?v=${id}`,`https://youtube.com:8443/watch?v=${id}`,'javascript:alert(1)',`https://youtube.com/watch?v=${id}x`])assert.equal(parseYouTubeVideo(input),null,input);
});
test('search opens the official results page and embeds only validated videos',()=>{
 const dom=new JSDOM(`<main>${youtubeWorkspace()}</main>`,{url:'https://example.test/public/'});try{
  const root=dom.window.document.querySelector('main'),q=s=>root.querySelector(s),ctl=mountYouTubeWorkspace({root,win:dom.window});
  assert.equal(q('#youtubePlayer iframe'),null);assert.equal(q('#youtubeSearchForm').action,'https://www.youtube.com/results');assert.equal(q('#youtubeSearchForm').target,'_blank');assert.match(q('#youtubeSearchForm').getAttribute('rel'),/noopener/);assert.equal(q('#youtubeQuery').name,'search_query');
  q('#youtubeQuery').value='   ';const searchEvent=new dom.window.Event('submit',{bubbles:true,cancelable:true});q('#youtubeSearchForm').dispatchEvent(searchEvent);assert.equal(searchEvent.defaultPrevented,true);assert.match(q('#youtubeSearchError').textContent,/Enter/);
  q('#youtubeLink').value='https://evil.test/watch?v='+id;q('#youtubePlayForm').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));assert.equal(q('#youtubePlayer iframe'),null);assert.equal(q('#youtubeLink').getAttribute('aria-invalid'),'true');
  q('#youtubeLink').value=`https://youtu.be/${id}`;q('#youtubePlayForm').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));assert.equal(q('#youtubePlayer iframe').src,`https://www.youtube-nocookie.com/embed/${id}?rel=0`);assert.equal(q('#youtubeOpen').href,`https://www.youtube.com/watch?v=${id}`);assert.equal(q('#youtubeActions').hidden,false);assert.equal(q('#youtubeLink').hasAttribute('aria-invalid'),false);
  q('#youtubeStop').click();assert.equal(q('#youtubePlayer iframe'),null);assert.equal(q('#youtubeActions').hidden,true);assert.match(q('#youtubePlayer').textContent,/appear here/);
  q('#youtubeLink').value=id;q('#youtubePlayForm').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));ctl.destroy();assert.equal(q('#youtubePlayer iframe'),null);
 }finally{dom.window.close();}
});
