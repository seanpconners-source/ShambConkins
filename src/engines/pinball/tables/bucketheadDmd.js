// Bucketheadland DMD animations (128 x 32 dots). Each scene draws a whole frame: dot art, usually on the left, with
// the message lines on the right. Picked by m.say(lines, dur, {anim}); unknown names fall back to the plain splash.
// Scenes get (d, age, lines, ctx) with ctx = {t, face(i) → canvas or null, cur, names, ball}.
const CHICKEN=[
 '....##.......',
 '...####......',
 '..#####......',
 '..##.##.##...',
 '#######..##..',
 '.######......',
 '..#######....',
 '..#########..',
 '...#########.',
 '....#######..',
 '.....#...#...',
 '....##..##...',
];
// Message lines in the area right of the art (x0..127).
function text(d,lines,x0=44){const L=lines.filter(Boolean),cx=Math.round((x0+127)/2),max=127-x0;
 if(L.length===1)d.fit(L[0],cx,d.measure(L[0],2)<=max?9:12,{scale:2,align:'center',max});
 else if(L.length===2){d.fit(L[0],cx,3,{align:'center',max});const big=d.measure(L[1],2)<=max;d.fit(L[1],cx,big?15:19,{scale:big?2:1,align:'center',max});}
 else L.slice(0,3).forEach((s,i)=>d.fit(s,cx,1+i*11,{align:'center',max}));}
function robot(d,x,y,age,{down=0,eyes=15}={}){
 const st=Math.round(Math.sin(age*10)*2);const dy=Math.round(down);
 d.line(x+10,y-3+dy,x+10,y+dy,9);d.dot(x+10,y-4+dy,Math.floor(age*6)%2?15:4);
 d.rect(x+5,y+dy,11,6,10,false);d.dot(x+7,y+2+dy,eyes);d.dot(x+8,y+2+dy,eyes);d.dot(x+12,y+2+dy,eyes);d.dot(x+13,y+2+dy,eyes);
 d.rect(x+2,y+7+dy,17,10,5);d.rect(x+2,y+7+dy,17,10,13,false);for(let i=0;i<3;i++)d.dot(x+6+i*4,y+11+dy,(Math.floor(age*8)+i)%3?15:3);
 d.line(x+1,y+8+dy,x-2,y+15+dy-st,11);d.line(x+20,y+8+dy,x+23,y+15+dy+st,11);
 d.rect(x+5,y+18+dy,3,6+st,12);d.rect(x+13,y+18+dy,3,6-st,12);
}
function bucketHead(d,x,y){
 for(let j=0;j<10;j++){const w=14+Math.round(j*.4),x0=x+9-w/2;for(let i=0;i<w;i++)d.set(x0+i,y+j,Math.floor((i+j*.1)/3)%2?15:5);}
 d.rect(x,y+10,19,2,12);d.ellipse(x+9,y+19,7,8,13);d.set(x+6,y+17,0);d.set(x+7,y+17,0);d.set(x+11,y+17,0);d.set(x+12,y+17,0);
}
function ferris(d,cx,cy,r,age){d.circle(cx,cy,r,13);d.circle(cx,cy,r*.55,6);for(let i=0;i<8;i++){const a=i/8*Math.PI*2+age*1.2;d.line(cx,cy,cx+Math.cos(a)*r,cy+Math.sin(a)*r,7);d.rect(Math.round(cx+Math.cos(a)*r)-1,Math.round(cy+Math.sin(a)*r),3,2,15);}
 d.line(cx,cy,cx-r*.6,31,9);d.line(cx,cy,cx+r*.6,31,9);}
function ghost(d,x,y){d.circle(x+7,y+6,6,13,true);d.rect(x+1,y+6,13,8,13);for(let i=0;i<13;i++)if(i%4<2)d.set(x+1+i,y+14,13);d.set(x+5,y+5,0);d.set(x+9,y+5,0);d.set(x+5,y+6,0);d.set(x+9,y+6,0);d.ellipse(x+7,y+10,1,2,0);}
function ball(d,x,y,r=3,v=15){d.circle(x,y,r,Math.round(v*.6),true);d.dot(x-1,y-1,v);}

