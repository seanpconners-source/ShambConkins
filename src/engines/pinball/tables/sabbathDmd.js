// Black Sabbath DMD animations (128 x 32 dots), picked by m.say(lines, dur, {anim}). Gothic: Iron Man, war pigs, the
// cloaked witch under the moon, graveyard hands, bats, the paranoid eye, the void spiral, coffins and lightning.
function text(d,lines,x0=44){const L=lines.filter(Boolean),cx=Math.round((x0+127)/2),max=127-x0;
 if(L.length===1)d.fit(L[0],cx,d.measure(L[0],2)<=max?9:12,{scale:2,align:'center',max});
 else if(L.length===2){d.fit(L[0],cx,3,{align:'center',max});const big=d.measure(L[1],2)<=max;d.fit(L[1],cx,big?15:19,{scale:big?2:1,align:'center',max});}
 else L.slice(0,3).forEach((s,i)=>d.fit(s,cx,1+i*11,{align:'center',max}));}
function ironMan(d,x,y,age,{down=0,eyes=15}={}){const st=Math.round(Math.sin(age*5)*1.5),dy=Math.round(down);
 d.rect(x+6,y+dy,12,9,9);d.rect(x+6,y+dy,12,9,14,false);d.line(x+8,y+4+dy,x+11,y+4+dy,eyes);d.line(x+13,y+4+dy,x+16,y+4+dy,eyes);d.line(x+9,y+7+dy,x+15,y+7+dy,5);
 d.rect(x+1,y+10+dy,22,11,6);d.rect(x+1,y+10+dy,22,11,13,false);d.line(x+12,y+11+dy,x+12,y+20+dy,10);d.line(x+4,y+15+dy,x+20,y+15+dy,8);
 d.rect(x-3,y+11+dy,4,9,11);d.rect(x+23,y+11+dy,4,9,11);d.rect(x+4,y+22+dy,6,8+st,12);d.rect(x+14,y+22+dy,6,8-st,12);}
function pig(d,x,y,age){d.ellipse(x+11,y+15,10,9,9);d.ellipse(x+11,y+15,10,9,14,false);
 d.ellipse(x+11,y+7,11,5,13);d.rect(x,y+8,23,2,15);                          // helmet + brim
 d.ellipse(x+11,y+18,5,3,15);d.set(x+9,y+18,0);d.set(x+13,y+18,0);           // snout
 d.set(x+7,y+13,Math.floor(age*3)%5?15:0);d.set(x+15,y+13,Math.floor(age*3)%5?15:0);
 d.line(x+1,y+9,x-1,y+5,11);d.line(x+21,y+9,x+23,y+5,11);}
function witch(d,x,y){d.circle(x+20,y+6,5,15,true);                         // moon
 for(let i=0;i<14;i++)d.line(x+8-i*.35,y+8+i,x+8+i*.35,y+8+i,i<4?13:5);d.ellipse(x+8,y+8,2,3,14);   // cloak + pale face
 d.line(x-6,y+31,x-2,y+12,6);d.line(x-2,y+12,x+1,y+20,6);d.line(x+28,y+31,x+30,y+14,6);d.line(x+30,y+14,x+33,y+22,6);}
function tombs(d,x,y,age){for(const [tx,h] of [[x,14],[x+14,18],[x+28,12]]){d.rect(tx,y+31-h,10,h,7);d.ellipse(tx+5,y+31-h,5,3,7);d.line(tx+5,y+33-h,tx+5,y+39-h,14);d.line(tx+3,y+35-h,tx+7,y+35-h,14);}
 const rise=Math.min(12,age*14);d.rect(x+19,y+30-rise,4,rise,15);for(let f=0;f<3;f++)d.line(x+19+f*1.5,y+30-rise,x+18+f*2,y+26-rise,15);}
function bat(d,x,y,age,ph=0){const f=Math.sin(age*14+ph)>0;d.rect(x-1,y,3,2,15);if(f){d.line(x-1,y,x-6,y-3,14);d.line(x+1,y,x+6,y-3,14);}else{d.line(x-1,y+1,x-6,y+3,14);d.line(x+1,y+1,x+6,y+3,14);}}
function spiral(d,cx,cy,age,r=14){for(let i=0;i<90;i++){const a=i*.21-age*6,rr=i/90*r;d.dot(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr*.85,4+Math.round(11*i/90));}}
function lightning(d,x,y,age){if(Math.floor(age*7)%3)return;let px=x,py=y;for(let i=0;i<6;i++){const nx=px+(i%2?-3:4),ny=py+5;d.line(px,py,nx,ny,15);px=nx;py=ny;}}
function hand(d,x,y,age){const up=Math.min(10,age*20);d.rect(x+2,y+18-up,14,12,13);for(let f=0;f<4;f++)d.rect(x+2+f*4,y+8-up-(f===1||f===2?2:0),3,10,13);d.rect(x+16,y+20-up,4,3,13);d.rect(x+2,y+28,14,4,6);}
// d.dot only brightens; dark features (pupils, holes) are set outright
function disk(d,cx,cy,r,v){for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<=r*r)d.set(cx+x,cy+y,v);}
function ball(d,x,y,r=3,v=15){d.circle(x,y,r,Math.round(v*.6),true);d.dot(x-1,y-1,v);}

