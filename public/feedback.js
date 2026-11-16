const pageId = value => /^[a-z0-9-]{1,40}$/.test(value) ? value : 'website';

export function mountFeedback({root=document,client=null,win=window}={}) {
 const dialog=root.querySelector('#feedbackDialog'),form=root.querySelector('#feedbackForm');
 if(!dialog||!form)return {destroy(){}};
 const message=form.querySelector('#feedbackMessage'),category=form.querySelector('#feedbackCategory'),website=form.querySelector('#feedbackWebsite');
 const status=form.querySelector('#feedbackStatus'),count=form.querySelector('#feedbackCount'),submit=form.querySelector('[type="submit"]');
 const closeButtons=[...dialog.querySelectorAll('#closeFeedback, #closeFeedbackSecondary')];
 const triggers=[...root.querySelectorAll('[data-open-feedback]')];
 function showStatus(text,kind=''){
  status.textContent=text;
  status.classList.toggle('feedback-status-error',kind==='error');
 }
 function updateCount(){
  let characters=Array.from(message.value);
  if(characters.length>1500){
   characters=characters.slice(0,1500);
   message.value=characters.join('');
   showStatus('Feedback is limited to 1,500 characters.','error');
  }
  count.textContent=`${characters.length} / 1,500`;
 }
 function openFeedback(event){
  event.preventDefault();
  showStatus('');
  if(!dialog.open)dialog.showModal();
  message.focus();
 }
 function closeFeedback(){if(dialog.open)dialog.close();}
 async function submitFeedback(event){
  event.preventDefault();
  const text=message.value.trim();
  const characterCount=Array.from(text).length;
  if(characterCount<10||characterCount>1500){showStatus('Write between 10 and 1,500 characters.','error');message.focus();return;}
  if(!['suggestion','problem','other'].includes(category.value)){showStatus('Choose a feedback type.','error');category.focus();return;}
  if(!client?.supabaseUrl||!client?.supabaseKey||typeof win.fetch!=='function'){showStatus('Feedback is unavailable right now. Please try again later.','error');return;}
  submit.disabled=true;
  showStatus('Sending feedback…');
  const page=pageId(String(win.location.hash||'').slice(1).split('/')[0].toLowerCase());
  try{
   const endpoint=new URL('/functions/v1/site-feedback',client.supabaseUrl);
   const response=await win.fetch(endpoint.href,{
    method:'POST',mode:'cors',credentials:'omit',
    headers:{'Content-Type':'application/json',apikey:client.supabaseKey},
    body:JSON.stringify({category:category.value,message:text,page,website:website.value})
   });
   let data=null;
   try{data=await response.json();}catch{}
   if(!response.ok){
    const messageFromServer=typeof data?.error==='string'?data.error:'Feedback could not be sent. Please try again later.';
    showStatus(messageFromServer,'error');
    return;
   }
   if(data?.ok!==true){showStatus('Feedback could not be sent. Please try again later.','error');return;}
   form.reset();
   updateCount();
   showStatus('Thanks — your feedback has been sent privately to the site team.');
  }catch{
   showStatus('Feedback could not be sent. Check your connection and try again.','error');
  }finally{
   submit.disabled=false;
  }
 }
 const onDialogClick=event=>{if(event.target===dialog)closeFeedback();};
 for(const trigger of triggers)trigger.addEventListener('click',openFeedback);
 for(const button of closeButtons)button.addEventListener('click',closeFeedback);
 form.addEventListener('submit',submitFeedback);
 message.addEventListener('input',updateCount);
 dialog.addEventListener('click',onDialogClick);
 updateCount();
 return {destroy(){
  for(const trigger of triggers)trigger.removeEventListener('click',openFeedback);
  for(const button of closeButtons)button.removeEventListener('click',closeFeedback);
  form.removeEventListener('submit',submitFeedback);
  message.removeEventListener('input',updateCount);
  dialog.removeEventListener('click',onDialogClick);
 }};
}
