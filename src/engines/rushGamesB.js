// Microgame Rush, set B: swipe / flick / gesture microgames.
const R=require("src/engines/rushCore.js");
const {COL,circ,ell,rrect,boxC,poly,path,star,txt,cap,head,sfx,lerp,ramp,easeOutBack,dist,wob,backdrop,ground,clamp,segCirc}=R;
const TAU=R.TAU;
const U=r=>Math.min(r.w,r.h);
function segSeg(ax,ay,bx,by,cx,cy,dx,dy){const d=(bx-ax)*(dy-cy)-(by-ay)*(dx-cx);if(!d)return false;const t=((cx-ax)*(dy-cy)-(cy-ay)*(dx-cx))/d,u=((cx-ax)*(by-ay)-(cy-ay)*(bx-ax))/d;return t>=0&&t<=1&&u>=0&&u<=1;}
// finger bookkeeping shared by swipe games: st.f[id]={x,y,sx,sy}
const fdown=(st,p,id)=>{(st.f||(st.f={}))[id]={x:p.x,y:p.y,sx:p.x,sy:p.y,t:st.t};return st.f[id];};
const trail=(st,p)=>{(st.tr||(st.tr=[])).push({x:p.x,y:p.y,t:st.t});if(st.tr.length>12)st.tr.shift();};
function drawTrail(x,st){if(!st.tr||st.tr.length<2)return;const now=st.t;x.lineCap='round';for(let i=1;i<st.tr.length;i++){const a=st.tr[i-1],b=st.tr[i],age=now-b.t;if(age>.3)continue;x.strokeStyle=`rgba(255,255,255,${1-age/.3})`;x.lineWidth=10*(1-age/.3)+2;x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke();}}

// ---------------------------------------------------------------- Fruit Ninja: slice
const FRUIT=[['#2fae4f','#ff5a5a'],['#ff9a3c','#ffd27a'],['#e8403a','#fff3d1'],['#b9e83c','#f4ffc4']];
const slice={id:'slice',verb:'SLICE!',theme:'game',kind:'swipe',source:'Fruit Ninja',caption:'Fruit Ninja: slice 3 fruits (not the bomb)',duration:5,bossDuration:8,bg:'#7a4a2a',boss:true,
 init(r,rng,speed,player,boss){const need=boss?6:3,n=need+2,D=ramp(speed,1.6,1.3),gap=ramp(speed,.5,.4),u=U(r),fr=[];let T=.2;const bombAt=1+Math.floor(rng()*(n-1));
  for(let i=0;i<n+(boss?1:0);i++){const bomb=i===bombAt||(boss&&i===bombAt+3);const Hpk=r.h*(.55+rng()*.2),g=8*Hpk/(D*D);fr.push({T,x:r.w*(.2+rng()*.6),vx:(rng()-.5)*r.w*.15,g,v0:g*D/2,D,bomb,type:Math.floor(rng()*4),done:0,sx:0,sy:0,svx:0,svy:0,rot:rng()*6});T+=gap*(.85+rng()*.3);}
  return {u,need,fr,got:0,fr0:u*.13};},
 update(st,dt){for(const f of st.fr)if(f.done){f.done+=dt;f.svy+=st.r.h*2.5*dt;f.sx+=f.svx*dt;f.sy+=f.svy*dt;}},
 down(st,p,id){fdown(st,p,id);trail(st,p);},
 move(st,p,id){const f=st.f?.[id];if(!f||st.result)return;trail(st,p);
  for(const fr of st.fr){const k=st.t-fr.T;if(fr.done||k<0||k>fr.D)continue;const px=fr.x+fr.vx*k,py=st.r.h+st.fr0-(fr.v0*k-.5*fr.g*k*k);
   if(segCirc(f.x,f.y,p.x,p.y,px,py,st.fr0*1.25)&&dist(f.x,f.y,p.x,p.y)>2){fr.done=.001;fr.sx=px;fr.sy=py;fr.svx=(p.x-f.x)*8+(fr.bomb?0:0);fr.svy=-st.r.h*.3;
    if(fr.bomb){st.result='lose';sfx('lose');}else{st.got++;sfx('pickup');if(st.got>=st.need)st.result='win';}}}
  f.x=p.x;f.y=p.y;},
 up(st,p,id){if(st.f)delete st.f[id];},
 hint(st){return {kind:'swipe',x:st.r.w*.25,y:st.r.h*.55,x2:st.r.w*.75,y2:st.r.h*.45,size:st.u*.12};},
 draw(x,st,r){const u=st.u;backdrop(x,r,'#7a4a2a',st.t,'#a86c40');for(let i=0;i<4;i++){x.fillStyle='#00000018';x.fillRect(0,i*r.h*.25,r.w,4);}
  for(const f of st.fr){const k=st.t-f.T;if(f.done){const a=Math.max(0,1-f.done*1.3);if(a<=0)continue;x.globalAlpha=a;for(const s of [-1,1]){x.save();x.translate(f.sx+s*f.done*u*.5,f.sy);x.rotate(s*f.done*5);if(f.bomb){circ(x,0,0,st.fr0,COL.red,3);txt(x,'BOOM',0,0,st.fr0*.7,COL.yellow);}else{x.beginPath();x.arc(0,0,st.fr0,s>0?-Math.PI/2:Math.PI/2,s>0?Math.PI/2:Math.PI*1.5);x.closePath();R.paint(x,FRUIT[f.type][1],3);}x.restore();}x.globalAlpha=1;continue;}
   if(k<0||k>f.D)continue;const px=f.x+f.vx*k,py=r.h+st.fr0-(f.v0*k-.5*f.g*k*k);
   if(f.bomb){circ(x,px,py,st.fr0,'#2b2b3b',4);rrect(x,px-st.fr0*.18,py-st.fr0*1.25,st.fr0*.36,st.fr0*.4,3,COL.grey,3);star(x,px,py-st.fr0*1.4,st.fr0*.3,st.fr0*.12,6,st.t*10,COL.yellow,2);circ(x,px-st.fr0*.3,py-st.fr0*.3,st.fr0*.2,'#ffffff55',0);}
   else{circ(x,px,py,st.fr0,FRUIT[f.type][0],4);circ(x,px-st.fr0*.3,py-st.fr0*.3,st.fr0*.22,'#ffffff55',0);if(f.type===0){x.strokeStyle='#14672b';x.lineWidth=3;for(let i=-1;i<=1;i++){x.beginPath();x.arc(px,py,st.fr0*(.45+i*.25),.7+f.rot,2.2+f.rot);x.stroke();}}}}
  drawTrail(x,st);txt(x,st.got+' / '+st.need,r.w-u*.35,u*.12,u*.12,COL.yellow);head(x,st.player,u*.2,r.h-u*.2,u*.3,st.got?'happy':'angry');rrect(x,u*.07,r.h-u*.35,u*.26,u*.07,3,COL.red,3);}};

