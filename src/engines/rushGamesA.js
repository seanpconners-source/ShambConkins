// Microgame Rush, set A: tap / timing / rapid-tap / hold-release microgames.
const R=require("src/engines/rushCore.js");
const {COL,circ,ell,rrect,boxC,poly,path,star,txt,cap,head,sfx,lerp,ramp,easeOutBack,dist,wob,backdrop,ground,clamp}=R;
const TAU=R.TAU;
const U=r=>Math.min(r.w,r.h);

// ---------------------------------------------------------------- Mario: stomp the Goomba
function goomba(x,cx,cy,s,t,squash){
 if(squash){ell(x,cx,cy+s*.35,s*.62,s*.18,COL.brown,3);circ(x,cx-s*.2,cy+s*.3,s*.07,COL.white,2);circ(x,cx+s*.2,cy+s*.3,s*.07,COL.white,2);return;}
 const step=Math.sin(t*12)*s*.12;ell(x,cx-s*.28,cy+s*.42+step,s*.28,s*.16,COL.ink,2);ell(x,cx+s*.28,cy+s*.42-step,s*.28,s*.16,COL.ink,2);
 ell(x,cx,cy-s*.1,s*.62,s*.55,COL.brown,4);ell(x,cx,cy+s*.22,s*.34,s*.22,COL.tan,3);
 circ(x,cx-s*.22,cy-s*.12,s*.15,COL.white,3);circ(x,cx+s*.22,cy-s*.12,s*.15,COL.white,3);circ(x,cx-s*.18,cy-s*.1,s*.06,COL.ink,0);circ(x,cx+s*.18,cy-s*.1,s*.06,COL.ink,0);
 x.lineWidth=4;x.strokeStyle=COL.ink;x.beginPath();x.moveTo(cx-s*.4,cy-s*.36);x.lineTo(cx-s*.08,cy-s*.22);x.moveTo(cx+s*.4,cy-s*.36);x.lineTo(cx+s*.08,cy-s*.22);x.stroke();}
const stomp={id:'stomp',verb:'STOMP!',theme:'game',kind:'tap',source:'Super Mario Bros.',caption:'Mario: stomp the Goomba',duration:4.6,bg:COL.sky,boss:true,
 init(r,rng,speed,player,boss){const u=U(r),n=boss?5:2,gy=r.h*.8;return {u,gy,gr:u*.17,hero:{x:r.w*.5,y:gy-u*.2,j:null},
  gs:Array.from({length:n},()=>({x:r.w*(.2+rng()*.6),dir:rng()<.5?-1:1,v:r.w*ramp(speed,.2,.3)*(.8+rng()*.4),dead:false,sq:0})),clouds:[rng(),rng(),rng()]};},
 update(st,dt){const {r,gr}=st;for(const g of st.gs){if(!g.dead){g.x+=g.dir*g.v*dt;if(g.x<gr){g.x=gr;g.dir=1;}if(g.x>r.w-gr){g.x=r.w-gr;g.dir=-1;}}else g.sq+=dt;}
  const h=st.hero;if(h.j){h.j.t+=dt/.2;const k=Math.min(1,h.j.t);h.x=lerp(h.j.fx,h.j.tx,k);h.y=lerp(h.j.fy,h.j.ty,k)-Math.sin(k*Math.PI)*st.u*.22;if(h.j.t>=1){h.y=h.j.ty;h.j=null;}}
  if(!st.result&&st.gs.every(g=>g.dead)&&!h.j)st.result='win';},
 down(st,p){if(st.result)return;let best=null;for(const g of st.gs)if(!g.dead&&Math.abs(p.x-g.x)<st.gr*1.8&&Math.abs(p.y-(st.gy-st.gr))<st.gr*2.8)if(!best||Math.abs(p.x-g.x)<Math.abs(p.x-best.x))best=g;
  if(best){best.dead=true;sfx('tap');const h=st.hero;h.j={t:0,fx:h.x,fy:h.y,tx:best.x,ty:st.gy-st.gr*1.7};}},
 hint(st){const g=st.gs[0];return {kind:'tap',x:g.x,y:st.gy-st.gr,size:st.u*.12};},
 draw(x,st,r){const {u,gy,gr}=st;backdrop(x,r,COL.sky,st.t,'#fff');for(let i=0;i<3;i++){const cx=((st.clouds[i]*r.w+st.t*10*(i+1))%(r.w+120))-60,cy=r.h*(.18+i*.12);ell(x,cx,cy,u*.13,u*.055,COL.white,3);ell(x,cx+u*.08,cy-u*.03,u*.08,u*.05,COL.white,3);}
  ground(x,r,gy,COL.brown,COL.green);x.fillStyle='#00000026';for(let i=0;i<r.w;i+=u*.22)x.fillRect(i,gy+u*.1,u*.11,6);
  for(const g of st.gs)goomba(x,g.x,gy-gr*(g.dead?.3:1),gr*1.05,st.t+g.v,g.dead);
  const h=st.hero;head(x,st.player,h.x,h.y,u*.34,st.result==='win'?'happy':'normal');cap(x,h.x,h.y,u*.34,COL.red,'M');}};

