import { dailyRewardValues } from './rewards.js?v=20261114-4';

const activities = [
  {kind:'task', label:'Complete a task', detail:'Check off something on your list', href:'#planner', group:'everyday'},
  {kind:'habit', label:'Check in on a habit', detail:'Mark a habit done today', href:'#habits', group:'everyday'},
  {kind:'list', label:'Check off a list item', detail:'Tick an item in Lists', href:'#lists', group:'everyday'},
  {kind:'reading', label:'Turn a page', detail:'Go forward in a hosted text edition', href:'#ebooks', group:'everyday'},
  {kind:'arcade', label:'Finish an original game', detail:'Play Skyline, Orbit or Reef to the end', href:'#arcade', group:'everyday'},
  {kind:'card', label:'Review a flashcard', detail:'Mark a card reviewed', href:'#flashcards', group:'learning'},
  {kind:'game', label:'Finish a study game', detail:'Complete a study game round', href:'#games', group:'learning'},
  {kind:'test', label:'Complete a practice test', detail:'Submit a practice test', href:'#tests', group:'learning'}
];

export function shopView(wallet, catalog, today) {
  const current=catalog.find(item=>item.id===wallet.equipped)||catalog[0];
  const claimed=wallet.daily.date===today?wallet.daily.claimed:[];
  const maxCoins=activities.reduce((sum,item)=>sum+dailyRewardValues[item.kind],0);
  const earned=activities.reduce((sum,item)=>sum+(claimed.includes(item.kind)?dailyRewardValues[item.kind]:0),0);
  const rows=group=>activities.filter(item=>item.group===group).map(item=>{
    const done=claimed.includes(item.kind);
    return `<a class="reward-task ${done?'is-claimed':''}" href="${item.href}"><span class="reward-task-check" aria-hidden="true">${done?'✓':'○'}</span><span class="reward-task-copy"><strong>${item.label}</strong><small>${done?'Earned today':item.detail}</small></span><span class="reward-task-value">+${dailyRewardValues[item.kind]} <span class="sr-only">coins${done?', earned today':''}</span></span></a>`;
  }).join('');
  return `<div class="rewards-page"><div class="shop-hero"><div><p class="eyebrow">YOUR COLLECTION</p><h1>Rewards</h1><p>Collect coins as you use the hub, then choose a badge that feels like you.</p><div class="shop-wallet"><strong>${wallet.coins}</strong> coins <span class="shop-wallet-divider">·</span> ${earned} / ${maxCoins} earned today</div></div><div class="shop-hero-badge badge-${current.color}" aria-hidden="true">${current.symbol}</div></div><section aria-labelledby="rewardWays"><div class="section-head"><div><p class="eyebrow">A LITTLE SOMETHING FOR YOUR DAY</p><h2 id="rewardWays">Ways to earn</h2><p>Each activity earns coins once per local day, up to ${maxCoins} coins. You don’t need to do them all.</p></div></div><h3 class="reward-group-title">Everyday &amp; play</h3><div class="reward-tasks">${rows('everyday')}</div><h3 class="reward-group-title">Learning, if you like</h3><div class="reward-tasks">${rows('learning')}</div></section><section aria-labelledby="rewardBadges"><div class="section-head"><div><p class="eyebrow">YOUR STYLE</p><h2 id="rewardBadges">Choose a badge</h2><p>Unlock with virtual coins and change your badge whenever you like.</p></div></div><div class="reward-grid">${catalog.map(item=>{const owned=wallet.owned.includes(item.id),equipped=wallet.equipped===item.id,affordable=wallet.coins>=item.price;return `<article class="reward-card" id="reward-${item.id}" tabindex="-1"><div class="reward-badge badge-${item.color}" aria-hidden="true">${item.symbol}</div><h3>${item.name}</h3><p>${item.description}</p><div class="reward-card-bottom"><strong>${owned?'Owned':`${item.price} coins`}</strong><button class="btn ${equipped?'outline':'dark'}" data-reward="${item.id}" ${equipped||(!owned&&!affordable)?'disabled':''}>${equipped?'Equipped':owned?'Equip':affordable?'Unlock':`Need ${item.price-wallet.coins} more`}</button></div></article>`;}).join('')}</div></section><p class="game-privacy-note">Coins and badges are cosmetic and saved with your account progress. They aren’t money or prizes. Progress from before these rewards was not counted retroactively. As with other progress, simultaneous edits on different devices can overwrite one another.</p></div>`;
}