// ---------------------------------------------------------------- Super Troopers: slap the stick
const slap={id:'slap',verb:'SLAP!',theme:'movie',kind:'swipe',source:'Super Troopers',caption:'Super Troopers: slap the stick',duration:5,bossDuration:8,bg:'#3d6bd6',boss:true,
 init(r,rng,speed,player,boss){const n=boss?6:3,life=ramp(speed,1.1,.85),spots=Array.from({length:n+3},()=>({x:r.w*(.2+rng()*.6),y:r.h*(.3+rng()*.4),rot:(rng()-.5)*.9}));return {u:U(r),n,life,spots,i:0,t0:.35,hits:0,slapT:-9,burst:null};},
 cur(st){const s=st.spots[Math.min(st.i,st.spots.length-1)];return s;},
 update(st,dt){if(st.result)return;const e=st.t-st.t0;if(e>st.life&&st.hits<st.n&&st.i<st.spots.length-1){st.i++;st.t0=st.t+.2;}if(e>st.life+.2&&st.i>=st.spots.length-1)st.result='lose';},
 down(st,p,id){fdown(st,p,id);},
 move(st,p,id){const f=st.f?.[id];if(!f||st.result)return;trail(st,p);const e=st.t-st.t0;if(e<0||e>st.life){f.x=p.x;f.y=p.y;return;}const s=this.cur(st);
  if(dist(f.x,f.y,p.x,p.y)>st.u*.03&&segCirc(f.x,f.y,p.x,p.y,s.x,s.y,st.u*.17)){st.hits++;st.burst={x:s.x,y:s.y,t:st.t};sfx('shot');if(st.hits>=st.n)st.result='win';else{st.i++;st.t0=st.t+.25;}}f.x=p.x;f.y=p.y;},
 up(st,p,id){if(st.f)delete st.f[id];},
 hint(st){const s=st.spots[0];return {kind:'swipe',x:s.x-st.u*.25,y:s.y,x2:s.x+st.u*.25,y2:s.y,size:st.u*.12};},
 draw(x,st,r){const u=st.u;backdrop(x,r,'#3d6bd6',st.t,'#6f98f2');ground(x,r,r.h*.86,'#555a6b',COL.ink);
  const e=st.t-st.t0,s=this.cur(st),show=!st.result&&e>=0&&e<=st.life;
  if(show){const k=easeOutBack(e/.12),sw=Math.sin(st.t*14)*.05;x.save();x.translate(s.x,s.y);x.rotate(s.rot+sw);x.scale(k,k);rrect(x,-u*.05,-u*.26,u*.1,u*.52,u*.03,COL.tan,4);rrect(x,-u*.05,-u*.08,u*.1,u*.08,2,COL.red,3);rrect(x,-u*.05,u*.1,u*.1,u*.08,2,COL.red,3);x.restore();
   circ(x,s.x,s.y+u*.34,u*.06,'#e8b89a',3);x.lineWidth=3;x.strokeStyle=COL.white;x.globalAlpha=.8*(1-e/st.life);x.beginPath();x.arc(s.x,s.y,u*.2+e*u*.05,0,TAU);x.stroke();x.globalAlpha=1;}
  if(st.burst&&st.t-st.burst.t<.4){const b=st.burst,k=(st.t-b.t)/.4;star(x,b.x,b.y,u*(.2+.2*k),u*.09,9,k*2,COL.yellow,4);txt(x,'SLAP!',b.x,b.y,u*.12,COL.red,{rot:-.2});}
  drawTrail(x,st);head(x,st.player,u*.2,r.h-u*.22,u*.36,st.hits?'happy':'angry');rrect(x,u*.1,r.h-u*.1-u*.36,u*.2,u*.06,3,COL.dark,3);txt(x,st.hits+' / '+st.n,r.w-u*.35,u*.12,u*.12,COL.white);}};