// ---------------------------------------------------------------- Duck Hunt: shoot the duck
const shoot={id:'shoot',verb:'SHOOT!',theme:'game',kind:'tap',source:'Duck Hunt',caption:'Duck Hunt: shoot the duck',duration:4.6,bg:'#7fd8ff',
 init(r,rng,speed){const u=U(r);return {u,gy:r.h*.76,duck:{x:r.w*(.2+rng()*.6),y:r.h*.55,vx:r.w*ramp(speed,.2,.28)*(rng()<.5?-1:1),vy:-r.h*(.12+rng()*.08),ph:rng()*6},bullets:3,last:-9,flash:null,fall:0,dog:0};},
 update(st,dt){const d=st.duck,{r}=st;if(!st.fall){d.x+=d.vx*dt;d.y+=d.vy*dt;d.ph+=dt*14;if(d.x<r.w*.1){d.x=r.w*.1;d.vx=Math.abs(d.vx);}if(d.x>r.w*.9){d.x=r.w*.9;d.vx=-Math.abs(d.vx);}if(d.y<r.h*.14){d.y=r.h*.14;d.vy=Math.abs(d.vy);}if(d.y>r.h*.62){d.y=r.h*.62;d.vy=-Math.abs(d.vy);}}
  else{st.fall+=dt;d.y+=st.u*2.2*dt;d.ph+=dt*3;st.dog=Math.min(1,st.dog+dt*3);}
  if(st.flash)st.flash.t+=dt;if(!st.result&&!st.fall&&st.bullets<=0&&st.t>st.last+.4){st.result='lose';st.dog=1;}},
 down(st,p){if(st.result||st.bullets<=0||st.fall)return;st.bullets--;st.last=st.t;st.flash={x:p.x,y:p.y,t:0};sfx('shot');
  if(dist(p.x,p.y,st.duck.x,st.duck.y)<st.u*.22){st.fall=.001;st.result='win';}},
 hint(st){return {kind:'tap',x:st.duck.x,y:st.duck.y,size:st.u*.12};},
 draw(x,st,r){const {u,gy}=st,d=st.duck;backdrop(x,r,'#7fd8ff',st.t,'#fff');
  ground(x,r,gy,COL.green,COL.ink);x.fillStyle='#2da95b';for(let i=0;i<r.w;i+=u*.16)poly(x,[[i,gy],[i+u*.04,gy-u*.1],[i+u*.08,gy]],'#2da95b',2);
  rrect(x,r.w*.06,gy-u*.45,u*.08,u*.5,3,COL.brown,3);circ(x,r.w*.06+u*.04,gy-u*.55,u*.2,'#2f9e4e',4);
  const dir=d.vx>=0?1:-1;x.save();x.translate(d.x,d.y);x.scale(dir,1);if(st.fall)x.rotate(Math.min(1.4,st.fall*3));const s=u*.2;
  ell(x,0,0,s,s*.62,COL.brown,4);const fl=Math.sin(d.ph)*s*.7;poly(x,[[-s*.1,-s*.2],[-s*.7,-s*.2-fl],[-s*.4,s*.1]],COL.tan,3);circ(x,s*.8,-s*.45,s*.42,COL.green,4);poly(x,[[s*1.1,-s*.5],[s*1.6,-s*.38],[s*1.1,-s*.28]],COL.orange,3);circ(x,s*.86,-s*.55,s*.1,st.fall?COL.red:COL.white,2);x.restore();
  if(st.dog){const dy=gy-u*.2*st.dog;ell(x,r.w*.5,dy+u*.16,u*.2,u*.17,COL.tan,4);circ(x,r.w*.5,dy-u*.02,u*.13,COL.tan,4);ell(x,r.w*.5-u*.16,dy-u*.02,u*.06,u*.12,COL.brown,3);ell(x,r.w*.5+u*.16,dy-u*.02,u*.06,u*.12,COL.brown,3);if(st.result==='lose')txt(x,'HA HA!',r.w*.5,dy-u*.28,u*.12,COL.yellow);}
  if(st.flash&&st.flash.t<.18){star(x,st.flash.x,st.flash.y,u*.14,u*.06,8,st.flash.t*20,COL.yellow,3);}
  for(let i=0;i<3;i++)rrect(x,r.w*.04+i*u*.1,r.h-u*.2,u*.07,u*.14,3,i<st.bullets?COL.red:'#6b6b7b',3);}};

// ---------------------------------------------------------------- Among Us: pick the impostor
const CREW=['#e8403a','#3b6cf4','#2fb561','#ff7eb6','#ff9a3c','#ffd93d','#38d6e8','#8f5cf5','#f2f2f2','#7a5a40'];
function crew(x,cx,cy,s,color,t,knife,out){x.save();x.translate(cx,cy);if(out){x.rotate(out*8);x.scale(1-out*.6,1-out*.6);}
 ell(x,-s*.22,s*.48,s*.2,s*.16,color,4);ell(x,s*.22,s*.48,s*.2,s*.16,color,4);rrect(x,-s*.52,-s*.1,s*.2,s*.5,s*.1,color,4);rrect(x,-s*.4,-s*.55,s*.8,s*1.05,s*.38,color,4);
 rrect(x,-s*.05,-s*.34,s*.52,s*.3,s*.14,'#bfe9ff',3);ell(x,s*.22,-s*.3,s*.1,s*.04,COL.white,0);
 if(knife){x.save();x.translate(s*.5,s*.05);x.rotate(-.9+Math.sin(t*6)*.12);rrect(x,-s*.06,-s*.05,s*.12,s*.22,s*.03,COL.dark,3);poly(x,[[-s*.08,-s*.05],[s*.08,-s*.05],[s*.06,-s*.7],[0,-s*.82]],'#e9eef7',3);x.restore();}x.restore();}
const pick={id:'pick',verb:'PICK!',theme:'game',kind:'tap',source:'Among Us',caption:'Among Us: pick the impostor',duration:4.4,bg:'#1c1f4a',boss:true,
 init(r,rng,speed,player,boss){const n=boss?10:6,cols=n/2,imp=Math.floor(rng()*n),colors=[...CREW].sort(()=>rng()-.5).slice(0,n);return {u:U(r),n,cols,imp,colors,ph:Array.from({length:n},()=>rng()*6),wrong:-1,out:0};},
 update(st,dt){if(st.out)st.out+=dt;},
 down(st,p){if(st.result)return;const cw=st.r.w/st.cols,ch=st.r.h/2,c=clamp(Math.floor(p.x/cw),0,st.cols-1),i=clamp(Math.floor(p.y/ch),0,1)*st.cols+c;if(i===st.imp){st.result='win';st.out=.001;sfx('rare');}else{st.wrong=i;st.result='lose';}},
 hint(st){const cw=st.r.w/st.cols,ch=st.r.h/2,i=st.imp;return {kind:'tap',x:(i%st.cols+.5)*cw,y:(Math.floor(i/st.cols)+.5)*ch,size:st.u*.12};},
 draw(x,st,r){const cw=r.w/st.cols,ch=r.h/2,s=Math.min(cw*.78,ch*.8)*.6;backdrop(x,r,'#1c1f4a',st.t,'#4a4fa8');x.fillStyle='#fff';for(let i=0;i<14;i++)x.fillRect((i*97)%r.w,(i*53)%r.h,3,3);
  for(let i=0;i<st.n;i++){const cx=(i%st.cols+.5)*cw,cy=(Math.floor(i/st.cols)+.5)*ch+wob(st.t+st.ph[i],5,2);const isI=i===st.imp;
   if(isI&&st.out)crew(x,cx+st.out*r.w*.4,cy-st.out*r.h*.8,s,st.colors[i],st.t,true,Math.min(1,st.out));else crew(x,cx,cy,s,st.colors[i],st.t,isI,0);
   if(st.wrong===i){txt(x,'NOT SUS',cx,cy-s*.7,s*.32,COL.red);}}
  if(st.result==='win')txt(x,'EJECTED',r.w/2,r.h*.5,u0(r)*.17,COL.yellow);}};
