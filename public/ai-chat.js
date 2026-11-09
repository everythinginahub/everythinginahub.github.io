// A fresh client belongs to one open page, not to a shared account or API key.
// No prompt history or credentials are stored in Everything Hub.
const SPACE='Zacheus10/free-ai-chat';
export function responseText(result){
 let value=Array.isArray(result?.data)?result.data[0]:result?.data;
 if(value&&typeof value==='object'&&!Array.isArray(value)){
  if(value.error)throw new Error(String(value.error));
  value=value.response??value.text??value.generated_text??value.content??value.message??value;
 }
 if(value===null||value===undefined)throw new Error('Empty response');
 const text=typeof value==='string'?value:JSON.stringify(value,null,2);
 if(!text?.trim())throw new Error('Empty response');
 return text.length>20000?text.slice(0,20000)+'\n\n[Response shortened]':text;
}
export function aiChatWorkspace(){return `<div class="ai-api-workspace" id="aiApiWorkspace"><div class="ai-api-heading"><div><h3>Ask a question</h3><p>A new session starts in this tab when you send a message. Nothing is saved in the hub.</p></div><button type="button" class="btn outline" id="aiNewSession">New session</button></div><div class="ai-api-thread" id="aiApiThread" aria-label="Questions and answers"><div class="ai-api-welcome" id="aiWelcome"><strong>What would you like to know?</strong><p>Ask for an explanation, explore an idea, or get help with a question.</p></div></div><p id="aiApiStatus" class="ai-api-status" role="status" aria-live="polite"></p><form id="aiApiForm"><label for="aiMessage">Your question</label><textarea id="aiMessage" name="message" autocomplete="off" maxlength="4000" rows="3" required placeholder="Ask a question…"></textarea><div class="ai-api-actions"><span>Each question is sent independently; earlier messages aren’t included. Don’t include sensitive information.</span><button class="btn dark" type="submit" id="aiSend">Send question →</button></div></form><p class="ai-api-footnote">Your message goes directly to the third-party Space. Separate sessions do not create separate Hugging Face accounts or bypass usage limits.</p></div>`;}
export async function connectAi({load=()=>import('./gradio-client.js?v=20261114-20')}={}){const {Client}=await load();return Client.connect(SPACE,{record_history:false});}
export function mountAiChat({root,win=window,connect=connectAi,timeoutMs=120000}={}){
 let client=null,disposed=false,busy=false,sequence=0,timer=null;const q=s=>root.querySelector(s),form=q('#aiApiForm'),thread=q('#aiApiThread'),status=q('#aiApiStatus'),input=q('#aiMessage'),send=q('#aiSend');
 function close(){try{client?.close?.();}catch{}client=null;}
 function reset(message='New session started.'){sequence++;if(timer!==null){win.clearTimeout(timer);timer=null;}close();busy=false;send.disabled=false;thread.replaceChildren();const welcome=win.document.createElement('div');welcome.className='ai-api-welcome';const strong=win.document.createElement('strong');strong.textContent='What would you like to know?';const p=win.document.createElement('p');p.textContent='Ask for an explanation, explore an idea, or get help with a question.';welcome.append(strong,p);thread.append(welcome);input.value='';status.textContent=message;}
 function append(role,text){q('#aiWelcome')?.remove();const welcome=thread.querySelector('.ai-api-welcome');welcome?.remove();const item=win.document.createElement('div');item.className=`ai-api-message ${role==='You'?'is-user':'is-assistant'}`;const label=win.document.createElement('strong');label.textContent=role;const body=win.document.createElement('p');body.textContent=text;item.append(label,body);thread.append(item);while(thread.children.length>30)thread.firstElementChild.remove();thread.scrollTop=thread.scrollHeight;return body;}
 function errorMessage(error){const detail=String(error?.message||error||'');if(/quota|limit|rate.?limit|too many|429|gpu.?time/i.test(detail))return 'The AI provider reports a usage limit. Please wait and try again, or open the original Space below.';if(/timeout|timed out/i.test(detail))return 'The request took too long. Please try again or open the original Space below.';return 'Could not get a response. The Space may be busy, unavailable, blocked by your browser, or require sign-in. Please try again or open the original Space below.';}
 async function submit(e){if(e.target!==form)return;e.preventDefault();if(busy||disposed)return;const message=input.value.trim();if(!message||message.length>4000){status.textContent='Enter a question of up to 4,000 characters.';return;}busy=true;send.disabled=true;const request=++sequence;let ownTimer=null,finished=false;append('You',message);status.textContent='Connecting and waiting for a response…';
  const work=(async()=>{let active=client;if(!active){active=await connect();if(disposed||request!==sequence){try{active?.close?.();}catch{}return null;}client=active;}return active.predict('/generate',{message,max_new_tokens:1024,temperature:0.7});})();
  try{const result=await Promise.race([work,new Promise((_,reject)=>{ownTimer=win.setTimeout(()=>reject(new Error('Request timed out')),timeoutMs);timer=ownTimer;})]);if(disposed||request!==sequence)return;const answer=responseText(result);append('Assistant',answer);if(input.value.trim()===message)input.value='';status.textContent='Response received. Check important answers.';finished=true;}
  catch(error){if(disposed||request!==sequence)return;sequence++;close();status.textContent=errorMessage(error);finished=true;}
  finally{if(ownTimer!==null)win.clearTimeout(ownTimer);if(timer===ownTimer)timer=null;if(!disposed&&finished){busy=false;send.disabled=false;}}
 }
 function click(e){if(e.target.closest('#aiNewSession')){reset();input.focus();}}
 root.addEventListener('submit',submit);root.addEventListener('click',click);
 return {destroy(){disposed=true;sequence++;if(timer!==null)win.clearTimeout(timer);timer=null;close();thread.replaceChildren();input.value='';status.textContent='';root.removeEventListener('submit',submit);root.removeEventListener('click',click);}};
}
