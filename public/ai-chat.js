const sparkle = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2.5c.7 5.4 3.1 7.8 8.5 8.5-5.4.7-7.8 3.1-8.5 8.5-.7-5.4-3.1-7.8-8.5-8.5C8.9 10.3 11.3 7.9 12 2.5Z" fill="currentColor"/><path d="M19 16.5c.25 1.8 1.05 2.6 2.8 2.8-1.75.25-2.55 1.05-2.8 2.8-.25-1.75-1.05-2.55-2.8-2.8 1.75-.2 2.55-1 2.8-2.8Z" fill="currentColor"/></svg>`;
function welcomeMarkup(){return `<div class="ai-api-welcome"><span class="ai-welcome-icon">${sparkle}</span><p class="ai-welcome-kicker">A LITTLE HELP, ON HAND</p><strong>What’s on your mind?</strong><p>Ask a question, make sense of something new, or get a fresh perspective.</p><div class="ai-suggestions" aria-label="Question ideas"><button type="button" data-ai-prompt="Explain a difficult topic in simple terms">Explain a topic <span aria-hidden="true">↗</span></button><button type="button" data-ai-prompt="Help me come up with ideas for a creative project">Spark an idea <span aria-hidden="true">↗</span></button><button type="button" data-ai-prompt="Help me make a simple plan for my week">Make a plan <span aria-hidden="true">↗</span></button></div></div>`;}
export function aiChatWorkspace(){return `<div class="ai-api-workspace" id="aiApiWorkspace"><div class="ai-api-heading"><div class="ai-chat-identity"><span class="ai-chat-mark">${sparkle}</span><div><h3>Everything Hub AI</h3><p><span class="ai-online-dot" aria-hidden="true"></span>Connected to the configured AI provider</p></div></div><button type="button" class="ai-clear" id="aiNewSession" title="Clear the chat display"><span aria-hidden="true">↺</span> Clear chat</button></div><div class="ai-api-thread" id="aiApiThread" aria-label="Questions and answers">${welcomeMarkup()}</div><p id="aiApiStatus" class="ai-api-status" role="status" aria-live="polite"></p><form id="aiApiForm"><label for="aiMessage">Your question</label><div class="ai-composer"><textarea id="aiMessage" name="message" autocomplete="off" maxlength="4000" rows="3" required placeholder="Ask anything you’re curious about…"></textarea><div class="ai-compose-bottom"><span id="aiCharCount" aria-live="off">0 / 4,000</span><button class="ai-send" type="submit" id="aiSend">Send question <span aria-hidden="true">↗</span></button></div></div><p class="ai-compose-note">Each question is independent; earlier messages aren’t included.</p></form><p class="ai-api-footnote">AI can make mistakes. Check important answers.</p></div>`;}
async function functionError(error,fallback){
 let detail;try{detail=await error?.context?.json();}catch{}
 return new Error(typeof detail?.error==='string'?detail.error:fallback);
}