const u0=U;

// ---------------------------------------------------------------- Home Alone: pull the paint can
const pull={id:'pull',verb:'PULL!',theme:'movie',kind:'tap',source:'Home Alone',caption:'Home Alone: pull the paint can',duration:5,bg:'#ffe8a8',
 init(r,rng,speed){const u=U(r);return {u,floor:r.h*.82,cx:r.w*(.4+rng()*.2),cy:r.h*.2,state:'hang',pulls:2,vy:0,bx:-u*.15,dir:1,v:r.w*ramp(speed,.3,.36),hit:0,back:0};},
 update(st,dt){const {r,u}=st;if(!st.hit){st.bx+=st.dir*st.v*dt;if(st.bx>r.w+u*.15)st.dir=-1;if(st.bx<-u*.15&&st.dir<0)st.dir=1;}else st.hit+=dt;
  const top=st.floor-u*.62;if(st.state==='fall'){st.cy+=r.h*3.4*dt;if(st.cy>=top){st.cy=top;if(Math.abs(st.bx-st.cx)<u*.2){st.state='landed';st.hit=.001;st.result='win';sfx('shot');}else{st.state='miss';st.back=.45;sfx('lose');}}}
  else if(st.state==='miss'){st.back-=dt;if(st.back<=0){if(st.pulls>0){st.state='hang';st.cy=r.h*.2;}else if(!st.result)st.result='lose';}}},
 down(st){if(st.result||st.state!=='hang'||st.pulls<=0)return;st.pulls--;st.state='fall';sfx('tap');},
 hint(st){return {kind:'tap',x:st.r.w*.86,y:st.r.h*.3,size:st.u*.12};},
 draw(x,st,r){const {u,floor}=st;backdrop(x,r,'#ffe8a8',st.t,'#fff');x.fillStyle='#d9b45c';x.fillRect(0,0,r.w,u*.1);rrect(x,st.cx-u*.34,floor-u*.95,u*.68,u*.95,6,'#b27d4a',4);rrect(x,st.cx-u*.28,floor-u*.89,u*.56,u*.89,4,'#6c4328',3);
  ground(x,r,floor,'#c9893f',COL.ink);
  const hx=r.w*.86,hy=r.h*.3;x.strokeStyle=COL.ink;x.lineWidth=3;x.beginPath();x.moveTo(st.cx,st.cy);x.lineTo(st.cx,u*.05);x.lineTo(hx,u*.05);x.lineTo(hx-u*.04,hy-u*.1);x.stroke();
  head(x,st.player,hx,hy,u*.34,st.state==='landed'?'happy':'silly');
  const bx=st.bx,by=floor-u*.46,flat=st.hit;x.save();x.translate(bx,0);
  rrect(x,-u*.1,floor-u*.3,u*.07,u*.3,3,COL.dark,3);rrect(x,u*.03,floor-u*.3,u*.07,u*.3,3,COL.dark,3);rrect(x,-u*.14,by+u*.06,u*.28,u*.24,u*.05,'#222',3);for(let i=0;i<3;i++)x.fillRect(-u*.14,by+u*.1+i*u*.07,u*.28,u*.03);
  head(x,1-st.player,0,by-u*.08,u*.36,flat?'sad':'walking');
  if(flat)for(let i=0;i<3;i++)star(x,Math.cos(st.t*5+i*2.1)*u*.2,by-u*.36+Math.sin(st.t*5+i*2.1)*u*.04,u*.06,u*.03,5,0,COL.yellow,2);x.restore();
  const cy=st.state==='landed'?st.cy:st.cy;rrect(x,st.cx-u*.12,cy,u*.24,u*.26,u*.03,COL.red,4);rrect(x,st.cx-u*.12,cy+u*.08,u*.24,u*.06,2,COL.white,0);ell(x,st.cx,cy,u*.12,u*.04,'#ff9a8a',3);
  if(st.state==='landed')ell(x,bx+0,by-u*.28,u*.2,u*.1,COL.red,3);
  st.state!=='landed'&&(x.fillStyle='rgba(0,0,0,.3)',x.fillRect(st.cx-u*.1,floor+3,u*.2,5));}};

// ---------------------------------------------------------------- Guitar Hero: hit 3 notes
const LANEC=[COL.green,COL.red,COL.yellow];
const strum={id:'strum',verb:'STRUM!',theme:'game',kind:'tap',source:'Guitar Hero',caption:'Guitar Hero: hit 3 notes',duration:5,bossDuration:8,bg:'#2a1448',boss:true,
 init(r,rng,speed,player,boss){const n=boss?7:3,gap=ramp(speed,.85,.62),notes=[];let T=1,last=-1;for(let i=0;i<n;i++){let l=Math.floor(rng()*3);if(l===last&&rng()<.6)l=(l+1+Math.floor(rng()*2))%3;last=l;notes.push({T,l,hit:false});T+=gap*(.95+rng()*.2);}
  const u=U(r),tw=Math.min(r.w*.84,u*1.5);return {u,notes,hitY:r.h*.78,x0:(r.w-tw)/2,lw:tw/3,press:[0,0,0],vy:r.h*.78,streak:0,miss:-1};},
 update(st,dt){for(let i=0;i<3;i++)st.press[i]=Math.max(0,st.press[i]-dt);if(st.result)return;for(const n of st.notes)if(!n.hit&&st.t>n.T+.22){st.result='lose';sfx('lose');}if(st.notes.every(n=>n.hit))st.result='win';},
 down(st,p){if(st.result)return;const l=clamp(Math.floor((p.x-st.x0)/st.lw),0,2);st.press[l]=.16;const n=st.notes.find(n=>!n.hit&&n.l===l&&Math.abs(n.T-st.t)<.22);if(n){n.hit=true;st.streak++;sfx('pickup');}},
 hint(st){const n=st.notes[0];return {kind:'tap',x:st.x0+(n.l+.5)*st.lw,y:st.hitY,size:st.u*.13};},
 draw(x,st,r){const {u,hitY,x0,lw}=st;backdrop(x,r,'#2a1448',st.t,'#6a2fb0');
  for(let l=0;l<3;l++){x.fillStyle=LANEC[l]+'38';x.fillRect(x0+l*lw,0,lw,r.h);x.fillStyle='#00000040';x.fillRect(x0+l*lw-1,0,3,r.h);}
  x.fillStyle=COL.white;x.fillRect(x0,hitY-3,lw*3,6);
  for(const n of st.notes){const y=hitY-(n.T-st.t)*st.vy;if(n.hit||y<-30||y>r.h+30)continue;const cx=x0+(n.l+.5)*lw;circ(x,cx,y,Math.min(lw*.36,u*.14),LANEC[n.l],4);circ(x,cx,y,Math.min(lw*.16,u*.06),COL.white,0);}
  for(let l=0;l<3;l++){const cx=x0+(l+.5)*lw,pr=st.press[l]>0;circ(x,cx,hitY,Math.min(lw*.4,u*.16)*(pr?1.12:1),pr?LANEC[l]:COL.dark,5);circ(x,cx,hitY,Math.min(lw*.22,u*.09),LANEC[l],3);}
  head(x,st.player,x0-u*.06+u*.18,u*.2,u*.3,st.streak?'happy':'normal');txt(x,st.streak+' / '+st.notes.length,r.w-u*.35,u*.12,u*.11,COL.yellow);}};

