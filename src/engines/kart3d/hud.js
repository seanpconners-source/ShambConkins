// 2D overlay for one player's half of the split screen: Mario Kart Tour style item slots (two, with roulette),
// position, laps, coins, Lakitu's starting lights, banners, blooper ink, speed lines and the steering touch ring.
const {outlined,rr,FONT,PCOL}=require("src/engines/arenaKit.js");
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const ICON={banana:'🍌',banana3:'🍌',mushroom:'🍄',mush3:'🍄',golden:'🍄',star:'⭐',bolt:'⚡',bomb:'💣',blooper:'🦑',coin:'🪙',bullet:'🚀',green:'',shell3:'',red:'',blue:''};
const ROLL=['banana','green','mushroom','red','star','bomb','coin','blooper','bolt','blue'];
const SHELL={green:['#2fbf3a','#145a1a'],shell3:['#2fbf3a','#145a1a'],red:['#e8322b','#6a1210'],blue:['#2e6bff','#0f2a7a']};

function drawShell(x,cx,cy,r,id){const [c1,c2]=SHELL[id];x.save();x.translate(cx,cy);x.fillStyle='#fff';x.beginPath();x.ellipse(0,r*.35,r*1.02,r*.32,0,0,7);x.fill();
 const g=x.createRadialGradient(-r*.3,-r*.4,r*.1,0,0,r);g.addColorStop(0,'#fff');g.addColorStop(.25,c1);g.addColorStop(1,c2);x.fillStyle=g;x.beginPath();x.arc(0,r*.3,r*.92,Math.PI,0);x.fill();
 x.strokeStyle='rgba(255,255,255,.75)';x.lineWidth=Math.max(1,r*.09);x.beginPath();x.moveTo(-r*.3,-r*.45);x.lineTo(r*.3,-r*.45);x.lineTo(r*.48,r*.05);x.lineTo(-r*.48,r*.05);x.closePath();x.stroke();
 if(id==='blue'){x.fillStyle='#fff';for(const a of [-.9,-.3,.3,.9]){x.beginPath();x.moveTo(Math.sin(a)*r*.9,-Math.cos(a)*r*.6);x.lineTo(Math.sin(a)*r*1.2,-Math.cos(a)*r*1.05);x.lineTo(Math.sin(a+.25)*r*.9,-Math.cos(a+.25)*r*.6);x.fill();}}
 x.restore();}
