// King Gizzard DMD animations (128 x 32 dots), picked by m.say(lines, dur, {anim}). Psychedelic: the Lizard Wizard
// with his staff, the rattlesnake (a bulge sliding down its body), the spinning nonagon, a rat escaping to a planet,
// the Gila monster, a flying banana, the altered beast, a fire-breathing dragon, a fish on a line.
// Lines beside the scene art (from column x0). A message too long for that space first closes up its letter spacing,
// then dims the art and takes the full width, then wraps onto up to three lines, so nothing runs off the panel.
function text(d,lines,x0=44){let L=lines.filter(Boolean);const fits=(x,sp)=>L.every(s=>d.measure(s,1,sp)<=127-x);
 if(fits(x0,1))return place(d,L,x0,1);if(fits(x0,0))return place(d,L,x0,0);
 d.dim(.3);if(fits(0,1))return place(d,L,0,1);if(fits(0,0))return place(d,L,0,0);
 const words=L.join(' ').split(' '),out=[''];for(const w of words){const t=out[out.length-1]?out[out.length-1]+' '+w:w;if(d.measure(t,1,0)<=126||!out[out.length-1])out[out.length-1]=t;else out.push(w);}
 L=out.slice(0,3);place(d,L,0,0);}
function place(d,L,x0,sp){const cx=Math.round((x0+127)/2),max=127-x0,o={align:'center',max,sp};
 if(L.length===1)d.fit(L[0],cx,d.measure(L[0],2,sp)<=max?9:12,{...o,scale:2});
 else if(L.length===2){d.fit(L[0],cx,3,o);const big=d.measure(L[1],2,sp)<=max;d.fit(L[1],cx,big?15:19,{...o,scale:big?2:1});}
 else L.slice(0,3).forEach((s,i)=>d.fit(s,cx,1+i*11,o));}
function disk(d,cx,cy,r,v){for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<=r*r)d.set(cx+x,cy+y,v);}
function ball(d,x,y,r=3,v=15){d.circle(x,y,r,Math.round(v*.6),true);d.dot(x-1,y-1,v);}
// A nonagon (9 sides), turning.
function nonagon(d,cx,cy,r,age,v=15){const pts=[];for(let i=0;i<9;i++){const a=age*1.6+i/9*Math.PI*2;pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r*.9]);}pts.forEach((p,i)=>{const q=pts[(i+1)%9];d.line(p[0],p[1],q[0],q[1],v);});}
// The Lizard Wizard: pointed hat with stars, a lizard snout, a robe and a glowing staff.
function wizard(d,x,y,age){d.line(x+10,y,x+3,y+11,13);d.line(x+10,y,x+17,y+11,13);d.line(x+1,y+11,x+19,y+11,15);for(let i=0;i<10;i++)d.line(x+10-i*.6,y+i,x+10+i*.6,y+i,6);
 d.dot(x+9,y+5,Math.floor(age*6)%2?15:4);d.ellipse(x+10,y+14,6,3,10);d.ellipse(x+15,y+15,5,2,10);d.set(x+9,y+13,0);d.dot(x+19,y+15,15);
 for(let i=0;i<13;i++)d.line(x+10-2-i*.5,y+18+i,x+10+2+i*.5,y+18+i,i%4?5:8);
 d.line(x+24,y+6,x+24,y+31,11);const g=Math.floor(age*8)%2?15:9;d.circle(x+24,y+5,2,g,true);if(g>10)d.circle(x+24,y+5,4,6);}
// Rattlesnake: an S-shaped body (dots), the head at the left, a rattle at the tail; k = where the swallowed ball is (0..1).
function snakePath(t,x,y,age){return [x+6+t*36,y+16+Math.sin(t*9-age*6)*8];}
function snake(d,x,y,age,k=-1){for(let i=0;i<=60;i++){const t=i/60,[px,py]=snakePath(t,x,y,age),w=2.6-t*1.2;d.circle(px,py,w,i%6<3?13:7,true);}
 const [hx,hy]=snakePath(0,x,y,age);d.ellipse(hx-3,hy,5,3,15);d.set(hx-5,hy-1,0);if(Math.floor(age*5)%2){d.line(hx-8,hy+1,hx-12,hy,13);d.line(hx-12,hy,hx-13,hy-2,13);d.line(hx-12,hy,hx-13,hy+2,13);}
 const [tx,ty]=snakePath(1,x,y,age),sh=Math.floor(age*20)%2;for(let j=0;j<3;j++)d.rect(tx+1+j*2,ty-1+sh,2,3,15);
 if(k>=0&&k<=1){const [bx,by]=snakePath(k,x,y,age);d.circle(bx,by,4,15,true);}}
