// Microgame Rush, set C: drag / steer / scrub / hold / don't-touch microgames.
const R=require("src/engines/rushCore.js");
const {COL,circ,ell,rrect,boxC,poly,path,star,txt,cap,head,sfx,lerp,ramp,easeOutBack,dist,wob,backdrop,ground,clamp}=R;
const TAU=R.TAU;
const U=r=>Math.min(r.w,r.h);
const grab=(st,id,p,ox,oy)=>{st.drag={id,ox,oy};};

// ---------------------------------------------------------------- Star Trek: beam me up
const beam={id:'beam',verb:'BEAM!',theme:'tv',kind:'drag',source:'Star Trek',caption:'Star Trek: beam me up (drag Kirk to the pad)',duration:4.8,bg:'#1a2250',
 init(r,rng,speed){const u=U(r);return {u,k:{x:r.w*.14,y:r.h*(.3+rng()*.4)},pad:{x:r.w*.82,y:r.h*.5,A:r.h*.22,om:ramp(speed,1.2,1.7),ph:rng()*6},drag:null,inside:0,beam:0};},
 padY(st,t){return st.pad.y+Math.sin(st.pad.ph+t*st.pad.om)*st.pad.A;},
 update(st,dt){if(st.result==='win'){st.beam+=dt;return;}if(st.result)return;const py=this.padY(st,st.t);if(dist(st.k.x,st.k.y,st.pad.x,py)<st.u*.2){st.inside+=dt;if(st.inside>.12){st.result='win';st.beam=.001;sfx('rare');}}else st.inside=0;},
 down(st,p,id){if(!st.drag&&dist(p.x,p.y,st.k.x,st.k.y)<st.u*.3)grab(st,id,p,st.k.x-p.x,st.k.y-p.y);},
 move(st,p,id){if(st.drag&&st.drag.id===id&&!st.result){st.k.x=clamp(p.x+st.drag.ox,0,st.r.w);st.k.y=clamp(p.y+st.drag.oy,0,st.r.h);}},
 up(st,p,id){if(st.drag&&st.drag.id===id)st.drag=null;},
 hint(st){return {kind:'swipe',x:st.k.x,y:st.k.y,x2:st.pad.x,y2:st.pad.y,size:st.u*.12};},
 draw(x,st,r){const u=st.u,py=this.padY(st,st.t);backdrop(x,r,'#1a2250',st.t,'#3a4ba8');x.fillStyle='#fff';for(let i=0;i<20;i++)x.fillRect((i*83)%r.w,(i*47)%r.h,2,2);
  ell(x,st.pad.x,py+u*.06,u*.22,u*.09,'#2a3a7a',4);ell(x,st.pad.x,py,u*.2,u*.2*.45,'#6fe0ff',4);x.fillStyle='#bff4ff88';x.fillRect(st.pad.x-u*.17,py-u*.5,u*.34,u*.5);
  for(let i=0;i<6;i++){const a=st.t*3+i,ry=py-((st.t*60+i*20)%u*.5);star(x,st.pad.x+Math.sin(a)*u*.12,ry,u*.025,u*.01,4,a,COL.white,0);}
  const kx=st.k.x,ky=st.k.y,k=st.beam?Math.max(0,1-st.beam*3):1;if(k>0){x.save();x.translate(kx,ky);x.scale(k,k);rrect(x,-u*.12,u*.1,u*.24,u*.2,u*.04,COL.yellow,4);head(x,st.player,0,-u*.06,u*.34,st.drag?'angry':'normal');x.restore();}
  if(st.beam)for(let i=0;i<10;i++)star(x,st.pad.x+Math.sin(i*2+st.t*9)*u*.15,py-st.beam*u*1.2+i*u*.04,u*.03,u*.012,4,st.t*5,COL.white,0);}};

// ---------------------------------------------------------------- The Office: stapler in Jell-O
const jello={id:'jello',verb:'JELL-O!',theme:'tv',kind:'drag',source:'The Office',caption:'The Office: stapler in Jell-O (avoid the mugs)',duration:5,bg:'#e8d5a8',
 init(r,rng,speed){const u=U(r);return {u,s:{x:r.w*.13,y:r.h*.5},mugs:[{x:r.w*.45,y:r.h*(.14+rng()*.14)},{x:r.w*.58,y:r.h*(.72+rng()*.13)}],j:{x:r.w*.85,y:r.h*(.4+rng()*.2)},drag:null,splash:0,mr:u*.07};},
 update(st,dt){if(st.splash)st.splash+=dt;},
 down(st,p,id){if(!st.drag&&!st.result&&dist(p.x,p.y,st.s.x,st.s.y)<st.u*.28)grab(st,id,p,st.s.x-p.x,st.s.y-p.y);},
 move(st,p,id){if(!st.drag||st.drag.id!==id||st.result)return;st.s.x=clamp(p.x+st.drag.ox,0,st.r.w);st.s.y=clamp(p.y+st.drag.oy,0,st.r.h);
  for(const m of st.mugs)if(dist(st.s.x,st.s.y,m.x,m.y)<st.mr+st.u*.06){st.result='lose';st.hitMug=m;sfx('lose');return;}
  if(dist(st.s.x,st.s.y,st.j.x,st.j.y)<st.u*.16){st.result='win';st.splash=.001;sfx('rare');}},
 up(st,p,id){if(st.drag&&st.drag.id===id)st.drag=null;},
 hint(st){return {kind:'swipe',x:st.s.x,y:st.s.y,x2:st.j.x,y2:st.j.y,size:st.u*.12};},
 draw(x,st,r){const u=st.u;backdrop(x,r,'#e8d5a8',st.t,'#fff6d8');x.fillStyle='#c9a46a';x.fillRect(0,r.h*.92,r.w,r.h*.08);
  const jx=st.j.x,jy=st.j.y,wb=st.splash?Math.sin(st.splash*30)*4:Math.sin(st.t*4)*2;rrect(x,jx-u*.2+wb,jy-u*.18,u*.4,u*.36,u*.07,'rgba(80,220,160,.85)',4);rrect(x,jx-u*.2,jy+u*.12,u*.4,u*.06,u*.03,'#bfe9d4',3);txt(x,'JELL-O',jx,jy-u*.02,u*.075,COL.white,{lw:3});
  for(const m of st.mugs){rrect(x,m.x-u*.08,m.y-u*.08,u*.16,u*.18,u*.03,COL.white,4);x.strokeStyle=COL.ink;x.lineWidth=4;x.beginPath();x.arc(m.x+u*.1,m.y+u*.01,u*.05,-1.4,1.4);x.stroke();txt(x,'W',m.x,m.y+u*.01,u*.09,COL.red,{lw:0});if(st.hitMug===m)for(let i=0;i<5;i++)circ(x,m.x+Math.cos(i*1.3)*u*.14,m.y+u*.1,u*.025,'#7a4a1a',0);}
  if(!st.splash||st.splash<.2){x.save();x.translate(st.s.x,st.s.y);rrect(x,-u*.11,-u*.04,u*.22,u*.1,u*.03,COL.red,4);rrect(x,-u*.11,-u*.09,u*.19,u*.06,u*.025,'#b32b24',3);rrect(x,-u*.1,u*.04,u*.2,u*.03,u*.01,COL.dark,0);x.restore();}
  head(x,st.player,u*.12,r.h-u*.15,u*.3,st.result==='win'?'happy':st.result==='lose'?'sad':'silly');}};