// ---------------------------------------------------------------- Back to the Future: hit 88
const mph={id:'mph',verb:'88 MPH!',theme:'movie',kind:'tap',source:'Back to the Future',caption:'Back to the Future: hit 88 mph',duration:5,bg:'#0f1230',
 init(r,rng,speed){const T=ramp(speed,2.5,1.9)+rng()*.5;return {u:U(r),rate:88/T,v:0,lock:-1,win:ramp(speed,7,8.5)};},
 update(st,dt){if(st.lock<0){st.v=Math.min(125,st.v+st.rate*dt);if(st.v>=125&&!st.result)st.result='lose';}},
 down(st){if(st.result||st.lock>=0)return;st.lock=st.v;if(Math.abs(st.v-88)<=st.win){st.result='win';sfx('rare');}else st.result='lose';},
 hint(st){return {kind:'tap',x:st.r.w*.5,y:st.r.h*.5,size:st.u*.14};},
 draw(x,st,r){const {u}=st,cx=r.w/2,cy=r.h*.8,R=Math.min(r.w*.42,r.h*.7);backdrop(x,r,'#0f1230',st.t,'#26308a');
  const ang=v=>Math.PI+clamp(v,0,125)/125*Math.PI;x.lineCap='butt';x.lineWidth=R*.22;x.strokeStyle='#3b4a9a';x.beginPath();x.arc(cx,cy,R*.82,Math.PI,TAU);x.stroke();
  x.strokeStyle=COL.green;x.beginPath();x.arc(cx,cy,R*.82,ang(88-st.win),ang(88+st.win));x.stroke();x.lineCap='round';
  for(let v=0;v<=120;v+=20){const a=ang(v);x.strokeStyle=COL.white;x.lineWidth=3;x.beginPath();x.moveTo(cx+Math.cos(a)*R*.62,cy+Math.sin(a)*R*.62);x.lineTo(cx+Math.cos(a)*R*.7,cy+Math.sin(a)*R*.7);x.stroke();if(v%40===0||v===88)txt(x,String(v),cx+Math.cos(a)*R*1.04,cy+Math.sin(a)*R*1.04,R*.14,COL.white,{lw:3});}
  txt(x,'88',cx+Math.cos(ang(88))*R*1.04,cy+Math.sin(ang(88))*R*1.04,R*.17,COL.green,{lw:4});
  const a=ang(st.lock>=0?st.lock:st.v),shake=st.lock<0?Math.sin(st.t*60)*1.2:0;x.save();x.translate(cx+shake,cy);x.rotate(a);poly(x,[[R*.74,0],[0,-R*.05],[-R*.12,0],[0,R*.05]],COL.red,3);x.restore();
  circ(x,cx,cy,R*.14,COL.white,4);head(x,st.player,cx,cy-R*.02,R*.3,st.result==='win'?'happy':st.result==='lose'?'sad':'normal');
  txt(x,Math.round(st.lock>=0?st.lock:st.v)+' MPH',cx,cy+R*.2>r.h-8?r.h-10:Math.min(r.h-10,cy+R*.22),R*.16,st.result==='win'?COL.green:COL.yellow,{lw:4});
  if(st.v>60&&st.lock<0){x.globalAlpha=.8;for(let i=0;i<4;i++){const ly=r.h*.1+i*r.h*.07,lx=((st.t*900+i*140)%(r.w+200))-100;x.fillStyle=COL.orange;x.fillRect(r.w-lx,ly,70,4);}x.globalAlpha=1;}
  if(st.result==='win')for(let i=0;i<6;i++)poly(x,[[r.w*(.1+i*.16),0],[r.w*(.1+i*.16)+u*.05,r.h*.15],[r.w*(.1+i*.16)-u*.03,r.h*.15],[r.w*(.1+i*.16)+u*.04,r.h*.3]],COL.yellow,2);}};