// ---------------------------------------------------------------- Contra: Konami code
const DIRS=[[0,-1],[0,1],[-1,0],[1,0]],ARROW=['U','D','L','R'];
const konami={id:'konami',verb:'CODE!',theme:'game',kind:'swipe',source:'Contra (Konami)',caption:'Contra: the Konami code',duration:5,bossDuration:8,bg:'#1d2b6b',boss:true,
 init(r,rng,speed,player,boss){const seq=boss?[0,0,1,1,2,3,2,3]:[0,0,1,1];return {u:U(r),seq,idx:0,f:{},flash:-9,wrong:false};},
 update(st,dt){},
 down(st,p,id){st.f[id]={sx:p.x,sy:p.y,used:false};},
 move(st,p,id){const f=st.f[id];if(!f||f.used||st.result)return;const dx=p.x-f.sx,dy=p.y-f.sy,L=Math.hypot(dx,dy);if(L<st.u*.2)return;f.used=true;
  const d=Math.abs(dx)>Math.abs(dy)?(dx<0?2:3):(dy<0?0:1);if(d===st.seq[st.idx]){st.idx++;st.flash=st.t;sfx('pickup');if(st.idx>=st.seq.length)st.result='win';}else{st.wrong=true;st.result='lose';}},
 up(st,p,id){delete st.f[id];},
 hint(st){return {kind:'swipe',x:st.r.w*.5,y:st.r.h*.7,x2:st.r.w*.5,y2:st.r.h*.35,size:st.u*.12};},
 draw(x,st,r){const u=st.u,n=st.seq.length,tw=Math.min(r.w*.9/n,u*.34),x0=r.w/2-tw*n/2;backdrop(x,r,'#1d2b6b',st.t,'#3a52c9');
  for(let i=0;i<n;i++){const cx=x0+(i+.5)*tw,cy=r.h*.38,done=i<st.idx,nxt=i===st.idx&&!st.result;rrect(x,cx-tw*.44,cy-tw*.44,tw*.88,tw*.88,tw*.14,done?COL.green:nxt?COL.yellow:COL.white,4);
   const d=DIRS[st.seq[i]];x.save();x.translate(cx,cy);x.rotate(Math.atan2(d[1],d[0]));poly(x,[[tw*.28,0],[-tw*.1,-tw*.26],[-tw*.1,-tw*.1],[-tw*.28,-tw*.1],[-tw*.28,tw*.1],[-tw*.1,tw*.1],[-tw*.1,tw*.26]],done?COL.white:COL.ink,3);x.restore();}
  const hy=r.h*.78;head(x,st.player,r.w/2,hy,u*.38,st.result==='win'?'happy':st.wrong?'sad':'angry');rrect(x,r.w/2-u*.19,hy-u*.15,u*.38,u*.06,3,COL.red,3);
  if(st.t-st.flash<.2)star(x,r.w/2,hy,u*.3,u*.15,8,st.t*8,COL.yellow,3);}};