// ---------------------------------------------------------------- Seinfeld: don't double dip
const dip={id:'dip',verb:'DIP!',theme:'tv',kind:'drag',source:'Seinfeld',caption:'Seinfeld: don’t double dip',duration:5,bg:'#f2c97a',
 init(r,rng,speed){const u=U(r);return {u,c:{x:r.w*.12,y:r.h*.74},bowl:{x:r.w*.5,y:r.h*(.55+rng()*.12)},mouth:{x:r.w*.86,y:r.h*.36},drag:null,dips:0,inB:false,nibble:0};},
 update(st,dt){if(st.nibble)st.nibble+=dt;},
 down(st,p,id){if(!st.drag&&!st.result&&dist(p.x,p.y,st.c.x,st.c.y)<st.u*.28)grab(st,id,p,st.c.x-p.x,st.c.y-p.y);},
 move(st,p,id){if(!st.drag||st.drag.id!==id||st.result)return;st.c.x=clamp(p.x+st.drag.ox,0,st.r.w);st.c.y=clamp(p.y+st.drag.oy,0,st.r.h);const d=dist(st.c.x,st.c.y,st.bowl.x,st.bowl.y);
  if(!st.inB&&d<st.u*.16){st.inB=true;st.dips++;sfx('tap');if(st.dips>=2){st.result='lose';sfx('lose');}}else if(st.inB&&d>st.u*.26)st.inB=false;
  if(st.dips===1&&!st.result&&dist(st.c.x,st.c.y,st.mouth.x,st.mouth.y)<st.u*.2){st.result='win';st.nibble=.001;sfx('rare');}},
 up(st,p,id){if(st.drag&&st.drag.id===id)st.drag=null;},
 hint(st){return {kind:'swipe',x:st.c.x,y:st.c.y,x2:st.bowl.x,y2:st.bowl.y,size:st.u*.12};},
 draw(x,st,r){const u=st.u;backdrop(x,r,'#f2c97a',st.t,'#fff0c0');
  ell(x,st.bowl.x,st.bowl.y+u*.03,u*.22,u*.12,COL.white,4);ell(x,st.bowl.x,st.bowl.y,u*.17,u*.08,st.dips?'#89c441':'#a8d65a',3);if(st.dips)for(let i=0;i<4;i++)circ(x,st.bowl.x+Math.cos(i*1.7)*u*.1,st.bowl.y+Math.sin(i*2.3)*u*.03,u*.012,'#6fa022',0);
  const mx=st.mouth.x,my=st.mouth.y;head(x,st.player,mx,my,u*.42,st.result==='win'?'happy':st.result==='lose'?'sad':'normal');ell(x,mx,my+u*.14,u*.1,u*.05+(st.result==='win'?0:(st.nibble?0:u*.01)),COL.dark,3);
  head(x,1-st.player,r.w*.3,u*.15,u*.28,st.dips>=2?'angry':'thinking');if(st.dips>=2)txt(x,'DOUBLE DIP!',r.w*.5,r.h*.22,u*.12,COL.red,{rot:-.05});
  if(!(st.result==='win'&&st.nibble>.2)){x.save();x.translate(st.c.x,st.c.y);x.rotate(.5);poly(x,[[-u*.12,u*.09],[u*.12,u*.09],[0,-u*.12]],st.dips?'#d8f08a':'#f6d46a',4);if(st.dips)poly(x,[[-u*.07,u*.09],[u*.07,u*.09],[0,-u*.03]],'#89c441',0);x.restore();}
  if(st.inB&&st.dips===1)txt(x,'DIP',st.bowl.x,st.bowl.y-u*.18,u*.1,COL.green);}};

