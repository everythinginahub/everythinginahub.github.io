import {startSiteAnalytics} from './site-analytics.js?v=20261106-2';
import {supabaseConfig} from './config.js?v=20261106-4';
import {validateConfig} from './account-backend.js?v=20261114-13';
import {createClient} from './supabase-client.js?v=20261106-4';

export function mountStatus(doc,client,win=window){
 const get=id=>doc.getElementById(id),locked=get('locked'),dashboard=get('dashboard'),message=get('statusMessage');
 let code=null,owner=false,unlocked=false,alive=true,sequence=0,pendingTrackedRefresh=false;
 const fmt=n=>Number(n||0).toLocaleString();
 function clear(){unlocked=false;code=null;sequence++;locked.hidden=false;dashboard.hidden=true;get('hideDashboard').hidden=true;get('accessCode').value='';get('codeValue').value='';if(get('codeDialog').open)get('codeDialog').close();}
 async function read(candidate=code){
  const request=++sequence;let data,error;try{({data,error}=await client.rpc('site_status_read',{p_code:candidate}));}catch{error=true;}if(!alive||request!==sequence)return false;
  if(error||!data){if(unlocked){message.textContent='Could not refresh the dashboard. Please check your connection or access code.';}else message.textContent='Could not open the dashboard. Check the code or your connection.';return false;}
  code=candidate;unlocked=true;locked.hidden=true;dashboard.hidden=false;get('hideDashboard').hidden=false;get('accessCode').value='';message.textContent='';
  const numbers={allViews:data.all_views,signedViews:data.signed_views,guestViews:Math.max(0,Number(data.all_views)-Number(data.signed_views)),uniqueBrowsers:data.unique_browsers,uniqueAccounts:data.unique_accounts,onlineTotal:Number(data.guest_online)+Number(data.signed_online),guestOnline:data.guest_online,signedOnline:data.signed_online};
  for(const [id,value] of Object.entries(numbers))get(id).textContent=fmt(value);
  get('updatedAt').textContent=`Updated ${new Date().toLocaleTimeString()}`;
  const started=new Date(data.started_at);get('started').textContent=`Counting since ${Number.isNaN(started.valueOf())?'tracking began':started.toLocaleString()}. Historical visits before then are not included.`;if(pendingTrackedRefresh){pendingTrackedRefresh=false;void read();}return true;
 }
 async function checkOwner(){const {data,error}=await client.rpc('site_status_is_owner');if(!alive)return;owner=!error&&data===true;get('showCode').hidden=!owner;if(owner&&!unlocked)await read(null);}
 function submit(event){event.preventDefault();const candidate=get('accessCode').value.trim();if(candidate)read(candidate);}
 async function showCode(){if(!owner)return;get('codeMessage').textContent='';const {data,error}=await client.rpc('site_status_code');if(!alive||!owner)return;if(error||typeof data!=='string'){message.textContent='Could not retrieve the code. Make sure you are signed in as the owner.';return;}get('codeValue').value=data;get('codeDialog').showModal();}
 async function copyCode(){try{await win.navigator.clipboard.writeText(get('codeValue').value);get('codeMessage').textContent='Code copied.';}catch{get('codeValue').select();get('codeMessage').textContent='Select and copy the code above.';}}
 const form=get('accessForm'),show=get('showCode'),copy=get('copyCode'),close=get('closeCode'),lock=get('hideDashboard');
 const closeDialog=()=>{get('codeDialog').close();get('codeValue').value='';};
 form.addEventListener('submit',submit);show.addEventListener('click',showCode);copy.addEventListener('click',copyCode);close.addEventListener('click',closeDialog);get('codeDialog').addEventListener('close',()=>{get('codeValue').value='';});lock.addEventListener('click',clear);
 const refresh=()=>{if(unlocked&&!doc.hidden)read();};
 const tracker=startSiteAnalytics(client,win,{onResult(ok){if(!alive)return;get('trackingMessage').textContent=ok?'':'This visit could not be recorded. Counts may be incomplete; check your connection or browser privacy settings.';if(ok){if(unlocked)refresh();else pendingTrackedRefresh=true;}}});
 doc.addEventListener('visibilitychange',refresh);get('refreshStatus').addEventListener('click',refresh);
 const {data:subscription}=client.auth.onAuthStateChange(event=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT')win.setTimeout(()=>{if(event==='SIGNED_OUT'){owner=false;show.hidden=true;if(unlocked&&!code)clear();}checkOwner();},0);});
 client.auth.getSession().then(checkOwner).catch(()=>{message.textContent='Could not check your account. You can still try an access code.';});
 const timer=win.setInterval(refresh,30000);
 return {destroy(){alive=false;sequence++;tracker.destroy();doc.removeEventListener('visibilitychange',refresh);get('refreshStatus').removeEventListener('click',refresh);win.clearInterval(timer);subscription?.subscription?.unsubscribe();form.removeEventListener('submit',submit);show.removeEventListener('click',showCode);copy.removeEventListener('click',copyCode);close.removeEventListener('click',closeDialog);lock.removeEventListener('click',clear);}};
}
if(typeof document !== 'undefined'){
 const config=validateConfig(supabaseConfig);
 if(config.configured)mountStatus(document,createClient(config.url,config.key));
 else document.getElementById('statusMessage').textContent='The dashboard is not configured.';
}