// ---------------------------------------------------------------- Cut the Rope: cut at the right moment
const cut={id:'cut',verb:'CUT!',theme:'game',kind:'swipe',source:'Cut the Rope',caption:'Cut the Rope: feed Om Nom',duration:5,bg:'#a8e063',
 init(r,rng,speed){const u=U(r);return {u,hy:r.h*.08,L:r.h*.34,A:r.w*.28,om:ramp(speed,1.6,2.1),ph:rng()*6,cut:false,cx:0,cy:0,vx:0,vy:0,grav:r.h*2.2,mx:r.w*.5,my:r.h*.86,mr:u*.2,fell:0,hook:null};},
 hookX(st,t){return st.r.w*.5+Math.sin(st.ph+t*st.om)*st.A;},
 update(st,dt){const hx=this.hookX(st,st.t),hv=Math.cos(st.ph+st.t*st.om)*st.A*st.om;if(!st.cut){st.cx=hx+hv*.04;st.cy=st.hy+st.L;st.hx=hx;st.hv=hv;}
  else{st.vy+=st.grav*dt;st.cx+=st.vx*dt;st.cy+=st.vy*dt;if(!st.result&&st.cy>=st.my-st.u*.05){if(Math.abs(st.cx-st.mx)<st.mr){st.result='win';st.eat=st.t;sfx('rare');}else{st.result='lose';sfx('lose');}}}},
 down(st,p,id){fdown(st,p,id);},
 move(st,p,id){const f=st.f?.[id];if(!f||st.cut||st.result)return;trail(st,p);if(segSeg(f.x,f.y,p.x,p.y,st.hx,st.hy,st.cx,st.cy-st.u*.05)){st.cut=true;st.vx=st.hv*.55;st.vy=0;sfx('shot');}f.x=p.x;f.y=p.y;},
 up(st,p,id){if(st.f)delete st.f[id];},
 hint(st){return {kind:'swipe',x:st.r.w*.35,y:st.hy+st.L*.55,x2:st.r.w*.65,y2:st.hy+st.L*.55,size:st.u*.12};},
 draw(x,st,r){const u=st.u;backdrop(x,r,'#a8e063',st.t,'#e4ffb0');ground(x,r,r.h*.9,'#6fb83a',COL.ink);
  // landing preview
  if(!st.cut&&!st.result){const tf=Math.sqrt(2*(st.my-st.cy)/st.grav),lx=st.cx+st.hv*.55*tf;x.setLineDash([6,8]);x.strokeStyle='#ffffff';x.lineWidth=3;x.beginPath();x.moveTo(st.cx,st.cy);x.quadraticCurveTo(st.cx+st.hv*.55*tf*.5,st.cy,lx,st.my);x.stroke();x.setLineDash([]);circ(x,lx,st.my,u*.03,COL.red,2);}
  const ph=st.hx??this.hookX(st,0);if(!st.cut){circ(x,ph,st.hy,u*.04,COL.grey,3);x.strokeStyle='#7a4a1a';x.lineWidth=5;x.beginPath();x.moveTo(ph,st.hy);x.lineTo(st.cx,st.cy-u*.05);x.stroke();}
  else{x.strokeStyle='#7a4a1a';x.lineWidth=5;x.beginPath();x.moveTo(ph,st.hy);x.lineTo(ph+(Math.sin(st.t*8)*4),st.hy+st.L*.4);x.stroke();circ(x,this.hookX(st,st.t),st.hy,u*.04,COL.grey,3);}
  // Om Nom
  const mx=st.mx,my=st.my,open=st.cut||st.result?1:.5,eat=st.eat&&st.t-st.eat<.4;ell(x,mx,my-u*.02,u*.27,u*.24,COL.green,4);ell(x,mx,my+u*.02,st.mr*.9,st.mr*(.5+open*.3),COL.dark,3);
  if(!st.result||st.result==='lose'||!eat)ell(x,mx,my+u*.06,st.mr*.5,u*.03,COL.red,0);circ(x,mx-u*.12,my-u*.2,u*.06,COL.white,3);circ(x,mx+u*.12,my-u*.2,u*.06,COL.white,3);circ(x,mx-u*.11,my-u*.19,u*.025,COL.ink,0);circ(x,mx+u*.11,my-u*.19,u*.025,COL.ink,0);
  poly(x,[[mx-u*.12,my-u*.01],[mx-u*.08,my+u*.07],[mx-u*.04,my-u*.01]],COL.white,2);
  if(!(st.result==='win'&&st.t-st.eat>.05)){circ(x,st.cx,st.cy,u*.075,COL.orange,4);circ(x,st.cx,st.cy,u*.035,COL.yellow,0);}
  head(x,st.player,u*.18,u*.25,u*.3,st.result==='win'?'happy':'normal');drawTrail(x,st);}};