// ---------------------------------------------------------------- Pac-Man: eat the dots
const eat={id:'eat',verb:'EAT!',theme:'game',kind:'drag',source:'Pac-Man',caption:'Pac-Man: eat 3 dots (dodge the ghost)',duration:5,bossDuration:8,bg:'#05051a',boss:true,
 init(r,rng,speed,player,boss){const u=U(r),n=boss?6:3,dots=[];for(let i=0;i<n;i++)dots.push({x:r.w*(.15+rng()*.7),y:r.h*(.15+rng()*.7),got:false});
  return {u,p:{x:r.w*.1,y:r.h*.5},tgt:{x:r.w*.1,y:r.h*.5},dots,gv:u*ramp(speed,.4,.55),vmax:u*ramp(speed,1.9,2.4),touch:false,dir:0,gx:r.w*.92,gy:r.h*.5};},
 update(st,dt){if(st.t>.5&&!st.result){const dx=st.p.x-st.gx,dy=st.p.y-st.gy,d=Math.hypot(dx,dy)||1;st.gx+=dx/d*st.gv*dt;st.gy+=dy/d*st.gv*dt;}
  if(st.touch){const dx=st.tgt.x-st.p.x,dy=st.tgt.y-st.p.y,d=Math.hypot(dx,dy),m=Math.min(d,st.vmax*dt);if(d>1){st.p.x+=dx/d*m;st.p.y+=dy/d*m;st.dir=Math.atan2(dy,dx);}}
  if(st.result)return;for(const d of st.dots)if(!d.got&&dist(st.p.x,st.p.y,d.x,d.y)<st.u*.13){d.got=true;sfx('pickup');}
  if(st.dots.every(d=>d.got))st.result='win';else if(st.t>.4&&dist(st.p.x,st.p.y,st.gx,st.gy)<st.u*.17){st.result='lose';sfx('lose');}},
 down(st,p,id){if(st.result)return;st.touch=true;st.fid=id;st.tgt={x:p.x,y:p.y};},
 move(st,p,id){if(id===st.fid)st.tgt={x:p.x,y:p.y};},
 up(st,p,id){if(id===st.fid)st.touch=false;},
 hint(st){const d=st.dots[0];return {kind:'swipe',x:st.p.x,y:st.p.y,x2:d.x,y2:d.y,size:st.u*.12};},
 draw(x,st,r){const u=st.u;backdrop(x,r,'#05051a',st.t,'#16165a');x.strokeStyle='#2f35ff';x.lineWidth=5;x.strokeRect(6,6,r.w-12,r.h-12);
  for(const d of st.dots)if(!d.got)circ(x,d.x,d.y,u*.045+Math.sin(st.t*8)*1,'#ffe6a8',2);
  const gx=st.gx,gy=st.gy,s=u*.12;x.save();x.translate(gx,gy);x.beginPath();x.arc(0,-s*.1,s,Math.PI,0);x.lineTo(s,s);for(let i=0;i<4;i++)x.lineTo(s-(i+.5)*s*.5,s*.6+(i%2?0:s*.4)*1);x.lineTo(-s,s);x.closePath();R.paint(x,COL.red,3);circ(x,-s*.35,-s*.15,s*.28,COL.white,2);circ(x,s*.35,-s*.15,s*.28,COL.white,2);circ(x,-s*.28,-s*.12,s*.12,COL.blue,0);circ(x,s*.42,-s*.12,s*.12,COL.blue,0);x.restore();
  const pr=u*.13,mo=Math.abs(Math.sin(st.t*10))*.6+.1;x.save();x.translate(st.p.x,st.p.y);x.rotate(st.dir);x.beginPath();x.moveTo(0,0);x.arc(0,0,pr,mo,TAU-mo);x.closePath();R.paint(x,COL.yellow,4);x.restore();
  head(x,st.player,st.p.x-Math.cos(st.dir)*pr*.2,st.p.y-pr*.15,pr*1.05,st.result==='lose'?'sad':'normal');
  txt(x,st.dots.filter(d=>d.got).length+' / '+st.dots.length,r.w-u*.35,u*.11,u*.1,COL.yellow);}};

// ---------------------------------------------------------------- Jurassic Park: catch the amber
const amber={id:'amber',verb:'CATCH!',theme:'movie',kind:'drag',source:'Jurassic Park',caption:'Jurassic Park: catch the amber (not the rocks)',duration:5,bossDuration:8,bg:'#2e6b3a',boss:true,
 init(r,rng,speed,player,boss){const need=boss?5:3,items=[],gap=ramp(speed,.72,.52),fall=ramp(speed,.8,1.0);let T=.5;const total=need+1+2,rockAt=new Set();while(rockAt.size<2)rockAt.add(1+Math.floor(rng()*(total-1)));
  for(let i=0;i<total;i++){items.push({T,x:r.w*(.12+rng()*.76),rock:rockAt.has(i),done:false});T+=gap*(.9+rng()*.2);}
  items.forEach((it,i)=>{if(!it.rock)return;let best=it.x,bd=-1;for(let k=0;k<8;k++){const cx=r.w*(.1+.8*k/7),d=Math.min(...[items[i-1],items[i+1],items[i-2],items[i+2]].filter(Boolean).map(o=>Math.abs(o.x-cx)));if(d>bd){bd=d;best=cx;}}it.x=best;});
  return {u:U(r),need,items,bx:r.w/2,tx:r.w/2,by:r.h*.86,vs:r.h*fall,got:0,miss:0,drag:null,bounce:0};},
 iy(st,it){return -st.u*.1+(st.t-it.T)*st.vs;},
 update(st,dt){st.bx+=(st.tx-st.bx)*Math.min(1,dt*16);st.bounce=Math.max(0,st.bounce-dt*4);if(st.result)return;
  for(const it of st.items){if(it.done||st.t<it.T)continue;const y=this.iy(st,it);if(y>=st.by-st.u*.06&&y<=st.by+st.u*.06&&Math.abs(it.x-st.bx)<st.u*.2){it.done=true;st.bounce=1;if(it.rock){st.result='lose';sfx('lose');}else{st.got++;sfx('pickup');if(st.got>=st.need)st.result='win';}}
   else if(y>st.r.h+st.u*.1){it.done=true;if(!it.rock){st.miss++;if(st.miss>(st.items.filter(i=>!i.rock).length-st.need)){st.result='lose';sfx('lose');}}}}},
 down(st,p,id){st.drag=id;st.tx=clamp(p.x,0,st.r.w);},
 move(st,p,id){if(st.drag===id&&!st.result)st.tx=clamp(p.x,0,st.r.w);},
 up(st,p,id){if(st.drag===id)st.drag=null;},
 hint(st){return {kind:'swipe',x:st.r.w*.3,y:st.by,x2:st.r.w*.7,y2:st.by,size:st.u*.12};},
 draw(x,st,r){const u=st.u;backdrop(x,r,'#2e6b3a',st.t,'#58b86c');for(let i=0;i<6;i++){const lx=(i*r.w/5)+8;poly(x,[[lx,r.h],[lx+u*.08,r.h*.4],[lx+u*.16,r.h]],'#1f4f2a',0);}ground(x,r,r.h*.95,'#6b4a2a',COL.ink);
  for(const it of st.items){if(it.done||st.t<it.T)continue;const y=this.iy(st,it);if(it.rock){poly(x,[[it.x-u*.09,y+u*.06],[it.x-u*.06,y-u*.07],[it.x+u*.05,y-u*.08],[it.x+u*.1,y+u*.05]],COL.grey,4);}else{x.save();x.translate(it.x,y);x.rotate(Math.sin(st.t*5+it.T)*.3);poly(x,[[0,-u*.12],[u*.09,-u*.02],[u*.06,u*.1],[-u*.06,u*.1],[-u*.09,-u*.02]],COL.orange,4);ell(x,0,0,u*.02,u*.045,COL.ink,0);x.restore();}}
  const k=1+st.bounce*.15,bx=st.bx,by=st.by;x.save();x.translate(bx,by);x.scale(1/k,k);rrect(x,-u*.17,-u*.02,u*.34,u*.14,u*.04,COL.brown,4);x.restore();head(x,st.player,bx,by-u*.1,u*.32,st.result==='lose'?'sad':'normal');
  txt(x,st.got+' / '+st.need,r.w-u*.35,u*.11,u*.1,COL.yellow);}};