function localServerBase(value){
 let url;try{url=new URL(String(value||''));}catch{throw new Error('Enter a valid local model-server address.');}
 const host=url.hostname.toLowerCase();
 if(!['localhost','127.0.0.1','[::1]'].includes(host)||!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||!['','/','/v1'].includes(url.pathname))throw new Error('For safety, use an HTTP(S) loopback address such as http://localhost:11434/v1.');
 url.pathname='/v1';return url.href.replace(/\/$/,'');
}
function readLocalModels(payload){return Array.isArray(payload?.data)?payload.data:Array.isArray(payload?.models)?payload.models:Array.isArray(payload)?payload:[];}
function localParameterCount(item,id){
 const value=item?.parameters_b??item?.parameter_count_b??item?.parametersB;
 if(typeof value==='number'&&Number.isFinite(value)&&value>0)return value;
 const text=typeof value==='string'?value:String(id||'');
 const match=text.match(/(?:^|[^0-9])(\d+(?:\.\d+)?)\s*b(?:$|[^a-z0-9])/i)||String(id||'').match(/(?:^|[^0-9])(\d+(?:\.\d+)?)\s*b(?:$|[^a-z0-9])/i);
 return match?Number(match[1]):0;
}
export async function fetchLocalModels(baseUrl,{signal,fetcher=globalThis.fetch}={}){
 const base=localServerBase(baseUrl);
 if(typeof fetcher!=='function')throw new Error('This browser cannot check a local model server.');
 let response;
 try{response=await fetcher(`${base}/models`,{method:'GET',headers:{Accept:'application/json'},mode:'cors',credentials:'omit',redirect:'error',signal});}
 catch(error){if(signal?.aborted||error?.name==='AbortError')throw error;throw new Error('Could not reach that local server. Start it and allow this site in its CORS settings.');}
 if(!response.ok)throw new Error(`The local server returned HTTP ${response.status} while listing models.`);
 let payload;try{payload=await response.json();}catch{throw new Error('The local server returned an invalid model list.');}
 const models=[],items=readLocalModels(payload).slice(0,100);
 for(const item of items){
  const id=typeof item?.id==='string'?item.id.trim():typeof item?.name==='string'?item.name.trim():'';
  if(!id||id.length>180||/[\u0000-\u001f\u007f]/.test(id))continue;
  const parametersB=localParameterCount(item,id);if(parametersB<7)continue;
  const category=/abliterat|heretic|uncensored|unfiltered|dolphin|obliterat|lorablated|stheno|cydonia|magnum|skyfall|behemoth|rocinante|lumimaid|dark[-_ ]?orthia|wicked|impish|fimbulvetr|mythomax|noromaid|lunaris|wayfarer/i.test(id)?'abliterated':'standard';
  const contextLength=Number(item.context_length||item.context_window||0);
  models.push({id,provider:'local',name:id,providerLabel:'Local server',category,parametersB,contextLength:Number.isFinite(contextLength)?contextLength:0,maxOutputTokens:1024,workers:0,queued:0,baseUrl:base});
 }
 return {models,hidden:Math.max(0,items.length-models.length),baseUrl:base};
}
function responseText(payload){
 const content=payload?.choices?.[0]?.message?.content;
 if(typeof content==='string')return content;
 if(Array.isArray(content))return content.filter(part=>part?.type==='text'&&typeof part.text==='string').map(part=>part.text).join('');
 return '';
}
export async function askLocalAi(message,selection,signal,{fetcher=globalThis.fetch}={}){
 const base=localServerBase(selection?.baseUrl),model=typeof selection?.model==='string'?selection.model:'';
 if(!model||model.length>180)throw new Error('Choose an available local model first.');
 try{
  const response=await fetcher(`${base}/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},mode:'cors',credentials:'omit',redirect:'error',signal,body:JSON.stringify({model,messages:[{role:'system',content:'You are Everything Hub AI. Identify the model accurately if asked, follow its own safety rules, be helpful and clear when uncertain. This request is sent directly to the user-configured local server.'},{role:'user',content:message}],temperature:0.7,max_tokens:Math.min(1024,Number(selection?.maxOutputTokens)||1024),stream:false})});
  if(!response.ok)throw new Error(`The local model returned HTTP ${response.status}. Check its model name and server configuration.`);
  let payload;try{payload=await response.json();}catch{throw new Error('The local server returned an invalid AI response.');}
  const answer=responseText(payload).trim();if(!answer)throw new Error('The local model returned an empty response.');
  return {answer,provider:'local',model};
 }catch(error){
  if(signal?.aborted||error?.name==='AbortError')throw error;
  if(error instanceof Error&&/local model|local server/i.test(error.message))throw error;
  throw new Error('Could not reach the local model. Check that the server is running and its CORS settings allow this site.');
 }
}
export async function listAiModels(client,{refresh=false,signal}={}){
 if(!client)throw new Error('The live model list needs a signed-in account.');
 const {data,error}=await client.functions.invoke('ai-chat',{body:{action:'models',refresh},signal});
 if(error)throw await functionError(error,'The live model list is unavailable right now. Try again in a moment.');
 if(!Array.isArray(data?.models))throw new Error('The live model catalog returned an invalid response.');
 return data.models.filter(model=>model&&['hub','aihorde','llm7'].includes(model.provider)&&typeof model.id==='string'&&model.id.length<=180&&typeof model.name==='string'&&['abliterated','standard'].includes(model.category)).map(model=>({...model}));
}
export async function askAi(client,message,signal,selection){
 if(selection?.provider==='local')return askLocalAi(message,selection,signal);
 if(!client)throw new Error('AI chat is not configured yet.');
 const body={message};
 if(selection?.provider){
  if(!['hub','aihorde','llm7'].includes(selection.provider)||typeof selection.model!=='string'||!selection.model)throw new Error('Choose an available AI model.');
  body.provider=selection.provider;body.model=selection.model;
  if(selection.webSearch){body.webSearch=true;body.searchQuery=String(selection.searchQuery||'').slice(0,240);}
 }
 const {data,error}=await client.functions.invoke('ai-chat',{body,signal});
 if(error)throw await functionError(error,'AI chat is unavailable right now. Please try again later.');
 if(typeof data?.answer!=='string'||!data.answer.trim())throw new Error('The AI returned an empty response. This attempt may count towards the short-term rate limit.');
 return data;
}
export function mountAiChat({root,win=window,client,ask=askAi,timeoutMs=60000}={}){
 let disposed=false,busy=false,sequence=0,abort=null,timer=null;const q=s=>root.querySelector(s),form=q('#aiApiForm'),thread=q('#aiApiThread'),status=q('#aiApiStatus'),input=q('#aiMessage'),send=q('#aiSend'),count=q('#aiCharCount');
 function updateCount(){count.textContent=`${input.value.length.toLocaleString('en-GB')} / 4,000`;}
 function cancel(){sequence++;if(timer!==null)win.clearTimeout(timer);timer=null;abort?.abort();abort=null;}
 function reset(){cancel();busy=false;send.disabled=false;thread.innerHTML=welcomeMarkup();input.value='';updateCount();status.textContent='Chat display cleared. Request limits are unchanged.';thread.removeAttribute('aria-busy');}
 function append(role,text){thread.querySelector('.ai-api-welcome')?.remove();const item=win.document.createElement('div');item.className=`ai-api-message ${role==='You'?'is-user':'is-assistant'}`;const label=win.document.createElement('strong');label.textContent=role;const body=win.document.createElement('p');body.textContent=text;item.append(label,body);thread.append(item);while(thread.children.length>30)thread.firstElementChild.remove();thread.scrollTop=thread.scrollHeight;}
 async function submit(e){if(e.target!==form)return;e.preventDefault();if(busy||disposed)return;const message=input.value.trim();if(!message||message.length>4000){status.textContent='Enter a question of up to 4,000 characters.';return;}busy=true;send.disabled=true;const request=++sequence,controller=new AbortController();abort=controller;append('You',message);status.textContent='Thinking…';thread.setAttribute('aria-busy','true');let ownTimer;
  try{const result=await Promise.race([ask(client,message,controller.signal),new Promise((_,reject)=>{ownTimer=win.setTimeout(()=>{controller.abort();reject(new Error('The request took too long. The attempt may count towards the short-term rate limit.'));},timeoutMs);timer=ownTimer;})]);if(disposed||request!==sequence)return;append('Assistant',result.answer);if(input.value.trim()===message){input.value='';updateCount();}status.textContent='Response received. Check important answers.';}
  catch(error){if(disposed||request!==sequence)return;status.textContent=error?.message||'AI chat is unavailable right now.';}
  finally{if(ownTimer!==undefined)win.clearTimeout(ownTimer);if(request===sequence&&!disposed){timer=null;abort=null;busy=false;send.disabled=false;thread.removeAttribute('aria-busy');}}
 }
 function click(e){if(e.target.closest('#aiNewSession')){reset();input.focus();return;}const suggestion=e.target.closest('[data-ai-prompt]');if(suggestion){input.value=suggestion.dataset.aiPrompt;updateCount();input.focus();}}
 root.addEventListener('submit',submit);root.addEventListener('click',click);input.addEventListener('input',updateCount);
 return {destroy(){disposed=true;cancel();thread.replaceChildren();input.value='';status.textContent='';root.removeEventListener('submit',submit);root.removeEventListener('click',click);input.removeEventListener('input',updateCount);}};
}