// ---------------------------------------------------------------- Street Fighter: hadouken
const hadouken={id:'hadouken',verb:'HADOUKEN!',theme:'game',kind:'swipe',source:'Street Fighter',caption:'Street Fighter: down, down-forward, forward',duration:5,bg:'#e8b04a',
 init(r,rng,speed){return {u:U(r),f:{},ball:null,hit:0,gy:r.h*.78,fx:r.w*.22,ex:r.w*.8,v:r.w*ramp(speed,.9,1.3),cast:-9,dizzy:0};},
 update(st,dt){if(st.ball){st.ball.x+=st.v*dt;if(st.ball.x>=st.ex-st.u*.12&&!st.hit){st.hit=st.t;st.result='win';st.ball=null;sfx('shot');}}if(st.hit)st.dizzy+=dt;},
 down(st,p,id){st.f[id]={sx:p.x,sy:p.y,stage:0,mx:p.x,my:p.y};},
 move(st,p,id){const f=st.f[id];if(!f||st.ball||st.result)return;const u=st.u;if(f.stage===0&&p.y-f.sy>u*.13){f.stage=1;f.mx=p.x;f.my=p.y;}
  else if(f.stage===1){if(p.y>f.my){f.my=p.y;f.mx=Math.min(f.mx,p.x+u*.5);}if(p.x-f.mx>u*.2){st.ball={x:st.fx+u*.15,y:st.gy-u*.3};st.cast=st.t;sfx('rare');f.stage=2;}}},
 up(st,p,id){delete st.f[id];},
 hint(st){return {kind:'swipe',x:st.r.w*.25,y:st.r.h*.3,x2:st.r.w*.6,y2:st.r.h*.65,size:st.u*.12};},
 draw(x,st,r){const u=st.u,gy=st.gy;backdrop(x,r,'#e8b04a',st.t,'#fff0a8');ground(x,r,gy+u*.12,'#a06a3a',COL.ink);x.fillStyle='#0003';for(let i=0;i<r.w;i+=u*.3)x.fillRect(i,gy+u*.2,u*.2,4);
  const lean=st.cast>0&&st.t-st.cast<.3?u*.08:0;head(x,st.player,st.fx+lean,gy-u*.3,u*.4,st.cast>0?'angry':'normal');rrect(x,st.fx-u*.2+lean,gy-u*.48,u*.4,u*.06,3,COL.red,3);rrect(x,st.fx-u*.17,gy-u*.1,u*.34,u*.22,u*.04,COL.white,3);
  const ex=st.ex+(st.hit?Math.min(u*.5,st.dizzy*u*2):0),ey=gy-u*.3-(st.hit?Math.sin(Math.min(st.dizzy*5,3))*u*.25:0);head(x,1-st.player,ex,ey,u*.4,st.hit?'sad':'angry');rrect(x,ex-u*.17,gy-u*.1,u*.34,u*.22,u*.04,COL.red,3);
  if(st.ball){const b=st.ball;circ(x,b.x,b.y,u*.15,'#7fe0ff',4);circ(x,b.x,b.y,u*.08,COL.white,0);for(let i=1;i<4;i++)circ(x,b.x-i*u*.1,b.y+Math.sin(st.t*30+i)*3,u*.12-i*u*.02,'#7fe0ff88',0);}
  if(st.hit&&st.dizzy<.5)txt(x,'HIT!',ex,ey-u*.35,u*.14,COL.red);
  if(!st.result&&!st.ball){x.globalAlpha=.55;x.strokeStyle=COL.ink;x.lineWidth=4;x.setLineDash([8,8]);x.beginPath();x.moveTo(r.w*.1,r.h*.12);x.lineTo(r.w*.1,r.h*.12+u*.2);x.lineTo(r.w*.1+u*.2,r.h*.12+u*.2);x.stroke();x.setLineDash([]);x.globalAlpha=1;}}};

