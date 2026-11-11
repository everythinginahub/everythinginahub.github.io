// First-party aggregate presence counts are written only for signed-in accounts.
export function startSiteAnalytics(client,win=window,{onResult=()=>{},countViews=true}={}){
 if(!client || !win.crypto?.randomUUID){onResult(false);return {destroy(){}};}
 let browser=null;function getBrowserId(){
  if(browser)return browser;
  try{browser=win.localStorage.getItem('everything-status-browser');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(browser||'')){browser=win.crypto.randomUUID();win.localStorage.setItem('everything-status-browser',browser);}}
  catch{browser=win.crypto.randomUUID();}
  return browser;
 }
 const tab=win.crypto.randomUUID();let alive=true,ready=false,signedIn=false,initialAuth=false,pendingFirstView=countViews,queue=Promise.resolve();
 // Empty hash and #home both represent the same page. Auth callback fragments are not routes.
 function route(){const hash=win.location.hash;if(!hash||hash==='#'||hash==='#home')return '#home';if(new URLSearchParams(hash.slice(1)).has('access_token'))return '#home';return hash;}
 let lastRoute=route();
 function ping(view=false){
  if(!alive||!ready||!signedIn||win.document.hidden)return;
  const isView=countViews&&(view||pendingFirstView);pendingFirstView=false;
  queue=queue.then(async()=>{
   if(!alive||!signedIn)return;
   // A failed or ambiguous request is not retried as another view: the server may have counted it already.
   try{const {error}=await client.rpc('site_status_ping',{p_browser:getBrowserId(),p_session:tab,p_view:isView});if(alive)onResult(!error);}
   catch{if(alive)onResult(false);}
  });
 }
 function hash(){const next=route();if(next===lastRoute)return;lastRoute=next;if(!countViews)return;if(!ready||win.document.hidden||!signedIn){pendingFirstView=true;return;}ping(true);}
 function visibility(){if(!win.document.hidden)ping(false);}
 function authChanged(event,session){
  const wasSignedIn=signedIn;signedIn=!!session?.user?.id;
  if(event==='INITIAL_SESSION'){initialAuth=true;return;}
  if(initialAuth&&!wasSignedIn&&signedIn){if(countViews)pendingFirstView=true;win.setTimeout(()=>ping(false),0);}
  else if(initialAuth&&wasSignedIn&&signedIn&&(event==='TOKEN_REFRESHED'||event==='USER_UPDATED'))win.setTimeout(()=>ping(false),0);
 }
 const {data:subscription}=client.auth.onAuthStateChange(authChanged);
 client.auth.getSession().then(({data})=>{if(alive){signedIn=!!data?.session?.user?.id;ready=true;ping(false);}}).catch(()=>{if(alive){signedIn=false;ready=true;}});
 win.addEventListener('hashchange',hash);win.document.addEventListener('visibilitychange',visibility);const timer=win.setInterval(()=>ping(false),60000);
 return {destroy(){alive=false;win.clearInterval(timer);win.removeEventListener('hashchange',hash);win.document.removeEventListener('visibilitychange',visibility);subscription?.subscription?.unsubscribe();}};
}