// ---------------------------------------------------------------- Mario Kart: banana dodge
const banana={id:'banana',verb:'STEER!',theme:'game',kind:'drag',source:'Mario Kart',caption:'Mario Kart: dodge the bananas',duration:5,bossDuration:8,bg:'#3a9a46',boss:true,
 init(r,rng,speed,player,boss){const waves=boss?6:3,gap=ramp(speed,1.05,.85),bs=[];let T=1.3;const rw=Math.min(r.w*.7,U(r)*1.5);for(let i=0;i<waves;i++){const free=Math.floor(rng()*3);for(let l=0;l<3;l++)if(l!==free||(boss&&i%2&&rng()<.5&&l!==free&&false))bs.push({T,l});T+=gap*(.95+rng()*.15);}
  return {u:U(r),bs,rw,rx:(r.w-rw)/2,kx:r.w/2,tx:r.w/2,ky:r.h*.78,vs:r.h*ramp(speed,.6,.8),last:Math.max(...bs.map(b=>b.T))+.2,spin:0,drag:null};},
 by(st,b){return st.ky-(b.T-st.t)*st.vs;},
 update(st,dt){st.kx+=(st.tx-st.kx)*Math.min(1,dt*18);if(st.spin)st.spin+=dt*10;if(st.result)return;
  for(const b of st.bs){const bx=st.rx+(b.l+.5)*st.rw/3,y=this.by(st,b);if(Math.abs(y-st.ky)<st.u*.1&&Math.abs(bx-st.kx)<st.u*.13){st.result='lose';st.spin=.001;sfx('lose');}}
  if(st.t>st.last+.1)st.result='win';},
 down(st,p,id){st.drag=id;st.tx=clamp(p.x,st.rx+st.u*.1,st.rx+st.rw-st.u*.1);},
 move(st,p,id){if(st.drag===id&&!st.result)st.tx=clamp(p.x,st.rx+st.u*.1,st.rx+st.rw-st.u*.1);},
 up(st,p,id){if(st.drag===id)st.drag=null;},
 hint(st){return {kind:'swipe',x:st.r.w*.4,y:st.ky,x2:st.r.w*.6,y2:st.ky,size:st.u*.12};},
 draw(x,st,r){const u=st.u;backdrop(x,r,'#3a9a46',st.t,'#6fd37a');x.fillStyle='#55555f';x.fillRect(st.rx,0,st.rw,r.h);x.fillStyle=COL.ink;x.fillRect(st.rx-4,0,4,r.h);x.fillRect(st.rx+st.rw,0,4,r.h);
  x.fillStyle=COL.white;for(let l=1;l<3;l++)for(let i=-1;i<8;i++){const dy=((st.t*st.vs+i*u*.4)%(u*.4*8))-u*.4;x.fillRect(st.rx+l*st.rw/3-3,dy,6,u*.2);}
  for(let i=0;i<r.h;i+=u*.2){x.fillStyle=((Math.floor((i+st.t*st.vs)/(u*.2)))%2)?COL.red:COL.white;x.fillRect(st.rx-u*.04,(i+st.t*st.vs)%r.h,u*.04,u*.2);}
  for(const b of st.bs){const y=this.by(st,b);if(y<-30||y>r.h+30)continue;const bx=st.rx+(b.l+.5)*st.rw/3;x.save();x.translate(bx,y);x.rotate(.3);ell(x,0,0,u*.05,u*.11,COL.yellow,3);rrect(x,-u*.015,-u*.14,u*.03,u*.05,2,COL.brown,2);x.restore();}
  x.save();x.translate(st.kx,st.ky);x.rotate(st.spin?st.spin:(st.tx-st.kx)*.004);rrect(x,-u*.13,-u*.04,u*.26,u*.15,u*.04,COL.red,4);rrect(x,-u*.17,u*.0,u*.07,u*.12,3,COL.ink,2);rrect(x,u*.1,u*.0,u*.07,u*.12,3,COL.ink,2);head(x,st.player,0,-u*.1,u*.3,st.result==='lose'?'sad':'happy');cap(x,0,-u*.1,u*.3,COL.green,'L');x.restore();}};