// ---------------------------------------------------------------- Pokemon: flick the ball
const throwG={id:'throw',verb:'THROW!',theme:'game',kind:'swipe',source:'Pokémon',caption:'Pokémon: flick the Poké Ball',duration:5,bg:'#7fd8ff',
 init(r,rng,speed){const u=U(r);return {u,f:{},balls:3,flying:[],py:r.h*.28,A:r.w*.3,om:ramp(speed,1.5,2.1),ph:rng()*6,hit:0,rx:r.w*.5,ry:r.h*.9};},
 mon(st,t){return {x:st.r.w*.5+Math.sin(st.ph+t*st.om)*st.A,y:st.py+Math.sin(t*3)*st.u*.03};},
 update(st,dt){const m=this.mon(st,st.t);for(const b of st.flying){if(b.dead)continue;b.x+=b.vx*dt;b.y+=b.vy*dt;b.k+=dt;if(!st.result&&dist(b.x,b.y,m.x,m.y)<st.u*.17){b.dead=true;st.result='win';st.hit=st.t;sfx('rare');}if(b.y<-30||b.x<-30||b.x>st.r.w+30){b.dead=true;}}
  if(st.hit)st.hitD=(st.hitD||0)+dt;if(!st.result&&st.balls<=0&&st.flying.every(b=>b.dead))st.result='lose';},
 down(st,p,id){st.f[id]={sx:p.x,sy:p.y,done:false,t:st.t};},
 move(st,p,id){const f=st.f[id];if(!f||f.done||st.result||st.balls<=0)return;const dx=p.x-f.sx,dy=p.y-f.sy,L=Math.hypot(dx,dy);if(L<st.u*.14||dy>-st.u*.06)return;f.done=true;st.balls--;const sp=st.r.h*1.7;st.flying.push({x:st.rx,y:st.ry,vx:dx/L*sp,vy:dy/L*sp,k:0,dead:false});sfx('tap');},
 up(st,p,id){delete st.f[id];},
 hint(st){return {kind:'swipe',x:st.rx,y:st.ry,x2:st.rx+st.u*.05,y2:st.r.h*.5,size:st.u*.12};},
 draw(x,st,r){const u=st.u,m=this.mon(st,st.t);backdrop(x,r,'#7fd8ff',st.t,'#fff');ground(x,r,r.h*.72,'#6fcf6a',COL.ink);x.fillStyle='#00000012';ell(x,m.x,r.h*.74,u*.18,u*.04,'#00000022',0);
  const caught=st.hit,shk=caught?Math.sin(st.t*30)*3:0;x.save();x.translate(m.x+shk,m.y);const s=u*.17;
  poly(x,[[-s*.7,-s*.5],[-s*1.1,-s*1.5],[-s*.3,-s*.8]],COL.yellow,3);poly(x,[[s*.7,-s*.5],[s*1.1,-s*1.5],[s*.3,-s*.8]],COL.yellow,3);circ(x,-s*1.05,-s*1.4,s*.14,COL.ink,0);circ(x,s*1.05,-s*1.4,s*.14,COL.ink,0);
  ell(x,0,s*.15,s*.95,s*.9,COL.yellow,4);circ(x,-s*.32,-s*.1,s*.1,COL.ink,0);circ(x,s*.32,-s*.1,s*.1,COL.ink,0);circ(x,-s*.62,s*.18,s*.2,COL.red,2);circ(x,s*.62,s*.18,s*.2,COL.red,2);x.lineWidth=3;x.strokeStyle=COL.ink;x.beginPath();x.arc(0,s*.1,s*.15,.2,Math.PI-.2);x.stroke();x.restore();
  if(caught){const k=Math.min(1,st.hitD*3);ell(x,m.x,m.y,u*.2*(1-k*.3),u*.2*(1-k*.3),COL.white,0);}
  const ball=(bx,by,sc)=>{circ(x,bx,by,u*.07*sc,COL.red,3);x.save();x.beginPath();x.arc(bx,by,u*.07*sc,0,Math.PI);x.closePath();x.fillStyle=COL.white;x.fill();x.restore();circ(x,bx,by,u*.07*sc,null,3);circ(x,bx,by,u*.025*sc,COL.white,3);};
  for(const b of st.flying)if(!b.dead)ball(b.x,b.y,Math.max(.4,1-b.k*.8));if(st.balls>0&&!st.result)ball(st.rx,st.ry,1);for(let i=0;i<st.balls;i++)ball(u*.12+i*u*.15,r.h*.1,.7);
  head(x,st.player,r.w-u*.2,r.h-u*.2,u*.34,st.result==='win'?'happy':'normal');cap(x,r.w-u*.2,r.h-u*.2,u*.34,COL.red,'');}};

