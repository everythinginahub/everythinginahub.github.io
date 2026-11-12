// Cosmetic, non-monetary rewards live with the learner's existing private
// progress. This is not a secure currency or a payment system.
export const rewardsCatalog = [
  { id:'leaf', name:'Fresh leaf', symbol:'❧', price:0, color:'leaf', type:'badge', description:'A fresh start for your space.' },
  { id:'sun', name:'Little sunshine', symbol:'●', price:20, color:'sun', type:'badge', description:'A brighter way to show up.' },
  { id:'moon', name:'Night owl', symbol:'☾', price:40, color:'moon', type:'badge', description:'For night owls and dreamers.' },
  { id:'spark', name:'Diamond', symbol:'◇', price:60, color:'spark', type:'badge', description:'Celebrate a moment of focus.' },
  { id:'bloom', name:'Bloom', symbol:'♧', price:90, color:'bloom', type:'badge', description:'A reminder that progress grows.' },
  { id:'star', name:'North star', symbol:'★', price:120, color:'star', type:'badge', description:'Keep finding your way forward.' },
  { id:'wave', name:'Ocean wave', symbol:'≈', price:30, color:'wave', type:'badge', description:'A little bit of ocean for your day.' },
  { id:'cloud', name:'Cloud nine', symbol:'☁', price:50, color:'cloud', type:'badge', description:'Keep your head in the clouds.' },
  { id:'comet', name:'Comet', symbol:'☄', price:80, color:'comet', type:'badge', description:'A bright spark wherever you go.' },
  { id:'chat-lagoon', name:'Lagoon chat', price:25, type:'chatColor', value:'chat-lagoon', description:'A cool teal accent for your chat name.' },
  { id:'chat-violet', name:'Violet chat', price:35, type:'chatColor', value:'chat-violet', description:'A soft violet accent for your chat name.' },
  { id:'chat-coral', name:'Coral chat', price:35, type:'chatColor', value:'chat-coral', description:'A bright coral accent for your chat name.' },
  { id:'chat-gold', name:'Golden chat', price:50, type:'chatColor', value:'chat-gold', description:'A warm golden accent for your chat name.' },
  { id:'frame-mint', name:'Mint picture border', price:30, type:'avatarBorder', value:'frame-mint', description:'A fresh mint ring around your profile picture.' },
  { id:'frame-violet', name:'Violet picture border', price:45, type:'avatarBorder', value:'frame-violet', description:'A bright violet ring around your profile picture.' },
  { id:'frame-coral', name:'Coral picture border', price:45, type:'avatarBorder', value:'frame-coral', description:'A cheerful coral ring around your profile picture.' },
  { id:'frame-gold', name:'Golden picture border', price:65, type:'avatarBorder', value:'frame-gold', description:'A sunny gold ring around your profile picture.' }
];
export const dailyRewardValues = Object.freeze({ card:5, game:10, test:15, task:5, habit:5, list:5, reading:5, arcade:10 });

const itemById=new Map(rewardsCatalog.map(item=>[item.id,item]));
function isEquippedCosmetic(wallet, id) {
  const item=itemById.get(id);
  if(!item)return false;
  if(item.type==='chatColor')return wallet.chatColor===id;
  if(item.type==='avatarBorder')return wallet.avatarBorder===id;
  return wallet.equipped===id;
}

export function normalizeRewards(value) {
  const raw = value && typeof value === 'object' ? value : {};
  const coins = Number.isSafeInteger(raw.coins) && raw.coins >= 0 ? Math.min(raw.coins, 1000000000) : 0;
  const owned = [...new Set(['leaf', ...(Array.isArray(raw.owned)?raw.owned.filter(id=>itemById.has(id)):[])])];
  const equipped = owned.includes(raw.equipped) && itemById.get(raw.equipped)?.type==='badge' ? raw.equipped : 'leaf';
  const chatColor = owned.includes(raw.chatColor) && itemById.get(raw.chatColor)?.type==='chatColor' ? raw.chatColor : 'default';
  const avatarBorder = owned.includes(raw.avatarBorder) && itemById.get(raw.avatarBorder)?.type==='avatarBorder' ? raw.avatarBorder : 'none';
  const daily = raw.daily && typeof raw.daily==='object' ? raw.daily : {};
  const date = typeof daily.date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(daily.date) ? daily.date : '';
  const claimed = [...new Set((Array.isArray(daily.claimed)?daily.claimed:[]).filter(kind=>Object.hasOwn(dailyRewardValues,kind)))];
  return { coins, owned, equipped, chatColor, avatarBorder, daily:{date,claimed} };
}

export function awardDaily(value, kind, date) {
  const wallet=normalizeRewards(value);
  if(!Object.hasOwn(dailyRewardValues,kind) || typeof date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return {wallet,gained:0};
  if(wallet.daily.date!==date) wallet.daily={date,claimed:[]};
  if(wallet.daily.claimed.includes(kind)) return {wallet,gained:0};
  const gained=Math.min(dailyRewardValues[kind],1000000000-wallet.coins);
  wallet.coins+=gained; wallet.daily.claimed.push(kind);
  return {wallet,gained};
}

export function chooseReward(value, id) {
  const wallet=normalizeRewards(value), item=itemById.get(id);
  if(!item) return {wallet,status:'unknown'};
  if(isEquippedCosmetic(wallet,id)) return {wallet,status:'equipped'};
  const slot=item.type==='chatColor'?'chatColor':item.type==='avatarBorder'?'avatarBorder':'equipped';
  if(wallet.owned.includes(id)){wallet[slot]=id;return {wallet,status:'changed'};}
  if(wallet.coins<item.price) return {wallet,status:'insufficient'};
  wallet.coins-=item.price;wallet.owned.push(id);wallet[slot]=id;
  return {wallet,status:'purchased'};
}
