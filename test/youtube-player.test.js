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

test('the player panel is removed while the separate Bing Videos search still loads in-page',()=>{
 const dom=new JSDOM(`<main>${youtubeWorkspace()}</main>`,{url:'https://example.test/public/'});try{
  const root=dom.window.document.querySelector('main'),q=s=>root.querySelector(s),ctl=mountYouTubeWorkspace({root,win:dom.window});
  assert.equal(q('#youtubePlayForm'),null);assert.equal(q('#youtubeLink'),null);assert.equal(q('#youtubePlayer'),null);assert.equal(q('#youtubeActions'),null);
  assert.doesNotMatch(root.textContent,/YOUR PLAYER|Paste a YouTube link to play it below|Your video will appear here/);
  assert.equal(q('#bingVideosSearchForm').action,'https://www.bing.com/videos/search');assert.equal(q('#bingVideosSearchForm').target,'bingVideosFrame');assert.equal(q('#bingVideosFrame').name,'bingVideosFrame');assert.equal(q('#bingVideosFrame').src,'about:blank');assert.equal(q('#bingVideosFrameWrap').hidden,true);
  q('#bingVideosQuery').value='   ';const emptyEvent=new dom.window.Event('submit',{bubbles:true,cancelable:true});q('#bingVideosSearchForm').dispatchEvent(emptyEvent);assert.equal(emptyEvent.defaultPrevented,true);assert.match(q('#bingVideosSearchError').textContent,/Enter/);assert.equal(q('#bingVideosQuery').getAttribute('aria-invalid'),'true');
  q('#bingVideosQuery').value='  space documentaries  ';const searchEvent=new dom.window.Event('submit',{bubbles:true,cancelable:true});q('#bingVideosSearchForm').dispatchEvent(searchEvent);assert.equal(searchEvent.defaultPrevented,true);assert.equal(q('#bingVideosQuery').value,'space documentaries');assert.equal(q('#bingVideosFrame').src,'https://www.bing.com/videos/search?q=space+documentaries&mkt=en-GB');assert.equal(q('#bingVideosOpen').href,'https://www.bing.com/videos/search?q=space+documentaries&mkt=en-GB');assert.equal(q('#bingVideosFrameWrap').hidden,false);assert.equal(q('#bingVideosOpen').hidden,false);assert.match(q('#bingVideosStatus').textContent,/inside this page/);
  ctl.destroy();assert.equal(q('#bingVideosFrame').src,'about:blank');
 }finally{dom.window.close();}
});

test('selected lesson search remains useful and opens only validated YouTube links in a new tab',()=>{
 const dom=new JSDOM(`<main>${youtubeWorkspace(videos)}</main>`,{url:'https://example.test/public/'});try{
  const root=dom.window.document.querySelector('main'),q=s=>root.querySelector(s),ctl=mountYouTubeWorkspace({root,win:dom.window,videos});
  q('#youtubeLibraryQuery').value='  osmosis  ';const event=new dom.window.Event('submit',{bubbles:true,cancelable:true});q('#youtubeLibrarySearchForm').dispatchEvent(event);
  assert.equal(event.defaultPrevented,true);assert.equal(q('#youtubeLibraryQuery').value,'osmosis');assert.equal(root.querySelectorAll('#youtubeLibraryResults a').length,1);assert.match(q('#youtubeLibraryStatus').textContent,/1 selected lesson video found/);
  const result=q('#youtubeLibraryResults a');assert.match(result.getAttribute('aria-label'),/Osmosis.*new tab/);assert.equal(result.href,'https://www.youtube.com/watch?v=vCJVXYmXkzM');assert.equal(result.target,'_blank');assert.match(result.rel,/noopener/);assert.match(result.querySelector('img').src,/i\.ytimg\.com\/vi\/vCJVXYmXkzM\/mqdefault\.jpg/);
  assert.equal(root.querySelectorAll('iframe').length,1);assert.equal(q('#bingVideosFrame').title,'Bing Videos search results');
  q('#youtubeLibraryQuery').value='no selected lesson has this phrase';q('#youtubeLibrarySearchForm').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));assert.equal(q('#youtubeLibraryResults').children.length,0);assert.match(q('#youtubeLibraryStatus').textContent,/No selected lesson videos match/);assert.equal(q('#bingVideosQuery').value,'no selected lesson has this phrase');
  ctl.destroy();assert.equal(q('#youtubeLibraryResults').children.length,0);assert.equal(q('#bingVideosFrame').src,'about:blank');
 }finally{dom.window.close();}
});