// ---------------------------------------------------------------- The Office: stack the pennies
const stack={id:'stack',verb:'STACK!',theme:'tv',kind:'tap',source:'The Office',caption:'The Office: stack the pennies',duration:5,bossDuration:8,bg:'#c98d4e',boss:true,
 init(r,rng,speed,player,boss){const u=U(r),n=boss?5:3;return {u,n,cw:u*.34,ch:u*.08,baseY:r.h*.9,placed:[r.w*.5],f:ramp(speed,.55,.75),ph:rng()*6,A:r.w*.26,drop:null,off:null};},
 mover(st){return st.r.w*.5+Math.sin(st.ph+st.t*TAU*st.f)*st.A;},
 update(st,dt){if(st.drop){st.drop.y+=st.u*3.5*dt;const ty=st.baseY-st.placed.length*st.ch;if(st.drop.y>=ty&&!st.drop.off){st.placed.push(st.drop.x);st.drop=null;sfx('pickup');if(st.placed.length-1>=st.n&&!st.result)st.result='win';}}
  if(st.off){st.off.y+=st.u*3*dt;st.off.x+=st.off.vx*dt;st.off.rot+=dt*5;if(!st.result&&st.off.y>st.r.h)st.result='lose';}},
 down(st){if(st.result||st.drop||st.off)return;const mx=this.mover(st),top=st.placed[0];
  if(Math.abs(mx-top)<st.cw*.6)st.drop={x:mx,y:st.u*.3};else{st.off={x:mx,y:st.u*.3,vx:(mx>top?1:-1)*st.u*.5,rot:0};sfx('lose');}},
 hint(st){return {kind:'tap',x:st.r.w*.5,y:st.u*.55,size:st.u*.12};},
 draw(x,st,r){const {u,cw,ch}=st;backdrop(x,r,'#c98d4e',st.t,'#e6b274');for(let i=0;i<5;i++){x.fillStyle='#00000012';x.fillRect(0,i*r.h*.22,r.w,3);}
  const coin=(cx,cy,rot)=>{x.save();x.translate(cx,cy);x.rotate(rot||0);rrect(x,-cw/2,-ch/2,cw,ch,ch*.45,'#e0a63a',3);x.fillStyle='#fff6';x.fillRect(-cw*.4,-ch*.3,cw*.5,ch*.18);x.restore();};
  st.placed.forEach((px,i)=>coin(px,st.baseY-(i+.5)*ch,0));
  if(st.drop)coin(st.drop.x,st.drop.y,0);else if(st.off)coin(st.off.x,st.off.y,st.off.rot);else if(!st.result)coin(this.mover(st),u*.3,0);
  head(x,st.player,u*.2,r.h-u*.2,u*.36,st.result==='win'?'happy':'silly');x.strokeStyle=COL.white;x.setLineDash([6,8]);x.lineWidth=2;x.beginPath();x.moveTo(st.placed[st.placed.length-1],u*.4);x.lineTo(st.placed[st.placed.length-1],st.baseY-st.placed.length*ch);x.stroke();x.setLineDash([]);
  txt(x,(st.placed.length-1)+' / '+st.n,r.w-u*.3,u*.14,u*.12,COL.white);}};

// ---------------------------------------------------------------- Tetris: rotate to fit
const SHAPES={T:[[0,0],[1,0],[2,0],[1,1]],L:[[0,0],[0,1],[0,2],[1,2]],J:[[1,0],[1,1],[1,2],[0,2]],S:[[1,0],[2,0],[0,1],[1,1]],Z:[[0,0],[1,0],[1,1],[2,1]]};
const SHAPE_COL={T:COL.purple,L:COL.orange,J:COL.blue,S:COL.green,Z:COL.red};
function rotCells(c){const m=c.map(([x,y])=>[-y,x]),mx=Math.min(...m.map(a=>a[0])),my=Math.min(...m.map(a=>a[1]));return m.map(([x,y])=>[x-mx,y-my]);}
const keyOf=c=>c.map(a=>a.join()).sort().join('|');
function newPiece(st,rng){const keys=Object.keys(SHAPES),k=keys[Math.floor(rng()*keys.length)];let tgt=SHAPES[k];for(let i=Math.floor(rng()*4);i>0;i--)tgt=rotCells(tgt);let cur=tgt;do{cur=rotCells(cur);}while(keyOf(cur)===keyOf(tgt));
 const bw=Math.max(...tgt.map(a=>a[0]))+1,bh=Math.max(...tgt.map(a=>a[1]))+1,hx=Math.floor(rng()*(st.cols-3));return {k,tgt,cur,hx,bw,bh,fall:0,drop:false,lock:0};}
const rotate={id:'rotate',verb:'ROTATE!',theme:'game',kind:'tap',source:'Tetris',caption:'Tetris: rotate to fit',duration:5.4,bossDuration:8,bg:'#10224d',boss:true,
 init(r,rng,speed,player,boss){const rows=6,cols=7,cs=Math.min(r.h*.92/rows,r.w*.8/cols),st={u:U(r),rows,cols,cs,left:boss?2:1,tf:ramp(speed,4.2,3.2),rr:rng,seq:[],done:0,fx:0};
  st.pieces=Array.from({length:boss?2:1},()=>newPiece(st,rng));st.cur=0;st.base=Array.from({length:cols},()=>1+Math.floor(rng()*2));return st;},
 update(st,dt){const p=st.pieces[st.cur];if(st.fx>0)st.fx-=dt;if(!p||st.result||p.lock)return;p.fall+=dt/st.tf;if(p.drop)p.fall+=dt*4;if(p.fall>=1){p.fall=1;this.land(st,p);}},
 land(st,p){p.lock=1;if(keyOf(p.cur)===keyOf(p.tgt)){sfx('pickup');st.cur++;if(st.cur>=st.pieces.length)st.result='win';}else{st.result='lose';st.fx=.5;sfx('lose');}},
 down(st,p,id){st.dn=st.dn||{};st.dn[id]={x:p.x,y:p.y};},
 move(st,p,id){const d=st.dn?.[id];if(!d||st.result)return;const pc=st.pieces[st.cur];if(pc&&!pc.lock&&p.y-d.y>st.u*.2){d.sw=true;pc.drop=true;}},
 up(st,p,id){const d=st.dn?.[id];if(!d)return;delete st.dn[id];if(st.result||d.sw)return;const pc=st.pieces[st.cur];if(pc&&!pc.lock){pc.cur=rotCells(pc.cur);sfx('tap');}},
 hint(st){const p=st.pieces[0];return {kind:'tap',x:st.r.w/2,y:st.r.h*.3,size:st.u*.12};},
 draw(x,st,r){const {cs,rows,cols}=st,ox=(r.w-cols*cs)/2,oy=(r.h-rows*cs)/2;backdrop(x,r,'#10224d',st.t,'#2a47a0');rrect(x,ox-6,oy-6,cols*cs+12,rows*cs+12,6,'#0a1230',4);
  const cell=(c,rr,col,a)=>{x.globalAlpha=a||1;rrect(x,ox+c*cs+1,oy+(rows-1-rr)*cs+1,cs-2,cs-2,4,col,3);x.globalAlpha=1;};
  const p=st.pieces[Math.min(st.cur,st.pieces.length-1)];const tgtBottom=pcs=>{const prof={};for(const [cx,cy] of pcs)prof[cx]=Math.max(prof[cx]??-1,cy);return prof;};
  const done=st.cur;let hy={};
  // surface: columns under the target piece are cut to its bottom profile
  const prof=tgtBottom(p.tgt),B=1;for(let c=0;c<cols;c++){let h=st.base[c];if(c>=p.hx&&c<p.hx+p.bw){h=B+(p.bh-1-prof[c-p.hx]);}hy[c]=h;for(let rr=0;rr<h;rr++)cell(c,rr,'#6b7692');}
  for(const [cx,cy] of p.tgt){x.setLineDash([5,5]);x.strokeStyle=COL.white;x.lineWidth=2.5;const rr=B+(p.bh-1-cy);x.strokeRect(ox+(p.hx+cx)*cs+3,oy+(rows-1-rr)*cs+3,cs-6,cs-6);x.setLineDash([]);}
  if(st.cur<st.pieces.length||st.result==='win'){const q=st.pieces[Math.min(st.cur,st.pieces.length-1)];const topRow=rows-q.bh,landRow=B,row=lerp(topRow,landRow,q.fall);const lockedOK=q.lock&&keyOf(q.cur)===keyOf(q.tgt);
   for(const [cx,cy] of q.cur){const rr=(q.lock?B:row)+(q.bh-1-cy)*(q.lock?1:1);x.globalAlpha=1;rrect(x,ox+(q.hx+cx)*cs+1,oy+(rows-1-rr)*cs+1,cs-2,cs-2,4,SHAPE_COL[q.k],3);}}
  if(st.cur>0&&st.cur<st.pieces.length)txt(x,'1 DOWN',r.w/2,oy-2,cs*.5,COL.yellow);
  if(st.fx>0)txt(x,'NO FIT',r.w/2,r.h/2,cs*.9,COL.red);}};