const dmdScenes={
 face(d,age,lines,ctx){d.clear();const f=ctx.face?.(ctx.cur);if(!(f&&d.portrait(f,3,1,30,30)))ironMan(d,8,1,age);text(d,lines,38);if(age<.3)d.dim(age/.3);},
 skill(d,age,lines){d.clear();for(const x of [4,13,22,31,40])d.line(x,2,x,14,9);const lane=Math.floor(age*3)%4;ball(d,8+lane*9,Math.min(26,2+((age*40)%30)),3);d.line(2,30,42,30,6);text(d,lines,46);},
 jackpot(d,age,lines){d.clear();d.burst(64,16,age%.8);d.sparkle(age,30,8);d.dim(.45);const L=lines.filter(Boolean);d.zoomText(L[0]||'',64,age<1?16:9,age);if(L[1]&&age>.5)d.fit(L[1],64,21,{align:'center'});},
 iron(d,age,lines){d.clear();ironMan(d,10,1,age);d.line(0,31,40,31,5);text(d,lines,44);},
 ironDown(d,age,lines){d.clear();ironMan(d,10,1,age,{down:Math.min(16,age*20),eyes:age>.8?2:15});if(age>.6)d.burst(22,28,(age-.6)%.7,10);text(d,lines,44);},
 pigs(d,age,lines){d.clear();for(let i=0;i<4;i++){const x=((age*30+i*36)%150)-24;pig(d,x,8+(Math.floor(age*6+i)%2),age);}d.dim(.55);const L=lines.filter(Boolean);d.zoomText(L[0]||'',64,9,age);if(L[1])d.zoomText(L[1],64,23,Math.max(0,age-.3),{max:1});},
 grave(d,age,lines){d.clear();tombs(d,2,0,age);text(d,lines,44);},
 lock(d,age,lines){d.clear();tombs(d,2,0,1);for(let i=0;i<3;i++)ball(d,8+i*12,4,2,i<2||Math.floor(age*4)%2?15:3);text(d,lines,44);},
 void(d,age,lines){d.clear();spiral(d,20,16,age,15);text(d,lines,42);},
 bats(d,age,lines){d.clear();for(let i=0;i<6;i++)bat(d,(i*23+age*40)%140-6,4+((i*7)%20)+Math.sin(age*3+i)*3,age,i);d.dim(.6);text(d,lines,0);},
 paranoid(d,age,lines){d.clear();d.ellipse(20,16,16,8,12);d.ellipse(20,16,16,8,15,false);const px=20+Math.round(Math.sin(age*9)*8);disk(d,px,16,5,3);disk(d,px,16,2,0);d.set(px-2,14,15);
  if(Math.floor(age*6)%4===0)d.invert();text(d,lines,42);},
 funeral(d,age,lines){d.clear();const x=6,y=6;[[x+6,y],[x+18,y],[x+24,y+6],[x+18,y+24],[x+6,y+24],[x,y+6]].forEach((p,i,a)=>{const q=a[(i+1)%a.length];d.line(p[0],p[1],q[0],q[1],13);});d.line(x+12,y+6,x+12,y+18,9);d.line(x+8,y+10,x+16,y+10,9);lightning(d,36,0,age);text(d,lines,44);},
 witch(d,age,lines){d.clear();witch(d,10,1);if(Math.floor(age*5)%7===0)d.dim(.5);text(d,lines,46);},
 hand(d,age,lines){d.clear();hand(d,8,2,age);lightning(d,32,0,age);text(d,lines,42);},
 cross(d,age,lines){d.clear();// heaven and hell: a wing on the left, horns and flame on the right
  for(let i=0;i<5;i++)d.line(4,8+i*3,14+i*2,4+i*4,13-i);for(let i=0;i<6;i++){const h=6+Math.sin(age*10+i)*3;d.line(26+i*2,30,26+i*2,30-h,i%2?10:15);}d.line(28,10,31,4,13);d.line(36,10,33,4,13);d.ellipse(32,13,5,4,10);
  text(d,lines,44);},
 wizard(d,age,lines){dmdScenes.cross(d,age,lines);d.sparkle(age,16,9);},
 extra(d,age,lines){d.clear();for(let i=0;i<6;i++){const x=(i*29+age*120)%160-20,y=(i*11)%32;d.line(x,y,x-12,y-4,i%2?12:6);d.dot(x,y,15);}d.zoomText(lines[0]||'EXTRA BALL',64,16,age);},
 save(d,age,lines){d.clear();for(let i=0;i<5;i++)bat(d,12+i*24,28-((age*40+i*8)%30),age,i);d.zoomText(lines[0]||'BALL SAVED',64,16,age);},
};
Object.assign(exports,{dmdScenes});
