// Room chat is isolated from the game view so typing and scroll position survive game updates.
export function mountLiveChat({root,client,roomId,isHost,win=window}) {
  let stopped=false, inFlight=null, enabled=false, sending=false, moderating=false;
  root.innerHTML=`<section class="live-panel live-chat" aria-labelledby="liveChatTitle"><div class="live-chat-heading"><div><p class="eyebrow">YOUR GAME ROOM</p><h2 id="liveChatTitle" tabindex="-1">Room chat</h2></div><span class="live-chat-badge">LIVE</span></div><p class="live-chat-note">Only players in this game can see messages. Be kind and don’t share personal information. English-language rules check messages but can miss unsafe content.</p>${isHost?'<button class="live-chat-toggle" type="button" data-chat-toggle disabled>Pause chat</button>':''}<div id="liveChatMessages" class="live-chat-messages" role="log" aria-label="Room messages" aria-live="polite" aria-relevant="additions"><p class="live-chat-empty">Loading chat…</p></div><form id="liveChatForm"><label for="liveChatInput">Your message</label><div class="live-chat-compose"><input id="liveChatInput" name="message" maxlength="250" placeholder="Say something…" autocomplete="off" required disabled><button class="btn dark" type="submit" disabled>Send</button></div><small>Up to 250 characters · Please be respectful</small><p id="liveChatError" class="live-chat-error" role="alert"></p></form><p id="liveChatStatus" class="live-chat-status" role="status">Connecting…</p></section>`;
  const input=root.querySelector('#liveChatInput'),form=root.querySelector('#liveChatForm'),send=form.querySelector('button'),list=root.querySelector('#liveChatMessages'),error=root.querySelector('#liveChatError'),status=root.querySelector('#liveChatStatus'),toggle=root.querySelector('[data-chat-toggle]');
  const rpc=async(name,args)=>{const result=await client.rpc(name,args);if(result.error)throw result.error;return result.data;};
  function render(data){
    if(!data || !Array.isArray(data.messages) || typeof data.enabled!=='boolean')throw new Error('Invalid chat response');
    enabled=data.enabled;input.disabled=!enabled;send.disabled=!enabled||sending;
    if(toggle){toggle.disabled=moderating;toggle.textContent=enabled?'Pause chat':'Resume chat';}
    status.textContent=enabled?'Updates every few seconds':'The host has paused chat.';
    const nearBottom=list.scrollHeight-list.scrollTop-list.clientHeight<32;
    const keep=new Set(data.messages.map(m=>String(m.id)));
    for(const child of [...list.querySelectorAll('[data-message-id]')])if(!keep.has(child.dataset.messageId))child.remove();
    const existing=new Set([...list.querySelectorAll('[data-message-id]')].map(el=>el.dataset.messageId));
    if(data.messages.length)list.querySelector('.live-chat-empty')?.remove();
    for(const message of data.messages){
      if(existing.has(String(message.id))){const item=[...list.querySelectorAll('[data-message-id]')].find(el=>el.dataset.messageId===String(message.id));const header=item.querySelector('.live-chat-message-head');const author=header.querySelector('strong'),label=message.mine?'You':message.name;if(author.textContent!==label)author.textContent=label;let tag=header.querySelector('.chat-owner-badge');if(message.isOwner===true&&!tag){tag=win.document.createElement('span');tag.className='chat-owner-badge';tag.textContent='Owner';header.querySelector('strong').after(tag);}else if(message.isOwner!==true)tag?.remove();continue;}
      const item=win.document.createElement('div');item.className=`live-chat-message${message.mine?' mine':''}`;item.dataset.messageId=message.id;
      const header=win.document.createElement('div');header.className='live-chat-message-head';
      const author=win.document.createElement('strong');author.textContent=message.mine?'You':message.name;const byline=win.document.createElement('span');byline.className='chat-author';byline.append(author);header.append(byline);if(message.isOwner===true){const tag=win.document.createElement('span');tag.className='chat-owner-badge';tag.textContent='Owner';byline.append(tag);}
      if(isHost||message.mine){const remove=win.document.createElement('button');remove.type='button';remove.className='live-chat-remove';remove.dataset.chatDelete=message.id;remove.setAttribute('aria-label',message.mine?'Delete your message':`Delete message from ${message.name}`);remove.textContent='Delete';header.append(remove);}
      const text=win.document.createElement('p');text.textContent=message.text;item.append(header,text);list.append(item);
    }
    if(!data.messages.length){let empty=list.querySelector('.live-chat-empty');if(!empty){empty=win.document.createElement('p');empty.className='live-chat-empty';list.append(empty);}if(empty.textContent!=='No messages yet. Say hello!')empty.textContent='No messages yet. Say hello!';}
    if(nearBottom)list.scrollTop=list.scrollHeight;
  }
  function poll(){
    if(stopped)return Promise.resolve();if(inFlight)return inFlight;
    inFlight=(async()=>{try{const data=await rpc('live_chat_list',{p_room:roomId});if(!stopped)render(data);}catch{if(!stopped){status.textContent='Chat connection interrupted. Retrying…';const empty=list.querySelector('.live-chat-empty');if(empty)empty.textContent='Chat could not load. Retrying…';}}})().finally(()=>{inFlight=null;});return inFlight;
  }
  async function refreshAfterWrite(){if(inFlight)await inFlight;await poll();}
  async function submit(e){
    e.preventDefault();if(sending||!enabled)return;
    const value=input.value,text=value.trim();error.textContent='';
    if(!text||[...text].length>250||/[\x00-\x1f\x7f]/.test(text)){error.textContent='Use 1 to 250 characters on one line.';return;}
    sending=true;send.disabled=true;
    try{await rpc('live_chat_send',{p_room:roomId,p_text:text});if(stopped)return;if(input.value===value)input.value='';await refreshAfterWrite();}
    catch(err){if(!stopped)error.textContent=err.message||'Could not send. Please try again.';}
    finally{sending=false;if(!stopped)send.disabled=!enabled;}
  }
  async function click(e){
    const button=e.target.closest('button');if(!button||moderating)return;
    const message=button.dataset.chatDelete;const isToggle=button.hasAttribute('data-chat-toggle');if(!message&&!isToggle)return;
    if(message&&!win.confirm('Delete this message?'))return;
    moderating=true;button.disabled=true;error.textContent='';
    try{if(message)await rpc('live_chat_delete',{p_room:roomId,p_message:message});else await rpc('live_chat_toggle',{p_room:roomId,p_enabled:!enabled});await refreshAfterWrite();}
    catch(err){if(!stopped)error.textContent=err.message||'Could not update chat.';}
    finally{moderating=false;if(!stopped&&button.isConnected)button.disabled=false;}
  }
  form.addEventListener('submit',submit);root.addEventListener('click',click);poll();const timer=win.setInterval(poll,2500);
  return {destroy(){stopped=true;win.clearInterval(timer);form.removeEventListener('submit',submit);root.removeEventListener('click',click);}};
}
