// A limited, intentionally conservative filter. The server enforces the same
// rules; visual similarities across all scripts cannot be detected perfectly.
export function restrictedNickname(value) {
 const lookalikes={'ѕ':'s','һ':'h','а':'a','у':'y','і':'i','е':'e','о':'o','ο':'o','α':'a','ι':'i','υ':'y'};
 const leet={'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','8':'b'};
 const folded=[...String(value||'').normalize('NFKD').toLowerCase()].map(c=>lookalikes[c]||c).join('').replace(/[^a-z0-9]/g,'').replace(/[0134578]/g,c=>leet[c]).replace(/(.)\1+/g,'$1');
 return /(shay|shai|shae|shea|shey|owner|admin|moderator|moderation|staf|founder|creator|developer|suport|oficial)/.test(folded)||['mod','themod','dev','bos','ceo'].includes(folded);
}