const dmdScenes={
 face(d,age,lines,ctx){d.clear();const f=ctx.face?.(ctx.cur);if(!(f&&d.portrait(f,3,1,30,30)))bucketHead(d,8,4);text(d,lines,38);if(age<.3)d.dim(age/.3);},
 skill(d,age,lines){d.clear();for(const x of [6,16,26,36])d.line(x,2,x,14,9);const lane=Math.floor(age*3)%3;ball(d,11+lane*10,Math.min(26,2+((age*40)%30)),3);d.line(4,30,38,30,6);text(d,lines,44);},
 jackpot(d,age,lines){d.clear();d.burst(64,16,age%.8);d.sparkle(age,30,8);d.dim(.45);const L=lines.filter(Boolean);d.zoomText(L[0]||'',64,age<1?16:9,age);if(L[1]&&age>.5)d.fit(L[1],64,21,{align:'center'});},
 coaster(d,age,lines){d.clear();const ty=x=>24+5*Math.sin(x/11);for(let x=0;x<128;x++){d.dot(x,ty(x),11);if(x%8===0)d.line(x,ty(x)+1,x,31,4);}
  const head=(age*80)%170-20;for(let k=0;k<3;k++){const cx=head-k*9;if(cx<-6||cx>132)continue;d.rect(Math.round(cx)-3,Math.round(ty(cx))-5,7,4,15);d.dot(cx-2,ty(cx)-6,10);}
  const L=lines.filter(Boolean);d.fit(L[0]||'',64,1,{align:'center'});if(L[1])d.fit(L[1],64,10,{align:'center'});},
 nunchuck(d,age,lines){d.clear();const a=age*14,px=20,py=16;const u=(t,l)=>[px+Math.cos(t)*l,py+Math.sin(t)*l];
  for(const off of [0,1]){const [ax,ay]=u(a,13);d.line(px,py+off,ax,ay+off,15);const b=a+2.6+Math.sin(age*9)*.4,[bx,by]=u(b,13);d.line(px,py+off,bx,by+off,12);}
  d.circle(px,py,2,8);text(d,lines,42);},
 moon(d,age,lines){d.clear();d.circle(16,9,7,15,true);d.set(13,7,9);d.set(18,11,10);d.set(15,12,11);
  const mt=[[0,26],[7,19],[13,24],[21,16],[29,23],[40,18]];for(let x=0;x<=40;x++){let y=31;for(let i=0;i<mt.length-1;i++)if(x>=mt[i][0]&&x<=mt[i+1][0]){const t=(x-mt[i][0])/(mt[i+1][0]-mt[i][0]);y=mt[i][1]+(mt[i+1][1]-mt[i][1])*t;}for(let yy=Math.round(y);yy<32;yy++)d.set(x,yy,yy===Math.round(y)?9:3);}
  for(let i=0;i<6;i++)d.dot(12+((age*20+i*7)%10),29-i%3,(i+Math.floor(age*6))%2?12:4);text(d,lines,44);},
 bucket(d,age,lines){d.clear();bucketHead(d,10,3+Math.round(Math.sin(age*5)));text(d,lines,40);},
 chicken(d,age,lines){d.clear();d.sprite(CHICKEN,6+Math.round(Math.sin(age*7)*4),8+(Math.floor(age*8)%2),{flip:Math.sin(age*3.5)<0});for(let i=0;i<4;i++)d.dot(4+i*9,30,8);text(d,lines,40);},
 egg(d,age,lines){d.clear();const crack=age>.6,chick=age>1.2;
  if(!chick){d.ellipse(18,17,8,11,12);if(crack){let x=10,y=15;for(let i=0;i<8;i++){const nx=x+2,ny=y+(i%2?3:-3);d.line(x,y,nx,ny,0);x=nx;y=ny;}}}
  else{d.ellipse(18,26,9,5,10);d.circle(18,14,6,15,true);d.set(16,12,0);d.set(20,12,0);d.line(18,16,21,17,6);d.ellipse(18,8,5,2,8,true);}
  d.sparkle(age,8,10);text(d,lines,40);},
 lock(d,age,lines){d.clear();d.sprite(CHICKEN,2,10);for(let i=0;i<3;i++)d.ellipse(22+i*7,24,2,3,i<2||Math.floor(age*4)%2?13:3);text(d,lines,46);},
 robot(d,age,lines){d.clear();robot(d,10,5,age);d.line(0,31,40,31,5);text(d,lines,44);},
 robotDown(d,age,lines){d.clear();robot(d,10,5,age,{down:Math.min(14,age*18),eyes:age>.8?3:15});if(age>.6)d.burst(20,26,(age-.6)%.7,10);text(d,lines,44);},
 beam(d,age,lines){d.clear();robot(d,4,3,age,{eyes:15});for(let i=0;i<5;i++){const y=12+((age*30+i*5)%18);d.line(14,y,34,y+2,i%2?12:6);}ball(d,36,27,3);text(d,lines,44);},
 multiball(d,age,lines){d.clear();for(let i=0;i<3;i++){const x=(age*55*(1+i*.35)+i*45)%148-10,y=27-Math.abs(Math.sin(age*4+i*1.3))*20;ball(d,x,y,3,8);}const L=lines.filter(Boolean);d.zoomText(L[0]||'',64,9,age);if(L[1])d.zoomText(L[1],64,23,Math.max(0,age-.3),{max:1});},
 wizard(d,age,lines){d.clear();ferris(d,20,14,12,age*2);d.sparkle(age,20,10);text(d,lines,42);},
 ferris(d,age,lines){d.clear();ferris(d,20,14,12,age);text(d,lines,42);},
 ghost(d,age,lines){d.clear();ghost(d,10,6+Math.round(Math.sin(age*4)*3));if(Math.floor(age*5)%4===0)d.dim(.5);text(d,lines,40);},
 extra(d,age,lines){d.clear();for(let i=0;i<6;i++){const x=(i*29+age*120)%160-20,y=(i*11)%32;d.line(x,y,x-12,y-4,i%2?12:6);d.dot(x,y,15);}d.zoomText(lines[0]||'EXTRA BALL',64,16,age);},
 save(d,age,lines){d.clear();for(let i=0;i<4;i++){const y=30-((age*40+i*8)%32);d.line(8,y,14,y-5,10);d.line(14,y-5,20,y,10);d.line(108,y,114,y-5,10);d.line(114,y-5,120,y,10);}d.zoomText(lines[0]||'BALL SAVED',64,16,age);},
};
Object.assign(exports,{dmdScenes});
