// A browser id estimates visitors; a per-tab id powers recent-presence estimates.
export function startSiteAnalytics(client,win=window,{onResult=()=>{}}={}){
 if(!client || !win.crypto?.randomUUID){onResult(false);return {destroy(){}};}
 let browser;try{browser=win.localStorage.getItem('everything-status-browser');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(browser||'')){browser=win.crypto.randomUUID();win.localStorage.setItem('everything-status-browser',browser);}}catch{browser=win.crypto.randomUUID();}
 const tab=win.crypto.randomUUID();let alive=true,ready=false,initialAuth=false,pendingFirstView=true,queue=Promise.resolve();
 function ping(view=false){
  if(!alive||!ready||win.document.hidden)return;
  const isView=view||pendingFirstView;pendingFirstView=false;
  queue=queue.then(async()=>{
   if(!alive)return;
   try{const {error}=await client.rpc('site_status_ping',{p_browser:browser,p_session:tab,p_view:isView});if(!alive)return;if(error){if(isView)pendingFirstView=true;onResult(false);return;}onResult(true);}
   catch{if(!alive)return;if(isView)pendingFirstView=true;onResult(false);}
  });
 }
 function hash(){ping(true);}function visibility(){if(!win.document.hidden)ping(false);}
 const {data:subscription}=client.auth.onAuthStateChange((event)=>{if(event==='INITIAL_SESSION'){initialAuth=true;return;}if(initialAuth&&(event==='SIGNED_IN'||event==='SIGNED_OUT'))win.setTimeout(()=>ping(true),0);});
 client.auth.getSession().then(()=>{if(alive){ready=true;ping(true);}}).catch(()=>{if(alive){ready=true;ping(true);}});
 win.addEventListener('hashchange',hash);win.document.addEventListener('visibilitychange',visibility);const timer=win.setInterval(()=>ping(false),60000);
 return {destroy(){alive=false;win.clearInterval(timer);win.removeEventListener('hashchange',hash);win.document.removeEventListener('visibilitychange',visibility);subscription?.subscription?.unsubscribe();}};
}