// ---------------------------------------------------------------- Simon: repeat the pattern
const SIMONC=[['#35c759','#1b7a36'],['#f0443a','#8a1f19'],['#ffd93d','#9a7c10'],['#2f9bff','#1a4f8c']];
const simon={id:'simon',verb:'REPEAT!',theme:'game',kind:'tap',source:'Simon (the game)',caption:'Simon: repeat the pattern',duration:5.4,bossDuration:8.5,bg:'#2b2b3d',boss:true,
 init(r,rng,speed,player,boss){const n=boss?5:3,seq=Array.from({length:n},()=>Math.floor(rng()*4)),step=ramp(speed,.52,.36);return {u:U(r),seq,step,t0:.5,idx:0,lit:-1,litT:0,wrong:false};},
 update(st,dt){const e=st.t-st.t0,showEnd=st.seq.length*st.step;if(e>=0&&e<showEnd){const i=Math.floor(e/st.step),ph=e/st.step-i;st.lit=ph<.75?st.seq[i]:-1;}else if(st.litT>0){st.litT-=dt;if(st.litT<=0)st.lit=-1;}else if(e>=showEnd)st.lit=-1;},
 showing(st){return st.t-st.t0<st.seq.length*st.step+.1;},
 down(st,p){if(st.result||this.showing(st))return;const dx=p.x-st.r.w/2,dy=p.y-st.r.h/2,q=(dy<0?0:2)+(dx<0?0:1),pad=q;
  st.lit=pad;st.litT=.18;if(pad===st.seq[st.idx]){st.idx++;sfx('tap');if(st.idx>=st.seq.length)st.result='win';}else{st.result='lose';st.wrong=true;}},
 hint(st){return {kind:'tap',x:st.r.w/2,y:st.r.h/2,size:st.u*.13};},
 draw(x,st,r){const cx=r.w/2,cy=r.h*.54,R=Math.min(r.w*.43,r.h*.44);backdrop(x,r,'#2b2b3d',st.t,'#3f3f5c');
  const ang=[[Math.PI,1.5*Math.PI],[1.5*Math.PI,TAU],[.5*Math.PI,Math.PI],[0,.5*Math.PI]];
  for(let i=0;i<4;i++){const lit=st.lit===i;x.beginPath();x.moveTo(cx,cy);x.arc(cx,cy,R,ang[i][0]+.04,ang[i][1]-.04);x.closePath();paint2(x,lit?SIMONC[i][0]:SIMONC[i][1]);if(lit){x.save();x.globalAlpha=.4;x.fillStyle='#fff';x.fill();x.restore();}}
  circ(x,cx,cy,R*.36,COL.dark,5);head(x,st.player,cx,cy,R*.5,this.showing(st)?'thinking':st.wrong?'sad':'normal');
  txt(x,this.showing(st)?'WATCH':st.result?'':'GO!',cx,Math.max(10,cy-R-r.h*.045),Math.min(r.h*.08,R*.2),COL.white);
  for(let i=0;i<st.seq.length;i++)circ(x,cx-(st.seq.length-1)*R*.07+i*R*.14,cy+R+r.h*.001,R*.04,i<st.idx?COL.yellow:'#00000055',2);}};
function paint2(x,f){x.fillStyle=f;x.fill();x.lineWidth=5;x.strokeStyle=COL.ink;x.lineJoin='round';x.stroke();}

