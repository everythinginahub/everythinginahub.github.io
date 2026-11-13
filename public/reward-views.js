import { dailyRewardValues } from './rewards.js?v=20261114-6';
import { normalizeProfilePicture } from './profile-picture.js?v=20261114-1';

const activities = [
  {kind:'task', label:'Complete a task', detail:'Check off something on your list', href:'#planner', group:'everyday'},
  {kind:'habit', label:'Check in on a habit', detail:'Mark a habit done today', href:'#habits', group:'everyday'},
  {kind:'list', label:'Check off a list item', detail:'Tick an item in Lists', href:'#lists', group:'everyday'},
  {kind:'reading', label:'Turn a page', detail:'Go forward in a hosted text edition', href:'#ebooks', group:'everyday'},
  {kind:'arcade', label:'Finish an original game', detail:'Clear Skypark Obby or finish a local arcade run', href:'#arcade', group:'everyday'},
  {kind:'card', label:'Review a flashcard', detail:'Mark a card reviewed', href:'#flashcards', group:'learning'},
  {kind:'game', label:'Finish a study game', detail:'Complete a study game round', href:'#games', group:'learning'},
  {kind:'test', label:'Complete a practice test', detail:'Submit a practice test', href:'#tests', group:'learning'}
];

function rewardCards(items, wallet, picture) {
  return `<div class="reward-grid">${items.map(item=>{
    const owned=wallet.owned.includes(item.id),equipped=item.type==='chatColor'?wallet.chatColor===item.id:item.type==='avatarBorder'?wallet.avatarBorder===item.id:wallet.equipped===item.id,affordable=wallet.coins>=item.price;
    const preview=item.type==='badge'?`<div class="reward-badge badge-${item.color}" aria-hidden="true">${item.symbol}</div>`:item.type==='chatColor'?`<div class="reward-chat-preview" data-chat-color="${item.value}" aria-hidden="true"><strong>Aa</strong><small>Your chat name</small></div>`:`<div class="reward-avatar-preview" data-avatar-border="${item.value}" aria-hidden="true">${picture?`<img src="${picture}" alt="">`:'<span>A</span>'}</div>`;
    const ownerLabel=item.ownerOnly?'<span class="owner-exclusive-tag">✦ OWNER EXCLUSIVE</span>':'';
    return `<article class="reward-card" id="reward-${item.id}" tabindex="-1" data-reward-type="${item.type}" ${item.ownerOnly?'data-owner-exclusive':''}>${ownerLabel}${preview}<h3>${item.name}</h3><p>${item.description}</p><div class="reward-card-bottom"><strong>${owned?'Owned':`${item.price} coins`}</strong><button class="btn ${equipped?'outline':'dark'}" data-reward="${item.id}" ${equipped||(!owned&&!affordable)?'disabled':''}>${equipped?'Equipped':owned?'Equip':affordable?'Unlock':`Need ${item.price-wallet.coins} more`}</button></div></article>`;
  }).join('')}</div>`;
}

export function shopView(wallet, catalog, today, profilePicture='', isOwner=false) {
  const visibleCatalog=catalog.filter(item=>!item.ownerOnly||isOwner===true);
  const current=visibleCatalog.find(item=>item.id===wallet.equipped)||visibleCatalog.find(item=>item.type==='badge')||visibleCatalog[0];
  const picture=normalizeProfilePicture(profilePicture);
  const claimed=wallet.daily.date===today?wallet.daily.claimed:[];
  const maxCoins=activities.reduce((sum,item)=>sum+dailyRewardValues[item.kind],0);
  const earned=activities.reduce((sum,item)=>sum+(claimed.includes(item.kind)?dailyRewardValues[item.kind]:0),0);
  const rows=group=>activities.filter(item=>item.group===group).map(item=>{
    const done=claimed.includes(item.kind);
    return `<a class="reward-task ${done?'is-claimed':''}" href="${item.href}"><span class="reward-task-check" aria-hidden="true">${done?'✓':'○'}</span><span class="reward-task-copy"><strong>${item.label}</strong><small>${done?'Earned today':item.detail}</small></span><span class="reward-task-value">+${dailyRewardValues[item.kind]} <span class="sr-only">coins${done?', earned today':''}</span></span></a>`;
  }).join('');
  return `<div class="rewards-page"><div class="shop-hero"><div><p class="eyebrow">YOUR COLLECTION</p><h1>Rewards</h1><p>Collect coins through everyday activities, then personalise your space.</p><div class="shop-wallet"><strong>${wallet.coins}</strong> coins <span class="shop-wallet-divider">·</span> ${earned} / ${maxCoins} earned today</div></div><div class="shop-hero-badge badge-${current.color}" aria-hidden="true">${current.symbol}</div></div><section aria-labelledby="rewardWays"><div class="section-head"><div><p class="eyebrow">A LITTLE SOMETHING FOR YOUR DAY</p><h2 id="rewardWays">Ways to earn</h2><p>Each activity earns coins once per local day, up to ${maxCoins} coins. You don’t need to do them all.</p></div></div><h3 class="reward-group-title">Everyday &amp; play</h3><div class="reward-tasks">${rows('everyday')}</div><h3 class="reward-group-title">Learning, if you like</h3><div class="reward-tasks">${rows('learning')}</div></section><section aria-labelledby="rewardBadges"><div class="section-head"><div><p class="eyebrow">YOUR STYLE</p><h2 id="rewardBadges">Choose a badge</h2><p>Unlock with virtual coins and change your badge whenever you like.</p></div></div>${rewardCards(visibleCatalog.filter(item=>item.type==='badge'),wallet,picture)}</section><section aria-labelledby="rewardChatColours"><div class="section-head"><div><p class="eyebrow">SAY IT YOUR WAY</p><h2 id="rewardChatColours">Chat colours</h2><p>Colour your name on your own messages in Community chat. Your preference is private to your account.</p></div></div>${rewardCards(visibleCatalog.filter(item=>item.type==='chatColor'),wallet,picture)}</section><section aria-labelledby="rewardPictureBorders"><div class="section-head"><div><p class="eyebrow">A LITTLE FRAME</p><h2 id="rewardPictureBorders">Profile picture borders</h2><p>Choose a ring for your account picture. Upload a picture from your account menu.</p></div></div>${rewardCards(visibleCatalog.filter(item=>item.type==='avatarBorder'),wallet,picture)}</section><p class="game-privacy-note">Coins and customisations are cosmetic, not money or prizes. Your profile picture is stored with your private account progress and appears only in your account and on your own chat view; it isn’t broadcast to other learners. As with other progress, simultaneous edits on different devices can overwrite one another.</p></div>`;
}