// ---------------------------------------------------------------- Pong: return the ball
const pong={id:'pong',verb:'RETURN!',theme:'game',kind:'drag',source:'Pong',caption:'Pong: return the ball',duration:5,bossDuration:8,bg:'#0b0b10',boss:true,
 init(r,rng,speed,player,boss){const u=U(r),v=r.w*ramp(speed,.85,1.15);return {u,need:boss?4:2,ret:0,py:r.h/2,ty:r.h/2,ph:r.h*.17,b:{x:r.w*.8,y:r.h*(.3+rng()*.4),vx:-v,vy:(rng()<.5?-1:1)*r.h*(.35+rng()*.25)},v,ay:r.h/2,drag:null,serveT:.4};},
 update(st,dt){st.py+=(st.ty-st.py)*Math.min(1,dt*20);if(st.t<st.serveT)return;const b=st.b,{r}=st;b.x+=b.vx*dt;b.y+=b.vy*dt;const br=st.u*.04;if(b.y<br){b.y=br;b.vy=Math.abs(b.vy);}if(b.y>r.h-br){b.y=r.h-br;b.vy=-Math.abs(b.vy);}
  st.ay+=(b.y-st.ay)*Math.min(1,dt*10);const px=r.w*.07;
  if(!st.result){if(b.vx<0&&b.x<=px+br){if(Math.abs(b.y-st.py)<=st.ph+br){b.vx=-b.vx*1.04;b.x=px+br;b.vy+=(b.y-st.py)/st.ph*r.h*.3;st.ret++;sfx('tap');if(st.ret>=st.need)st.result='win';}else if(b.x<0){st.result='lose';sfx('lose');}}
   if(b.vx>0&&b.x>=r.w*.93-br){b.vx=-b.vx;b.x=r.w*.93-br;}}},
 down(st,p,id){st.drag=id;st.ty=clamp(p.y,st.ph,st.r.h-st.ph);},
 move(st,p,id){if(st.drag===id)st.ty=clamp(p.y,st.ph,st.r.h-st.ph);},
 up(st,p,id){if(st.drag===id)st.drag=null;},
 hint(st){return {kind:'swipe',x:st.r.w*.12,y:st.r.h*.35,x2:st.r.w*.12,y2:st.r.h*.65,size:st.u*.12};},
 draw(x,st,r){const u=st.u;x.fillStyle='#0b0b10';x.fillRect(0,0,r.w,r.h);x.fillStyle='#ffffff55';for(let i=0;i<r.h;i+=u*.1)x.fillRect(r.w/2-2,i,4,u*.05);
  const px=r.w*.07;x.fillStyle=COL.white;x.fillRect(px-u*.05,st.py-st.ph,u*.05,st.ph*2);x.fillStyle=COL.yellow;x.fillRect(px-u*.05,st.py-st.ph,u*.05,4);x.fillStyle=COL.white;x.fillRect(r.w*.93,st.ay-st.ph,u*.05,st.ph*2);
  head(x,1-st.player,st.b.x,st.b.y,u*.2,st.result==='win'?'sad':'angry');txt(x,st.ret+' / '+st.need,r.w/2,u*.11,u*.14,COL.white,{stroke:'#000',lw:0});head(x,st.player,r.w*.3,r.h-u*.12,u*.2,'normal');}};

// ---------------------------------------------------------------- Ghostbusters: trap the ghost
const trap={id:'trap',verb:'TRAP!',theme:'movie',kind:'drag',source:'Ghostbusters',caption:'Ghostbusters: keep the beam on the ghost',duration:5,bossDuration:8,bg:'#241a45',boss:true,
 init(r,rng,speed,player,boss){return {u:U(r),need:boss?3.2:ramp(speed,1.6,1.3),prog:0,f:null,aim:{x:r.w/2,y:r.h*.55},ph:[rng()*6,rng()*6],om:ramp(speed,1.4,1.9),on:false,cx:r.w/2,cy:r.h*.38};},
 ghost(st,t){const {r}=st;return {x:r.w*.5+Math.sin(st.ph[0]+t*st.om)*r.w*.3,y:st.cy+Math.sin(st.ph[1]+t*st.om*1.37)*r.h*.2};},
 update(st,dt){const g=this.ghost(st,st.t);st.gh=g;if(st.result==='win'){st.suck=(st.suck||0)+dt;return;}if(st.result)return;st.on=st.f!==null&&dist(st.aim.x,st.aim.y,g.x,g.y)<st.u*.2;
  if(st.on)st.prog+=dt;else st.prog=Math.max(0,st.prog-dt*.5);if(st.prog>=st.need){st.result='win';st.suck=.001;sfx('rare');}},
 down(st,p,id){if(st.f===null){st.f=id;st.aim={x:p.x,y:p.y};}},
 move(st,p,id){if(st.f===id)st.aim={x:p.x,y:p.y};},
 up(st,p,id){if(st.f===id)st.f=null;},
 hint(st){const g=this.ghost(st,.3);return {kind:'hold',x:g.x,y:g.y,size:st.u*.12};},
 draw(x,st,r){const u=st.u,g=st.gh||this.ghost(st,st.t),k=1-clamp(st.prog/st.need,0,1)*.6-(st.suck?st.suck*2:0);backdrop(x,r,'#241a45',st.t,'#4a2f9a');
  const hx=r.w/2,hy=r.h-u*.18;if(st.f!==null&&!st.result){const j=()=>(Math.random()-.5)*8;for(const col of ['#ff9a3c','#ffe14a']){x.strokeStyle=col;x.lineWidth=col==='#ff9a3c'?8:3;x.beginPath();x.moveTo(hx,hy);for(let i=1;i<8;i++){const t=i/8;x.lineTo(lerp(hx,st.aim.x,t)+j(),lerp(hy,st.aim.y,t)+j());}x.lineTo(st.aim.x,st.aim.y);x.stroke();}circ(x,st.aim.x,st.aim.y,u*.05,st.on?COL.white:COL.yellow,3);}
  if(k>0){x.save();x.translate(g.x,g.y);x.scale(Math.max(.05,k),Math.max(.05,k));const s=u*.17;x.beginPath();x.arc(0,-s*.2,s,Math.PI,0);x.lineTo(s,s*.8);for(let i=0;i<4;i++)x.quadraticCurveTo(s-(i+.5)*s*.5,s*(i%2?.5:1.3),s-(i+1)*s*.5,s*.8);x.closePath();R.paint(x,'#7dff7d',4);
   circ(x,-s*.35,-s*.3,s*.22,COL.white,3);circ(x,s*.35,-s*.3,s*.22,COL.white,3);circ(x,-s*.3,-s*.27,s*.09,COL.ink,0);circ(x,s*.4,-s*.27,s*.09,COL.ink,0);ell(x,0,s*.25,s*.35,s*.22+(st.on?s*.1:0),COL.ink,3);x.restore();}
  head(x,st.player,hx,hy,u*.34,st.result==='win'?'happy':'angry');rrect(x,hx-u*.2,hy-u*.27,u*.4,u*.07,u*.03,COL.white,3);
  const bw=r.w*.5;rrect(x,r.w/2-bw/2,u*.06,bw,u*.07,u*.03,COL.dark,3);rrect(x,r.w/2-bw/2+2,u*.06+2,Math.max(0,(bw-4)*clamp(st.prog/st.need,0,1)),u*.07-4,u*.025,COL.green,0);}};