// ---------------------------------------------------------------- Donkey Kong: jump the barrels
const jump={id:'jump',verb:'JUMP!',theme:'game',kind:'tap',source:'Donkey Kong',caption:'Donkey Kong: jump the barrels',duration:5.4,bossDuration:8.2,bg:'#171a3c',boss:true,
 init(r,rng,speed,player,boss){const u=U(r),n=boss?5:3,v=u*ramp(speed,.75,1.0),sx=r.w*.84,hx=r.w*.24,T0=(sx-hx)/v,gap=ramp(speed,1.2,1.0)*(boss?.82:1),bs=[];let T=Math.max(T0+.2,1.4);for(let i=0;i<n;i++){bs.push({T,x:sx});T+=gap*(1+rng()*.25);}
  return {u,gy:r.h*.8,hx,v,sx,bs,jt:-1,jd:ramp(speed,.62,.55),jh:u*.3,hy:0};},
 update(st,dt){if(st.jt>=0){st.jt+=dt;const k=st.jt/st.jd;if(k>=1){st.jt=-1;st.hy=0;}else st.hy=4*k*(1-k)*st.jh;}
  for(const b of st.bs)b.x=st.hx+(b.T-st.t)*st.v;
  if(st.result)return;for(const b of st.bs)if(Math.abs(b.x-st.hx)<st.u*.12&&st.hy<st.u*.1){st.result='lose';sfx('lose');}
  if(st.bs.every(b=>b.x<st.hx-st.u*.2))st.result='win';},
 down(st){if(st.result||st.jt>=0)return;st.jt=0;sfx('tap');},
 hint(st){return {kind:'tap',x:st.hx,y:st.gy-st.u*.5,size:st.u*.12};},
 draw(x,st,r){const {u,gy}=st;backdrop(x,r,'#171a3c',st.t,'#2a3070');for(let i=-1;i<r.w/(u*.22)+1;i++){const gx=i*u*.22;x.fillStyle=COL.red;x.fillRect(gx,gy,u*.2,u*.1);x.strokeStyle=COL.ink;x.lineWidth=3;x.strokeRect(gx,gy,u*.2,u*.1);}
  x.fillStyle=COL.cyan||'#38d6e8';x.fillRect(0,gy+u*.1,r.w,4);
  // Kong
  const kx=r.w*.9,ky=gy-u*.3;ell(x,kx,ky,u*.28,u*.3,COL.brown,4);ell(x,kx,ky+u*.06,u*.16,u*.18,COL.tan,3);circ(x,kx-u*.04,ky-u*.26,u*.16,COL.brown,4);ell(x,kx-u*.06,ky-u*.22,u*.1,u*.08,COL.tan,3);circ(x,kx-u*.1,ky-u*.3,u*.04,COL.white,2);circ(x,kx+u*.02,ky-u*.3,u*.04,COL.white,2);
  for(const b of st.bs){if(b.x>st.sx||b.x<-u*.2)continue;const bx=b.x,by=gy-u*.12,rot=-b.x/(u*.12);x.save();x.translate(bx,by);x.rotate(rot);circ(x,0,0,u*.12,COL.orange,4);x.strokeStyle=COL.ink;x.lineWidth=3;x.beginPath();x.moveTo(-u*.12,0);x.lineTo(u*.12,0);x.moveTo(0,-u*.12);x.lineTo(0,u*.12);x.stroke();x.restore();}
  const hy=gy-u*.2-st.hy;head(x,st.player,st.hx,hy-u*.04,u*.34,st.result==='lose'?'sad':st.jt>=0?'happy':'walking');cap(x,st.hx,hy-u*.04,u*.34,COL.red,'');rrect(x,st.hx-u*.1,hy+u*.1,u*.2,u*.12,4,COL.blue,3);}};

// ---------------------------------------------------------------- Jaws: bigger boat (tap to bail)
const bail={id:'bail',verb:'BAIL!',theme:'movie',kind:'rapid',source:'Jaws',caption:'Jaws: you’re gonna need a bigger boat',duration:4.8,bossDuration:8,bg:'#1a6fb0',boss:true,
 init(r,rng,speed,player,boss){return {u:U(r),N:boss?24:Math.round(ramp(speed,12,13)),bailed:0,wl:.32,rate:ramp(speed,.14,.2),splash:0,fin:rng()*6};},
 update(st,dt){if(st.splash>0)st.splash-=dt;if(st.result)return;st.wl+=st.rate*dt;if(st.wl>=1){st.wl=1;st.result='lose';sfx('lose');}},
 down(st){if(st.result)return;st.bailed++;st.wl=Math.max(0,st.wl-.05);st.splash=.12;sfx('tap');if(st.bailed>=st.N)st.result='win';},
 hint(st){return {kind:'tap',x:st.r.w*.5,y:st.r.h*.55,size:st.u*.13};},
 draw(x,st,r){const {u}=st,w=r.w,h=r.h;backdrop(x,r,'#2aa0e8',st.t,'#7fd8ff');x.fillStyle='#1a6fb0';x.fillRect(0,h*.62,w,h*.4);
  for(let i=0;i<6;i++){const wx=((i*w/5+st.t*20)%(w+60))-30;x.strokeStyle=COL.white;x.lineWidth=3;x.beginPath();x.arc(wx,h*.64,u*.06,Math.PI,TAU);x.stroke();}
  const fx=((st.fin*50+st.t*60)%(w*1.4))-w*.2;poly(x,[[fx,h*.64],[fx+u*.05,h*.64-u*.2],[fx+u*.18,h*.64]],'#7f8aa0',4);
  const bx=w/2,by=h*.58,bw=Math.min(w*.7,u*1.35),bh=u*.34;x.save();x.translate(bx,by+Math.sin(st.t*3)*2);x.rotate(Math.sin(st.t*2.4)*.04);
  poly(x,[[-bw/2,-bh*.5],[bw/2,-bh*.5],[bw*.38,bh*.6],[-bw*.38,bh*.6]],'#b0703c',4);
  x.save();x.beginPath();x.moveTo(-bw/2+4,-bh*.5+4);x.lineTo(bw/2-4,-bh*.5+4);x.lineTo(bw*.38-3,bh*.6-4);x.lineTo(-bw*.38+3,bh*.6-4);x.closePath();x.clip();x.fillStyle='#46b8ff';const wl=bh*1.1*st.wl;x.fillRect(-bw,bh*.6-wl,bw*2,wl+8);x.restore();
  head(x,st.player,-bw*.12,-bh*.9,u*.38,st.result==='lose'?'sad':st.splash>0?'angry':'thinking');rrect(x,bw*.08,-bh*.62,u*.12,u*.14,3,COL.grey,3);if(st.splash>0){for(let i=0;i<5;i++)circ(x,bw*.14+Math.cos(i*1.3)*u*.14,-bh*.8-Math.abs(Math.sin(i*2.1))*u*.18,u*.025,'#bfe9ff',2);}x.restore();
  const pw=w*.7,px=(w-pw)/2,py=h-u*.18;rrect(x,px,py,pw,u*.1,u*.05,COL.dark,3);rrect(x,px+3,py+3,Math.max(0,(pw-6)*st.bailed/st.N),u*.1-6,u*.04,COL.yellow,0);
  rrect(x,w-u*.12,h*.2,u*.07,h*.4,4,COL.dark,3);rrect(x,w-u*.12+3,h*.2+h*.4*(1-st.wl)+3,u*.07-6,Math.max(0,h*.4*st.wl-6),3,st.wl>.75?COL.red:COL.blue,0);}};