function rat(d,x,y,age){d.ellipse(x+8,y+6,7,4,12);d.ellipse(x+15,y+5,3,3,12);d.dot(x+16,y+4,15);d.set(x+17,y+4,0);d.line(x+1,y+7,x-6,y+3+Math.sin(age*10)*2,9);
 const f=Math.floor(age*10)%2;d.line(x+4,y+10,x+3+f,y+12,10);d.line(x+11,y+10,x+12-f,y+12,10);}
function planet(d,cx,cy,r){d.circle(cx,cy,r,9,true);d.circle(cx-r*.3,cy-r*.3,r*.35,14,true);d.ellipse(cx,cy,r+6,2,15,false);}
function gila(d,x,y,age){for(let i=0;i<34;i++){const px=x+i,py=y+16+Math.sin(i*.4+age*4)*1.5,w=i<6?3:i>26?1:4;for(let j=-w;j<=w;j++)d.dot(px,py+j,(i+j)%4<2?15:6);}
 d.ellipse(x+36,y+16,4,3,15);d.set(x+37,y+15,0);for(const [lx,ph] of [[8,0],[22,1]]){const s=Math.floor(age*8+ph)%2?2:-2;d.line(x+lx,y+19,x+lx+s,y+25,12);d.line(x+lx,y+13,x+lx-s,y+7,12);}}
function banana(d,cx,cy,age){const bob=Math.sin(age*5)*3;for(let i=0;i<20;i++){const a=Math.PI*.15+i/20*Math.PI*.7,px=cx+Math.cos(a)*14,py=cy+bob-8+Math.sin(a)*14;d.circle(px,py,2.5-Math.abs(i-10)/9,i%5?14:9,true);}
 const f=Math.floor(age*12)%2;d.line(cx-6,cy+bob-4,cx-14,cy+bob-10-f*3,11);d.line(cx+6,cy+bob-4,cx+14,cy+bob-10-f*3,11);}
function beast(d,x,y,age){d.ellipse(x+12,y+18,10,12,6);d.ellipse(x+12,y+8,8,7,11);d.set(x+9,y+7,15);d.set(x+15,y+7,15);d.line(x+5,y+3,x+1,y-3,13);d.line(x+19,y+3,x+23,y-3,13);
 for(let i=0;i<5;i++)d.set(x+8+i*2,y+12,Math.floor(age*8+i)%2?15:0);d.line(x+2,y+18,x-3,y+28,10);d.line(x+22,y+18,x+27,y+28,10);}
function dragon(d,x,y,age){d.ellipse(x+12,y+16,10,6,9);d.ellipse(x+24,y+10,5,4,12);d.set(x+26,y+9,15);d.line(x+4,y+12,x-2,y+2,11);d.line(x-2,y+2,x+8,y+8,11);
 for(let i=0;i<14;i++){const fx=x+29+i*2,fy=y+11+Math.sin(age*20+i)*(i*.25);d.dot(fx,fy,Math.max(4,15-i));d.dot(fx,fy+1,Math.max(3,12-i));}}
function fish(d,x,y,age){const sw=Math.sin(age*6)*2;d.ellipse(x+10,y+18+sw,8,5,12);d.line(x+2,y+18+sw,x-4,y+13+sw,12);d.line(x+2,y+18+sw,x-4,y+23+sw,12);d.dot(x+14,y+16+sw,0);d.set(x+14,y+16+sw,0);
 d.line(x+18,y+18+sw,x+30,y,8);d.line(x+30,y,x+34,y,8);}

