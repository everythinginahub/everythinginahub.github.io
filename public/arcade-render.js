import {WIDTH as W,HEIGHT as H} from './arcade-engine.js?v=20261111-1';
const fill=(c,color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
function gradient(c,top,bottom){const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,top);g.addColorStop(1,bottom);fill(c,g,0,0,W,H);}
function circle(c,x,y,r,color){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();}
function rounded(c,x,y,w,h,r,color){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();}
function polygon(c,points,color){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();}
function runner(c,g,bg){
 if(bg){c.drawImage(bg,0,0,W,H);}else{gradient(c,'#272b56','#ef8b6f');circle(c,735,135,80,'#ffd3a6');
 for(let layer=0;layer<2;layer++){const speed=layer?0.18:.07,offset=(g.distance*speed)%150;for(let i=-1;i<8;i++){const x=i*150-offset,h=layer?95+(i%3+3)%3*32:130+(i%4+4)%4*26,y=455-h;fill(c,layer?'#383e65':'#626388',x,y,126,h);if(layer){for(let row=0;row<4;row++)for(let col=0;col<3;col++)fill(c,'#d1a18a',x+18+col*30,y+18+row*23,7,9);}}}
 }
 fill(c,'#1f2e48',0,455,W,85);fill(c,'#e7ac8d',0,455,W,5);for(let i=0;i<8;i++)fill(c,'#546075',i*160-(g.distance%160),490,85,3);
 for(const ob of g.obstacles){rounded(c,ob.x,ob.y,ob.w,ob.h,5,'#d95058');fill(c,'#ffb495',ob.x+6,ob.y+8,ob.w-12,5);fill(c,'#9c3e4c',ob.x+8,ob.y+ob.h-12,ob.w-16,4);}
 for(const coin of g.coins){circle(c,coin.x,coin.y,coin.r+4,'#f8c26b55');circle(c,coin.x,coin.y,coin.r,'#ffe492');circle(c,coin.x,coin.y,coin.r-5,'#e9a74d');}
 if(!g.invulnerable||Math.floor(g.invulnerable*10)%2){const x=126,y=g.y,run=g.y<g.ground?-1:Math.sin(g.time*13);c.save();c.lineCap='round';c.strokeStyle='#182f43';c.lineWidth=11;c.beginPath();c.moveTo(x+17,y+46);c.lineTo(x+9+run*8,y+63);c.moveTo(x+23,y+46);c.lineTo(x+31-run*8,y+63);c.stroke();polygon(c,[[x+9,y+20],[x-17-Math.sin(g.time*10)*5,y+24],[x+4,y+31]],'#f9d178');rounded(c,x+7,y+14,27,36,9,'#47c6b9');c.strokeStyle='#247e7e';c.lineWidth=6;c.beginPath();c.moveTo(x+10,y+24);c.lineTo(x+3-run*5,y+38);c.moveTo(x+30,y+24);c.lineTo(x+37+run*5,y+34);c.stroke();circle(c,x+21,y+10,10,'#f7c2a2');polygon(c,[[x+11,y+7],[x+14,y+1],[x+25,y-1],[x+31,y+6],[x+27,y+5],[x+19,y+7]],'#26334b');circle(c,x+27,y+10,1,'#26334b');fill(c,'#a0efe0',x+15,y+20,13,3);c.restore();}
}
function orbit(c,g,bg){
 if(bg){c.drawImage(bg,0,0,W,H);}else{gradient(c,'#0c1537','#1f3660');for(let i=0;i<65;i++){const x=(i*137+67)%W,y=(i*97+g.time*(8+i%3*4))%H;circle(c,x,y,i%9===0?2:1,i%7===0?'#a0f7df':'#ffffff99');}
 circle(c,795,440,210,'#1e4672');circle(c,820,449,205,'#274f7c');c.strokeStyle='#79d9db33';c.lineWidth=3;c.beginPath();c.arc(815,445,206,3.5,5.1);c.stroke();}
 for(const e of g.enemies){c.save();c.translate(e.x+e.w/2,e.y+e.h/2);c.shadowColor='#ff8f9a';c.shadowBlur=12;polygon(c,[[-21,-6],[-11,-15],[11,-15],[21,-6],[15,12],[5,9],[0,15],[-5,9],[-15,12]],e.hp>1?'#fac878':'#f67887');rounded(c,-8,-8,16,8,4,'#432d5a');c.restore();}
 c.save();c.shadowBlur=12;c.shadowColor='#70f7e0';for(const b of g.bullets)rounded(c,b.x,b.y,b.w,b.h,3,'#b9fff2');c.shadowColor='#ff7b91';for(const b of g.enemyBullets)rounded(c,b.x,b.y,b.w,b.h,4,'#ff9c98');c.restore();
 if(!g.invulnerable||Math.floor(g.invulnerable*10)%2){c.save();c.translate(g.x,485);c.shadowColor='#75fff0';c.shadowBlur=20;polygon(c,[[0,-27],[12,-7],[26,15],[10,11],[0,20],[-10,11],[-26,15],[-12,-7]],'#7ce6dc');polygon(c,[[0,-19],[7,0],[0,5],[-7,0]],'#d8fffb');polygon(c,[[-8,15],[0,29+Math.sin(g.time*20)*3],[8,15]],'#ffd492');c.restore();}
}
function reef(c,g,bg){
 if(bg){c.drawImage(bg,0,0,W,H);}else{gradient(c,'#104c72','#052c4b');for(let i=0;i<6;i++){polygon(c,[[i*220-100,0],[i*220+30,0],[i*220+200,540],[i*220+120,540]],'#9eeeff0b');}for(let i=0;i<28;i++){const x=(i*173)%W,y=(i*97-g.time*(10+i%4*4))%H;circle(c,x,(y+H)%H,2+i%4,'#a4ecf922');}
 for(let i=0;i<18;i++){const x=i*62;circle(c,x,550,34+i%3*8,i%2?'#0e5b65':'#116c6d');}
 }
 const colors=['#f5867f','#f9ca70','#73d7c8','#8fb2f0','#c19ee6'];for(const b of g.bricks){rounded(c,b.x,b.y,b.w,b.h,7,colors[b.color]);rounded(c,b.x+5,b.y+4,b.w-10,3,2,'#ffffff88');fill(c,'#ffffff40',b.x+11,b.y+10,7,7);}
 c.save();c.shadowColor='#9efff2';c.shadowBlur=18;rounded(c,g.paddle-76,465,152,17,9,'#64e4d8');rounded(c,g.paddle-61,467,122,4,2,'#e2fff6');circle(c,g.ball.x,g.ball.y,g.ball.r+5,'#baf9ef44');circle(c,g.ball.x,g.ball.y,g.ball.r,'#f5fff7');c.restore();
}
export function drawArcade(canvas,game,image=null){const c=canvas.getContext('2d');if(!c)return;c.clearRect(0,0,W,H);const bg=image&&image.complete&&image.naturalWidth?image:null;if(game.kind==='skyline')runner(c,game,bg);else if(game.kind==='orbit')orbit(c,game,bg);else reef(c,game,bg);if(game.particles)for(const p of game.particles){c.save();c.globalAlpha=Math.max(0,p.life/.45);circle(c,p.x,p.y,3,p.color);c.restore();}}
