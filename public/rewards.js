// Cosmetic, non-monetary rewards live with the learner's existing private
// progress. This is not a secure currency or a payment system.
export const rewardsCatalog = [
  { id:'leaf', name:'Fresh leaf', symbol:'❧', price:0, color:'leaf', description:'A fresh start for your space.' },
  { id:'sun', name:'Little sunshine', symbol:'●', price:20, color:'sun', description:'A brighter way to show up.' },
  { id:'moon', name:'Night owl', symbol:'☾', price:40, color:'moon', description:'For night owls and dreamers.' },
  { id:'spark', name:'Diamond', symbol:'◇', price:60, color:'spark', description:'Celebrate a moment of focus.' },
  { id:'bloom', name:'Bloom', symbol:'♧', price:90, color:'bloom', description:'A reminder that progress grows.' },
  { id:'star', name:'North star', symbol:'★', price:120, color:'star', description:'Keep finding your way forward.' },
  { id:'wave', name:'Ocean wave', symbol:'≈', price:30, color:'wave', description:'A little bit of ocean for your day.' },
  { id:'cloud', name:'Cloud nine', symbol:'☁', price:50, color:'cloud', description:'Keep your head in the clouds.' },
  { id:'comet', name:'Comet', symbol:'☄', price:80, color:'comet', description:'A bright spark wherever you go.' }
];
export const dailyRewardValues = Object.freeze({ card:5, game:10, test:15, task:5, habit:5, list:5, reading:5, arcade:10 });
export function normalizeRewards(value) {
  const raw = value && typeof value === 'object' ? value : {};
  const coins = Number.isSafeInteger(raw.coins) && raw.coins >= 0 ? Math.min(raw.coins, 1000000000) : 0;
  const known = new Set(rewardsCatalog.map(item=>item.id));
  const owned = [...new Set(['leaf', ...(Array.isArray(raw.owned)?raw.owned.filter(id=>known.has(id)):[])])];
  const equipped = owned.includes(raw.equipped) ? raw.equipped : 'leaf';
  const daily = raw.daily && typeof raw.daily==='object' ? raw.daily : {};
  const date = typeof daily.date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(daily.date) ? daily.date : '';
  const claimed = [...new Set((Array.isArray(daily.claimed)?daily.claimed:[]).filter(kind=>Object.hasOwn(dailyRewardValues,kind)))];
  return { coins, owned, equipped, daily:{date,claimed} };
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
  const wallet=normalizeRewards(value), item=rewardsCatalog.find(entry=>entry.id===id);
  if(!item) return {wallet,status:'unknown'};
  if(wallet.equipped===id) return {wallet,status:'equipped'};
  if(wallet.owned.includes(id)){wallet.equipped=id;return {wallet,status:'changed'};}
  if(wallet.coins<item.price) return {wallet,status:'insufficient'};
  wallet.coins-=item.price;wallet.owned.push(id);wallet.equipped=id;
  return {wallet,status:'purchased'};
}