// ---------------------------------------------------------------- The Matrix: dodge the bullets
const bullets={id:'bullets',verb:'DODGE!',theme:'movie',kind:'swipe',source:'The Matrix',caption:'The Matrix: dodge the bullets',duration:5,bossDuration:8,bg:'#06140c',boss:true,
 init(r,rng,speed,player,boss){const u=U(r),v=r.w*ramp(speed,.7,.85),nx=r.w*.2,vols=boss?4:3,gap=ramp(speed,1.05,.95)*(boss?1.1:1),bs=[];let T=1.3;for(let i=0;i<vols;i++){const k=boss&&i>0?2:1,free=Math.floor(rng()*3),lanes=k===2?[0,1,2].filter(l=>l!==free):[Math.floor(rng()*3)];for(const l of lanes)bs.push({T,l});T+=gap*(.95+rng()*.15);}
  return {u,v,nx,bs,lane:1,ly:[r.h*.2,r.h*.5,r.h*.8],f:{},y:r.h*.5,lean:0,last:Math.max(...bs.map(b=>b.T))+.15};},
 update(st,dt){st.y+=(st.ly[st.lane]-st.y)*Math.min(1,dt*14);st.lean=lerp(st.lean,0,dt*6);if(st.result)return;
  for(const b of st.bs){const bx=st.nx+(b.T-st.t)*st.v;if(Math.abs(bx-st.nx)<st.u*.12&&b.l===st.lane){st.result='lose';sfx('lose');}}
  if(st.t>st.last+.1)st.result='win';},
 down(st,p,id){st.f[id]={sy:p.y,used:false};},
 move(st,p,id){const f=st.f[id];if(!f||f.used||st.result)return;const dy=p.y-f.sy;if(Math.abs(dy)>st.u*.13){f.used=true;const nl=clamp(st.lane+(dy<0?-1:1),0,2);if(nl!==st.lane){st.lane=nl;st.lean=dy<0?-1:1;sfx('tap');}}},
 up(st,p,id){delete st.f[id];},
 hint(st){return {kind:'swipe',x:st.nx+st.u*.4,y:st.r.h*.6,x2:st.nx+st.u*.4,y2:st.r.h*.25,size:st.u*.12};},
 draw(x,st,r){const u=st.u;backdrop(x,r,'#06140c',st.t,'#0d5a2a');x.font='bold 14px monospace';x.fillStyle='#1fa24f55';for(let i=0;i<22;i++){const cx=(i*47)%r.w,cy=((st.t*60*(1+i%3)+i*61)%(r.h+20));x.fillText(String.fromCharCode(0x30a0+(i*7+Math.floor(st.t*6))%90),cx,cy);}
  for(let l=0;l<3;l++){x.fillStyle='#ffffff08';x.fillRect(0,st.ly[l]-u*.1,r.w,u*.2);}
  for(const b of st.bs){const bx=st.nx+(b.T-st.t)*st.v,by=st.ly[b.l],warn=(b.T-st.t)*st.v+st.nx>r.w-u*.05&&b.T-st.t<2.2;if(warn&&Math.floor(st.t*10)%2===0)poly(x,[[r.w-u*.06,by],[r.w-u*.22,by-u*.09],[r.w-u*.22,by+u*.09]],COL.red,3);
   if(bx>-30&&bx<r.w+30){x.strokeStyle='#9dffb8';x.lineWidth=3;x.globalAlpha=.5;x.beginPath();x.moveTo(bx,by);x.lineTo(bx+u*.5,by);x.stroke();x.globalAlpha=1;ell(x,bx,by,u*.1,u*.04,'#ffe14a',3);}}
  x.save();x.translate(st.nx,st.y);x.rotate(st.lean*-.35);rrect(x,-u*.1,u*.08,u*.2,u*.3,u*.05,COL.ink,2);rrect(x,-u*.09,u*.1,u*.18,u*.2,u*.04,'#222',2);x.restore();
  head(x,st.player,st.nx+st.lean*-u*.06,st.y-u*.08,u*.34,st.result==='lose'?'sad':'normal');rrect(x,st.nx-u*.15-st.lean*u*.06,st.y-u*.14,u*.3,u*.07,u*.03,COL.ink,2);
  if(st.result==='lose')txt(x,'HIT',st.nx,st.y-u*.35,u*.14,COL.red);}};