// ---------------------------------------------------------------- Karate Kid: wax on, wax off
const wax={id:'wax',verb:'WAX!',theme:'movie',kind:'circle',source:'The Karate Kid',caption:'Karate Kid: wax on, wax off',duration:5.4,bg:'#d9c9a0',
 init(r,rng,speed){const need=ramp(speed,5.5,6.2);return {u:U(r),need,acc:0,phase:0,f:null,last:null,cx:r.w/2,cy:r.h*.55,glow:0,hand:{x:r.w*.5,y:r.h*.3}};},
 update(st,dt){st.glow=Math.max(0,st.glow-dt);},
 down(st,p,id){if(st.f===null){st.f=id;st.last=Math.atan2(p.y-st.cy,p.x-st.cx);st.hand={x:p.x,y:p.y};}},
 move(st,p,id){if(st.f!==id||st.result)return;st.hand={x:p.x,y:p.y};if(dist(p.x,p.y,st.cx,st.cy)<st.u*.07)return;const a=Math.atan2(p.y-st.cy,p.x-st.cx);let d=a-st.last;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;st.last=a;
  if(st.phase===0&&d>0)st.acc+=d;else if(st.phase===1&&d<0)st.acc-=d;if(Math.abs(d)>.02)st.glow=.2;if(st.acc>=st.need){if(st.phase===0){st.phase=1;st.acc=0;sfx('pickup');}else{st.result='win';sfx('rare');}}},
 up(st,p,id){if(st.f===id)st.f=null;},
 hint(st){return {kind:'circle',x:st.cx,y:st.cy,size:st.u*.2};},
 draw(x,st,r){const u=st.u,cx=st.cx,cy=st.cy;backdrop(x,r,'#d9c9a0',st.t,'#fff3cf');const prog=(st.phase*st.need+st.acc)/(2*st.need);
  const bw=Math.min(r.w*.8,u*1.5),bh=u*.58;rrect(x,cx-bw/2,cy-bh/2,bw,bh,u*.16,'#c0392b',5);x.save();x.beginPath();x.moveTo(cx-bw/2+8,cy-bh/2+8);x.lineTo(cx+bw/2-8,cy-bh/2+8);x.lineTo(cx+bw/2-8,cy+bh/2-8);x.lineTo(cx-bw/2+8,cy+bh/2-8);x.clip();x.fillStyle=`rgba(255,255,255,${.1+prog*.5})`;x.fillRect(cx-bw/2,cy-bh/2,bw,bh);x.restore();
  x.fillStyle='#ffe0d8';for(let i=0;i<Math.floor(prog*7);i++)star(x,cx-bw*.35+i*bw*.12,cy-bh*.25+(i%2)*bh*.3,u*.04,u*.015,4,st.t*3,COL.white,0);
  const word=st.phase===0?'WAX ON':'WAX OFF',col=st.phase===0?COL.red:COL.blue;txt(x,word,cx,r.h*.13,u*.15,COL.yellow,{lw:u*.04});
  x.strokeStyle=col;x.lineWidth=7;x.beginPath();const dir=st.phase===0?1:-1;x.arc(cx,cy,bh*.62,-1.2,-1.2+dir*5.2,dir<0);x.stroke();
  if(st.f!==null||true){const hx=st.hand.x,hy=st.hand.y;circ(x,hx,hy,u*.07,'#f0c8a0',4);}
  head(x,st.player,u*.17,r.h-u*.17,u*.3,st.result==='win'?'happy':'normal');rrect(x,u*.02,r.h-u*.33,u*.3,u*.05,3,COL.white,3);
  rrect(x,r.w*.6,r.h-u*.12,r.w*.32,u*.06,u*.03,COL.dark,3);rrect(x,r.w*.6+2,r.h-u*.12+2,Math.max(0,(r.w*.32-4)*prog),u*.06-4,u*.02,col,0);}};