function drawIcon(x,id,cx,cy,r,n=1){
 if(!id)return;const multi=['banana3','mush3','shell3'].includes(id)&&n>1;
 const one=(px,py,rr2)=>{if(SHELL[id])drawShell(x,px,py,rr2,id==='shell3'?'green':id);else{x.font=`${rr2*1.6}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(ICON[id],px,py+rr2*.1);
  if(id==='golden'){x.save();x.globalCompositeOperation='source-atop';x.fillStyle='rgba(255,200,0,.55)';x.fillRect(px-rr2,py-rr2,rr2*2,rr2*2);x.restore();}}};
 if(multi){const pts=n===3?[[-.42,.28],[.42,.28],[0,-.36]]:[[-.32,.1],[.32,.1]];for(const [ox,oy] of pts)one(cx+ox*r,cy+oy*r,r*.52);}else one(cx,cy,r*.78);
}
const ord=n=>n+(n===1?'st':n===2?'nd':n===3?'rd':'th');
function speedLines(x,v,t,k){const n=26,cx=v.x+v.w/2,cy=v.y+v.h*.55;x.save();x.strokeStyle='rgba(255,255,255,.55)';x.lineCap='round';
 for(let j=0;j<n;j++){const a=j/n*Math.PI*2+Math.sin(j*7.3)*.2,ph=((t*3.2+j*.37)%1),r0=Math.max(v.w,v.h)*(.42+ph*.4),len=Math.max(v.w,v.h)*(.08+.06*Math.sin(j));
  x.globalAlpha=.25+.35*(1-ph);x.lineWidth=1.5+2*(1-ph);x.beginPath();x.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0*.75);x.lineTo(cx+Math.cos(a)*(r0+len),cy+Math.sin(a)*(r0+len)*.75);x.stroke();}x.restore();}
function ink(x,v,amt,seed){x.save();x.globalAlpha=clamp(amt,0,1)*.92;x.fillStyle='#0b0612';const n=7;for(let j=0;j<n;j++){const px=v.x+v.w*(.15+((seed*.31+j*.37)%1)*.7),py=v.y+v.h*(.2+((seed*.17+j*.53)%1)*.6),r=Math.min(v.w,v.h)*(.12+((j*.29)%1)*.12);
 x.beginPath();for(let a=0;a<14;a++){const an=a/14*Math.PI*2,rr2=r*(1+.25*Math.sin(a*2.7+j));x.lineTo(px+Math.cos(an)*rr2,py+Math.sin(an)*rr2);}x.closePath();x.fill();for(let d=0;d<3;d++){x.beginPath();x.arc(px+Math.cos(d*2.1+j)*r*1.35,py+Math.sin(d*2.1+j)*r*1.35,r*.18,0,7);x.fill();}}x.restore();}
function lakitu(x,cx,cy,u,lights,t){
 x.save();x.translate(cx,cy+Math.sin(t*3)*3*u);
 x.fillStyle='#fff';for(const [px,py,r] of [[-26,18,20],[0,24,24],[26,18,20],[0,8,22]]){x.beginPath();x.arc(px*u,py*u,r*u,0,7);x.fill();}
 x.font=`${42*u}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText('🐢',-8*u,-14*u);
 x.strokeStyle='#333';x.lineWidth=3*u;x.beginPath();x.moveTo(10*u,-6*u);x.lineTo(30*u,-34*u);x.stroke();
 x.fillStyle='#1b1b22';rr(x,22*u,-96*u,26*u,66*u,6*u);x.fill();
 for(let j=0;j<3;j++){const on=lights>j+1||lights>=3.95,col=lights>=3.95?'#3dff6a':on?'#ff3b3b':'#4a1010';x.fillStyle=col;x.beginPath();x.arc(35*u,(-84+j*20)*u,8*u,0,7);x.fill();if(on){x.fillStyle='rgba(255,255,255,.4)';x.beginPath();x.arc(33*u,(-86+j*20)*u,3*u,0,7);x.fill();}}
 x.restore();}

function drawHUD(x,v,st){
 const {k,i,mode,laps,rank,t,phase,lights,clock,course,other,pad,msgs,rad,battleTime,names}=st;
 const u=clamp(Math.min(v.w/420,v.h/300),.65,1.8),pad0=10*u;
 if(k.boostT>0||k.bullet>0)speedLines(x,v,t,k);
 if(k.ink>0)ink(x,v,Math.min(1,k.ink/1.2),i*3.7+1);
 // item slots
 const r1=26*u,r2=18*u,cx1=v.x+pad0+r1,cy1=v.y+pad0+r1;
 const slot=(cx,cy,r,main)=>{x.save();x.shadowColor='rgba(0,0,0,.4)';x.shadowBlur=6*u;x.fillStyle='rgba(20,12,44,.72)';x.beginPath();x.arc(cx,cy,r,0,7);x.fill();x.restore();
  x.lineWidth=Math.max(2,r*.14);x.strokeStyle=k.frenzy>0?`hsl(${t*500%360},100%,60%)`:main?'#fff':'rgba(255,255,255,.75)';x.beginPath();x.arc(cx,cy,r,0,7);x.stroke();};
 slot(cx1+r1+r2*.65,cy1-r1*.15,r2,false);slot(cx1,cy1,r1,true);
 const it0=k.items[0],it1=k.items[1],rollId=ROLL[(t*14|0)%ROLL.length];
 if(k.frenzy>0)drawIcon(x,k.frenzyItem,cx1,cy1,r1);
 else if(it0)drawIcon(x,it0.id,cx1,cy1,r1,it0.n);else if(k.rolling)drawIcon(x,rollId,cx1,cy1,r1);
 if(it1)drawIcon(x,it1.id,cx1+r1+r2*.65,cy1-r1*.15,r2,it1.n);else if(k.rolling&&it0)drawIcon(x,rollId,cx1+r1+r2*.65,cy1-r1*.15,r2);
 if(it0?.id==='golden'&&k.goldenT>0){x.strokeStyle='#ffd21c';x.lineWidth=4*u;x.beginPath();x.arc(cx1,cy1,r1+4*u,-Math.PI/2,-Math.PI/2+Math.PI*2*k.goldenT/6);x.stroke();}
 const nameY=cy1+r1+12*u;outlined(x,names[i].toUpperCase(),v.x+pad0,nameY,{size:11*u,fill:PCOL[i],stroke:'#120a2e',align:'left'});
 // coins
 const cy=v.y+v.h-pad0-13*u;if(mode==='race'){x.font=`${22*u}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;x.textAlign='center';x.textBaseline='middle';x.fillText('🪙',v.x+pad0+12*u,cy);
 outlined(x,`${k.coins}`,v.x+pad0+28*u,cy+1,{size:20*u,fill:k.coins>=10?'#ffe23a':'#fff',stroke:'#120a2e',align:'left'});}
 const map=()=>{if(v.h>230&&course.mini){const mw=Math.min(v.w*.24,92*u),mh=mw,mx=v.x+v.w-pad0-mw,my=v.y+pad0+40*u;x.save();x.globalAlpha=.85;x.strokeStyle='rgba(255,255,255,.9)';x.lineWidth=3*u;x.lineJoin='round';x.beginPath();
   course.mini.forEach(([a,b],j)=>{const X=mx+a*mw,Y=my+b*mh;j?x.lineTo(X,Y):x.moveTo(X,Y);});x.closePath();x.stroke();
   for(const q of st.karts||[])if(!q.human){const [a,b]=course.miniAt(q);x.fillStyle='rgba(255,255,255,.7)';x.beginPath();x.arc(mx+a*mw,my+b*mh,2.2*u,0,7);x.fill();}
   for(const q of [other,k]){if(!q)continue;const [a,b]=course.miniAt(q);x.fillStyle=PCOL[q.player??q.i];x.beginPath();x.arc(mx+a*mw,my+b*mh,(q===k?4.5:3.5)*u,0,7);x.fill();x.strokeStyle='#fff';x.lineWidth=1.5*u;x.stroke();}x.restore();}};map();
 if(mode==='time'){
  const big=34*u,px=v.x+v.w-pad0,py=v.y+v.h-pad0,tm=k.finished?k.finishT:clock;
  outlined(x,`${Math.floor(tm/60)}'${(tm%60).toFixed(2).padStart(5,'0')}"`,px,py,{size:big,fill:k.finished?'#ffe23a':'#fff',stroke:'#120a2e',align:'right',base:'bottom'});
  if(st.ghostBest!=null&&isFinite(st.ghostBest))outlined(x,`GHOST ${Math.floor(st.ghostBest/60)}'${(st.ghostBest%60).toFixed(2).padStart(5,'0')}"`,px,py-big*1.05,{size:13*u,fill:'#c9d4ff',stroke:'#120a2e',align:'right',base:'bottom'});
  const lap=Math.min(laps,k.lap+1);outlined(x,`LAP ${lap}/${laps}`,v.x+v.w-pad0,v.y+pad0+10*u,{size:15*u,fill:lap===laps?'#ffe23a':'#fff',stroke:'#120a2e',align:'right'});
 }else if(mode==='race'){
  // position
  const big=46*u,px=v.x+v.w-pad0,py=v.y+v.h-pad0;const label=k.finished?ord(k.place||rank):ord(rank);
  x.save();x.font=`italic 900 ${big}px ${FONT}`;x.textAlign='right';x.textBaseline='bottom';x.lineJoin='round';x.lineWidth=big*.22;x.strokeStyle='#120a2e';x.strokeText(label,px,py);
  const g=x.createLinearGradient(0,py-big,0,py);const pl=parseInt(label);if(pl===1){g.addColorStop(0,'#fff7a8');g.addColorStop(.5,'#ffd21c');g.addColorStop(1,'#ff9a1c');}else if(pl===2){g.addColorStop(0,'#ffffff');g.addColorStop(.5,'#d9e2f0');g.addColorStop(1,'#97a6c0');}else if(pl===3){g.addColorStop(0,'#ffe0c0');g.addColorStop(.5,'#e09a5a');g.addColorStop(1,'#a8602a');}else{g.addColorStop(0,'#e0f0ff');g.addColorStop(.5,'#6ab0ff');g.addColorStop(1,'#3a5cff');}
  x.fillStyle=g;x.fillText(label,px,py);x.restore();
  // lap + time
  const lap=Math.min(laps,k.lap+1);outlined(x,`LAP ${lap}/${laps}`,v.x+v.w-pad0,v.y+pad0+10*u,{size:15*u,fill:lap===laps?'#ffe23a':'#fff',stroke:'#120a2e',align:'right'});
  const tm=k.finished?k.finishT:clock;outlined(x,`${Math.floor(tm/60)}'${(tm%60).toFixed(2).padStart(5,'0')}"`,v.x+v.w-pad0,v.y+pad0+28*u,{size:12*u,fill:'#c9d4ff',stroke:'#120a2e',align:'right'});
 }else{
  const left=Math.max(0,battleTime-clock);outlined(x,`${Math.floor(left/60)}:${String(Math.ceil(left)%60).padStart(2,'0')}`,v.x+v.w-pad0,v.y+pad0+12*u,{size:18*u,fill:'#fff',stroke:'#120a2e',align:'right'});
  const cols=['#ff4a4a','#ffd23a','#3a9cff'];for(let b=0;b<3;b++){const bx=v.x+v.w-pad0-10*u-b*22*u,by=v.y+v.h-pad0-18*u;x.globalAlpha=b<k.balloons?1:.22;x.fillStyle=cols[b];x.beginPath();x.ellipse(bx,by,8*u,10*u,0,0,7);x.fill();x.strokeStyle='#fff';x.lineWidth=1.5*u;x.stroke();x.globalAlpha=1;}
  if(k.out)outlined(x,'OUT OF BALLOONS',v.x+v.w/2,v.y+v.h*.42,{size:22*u,fill:'#ff8aa8',stroke:'#120a2e'});
 }
 // banners
 let my=v.y+v.h*.36;for(const m of msgs){const a=clamp(m.t/.3,0,1)*clamp((m.life-m.t)/.25+0,0,1);const sc=1+Math.max(0,.25-m.t)*2;outlined(x,m.text,v.x+v.w/2,my,{size:(m.size||22)*u*sc,fill:m.color||'#fff',stroke:'#120a2e',alpha:clamp(Math.min(a,1),0,1)});my+=(m.size||22)*u*1.15;}
 if(k.lakitu>0||k.falling>.4)outlined(x,'LAKITU TO THE RESCUE',v.x+v.w/2,v.y+v.h*.2,{size:13*u,fill:'#fff',stroke:'#120a2e'});
 if(phase==='intro'||phase==='count'||phase==='play'&&clock<.8)lakitu(x,v.x+v.w*(v.w>v.h*1.6?.3:.22),v.y+v.h*.5-(phase==='play'?clock*v.h*.6:0),u*1.05,phase==='play'?4:phase==='count'?lights:0,t);
 if(phase==='play'&&clock<1)outlined(x,'GO!',v.x+v.w/2,v.y+v.h*.32,{size:60*u*(1+clock*.3),fill:'#3dff6a',stroke:'#0b3a12',alpha:1-clock});
 // steering ring
 if(pad.f){const R=rad,oy=pad.f.y;x.save();x.globalAlpha=.28;x.strokeStyle='#fff';x.lineWidth=2;x.beginPath();x.moveTo(pad.ox-R,oy);x.lineTo(pad.ox+R,oy);x.stroke();
  x.fillStyle='#fff';x.beginPath();x.arc(pad.ox-R,oy,4,0,7);x.fill();x.beginPath();x.arc(pad.ox+R,oy,4,0,7);x.fill();x.globalAlpha=pad.latch?.75:.4;x.fillStyle=pad.latch?['#ffd21c','#4ab8ff','#ff9a1c','#e04aff'][k.spark]||'#ffd21c':'#fff';x.beginPath();x.arc(clamp(pad.f.x,pad.ox-R,pad.ox+R),oy,14,0,7);x.fill();x.restore();}
 // first-time hints
 if(st.hint>0){const a=clamp(st.hint,0,1);x.save();x.globalAlpha=a;const sz=Math.max(9,10*u),hy=v.y+v.h-sz*4.4;x.fillStyle='rgba(18,10,46,.6)';const nL=v.w<v.h?4:2;rr(x,v.x+v.w*.06,hy-sz*1.6-(nL-2)*sz*1.5,v.w*.88,sz*4.4+(nL-2)*sz*1.5,10);x.fill();
  const L=v.w<v.h?['DRAG ◀ ▶ TO STEER','PUSH ALL THE WAY TO DRIFT','LET GO FOR A MINI-TURBO','TAP = ITEM · SWIPE ↑ / ↓ THROW']:['DRAG ◀ ▶ TO STEER · PUSH ALL THE WAY TO DRIFT','LET GO FOR A MINI-TURBO · TAP = ITEM · SWIPE ↑ AHEAD ↓ BEHIND'];
  x.font=`900 ${sz}px ${FONT}`;const fit=Math.min(1,v.w*.8/Math.max(...L.map(l=>x.measureText(l).width))),fs=sz*fit;L.forEach((l,j)=>outlined(x,l,v.x+v.w/2,hy-(L.length-2)*fs*1.5+j*fs*1.5,{size:fs,fill:j%2?'#ffe23a':'#fff',stroke:'#120a2e'}));x.restore();}
 if(st.wrongWay)outlined(x,'WRONG WAY!',v.x+v.w/2,v.y+v.h*.45,{size:24*u,fill:'#ff5a5a',stroke:'#120a2e',alpha:.6+.4*Math.sin(t*10)});
}
Object.assign(exports,{drawHUD,drawIcon,ICON});