const dmdScenes={
 face(d,age,lines,ctx){d.clear();const f=ctx.face?.(ctx.cur);if(!(f&&d.portrait(f,3,1,30,30)))wizard(d,6,0,age);text(d,lines,38);if(age<.3)d.dim(age/.3);},
 skill(d,age,lines){d.clear();snake(d,2,0,age,(age*.6)%1);text(d,lines,46);},
 jackpot(d,age,lines){d.clear();d.burst(64,16,age%.8);d.sparkle(age,30,8);d.dim(.45);const L=lines.filter(Boolean);d.zoomText(L[0]||'',64,age<1?16:9,age);if(L[1]&&age>.5)d.fit(L[1],64,21,{align:'center'});},
 snake(d,age,lines){d.clear();snake(d,2,0,age,Math.min(1,age*.8));text(d,lines,46);},
 lock(d,age,lines){d.clear();snake(d,2,0,age);for(let i=0;i<3;i++)ball(d,10+i*10,4,2,Math.floor(age*4+i)%2?15:5);text(d,lines,46);},
 rattle(d,age,lines){d.clear();for(let i=0;i<3;i++)snake(d,-10+((age*30+i*50)%170)-20,0,age+i);d.dim(.5);const L=lines.filter(Boolean);d.zoomText(L[0]||'',64,9,age);if(L[1])d.zoomText(L[1],64,23,Math.max(0,age-.3),{max:1});},
 nest(d,age,lines){d.clear();rat(d,6+((age*20)%20),14,age);rat(d,22-((age*16)%18),4,age+.5);d.line(0,30,40,30,6);text(d,lines,44);},
 rat(d,age,lines){d.clear();rat(d,8,12,age);text(d,lines,40);},
 planet(d,age,lines){d.clear();planet(d,26,16,9);rat(d,Math.min(10,age*12)-6,20-Math.min(12,age*10),age);d.sparkle(age,10,8);text(d,lines,44);},
 loop(d,age,lines){d.clear();nonagon(d,20,16,13,age);ball(d,20+Math.cos(age*9)*13,16+Math.sin(age*9)*12,2);text(d,lines,40);},
 nonagon(d,age,lines){d.clear();for(let k=0;k<3;k++)nonagon(d,64,16,8+k*7+((age*10)%7),age*(k%2?-1:1),15-k*4);d.dim(.5);const L=lines.filter(Boolean);d.zoomText(L[0]||'',64,L.length>1?9:16,age);if(L[1])d.fit(L[1],64,19,{align:'center',sp:d.measure(L[1])>126?0:1});},
 flight(d,age,lines){d.clear();const x=(age*60)%70-20;d.line(x,16,x+20,16,15);d.line(x+8,16,x+4,8,12);d.line(x+8,16,x+4,24,12);d.line(x+18,16,x+16,12,12);for(let i=0;i<4;i++)d.dot(x-4-i*4,16,10-i*2);text(d,lines,44);},
 gila(d,age,lines){d.clear();gila(d,2,0,age);text(d,lines,46);},
 banana(d,age,lines){d.clear();banana(d,20,18,age);text(d,lines,42);},
 beast(d,age,lines){d.clear();beast(d,8,2,age);if(Math.floor(age*6)%5===0)d.invert();text(d,lines,42);},
 dragon(d,age,lines){d.clear();dragon(d,2,4,age);text(d,lines,64);},
 fish(d,age,lines){d.clear();fish(d,6,4,age);text(d,lines,44);},
 wizard(d,age,lines){d.clear();wizard(d,6,0,age);d.sparkle(age,10,6);text(d,lines,40);},
 album(d,age,lines){d.clear();d.circle(20,16,14,8,true);d.circle(20,16,9,3,true);for(let r=10;r<14;r+=2)d.circle(20,16,r,5);d.circle(20,16,3,15,true);d.line(20,16,20+Math.cos(age*8)*12,16+Math.sin(age*8)*12,15);text(d,lines,40);},
 extra(d,age,lines){d.clear();for(let i=0;i<6;i++){const x=(i*29+age*120)%160-20,y=(i*11)%32;d.line(x,y,x-12,y-4,i%2?12:6);d.dot(x,y,15);}d.zoomText(lines[0]||'EXTRA BALL',64,16,age);},
 save(d,age,lines){d.clear();nonagon(d,64,16,14,age,6);d.zoomText(lines[0]||'BALL SAVED',64,16,age);},
};
Object.assign(exports,{dmdScenes});