// ---------------------------------------------------------------- Bop It: bop / twist / pull
const CMDS=[['BOP IT!',COL.orange],['TWIST IT!',COL.green],['PULL IT!',COL.blue]];
const bop={id:'bop',verb:'DO IT!',theme:'toy',kind:'mixed',source:'Bop It',caption:'Bop It: bop it, twist it, pull it',duration:5.4,bossDuration:8.5,bg:'#ff7eb6',boss:true,
 init(r,rng,speed,player,boss){const n=boss?6:3,seq=[];for(let i=0;i<n;i++){let c=Math.floor(rng()*3);if(i&&c===seq[i-1])c=(c+1+Math.floor(rng()*2))%3;seq.push(c);}
  return {u:U(r),seq,idx:0,win:ramp(speed,1.7,1.3),t0:0,f:{},pop:-9,ang:0,pull:0,tw:0};},
 zone(st,x){return clamp(Math.floor(x/(st.r.w/3)),0,2);},
 update(st,dt){if(st.result)return;if(st.t-st.t0>st.win){st.result='lose';sfx('lose');}},
 ok(st){st.idx++;st.pop=st.t;st.t0=st.t;sfx('pickup');if(st.idx>=st.seq.length)st.result='win';},
 down(st,p,id){st.f[id]={z:this.zone(st,p.x),sx:p.x,sy:p.y,ang:null,acc:0,pull:0,t:st.t,moved:0};},
 move(st,p,id){const f=st.f[id];if(!f||st.result)return;const cmd=st.seq[st.idx],cx=st.r.w/2,cy=st.r.h*.6,a=Math.atan2(p.y-cy,p.x-cx);f.moved=Math.max(f.moved,dist(f.sx,f.sy,p.x,p.y));
  if(f.z===1){if(f.ang!==null){let d=a-f.ang;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;f.acc+=Math.abs(d);st.tw=a;}f.ang=a;if(f.acc>2.4&&cmd===1){f.acc=-9;this.ok(st);}}
  else if(f.z===2&&cmd===2&&Math.abs(p.y-f.sy)>st.u*.22){f.sy=1e9;this.ok(st);}},
 up(st,p,id){const f=st.f[id];delete st.f[id];if(!f||st.result)return;if(f.z===0&&f.moved<st.u*.1&&st.seq[st.idx]===0)this.ok(st);},
 hint(st){return {kind:'tap',x:st.r.w/6,y:st.r.h*.6,size:st.u*.12};},
 draw(x,st,r){const u=st.u,w=r.w,cy=r.h*.6;backdrop(x,r,'#ff7eb6',st.t,'#ffc0de');const cmd=st.seq[Math.min(st.idx,st.seq.length-1)],fresh=st.t-st.pop<.18;
  const word=st.result==='win'?'BOP IT!!':CMDS[cmd][0];const k=1+(fresh?.15:0);txt(x,word,w/2,r.h*.17,Math.min(u*.17*k,w*.9/(word.length*.62)),CMDS[cmd][1]===COL.orange?COL.yellow:COL.white,{lw:u*.04});
  const left=clamp(1-(st.t-st.t0)/st.win,0,1);rrect(x,w*.2,r.h*.29,w*.6,u*.045,u*.02,COL.dark,2);rrect(x,w*.2+2,r.h*.29+2,Math.max(0,(w*.6-4)*left),u*.045-4,u*.015,left>.4?COL.green:COL.red,0);
  rrect(x,w*.06,cy-u*.34,w*.88,u*.68,u*.2,'#2b2b3d',5);
  circ(x,w/6,cy,Math.min(w/6-6,u*.26),COL.orange,5);txt(x,'BOP',w/6,cy,u*.1,COL.white);
  const kx=w/2;circ(x,kx,cy,Math.min(w/6-4,u*.27),COL.green,5);x.save();x.translate(kx,cy);x.rotate(st.tw);x.fillStyle=COL.ink;x.fillRect(-4,-u*.25,8,u*.22);circ(x,0,0,u*.1,COL.lime,3);x.restore();txt(x,'TWIST',kx,cy+u*.22,u*.07,COL.white,{lw:3});
  const hx=w*5/6,hy=cy-(Object.values(st.f).find(f=>f.z===2)?0:0);rrect(x,hx-u*.045,cy-u*.3,u*.09,u*.6,u*.04,COL.dark,3);rrect(x,hx-u*.1,cy-u*.12+(st.pull||0),u*.2,u*.24,u*.06,COL.blue,4);txt(x,'PULL',hx,cy+u*.3+0,u*.07,COL.white,{lw:3});
  head(x,st.player,w/2,r.h-u*.16,u*.28,st.result==='win'?'happy':st.result==='lose'?'sad':'silly');}};

Object.assign(exports,{GAMES_B:[slice,slap,konami,cut,hadouken,throwG,bullets,bop]});
