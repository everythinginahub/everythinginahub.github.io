import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {parseYouTubeVideo,youtubeWorkspace,mountYouTubeWorkspace} from '../public/youtube-player.js';
import {videos} from '../public/videos.js';

const id='vCJVXYmXkzM';
test('only valid YouTube IDs and supported HTTPS URLs are accepted',()=>{
 for(const input of [id,`https://www.youtube.com/watch?v=${id}&t=3`,`https://youtube.com/watch?v=${id}`,`https://m.youtube.com/shorts/${id}`,`https://youtu.be/${id}?si=abc`,`https://www.youtube.com/live/${id}`,`https://www.youtube-nocookie.com/embed/${id}`])assert.equal(parseYouTubeVideo(input),id,input);
 for(const input of ['', 'short',`http://www.youtube.com/watch?v=${id}`,`https://youtube.com.evil.test/watch?v=${id}`,`https://evil.test/${id}`,`https://youtu.be/${id}/extra`,`https://user@youtube.com/watch?v=${id}`,`https://youtube.com:8443/watch?v=${id}`,'javascript:alert(1)',`https://youtube.com/watch?v=${id}x`])assert.equal(parseYouTubeVideo(input),null,input);
});
test('Bing Videos search loads its page in-site; direct YouTube links embed only validated videos',()=>{
 const dom=new JSDOM(`<main>${youtubeWorkspace()}</main>`,{url:'https://example.test/public/'});try{
  const root=dom.window.document.querySelector('main'),q=s=>root.querySelector(s),ctl=mountYouTubeWorkspace({root,win:dom.window});
  assert.equal(q('#bingVideosSearchForm').action,'https://www.bing.com/videos/search');assert.equal(q('#bingVideosSearchForm').target,'bingVideosFrame');assert.equal(q('#bingVideosFrame').name,'bingVideosFrame');assert.equal(q('#bingVideosFrame').src,'about:blank');assert.equal(q('#bingVideosFrameWrap').hidden,true);
  q('#bingVideosQuery').value='   ';const emptyEvent=new dom.window.Event('submit',{bubbles:true,cancelable:true});q('#bingVideosSearchForm').dispatchEvent(emptyEvent);assert.equal(emptyEvent.defaultPrevented,true);assert.match(q('#bingVideosSearchError').textContent,/Enter/);assert.equal(q('#bingVideosQuery').getAttribute('aria-invalid'),'true');
  q('#bingVideosQuery').value='  space documentaries  ';const searchEvent=new dom.window.Event('submit',{bubbles:true,cancelable:true});q('#bingVideosSearchForm').dispatchEvent(searchEvent);assert.equal(searchEvent.defaultPrevented,true);assert.equal(q('#bingVideosQuery').value,'space documentaries');assert.equal(q('#bingVideosFrame').src,'https://www.bing.com/videos/search?q=space+documentaries&mkt=en-GB');assert.equal(q('#bingVideosOpen').href,'https://www.bing.com/videos/search?q=space+documentaries&mkt=en-GB');assert.equal(q('#bingVideosFrameWrap').hidden,false);assert.equal(q('#bingVideosOpen').hidden,false);assert.match(q('#bingVideosStatus').textContent,/inside this page/);
  q('#youtubeLink').value='https://evil.test/watch?v='+id;q('#youtubePlayForm').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));assert.equal(q('#youtubePlayer iframe'),null);assert.equal(q('#youtubeLink').getAttribute('aria-invalid'),'true');
  q('#youtubeLink').value=`https://youtu.be/${id}`;q('#youtubePlayForm').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));assert.equal(q('#youtubePlayer iframe').src,`https://www.youtube-nocookie.com/embed/${id}?rel=0`);assert.equal(q('#youtubeOpen').href,`https://www.youtube.com/watch?v=${id}`);assert.equal(q('#youtubeActions').hidden,false);assert.equal(q('#youtubeLink').hasAttribute('aria-invalid'),false);
  q('#youtubeStop').click();assert.equal(q('#youtubePlayer iframe'),null);assert.equal(q('#youtubeActions').hidden,true);assert.match(q('#youtubePlayer').textContent,/appear here/);
  q('#youtubeLink').value=id;q('#youtubePlayForm').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));ctl.destroy();assert.equal(q('#youtubePlayer iframe'),null);assert.equal(q('#bingVideosFrame').src,'about:blank');
 }finally{dom.window.close();}
});
test('in-player search filters selected lessons and loads a result with one click',()=>{
 const dom=new JSDOM(`<main>${youtubeWorkspace(videos)}</main>`,{url:'https://example.test/public/'});try{
  const root=dom.window.document.querySelector('main'),q=s=>root.querySelector(s),ctl=mountYouTubeWorkspace({root,win:dom.window,videos});
  q('#youtubeLibraryQuery').value='  osmosis  ';const event=new dom.window.Event('submit',{bubbles:true,cancelable:true});q('#youtubeLibrarySearchForm').dispatchEvent(event);
  assert.equal(event.defaultPrevented,true);assert.equal(q('#youtubeLibraryQuery').value,'osmosis');assert.equal(root.querySelectorAll('#youtubeLibraryResults button').length,1);assert.match(q('#youtubeLibraryStatus').textContent,/1 selected lesson video found/);
  const result=q('#youtubeLibraryResults button');assert.match(result.getAttribute('aria-label'),/Osmosis/);assert.match(result.querySelector('img').src,/i\.ytimg\.com\/vi\/vCJVXYmXkzM\/mqdefault\.jpg/);
  result.click();assert.equal(q('#youtubePlayer iframe').src,'https://www.youtube-nocookie.com/embed/vCJVXYmXkzM?rel=0');assert.equal(q('#youtubeActions').hidden,false);assert.equal(q('#bingVideosQuery').value,'osmosis');
  q('#youtubeLibraryQuery').value='no selected lesson has this phrase';q('#youtubeLibrarySearchForm').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));assert.equal(q('#youtubeLibraryResults').children.length,0);assert.match(q('#youtubeLibraryStatus').textContent,/No selected lesson videos match/);assert.equal(q('#bingVideosQuery').value,'no selected lesson has this phrase');
  ctl.destroy();assert.equal(q('#youtubePlayer iframe'),null);assert.equal(q('#youtubeLibraryResults').children.length,0);
 }finally{dom.window.close();}
});
