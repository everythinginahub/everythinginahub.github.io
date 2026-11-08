// Original, illustrative covers for the Games directory. These are not screenshots.
// Run `node scripts/generate-game-thumbnails.mjs` after changing the catalogue.
import {mkdirSync, writeFileSync} from 'node:fs';
import {embeddedGames} from '../public/embedded-games-data.js';
const out = 'public/assets/game-thumbnails'; mkdirSync(out,{recursive:true});
const colors = [
  ['#e7dbc8','#253d38','#bd5c3e','#f7f2e7'], ['#d3e0db','#253e45','#c26e42','#f5f3e8'],
  ['#e8d5c6','#443d31','#789b86','#faf3e7'], ['#d4dce2','#283e4b','#c8724b','#f4f1e8'],
  ['#e8dfbd','#454531','#b35d48','#f9f3df'], ['#d9d8cb','#334f44','#c36b4c','#f7f4e8'],
  ['#e9d7d3','#493d3c','#5d8879','#faf1e7'], ['#d6ded5','#344741','#c58a42','#faf5e9']
];
const esc = s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const hash=s=>[...s].reduce((h,c)=>(Math.imul(h,31)+c.charCodeAt(0))>>>0,7);
const line=(d,ink,w=7)=>`<path d="${d}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rounded=(x,y,w,h,fill,stroke='',r=8)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${stroke?`stroke="${stroke}" stroke-width="5"`:''}/>`;
const circle=(x,y,r,fill,stroke='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${stroke?`stroke="${stroke}" stroke-width="5"`:''}/>`;
const art={
 tiles:(i,a,p)=>`${rounded(4,4,148,148,p,i,12)}${[0,1,2,3,4,5,6,7,8].map((n)=>rounded(14+(n%3)*45,14+Math.floor(n/3)*45,36,36,n===1||n===4||n===6?a:'#d8cebc','',5)).join('')}<text x="78" y="84" fill="${p}" font-size="26" font-family="Arial" font-weight="bold" text-anchor="middle">4</text>`,
 cards:(i,a,p)=>`${rounded(0,18,62,92,p,i,7)}${rounded(80,18,62,92,a,i,7)}${rounded(0,128,62,44,a,i,7)}${rounded(80,128,62,44,p,i,7)}${circle(31,64,13,a)}${line('M99 65h24M111 53v24',p,5)}${circle(111,150,9,a)}`,
 puzzle:(i,a,p)=>`${rounded(0,0,54,54,a,i,5)}${rounded(57,0,54,54,p,i,5)}${rounded(57,57,54,54,a,i,5)}${rounded(114,57,54,54,p,i,5)}${rounded(0,114,54,54,p,i,5)}${rounded(57,114,54,54,a,i,5)}`,
 board:(i,a,p)=>`${rounded(0,0,168,168,p,i,5)}${[0,1,2,3].flatMap(r=>[0,1,2,3].filter(c=>(r+c)%2).map(c=>rounded(4+c*40,4+r*40,40,40,a))).join('')}${circle(64,64,13,i)}${circle(104,104,13,p,i)}`,
 word:(i,a,p)=>`${[0,1,2].map((r)=>[0,1,2,3].map(c=>rounded(c*39,r*44,34,36,(r===0||c===2)?a:p,i,3)).join('')).join('')}<text x="77" y="26" fill="${p}" font-family="Arial" font-size="19" font-weight="bold" text-anchor="middle">W O R D</text>`,
 connect:(i,a,p)=>`${line('M24 135L48 38 139 24 155 112 78 150 48 38M24 135L78 150 139 24',i,5)}${[[24,135],[48,38],[139,24],[155,112],[78,150]].map(([x,y],n)=>circle(x,y,13,n%2?a:p,i)).join('')}`,
 bubble:(i,a,p)=>`${[[39,39,25],[96,29,19],[142,57,25],[64,94,30],[127,119,30],[35,151,18]].map(([x,y,r],n)=>circle(x,y,r,n%2?p:a,i)).join('')}${circle(54,82,7,p)}${circle(117,107,7,p)}`,
 car:(i,a,p)=>`${line('M45 0L13 175M130 0L160 175',i,8)}${line('M88 0v25M88 58v25M88 118v25',p,7)}<g transform="translate(52 55)">${rounded(8,8,58,95,a,i,14)}${rounded(16,25,42,24,p,i,4)}${rounded(0,22,10,22,i)}${rounded(66,22,10,22,i)}${rounded(0,72,10,22,i)}${rounded(66,72,10,22,i)}</g>`,
 stack:(i,a,p)=>`${rounded(15,129,135,32,i)}${rounded(26,94,115,32,a,i,3)}${rounded(36,59,95,32,p,i,3)}${rounded(50,24,67,32,a,i,3)}`,
 runner:(i,a,p)=>`${line('M0 165h75M111 165h64M73 165l38-38',i,8)}${circle(85,31,15,p,i)}${line('M82 49l-13 34 32 8 23-21M70 82L48 111M101 90l-9 33M92 123l-25 13',i,10)}${line('M119 38l24-17M124 51l29-2',a,7)}`,
 snake:(i,a,p)=>`${line('M12 146h36c50 0 45-54 16-54H48c-35 0-35-59 10-59h65c33 0 33 51 0 51h-14',i,25)}${line('M12 146h36c50 0 45-54 16-54H48c-35 0-35-59 10-59h65c33 0 33 51 0 51h-14',a,15)}${circle(111,84,3,p)}`,
 ball:(i,a,p)=>`${circle(87,84,68,p,i)}${line('M19 84h136M87 16c-34 35-34 101 0 136M87 16c34 35 34 101 0 136',i,5)}${circle(87,84,15,a,i)}`,
 target:(i,a,p)=>`${circle(85,85,70,p,i)}${circle(85,85,48,a,i)}${circle(85,85,25,p,i)}${circle(85,85,8,i)}${line('M85 85l71-70M137 14h19v19',i,6)}`,
 fruit:(i,a,p)=>`${line('M90 43c-3-21 5-32 18-39',i,7)}<path d="M89 46C63 20 18 44 20 90c2 55 37 77 69 63 32 14 67-8 69-63 2-46-43-70-69-44z" fill="${a}" stroke="${i}" stroke-width="6"/>${line('M96 23c17-16 34-11 38-8-7 15-20 20-38 8z',i,5)}${circle(52,72,8,p)}`,
 circuit:(i,a,p)=>`${line('M10 35h55v35h40V35h50M10 135h55v-30h40v30h50',i,7)}${circle(12,35,10,a,i)}${circle(155,35,10,p,i)}${circle(12,135,10,p,i)}${circle(155,135,10,a,i)}${rounded(62,70,46,35,a,i,4)}`,
 rocket:(i,a,p)=>`<path d="M89 4c-27 22-38 49-34 91l34 33 34-33c4-42-7-69-34-91z" fill="${p}" stroke="${i}" stroke-width="6"/>${circle(89,62,18,a,i)}<path d="M54 85L32 103v36l25-14M124 85l22 18v36l-25-14" fill="${a}" stroke="${i}" stroke-width="6"/>${line('M74 142l-9 25M89 145v29M104 142l9 25',i,7)}`,
 pour:(i,a,p)=>`${rounded(5,12,42,142,p,i,14)}${rounded(62,12,42,142,p,i,14)}${rounded(119,12,42,142,p,i,14)}${rounded(11,98,30,48,a,'',8)}${rounded(68,68,30,78,a,'',8)}${rounded(125,120,30,26,a,'',8)}${line('M12 35h28M69 35h28M126 35h28',i,4)}`,
 cooking:(i,a,p)=>`${line('M20 74h135M35 75v62c0 16 15 23 52 23s52-7 52-23V75M60 50c-15-16 11-20 0-34M90 50c-15-16 11-20 0-34M120 50c-15-16 11-20 0-34',i,7)}${rounded(43,85,89,56,a,i,10)}${circle(63,105,7,p)}${circle(108,120,7,p)}`,
 paddle:(i,a,p)=>`${rounded(10,145,155,16,i)}${circle(87,57,29,p,i)}${line('M66 36l42 42M108 36L66 78',a,7)}${line('M87 87v35',i,7)}${circle(132,106,10,a,i)}`,
 catch:(i,a,p)=>`${line('M15 116h145l-16 45H31z',i,7)}${line('M44 116l20-25M132 116l-20-25',i,7)}${circle(58,56,19,a,i)}${circle(120,29,14,p,i)}${line('M58 10v13M120 0v6',i,5)}`,
 path:(i,a,p)=>`${line('M15 146V24h41v76h38V48h61v98',i,8)}${circle(15,146,12,a,i)}${circle(155,146,12,p,i)}${line('M94 48v-20h61',a,7)}`,
 question:(i,a,p)=>`${rounded(10,9,150,155,p,i,10)}<text x="85" y="120" fill="${a}" font-size="112" font-family="Georgia" font-weight="bold" text-anchor="middle">?</text>`,
 oct:(i,a,p)=>`${[[12,15],[70,15],[12,75],[70,75],[128,75],[70,135]].map(([x,y],n)=>`<polygon points="${x+12},${y} ${x+36},${y} ${x+48},${y+12} ${x+48},${y+36} ${x+36},${y+48} ${x+12},${y+48} ${x},${y+36} ${x},${y+12}" fill="${n%2?a:p}" stroke="${i}" stroke-width="4"/>`).join('')}`,
 breaker:(i,a,p)=>`${[0,1,2].map(r=>[0,1,2,3].map(c=>rounded(5+c*40,10+r*27,35,21,(r+c)%2?a:p,i,3)).join('')).join('')}${circle(95,118,10,p,i)}${rounded(42,154,90,12,i)}`,
 hoop:(i,a,p)=>`${line('M125 12v90M95 13h58v57H95zM101 78h50M104 79l8 38h29l9-38M112 88h30M116 100h23',i,6)}${circle(48,119,30,a,i)}${line('M18 119h60M48 89c-12 16-12 44 0 60M48 89c12 16 12 44 0 60',i,4)}`,
 bowling:(i,a,p)=>`${circle(47,130,28,a,i)}${circle(38,124,4,p)}${circle(50,117,4,p)}${circle(55,130,4,p)}${[0,1,2].map(n=>`<path d="M${88+n*27} 148q-12-8-6-25l6-24-3-30q0-12 12-12t12 12l-3 30 6 24q6 17-6 25z" fill="${p}" stroke="${i}" stroke-width="5"/>`).join('')}`,
 bird:(i,a,p)=>`${circle(75,90,48,a,i)}<path d="M57 86q18-28 42 2-20 16-42-2" fill="${p}" stroke="${i}" stroke-width="5"/>${circle(97,72,9,p,i)}<path d="M119 83l28 13-28 12z" fill="${p}" stroke="${i}" stroke-width="5"/>${line('M12 54l-12-5M17 76H0',i,6)}`,
 bug:(i,a,p)=>`${line('M47 66L22 43M130 66l25-23M43 103l-30 8M134 103l30 8M55 139l-19 25M120 139l19 25',i,7)}<ellipse cx="89" cy="103" rx="47" ry="60" fill="${a}" stroke="${i}" stroke-width="6"/>${line('M89 52v111M63 42L49 23M115 42l14-19',i,6)}${circle(70,90,9,p)}${circle(108,114,9,p)}`,
 dice:(i,a,p)=>`${rounded(8,13,140,140,p,i,18)}${[[43,48],[113,48],[78,83],[43,118],[113,118]].map(([x,y])=>circle(x,y,9,a,i)).join('')}`,
 planet:(i,a,p)=>`${circle(85,83,60,a,i)}${line('M32 78c-28 13-38 25-31 34 11 14 52 4 91-16 39-20 62-43 54-54-4-6-14-7-27-4',i,8)}${circle(65,58,9,p)}${circle(104,102,13,p)}${circle(130,15,5,i)}`,
 tree:(i,a,p)=>`${line('M22 155h133M88 155V76',i,9)}<path d="M88 12L36 90h28L45 121h86l-19-31h28z" fill="${a}" stroke="${i}" stroke-width="6"/>${circle(143,39,11,p,i)}`,
 trophy:(i,a,p)=>`${rounded(58,128,56,20,i)}${line('M86 106v22M57 28H25v28q0 31 32 31M115 28h32v28q0 31-32 31',i,7)}<path d="M53 15h66v52q0 39-33 39T53 67z" fill="${a}" stroke="${i}" stroke-width="6"/>${circle(86,55,12,p,i)}`,
 hand:(i,a,p)=>`${circle(45,88,37,p,i)}${rounded(84,39,60,97,a,i,7)}${line('M29 85l16-14 17 14M45 71v32M100 59h28M100 76h28M100 93h28',i,6)}`,
 chest:(i,a,p)=>`<path d="M19 69V54c0-27 26-40 67-40s67 13 67 40v15" fill="${a}" stroke="${i}" stroke-width="7"/>${rounded(18,66,137,89,a,i,8)}${line('M19 91h135M47 68v85M125 68v85',i,7)}${rounded(73,78,25,31,p,i,4)}${circle(85,91,4,i)}`,
 music:(i,a,p)=>`${line('M52 114V29l82-19v82',i,9)}${circle(38,125,21,a,i)}${circle(120,104,21,p,i)}`,
};
// Each game has a deliberately chosen motif, rather than one icon per category.
const motifs={
 '2048':'tiles','6oct':'oct','rock-paper-scissors':'hand','sudoku':'board','abhita':'runner','antigravity':'runner','archer':'target','balance-stack':'stack','basketball':'hoop','boom-dots':'bubble','bowling':'bowling','breakoid':'breaker','bubble-pop':'bubble','bubble-shooter':'bubble','bug-smasher':'bug','buttermilk':'pour','cargo-stack':'stack','car-race':'car','carrom':'board','chess':'board','circle-path':'path','circuit-bulb':'circuit','catch-me-if-you-can':'runner','collector':'catch','color-dash':'runner','colour-pour':'pour','connected':'connect','cooking':'cooking','cool-platformer':'runner','cosmic-cleaner':'rocket','cricket-123':'ball','crowd-control':'runner','curve-snake':'snake','dodge-enemy':'runner','dodge-master':'runner','dream-weaver':'connect','ellars':'path','endless-runner':'runner','flappy':'bird','flip-jump':'runner','fly-monkey':'runner','football':'ball','forest-runner':'tree','four-dots':'bubble','fruit-basket':'catch','fruit-cosmics':'fruit','luma-bounce':'ball','hex-puzzle':'puzzle','hungry-player':'fruit','jump-dot':'ball','laser-bounce':'circuit','link':'connect','ludo':'dice','math-quest':'tiles','memory':'cards','memory-cards':'cards','number-merge':'tiles','one-car':'car','orbital-outpost':'planet','pairing':'cards','parkour':'runner','pathfinder':'path','perfect-square':'puzzle','planet-visitor':'planet','quiz':'question','road-cross':'runner','road-fighter':'car','screw-master':'puzzle','shadow-runner':'runner','shape-collector':'catch','shape-fitter':'puzzle','signal-circuit':'circuit','sky-high':'runner','slide-puzzle':'tiles','snake':'snake','snake-and-ladder':'dice','spaceman':'rocket','space-waves':'rocket','square-one':'tiles','stack-tower':'stack','stick-game':'path','stick-toss':'target','straight-rush':'car','survival-run':'runner','table-tennis':'paddle','tap-target':'target','tic-tac-toe':'board','tile-tap':'tiles','two-cars':'car','two-cars-ai':'car','unruly':'tiles','whack-a-bug':'bug','wordle':'word','words-of-wonder':'word','penalty':'trophy','line-trap':'path',
 'skyline':'runner','orbit':'rocket','reef':'breaker','treasure-tussle':'chest','rocket-rally':'rocket','match':'cards','quick-quiz':'question','write-reveal':'word','hosted-quiz':'question','flashcard-race':'runner'
};
const others=[{slug:'skyline',name:'Skyline Sprint',category:'Original game'},{slug:'orbit',name:'Orbit Defender',category:'Original game'},{slug:'reef',name:'Reef Breaker',category:'Original game'},{slug:'treasure-tussle',name:'Treasure Tussle',category:'Live game'},{slug:'rocket-rally',name:'Rocket Rally',category:'Live game'},{slug:'match',name:'Match up',category:'Study game'},{slug:'quick-quiz',name:'Quick quiz',category:'Study game'},{slug:'write-reveal',name:'Write & reveal',category:'Study game'},{slug:'hosted-quiz',name:'Host-led quiz',category:'Live game'},{slug:'flashcard-race',name:'Flashcard race',category:'Live game'}];
function wrap(name){let lines=[''];for(const word of name.split(' ')){let cur=lines.at(-1);if(cur && (cur+' '+word).length>15)lines.push(word);else lines[lines.length-1]=cur?cur+' '+word:word;}return lines.slice(0,3);}
for(const game of [...embeddedGames,...others]){
 const h=hash(game.slug),[bg,ink,accent,paper]=colors[h%colors.length],motif=motifs[game.slug];if(!motif||!art[motif])throw new Error(`Choose a motif for ${game.slug}`);
 const name=wrap(game.name).map((word,n)=>`<tspan x="32" dy="${n===0?0:34}">${esc(word)}</tspan>`).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270"><rect width="480" height="270" fill="${bg}"/><path d="M0 0h480v12H0z" fill="${ink}"/><path d="M32 50h32" stroke="${accent}" stroke-width="5"/><text x="32" y="86" fill="${ink}" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="27">${name}</text><text x="32" y="237" fill="${ink}" opacity=".78" font-family="Arial,Helvetica,sans-serif" font-size="12" font-weight="700" letter-spacing="1.2">${esc(game.category.replace('word-quiz','words').toUpperCase())}</text><g transform="translate(284 49) rotate(${(h%7)-3} 84 84)">${art[motif](ink,accent,paper)}</g></svg>`;
 writeFileSync(`${out}/${game.slug}.svg`,svg);
}
console.log(`Wrote ${embeddedGames.length + others.length} illustrated covers`);
