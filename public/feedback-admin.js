const CATEGORY_LABELS={suggestion:'Suggestion',problem:'Problem',other:'Something else'};

export function feedbackAdminView({isOwner=false}={}){
 if(!isOwner)return `<div class="feedback-admin-page"><header class="feedback-admin-heading"><p class="eyebrow">PRIVATE SITE AREA</p><h1>Feedback inbox</h1></header><section class="feedback-admin-locked" role="alert"><h2>Owner access required</h2><p>This inbox is available only to the verified site-owner account.</p><a class="btn outline" href="#home">Return to your workspace</a></section></div>`;
 return `<div class="feedback-admin-page"><header class="feedback-admin-heading"><p class="eyebrow">PRIVATE SITE AREA</p><h1>Feedback inbox</h1><p>Recent messages sent through the Everything Hub feedback form.</p></header><section class="feedback-inbox" aria-labelledby="feedbackInboxTitle"><div class="feedback-inbox-toolbar"><div><h2 id="feedbackInboxTitle">Recent submissions</h2><p>Newest first · up to 100 messages</p></div><button class="btn outline" id="refreshFeedbackInbox" type="button">Refresh</button></div><p id="feedbackInboxStatus" class="feedback-inbox-status" role="status" aria-live="polite" aria-atomic="true">Loading feedback…</p><ol id="feedbackInboxList" class="feedback-inbox-list" aria-label="Recent feedback messages" aria-busy="true"></ol></section><p class="feedback-inbox-note">Read-only owner inbox. Feedback is user-submitted text; treat any links or personal details with care.</p></div>`;
}

export function mountFeedbackAdmin({root,client,win=window,isOwner=false}={}){
 if(isOwner!==true||!root||!client?.rpc)return {destroy(){}};
 const status=root.querySelector('#feedbackInboxStatus'),list=root.querySelector('#feedbackInboxList'),refreshButton=root.querySelector('#refreshFeedbackInbox');
 if(!status||!list||!refreshButton)return {destroy(){}};
 let alive=true,sequence=0;
 function setStatus(text,error=false){status.textContent=text;status.classList.toggle('feedback-inbox-status-error',error);}
 function renderRow(record){
  const item=win.document.createElement('li');item.className='feedback-inbox-item';
  const meta=win.document.createElement('div');meta.className='feedback-inbox-meta';
  const category=win.document.createElement('span');category.className='feedback-inbox-category';category.textContent=CATEGORY_LABELS[record?.category]||'Feedback';
  const page=win.document.createElement('span');page.className='feedback-inbox-page';page.textContent=String(record?.page||'website');
  const timestamp=win.document.createElement('time');
  const date=new Date(record?.created_at);
  if(!Number.isNaN(date.valueOf())){timestamp.dateTime=date.toISOString();timestamp.textContent=date.toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'});}
  else timestamp.textContent='Date unavailable';
  meta.append(category,page,timestamp);
  const message=win.document.createElement('p');message.className='feedback-inbox-message';message.textContent=String(record?.message||'');
  item.append(meta,message);return item;
 }
 async function refresh(){
  const request=++sequence;refreshButton.disabled=true;list.setAttribute('aria-busy','true');list.replaceChildren();setStatus('Loading feedback…');
  try{
   const {data,error}=await client.rpc('site_feedback_admin_list',{p_limit:100});
   if(!alive||request!==sequence)return;
   if(error||!Array.isArray(data)){setStatus('Could not load feedback. Check that you are signed in with the site-owner account, then try again.',true);return;}
   if(!data.length){setStatus('No feedback has been submitted yet.');return;}
   list.replaceChildren(...data.slice(0,100).map(renderRow));
   setStatus(`Showing ${Math.min(data.length,100)} of the most recent feedback messages.`);
  }catch{
   if(alive&&request===sequence)setStatus('Could not load feedback. Check your connection and try again.',true);
  }finally{
   if(alive&&request===sequence){refreshButton.disabled=false;list.setAttribute('aria-busy','false');}
  }
 }
 refreshButton.addEventListener('click',refresh);void refresh();
 return {destroy(){alive=false;sequence++;refreshButton.removeEventListener('click',refresh);}};
}