// ---------------------------------------------------------------- Always Sunny: shake the rum ham
const shake={id:'shake',verb:'SHAKE!',theme:'tv',kind:'scrub',source:'It’s Always Sunny',caption:'Always Sunny: shake the rum ham',duration:4.8,bossDuration:8,bg:'#f08a5d',boss:true,
 init(r,rng,speed,player,boss){return {u:U(r),need:boss?30:Math.round(ramp(speed,13,15)),n:0,f:null,last:null,dirX:0,acc:0,jig:0};},
 update(st,dt){st.jig=Math.max(0,st.jig-dt*3);},
 down(st,p,id){if(st.f===null){st.f=id;st.last={x:p.x,y:p.y};st.acc=0;st.dirX=0;}},
 move(st,p,id){if(st.f!==id||st.result)return;const dx=p.x-st.last.x,dy=p.y-st.last.y,ax=Math.abs(dx)>=Math.abs(dy)?dx:dy;st.acc+=ax;if(Math.abs(st.acc)>st.u*.07){const d=Math.sign(st.acc);if(st.dirX&&d!==st.dirX){st.n++;st.jig=1;sfx('tap');if(st.n>=st.need){st.result='win';sfx('rare');}}st.dirX=d;st.acc=0;}st.last={x:p.x,y:p.y};},
 up(st,p,id){if(st.f===id)st.f=null;},
 hint(st){return {kind:'swipe',x:st.r.w*.35,y:st.r.h*.5,x2:st.r.w*.65,y2:st.r.h*.5,size:st.u*.12};},
 draw(x,st,r){const u=st.u,k=st.n/st.need;backdrop(x,r,'#f08a5d',st.t,'#ffc9a0');const sh=st.jig>0?Math.sin(st.t*50)*u*.05*st.jig:0,hx=r.w/2+sh,hy=r.h*.5;
  x.save();x.translate(hx,hy);x.rotate(sh*.01);ell(x,0,0,u*.36,u*.28,'#ff9fb0',5);ell(x,-u*.08,-u*.06,u*.2,u*.12,'#ffd0d8',0);rrect(x,u*.3,-u*.06,u*.22,u*.12,u*.05,COL.white,4);circ(x,u*.52,-u*.1,u*.05,COL.white,3);circ(x,u*.52,u*.02,u*.05,COL.white,3);
  rrect(x,-u*.1,-u*.2,u*.2,u*.4,u*.05,'#8a4b1f',4);txt(x,'RUM',0,0,u*.11,COL.yellow,{rot:-1.57,lw:3});x.restore();
  for(let i=0;i<Math.floor(k*10);i++)circ(x,hx+Math.sin(i*2.7+st.t*6)*u*.4,hy-u*.3-((i*37+st.t*60)%u*.3),u*.025,'#fff6',0);
  head(x,st.player,u*.17,r.h-u*.17,u*.3,st.result==='win'?'happy':'angry');
  const bw=r.w*.5;rrect(x,r.w/2-bw/2,u*.06,bw,u*.07,u*.03,COL.dark,3);rrect(x,r.w/2-bw/2+2,u*.06+2,Math.max(0,(bw-4)*k),u*.07-4,u*.025,COL.yellow,0);}};

// ---------------------------------------------------------------- Jurassic Park: don't move
const freeze={id:'freeze',verb:'FREEZE!',theme:'movie',kind:'still',source:'Jurassic Park',caption:'Jurassic Park: don’t move (it can’t see you)',duration:4.4,timeout:'win',bg:'#16301f',
 init(r,rng,speed){return {u:U(r),roar:0,lure:[1.4+rng()*.4,2.8+rng()*.3],lureLen:ramp(speed,.9,.8)};},
 update(st,dt){if(st.roar)st.roar+=dt;},
 lureOn(st){return st.lure.some(l=>st.t>=l&&st.t<l+st.lureLen);},
 down(st){if(st.result)return;st.result='lose';st.roar=.001;sfx('shot');},
 hint(st){return {kind:'hold',x:st.r.w/2,y:st.r.h*.6,size:st.u*.1};},
 draw(x,st,r){const u=st.u,cx=r.w/2,shake=st.roar?Math.sin(st.roar*60)*5:0;backdrop(x,r,'#16301f',st.t,'#2e7d46');
  for(let i=0;i<7;i++)poly(x,[[i*r.w/6-u*.1,r.h],[i*r.w/6,r.h*.35+(i%2)*r.h*.1],[i*r.w/6+u*.12,r.h]],'#0f2417',0);
  x.save();x.translate(cx+shake,r.h*.42);const s=u*.46,eye=st.roar?0:(Math.sin(st.t*2)*.5+.5);ell(x,0,0,s*1.15,s*.78,'#4c8a3a',5);ell(x,0,s*.45,s*1.0,s*.35,'#7fb35a',4);
  circ(x,-s*.5,-s*.15,s*.26,'#ffe14a',4);circ(x,s*.5,-s*.15,s*.26,'#ffe14a',4);ell(x,-s*.5+(eye-.5)*s*.18,-s*.15,s*.05,s*.16,COL.ink,0);ell(x,s*.5+(eye-.5)*s*.18,-s*.15,s*.05,s*.16,COL.ink,0);circ(x,-s*.1,-s*.05,s*.05,COL.ink,0);circ(x,s*.1,-s*.05,s*.05,COL.ink,0);
  if(st.roar){ell(x,0,s*.38,s*.78,s*.32,COL.red,5);for(let i=0;i<8;i++)poly(x,[[-s*.7+i*s*.2,s*.12],[-s*.6+i*s*.2,s*.34],[-s*.5+i*s*.2,s*.12]],COL.white,2);}x.restore();
  head(x,st.player,cx,r.h-u*.2,u*.34,st.result==='lose'?'sad':'thinking');rrect(x,cx-u*.3,r.h-u*.12,u*.6,u*.1,u*.03,COL.red,3);
  if(this.lureOn(st)&&!st.result){const bw=u*.55,bh=u*.2,pulse=1+Math.sin(st.t*20)*.05;x.save();x.translate(cx,r.h*.18);x.scale(pulse,pulse);rrect(x,-bw/2,-bh/2,bw,bh,bh*.3,COL.green,5);txt(x,'TAP TO WIN!',0,0,bh*.46,COL.white,{lw:4});x.restore();}
  if(!st.result)txt(x,'DON’T MOVE',cx,r.h*.05+u*.04,u*.08,COL.yellow,{lw:4});
  if(st.result==='lose')txt(x,'ROAAAR!',cx,r.h*.2,u*.16,COL.red,{rot:-.08});else if(st.t>st.r.w*0)x.globalAlpha=1;}};