// ---------------------------------------------------------------- Rocky: run up the steps (alternate taps)
const steps={id:'steps',verb:'CLIMB!',theme:'movie',kind:'rapid',source:'Rocky',caption:'Rocky: run up the steps',duration:4.8,bossDuration:8,bg:'#ffb25a',boss:true,
 init(r,rng,speed,player,boss){return {u:U(r),S:boss?24:Math.round(ramp(speed,12,13)),n:0,last:-1,bad:0,pad:[0,0]};},
 update(st,dt){st.pad[0]=Math.max(0,st.pad[0]-dt);st.pad[1]=Math.max(0,st.pad[1]-dt);if(st.bad>0)st.bad-=dt;},
 down(st,p){if(st.result)return;const side=p.x<st.r.w/2?0:1;st.pad[side]=.12;if(side!==st.last){st.last=side;st.n++;sfx('tap');if(st.n>=st.S)st.result='win';}else st.bad=.2;},
 hint(st){return {kind:'tap',x:st.r.w*.25,y:st.r.h*.8,size:st.u*.12};},
 draw(x,st,r){const {u}=st,w=r.w,h=r.h;backdrop(x,r,'#ffb25a',st.t,'#ffe08a');circ(x,w*.8,h*.27,u*.2,COL.yellow,4);
  const T=7,tw=w*.76/T,th=(h*.62)/T,x0=w*.12,y0=h*.8;
  for(let i=0;i<T;i++)rrect(x,x0+i*tw,y0-(i+1)*th,w*.9,h,0,i%2?'#e6dcc4':'#f4ecd6',3);
  const k=st.n/st.S,px=x0+tw*.4+k*(T-1)*tw,py=y0-(k*(T-1)+1)*th-u*.17;
  head(x,st.player,px,py,u*.32,st.bad>0?'angry':st.result==='win'?'happy':'walking');rrect(x,px-u*.1,py+u*.13,u*.2,u*.1,4,'#8a8f9c',3);
  for(let i=0;i<2;i++){const bx=w*(i?.76:.24),by=h-u*.16,want=st.last!==i,pr=st.pad[i]>0;circ(x,bx,by,u*.13*(pr?1.1:1),want?COL.yellow:COL.dark,4);txt(x,i?'R':'L',bx,by,u*.13,want?COL.ink:COL.grey,{lw:0});}
  txt(x,st.n+' / '+st.S,w*.5,u*.12,u*.1,COL.white);}};

// ---------------------------------------------------------------- Karate: break the boards (hold-release)
const board={id:'board',verb:'BREAK!',theme:'movie',kind:'hold',source:'The Karate Kid',caption:'Karate: break the boards',duration:5.2,bossDuration:8.5,bg:'#7fb35a',boss:true,
 init(r,rng,speed,player,boss){return {u:U(r),f:ramp(speed,.55,.7),need:boss?3:1,broke:0,tries:boss?4:2,hold:-1,pw:0,zone:[.62,.92],strike:0,hit:null,fly:0};},
 update(st,dt){if(st.hold>=0){st.hold+=dt;const ph=(st.hold*st.f)%1;st.pw=ph<.5?ph*2:2-ph*2;}if(st.strike>0){st.strike-=dt;if(st.strike<=0)this.resolve(st);}if(st.fly>0)st.fly+=dt;},
 resolve(st){const ok=st.hit>=st.zone[0]&&st.hit<=st.zone[1];if(ok){st.broke++;st.fly=.001;sfx('shot');if(st.broke>=st.need&&!st.result)st.result='win';}else{st.tries--;sfx('lose');if(st.tries<=0&&!st.result)st.result='lose';}st.pw=0;},
 down(st){if(st.result||st.strike>0||st.hold>=0)return;st.hold=0;},
 up(st){if(st.hold<0||st.result)return;st.hit=st.pw;st.hold=-1;st.strike=.16;},
 hint(st){return {kind:'hold',x:st.r.w*.2,y:st.r.h*.55,size:st.u*.12};},
 draw(x,st,r){const {u}=st,w=r.w,h=r.h;backdrop(x,r,'#7fb35a',st.t,'#b9e83c');ground(x,r,h*.82,'#c9a36a',COL.ink);
  const bxm=w*.62;for(let i=0;i<4;i++){const by=h*.82-(i+1)*u*.09;if(i<st.need*0+3&&!(st.fly>0&&i<2)){rrect(x,bxm-u*.36,by,u*.72,u*.09,2,'#e8c48a',3);}else if(st.fly>0&&i<2){x.save();x.translate(bxm,by);x.rotate(st.fly*(i?3:-3));rrect(x,-u*.36,0,u*.36,u*.09,2,'#e8c48a',3);x.restore();}}
  const mx=w*.1,my=h*.1,mh=h*.62;rrect(x,mx,my,u*.1,mh,5,COL.dark,3);const [z0,z1]=st.zone;rrect(x,mx+3,my+mh*(1-z1),u*.1-6,mh*(z1-z0),3,COL.green,0);const py=my+mh*(1-st.pw);poly(x,[[mx+u*.1+4,py],[mx+u*.1+u*.12,py-u*.05],[mx+u*.1+u*.12,py+u*.05]],COL.white,3);
  const hy=h*.55+(st.hold>=0?-st.pw*u*.12:0);head(x,st.player,w*.2,hy,u*.38,st.broke?'happy':st.hold>=0?'angry':'normal');R.band(x,w*.2,hy,u*.38,COL.white);
  const ax=lerp(w*.3,bxm-u*.36,st.strike>0?1-st.strike/.16:(st.fly>0?1:0)),ay=hy-(st.strike>0?0:(st.hold>=0?st.pw*u*.28:0));circ(x,ax,ay+u*.1,u*.08,COL.tan,3);
  txt(x,'TRIES '+Math.max(0,st.tries),w-u*.5,u*.1,u*.09,COL.white);if(st.need>1)txt(x,st.broke+' / '+st.need,w-u*.5,u*.22,u*.1,COL.yellow);}};

Object.assign(exports,{GAMES_A:[stomp,shoot,pick,pull,strum,mph,stack,rotate,simon,jump,bail,steps,board]});