// ---------------------------------------------------------------- Angry Birds: fling
const fling={id:'fling',verb:'FLING!',theme:'game',kind:'drag',source:'Angry Birds',caption:'Angry Birds: pull back and let go',duration:5.4,bg:'#8fd8ff',
 init(r,rng,speed){const u=U(r),g=u*3.2;return {u,grav:g,vmax:Math.sqrt(g*1.15*r.w),lmax:u*.42,bx:r.w*.17,by:r.h*.66,gy:r.h*.88,pig:{x:r.w*(.62+rng()*.22),y:r.h*.88-u*.09},shots:2,ball:null,drag:null,pull:null,wait:0};},
 vel(st,p){const dx=st.bx-p.x,dy=st.by-p.y,L=Math.min(Math.hypot(dx,dy),st.lmax),a=Math.atan2(dy,dx),sp=st.vmax*L/st.lmax;return {vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,L};},
 update(st,dt){const b=st.ball;if(b){b.vy+=st.grav*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.k+=dt;if(!st.result&&dist(b.x,b.y,st.pig.x,st.pig.y)<st.u*.16){st.result='win';st.pigHit=st.t;b.dead=true;sfx('rare');}
   if(b.y>=st.gravy||b.x>st.r.w+40){if(!st.result){st.ball=null;st.wait=.35;}}}
  else if(st.wait>0){st.wait-=dt;if(st.wait<=0&&st.shots<=0&&!st.result)st.result='lose';}},
 down(st,p,id){if(st.ball||st.drag||st.shots<=0||st.result)return;if(dist(p.x,p.y,st.bx,st.by)<st.u*.35){st.drag=id;st.pull={x:p.x,y:p.y};}},
 move(st,p,id){if(st.drag!==id)return;const dx=p.x-st.bx,dy=p.y-st.by,L=Math.hypot(dx,dy),m=Math.min(L,st.lmax);st.pull={x:st.bx+dx/(L||1)*m,y:st.by+dy/(L||1)*m};},
 up(st,p,id){if(st.drag!==id)return;st.drag=null;const v=this.vel(st,st.pull);st.pull=null;if(v.L<st.u*.08)return;st.shots--;st.ball={x:st.bx-(st.bx-(st.bx))+0,y:st.by,vx:v.vx,vy:v.vy,k:0};sfx('shot');},
 hint(st){return {kind:'swipe',x:st.bx,y:st.by,x2:st.bx-st.u*.3,y2:st.by+st.u*.12,size:st.u*.12};},
 draw(x,st,r){const u=st.u;backdrop(x,r,'#8fd8ff',st.t,'#fff');ground(x,r,st.gravy,'#5fbf4f',COL.ink);x.fillStyle='#4a9a3c';x.fillRect(0,st.gravy+4,r.w,r.h);
  rrect(x,st.bx-u*.03,st.by+u*.06,u*.06,st.gravy-st.by-u*.04,3,COL.brown,4);poly(x,[[st.bx-u*.1,st.by-u*.06],[st.bx-u*.03,st.by+u*.08],[st.bx-u*.03,st.by+u*.0]],COL.brown,3);poly(x,[[st.bx+u*.1,st.by-u*.06],[st.bx+u*.03,st.by+u*.08],[st.bx+u*.03,st.by+u*.0]],COL.brown,3);
  const pg=st.pig,pf=st.pigHit?Math.sin((st.t-st.pigHit)*20)*3:0;circ(x,pg.x+pf,pg.y,u*.1,'#8fdc4f',4);circ(x,pg.x-u*.03+pf,pg.y-u*.02,u*.025,COL.white,2);circ(x,pg.x+u*.04+pf,pg.y-u*.02,u*.025,COL.white,2);ell(x,pg.x+pf,pg.y+u*.035,u*.04,u*.03,'#6fbf3a',2);
  const drawBird=(bx,by)=>{head(x,st.player,bx,by,u*.26,st.drag?'angry':'normal');};
  if(st.drag&&st.pull){const v=this.vel(st,st.pull);let px=st.bx,py=st.by,vx=v.vx,vy=v.vy;x.fillStyle=COL.white;for(let i=0;i<18;i++){for(let k=0;k<3;k++){vy+=st.grav*.02/3;px+=vx*.02/3;py+=vy*.02/3;}if(py>st.gravy)break;circ(x,px,py,u*.012+ (i<6?.5:0),COL.white,1);}
   path(x,[[st.bx-u*.08,st.by-u*.04],[st.pull.x,st.pull.y],[st.bx+u*.08,st.by-u*.04]],'#5a2d0c',4);drawBird(st.pull.x,st.pull.y);}
  else if(!st.ball&&st.shots>0&&!st.result)drawBird(st.bx,st.by);
  if(st.ball)head(x,st.player,st.ball.x,st.ball.y,u*.26,'angry');
  for(let i=0;i<st.shots;i++)circ(x,u*.07+i*u*.11,r.h-u*.07,u*.04,COL.red,3);}};

Object.assign(exports,{GAMES_C:[beam,jello,dip,eat,amber,banana,pong,trap,wax,shake,freeze,fling]});
