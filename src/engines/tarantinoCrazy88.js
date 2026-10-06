// Kill Bill · Crazy 88. Both players are a Bride in the blue-lit House of Blue Leaves. Swipe to slash along the line
// of your finger: it cuts everything it crosses. Shielded fighters need the swipe the arrow shows, stamina is
// limited, and O-Ren Ishii arrives at 80% of the clock. Cinematic slow-motion and black-and-white flashes on multi-kills.
const {clamp,seededRandom}=require("src/utils.js");
const K=require("src/engines/tarantinoKit.js");
const {label,rr,lerp,filmOverlay,flash,mono,titleCard,subtitle,makeFx,makeShake,makeSlowmo,sfx,voice,halfPointers,keyboard}=K;

const DURATION=62,BOSS_AT=.8*DURATION,BOSS_HP=16,DIRS={l:[-1,0],r:[1,0],u:[0,-1],d:[0,1]},ARROW={l:'◀',r:'▶',u:'▲',d:'▼'};
const TYPES={grunt:{hp:1,spd:72,r:20,pts:10,col:'#15151f'},runner:{hp:1,spd:150,r:15,pts:15,col:'#e8e8ee'},shield:{hp:1,spd:56,r:23,pts:30,col:'#1a2236'},heavy:{hp:3,spd:42,r:29,pts:40,col:'#3a2a4a'}};
const BOSS_LINES=['O-Ren Ishii bows. Then she does not.','You can\'t kill what you can\'t catch, they say.','Snow falls. So does everyone else.'];
const dist2seg=(px,py,ax,ay,bx,by)=>{const dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;let t=l2?((px-ax)*dx+(py-ay)*dy)/l2:0;t=clamp(t,0,1);const cx=ax+dx*t-px,cy=ay+dy*t-py;return Math.sqrt(cx*cx+cy*cy);};

async function crazy88(s){
 const [c,x]=s.canvas(900,560,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();s.queueCanvasFit?.();
 const rnd=seededRandom(s.seed+':c88'),fx=makeFx(),shake=makeShake(),slow=makeSlowmo();
 const S={t:0,card:0,phase:'card',spawn:1.2,over:false,white:0,monoT:0,banner:0,bossT:0,bossSpawned:false,bossDead:false,bossLine:'',endT:0,uid:1};
 const mkP=i=>({i,score:0,kills:0,stam:100,winded:0,stun:0,lastSlash:0,hurt:0,swing:0,aim:0,trail:[],streak:0,best:0,key:{},keyCd:0});
 const P=[mkP(0),mkP(1)];let E=[],corpses=[],boss=null;
 const L={};const layout=()=>{const W=s.W,H=s.H,U=clamp(Math.min(W/760,H/470),.5,1.5);Object.assign(L,{W,H,U,bx:[W*.26,W*.74],by:H*(W<H?.62:.6)});};
 s.debug={engine:'c88',S,P,get E(){return E;},get boss(){return boss;}};
 const nearest=(ex,ey)=>{let b=0,bd=1e9;for(let i=0;i<2;i++){const d=Math.hypot(ex-L.bx[i],ey-L.by);if(d<bd){bd=d;b=i;}}return b;};
 const sc=(i,v,x0,y0)=>{P[i].score=Math.max(0,P[i].score+v);s.setScores([P[0].score,P[1].score]);if(x0!==undefined)fx.pop(x0,y0,(v>0?'+':'')+v,{color:v>0?'#fff':'#ff6a5a',size:clamp(18*L.U,13,28),life:.8});};
 function spawn(type,x0,y0,extra={}){const T=TYPES[type];E.push({id:S.uid++,type,x:x0,y:y0,hp:T.hp,max:T.hp,r:T.r*L.U,spd:T.spd*L.U*(.9+rnd()*.2),dir:extra.dir||null,cd:0,face:0,flash:0,bob:rnd()*6,...extra});}
 const edge=()=>{const side=Math.floor(rnd()*3),W=L.W,H=L.H;return side===0?{x:-30,y:H*(.2+rnd()*.7),side}:side===1?{x:W+30,y:H*(.2+rnd()*.7),side}:{x:W*(.1+rnd()*.8),y:-30,side};};
 function wave(){
  const t=S.t,pool=[['grunt',50]];if(t>8)pool.push(['shield',22]);if(t>13)pool.push(['line',16]);if(t>20)pool.push(['heavy',14]);
  let tot=pool.reduce((a,b)=>a+b[1],0),r=rnd()*tot,pick='grunt';for(const [k,w] of pool){r-=w;if(r<=0){pick=k;break;}}
  const e=edge();
  if(pick==='line'){const n=3+Math.floor(rnd()*3),horiz=e.side===2;for(let k=0;k<n;k++){const off=(k-(n-1)/2)*34*L.U;spawn('runner',e.x+(horiz?off:-(e.side===0?1:-1)*k*10*L.U),e.y+(horiz?0:off));}}
  else if(pick==='shield'){spawn('shield',e.x,e.y,{dir:['l','r','u','d'][Math.floor(rnd()*4)]});}
  else spawn(pick,e.x,e.y);
 }
 function spawnBoss(){S.bossSpawned=true;S.banner=2.2;S.bossLine=BOSS_LINES[Math.floor(rnd()*BOSS_LINES.length)];slow.hit(1.2,.4);sfx.shing();
  boss={x:L.W/2,y:-40,hp:BOSS_HP,r:36*L.U,guard:'l',gT:0,wind:0,windT:0,stag:0,flash:0,tx:L.W/2,ty:L.H*.27,summon:3,atk:3.5,face:1,cd:0};
 }
 function hurtBride(i,amount,x0,y0){const p=P[i];p.stun=.9;p.hurt=.5;p.stam=0;p.streak=0;sc(i,-amount,x0,y0);sfx.hit();shake.kick(10);S.white=Math.max(S.white,.15);fx.splat(L.bx[i],L.by,{n:8,speed:160,size:3.5,decal:false});s.react?.(i,'sad');}
 function kill(e,i,gesture){
  const T=TYPES[e.type];corpses.push({x:e.x,y:e.y,t:0,type:e.type,r:e.r,ang:rnd()*6.3});
  fx.splat(e.x,e.y,{n:20,speed:300,dir:Math.atan2(gesture.dy,gesture.dx),spread:1.6,size:4.5*L.U});fx.spark(e.x,e.y,6,'#bfe6ff');
  sc(i,T.pts,e.x,e.y-e.r);P[i].kills++;P[i].streak++;P[i].best=Math.max(P[i].best,P[i].streak);sfx.splat();sfx.shing();vibrate(8);
  gesture.kills++;gesture.t=0;
  if(gesture.kills>=3&&gesture.kills>gesture.shown){gesture.shown=gesture.kills;const n=gesture.kills,bonus=10*(n-2);sc(i,bonus);
   const word=n===3?'TRIPLE!':n===4?'QUAD!':n===5?'PENTA!':'CRAZY 88!';fx.pop(L.W/2,L.H*.38,word,{color:'#fff',size:clamp(54*L.U,26,80),life:1.1,stroke:'#0a2a6a'});
   slow.hit(.75,.22);S.white=1;S.monoT=.7;shake.kick(16);sfx.fanfare();s.react?.(i,'win');}
 }
 const vibrate=ms=>{try{navigator.vibrate?.(ms);}catch{}};
 function slashSeg(i,ax,ay,bx,by,gesture,dirx,diry){
  const len=Math.hypot(bx-ax,by-ay);if(len<2)return;
  for(const e of [...E]){if(e.dead)continue;if(dist2seg(e.x,e.y,ax,ay,bx,by)>e.r+7*L.U)continue;
   if(e.type==='shield'){const d=DIRS[e.dir],dot=dirx*d[0]+diry*d[1];if(dot<.62){if(e.cd<=0){e.cd=.3;e.flash=.2;fx.spark(e.x,e.y,10,'#8fe3ff');fx.pop(e.x,e.y-e.r-8,'CLANG!',{color:'#8fe3ff',size:clamp(18*L.U,12,26)});sfx.hit();P[i].stam=Math.max(0,P[i].stam-8);}continue;}}
   if(e.hitCd>0)continue;e.hp--;e.hitCd=.22;e.flash=.15;
   if(e.hp<=0){e.dead=true;gesture.dx=dirx;gesture.dy=diry;kill(e,i,gesture);}
   else{fx.splat(e.x,e.y,{n:6,speed:200,size:3.5,decal:false});sfx.hit();sc(i,5,e.x,e.y-e.r);}
  }
  if(boss&&!S.bossDead&&dist2seg(boss.x,boss.y,ax,ay,bx,by)<boss.r+8*L.U&&boss.cd<=0){
   const d=DIRS[boss.guard],dot=dirx*d[0]+diry*d[1];boss.cd=.3;
   if(boss.stag>0||dot>=.62){boss.hp--;boss.flash=.2;fx.splat(boss.x,boss.y,{n:14,speed:260,size:4.5*L.U,dir:Math.atan2(diry,dirx),spread:1.5});sc(i,8,boss.x,boss.y-boss.r);sfx.hit();shake.kick(6);if(boss.wind>0){boss.wind=0;boss.stag=1;fx.pop(boss.x,boss.y-boss.r-26,'INTERRUPTED',{color:'#ffe48a',size:clamp(18*L.U,12,24)});}
    if(boss.hp<=0){S.bossDead=true;S.endT=0;sc(i,100,boss.x,boss.y);fx.splat(boss.x,boss.y,{n:50,speed:420,size:6*L.U});slow.hit(1.6,.15);S.white=1;S.monoT=1.4;shake.kick(22);sfx.fanfare();s.react?.(i,'win');s.react?.(1-i,'sad');for(const p of P)p.kills+=0;P[i].kills++;}}
   else{fx.spark(boss.x,boss.y,14,'#fff');fx.pop(boss.x,boss.y-boss.r-8,'PARRIED',{color:'#8fe3ff',size:clamp(20*L.U,12,26)});sfx.shing();P[i].stam=Math.max(0,P[i].stam-15);}
  }
 }
 // ----- input
 const gest=new Map();
 const sample=(i,r)=>{const p=P[i];if(S.phase!=='play'||p.stun>0||p.winded>0)return;
  let g=gest.get(r.id);if(!g){g={kills:0,shown:0,t:0,hist:[[r.px,r.py]],dx:1,dy:0};gest.set(r.id,g);}
  const ax=r.px,ay=r.py,bx=r.x,by=r.y,len=Math.hypot(bx-ax,by-ay);if(len<1.5)return;
  g.hist.push([bx,by]);if(g.hist.length>6)g.hist.shift();const h=g.hist[0],hl=Math.hypot(bx-h[0],by-h[1])||1;g.dx=(bx-h[0])/hl;g.dy=(by-h[1])/hl;
  p.stam-=len/L.U*.11;p.lastSlash=0;p.aim=Math.atan2(by-L.by,bx-L.bx[i]);p.swing=.12;p.trail.push({x:bx,y:by,t:0});sfx_whoosh(len);
  slashSeg(i,ax,ay,bx,by,g,g.dx,g.dy);
  if(p.stam<=0){p.stam=0;p.winded=.9;fx.pop(L.bx[i],L.by-50*L.U,'WINDED!',{color:'#ffe48a',size:clamp(20*L.U,13,28)});sfx.groan();}
 };
 let lastWh=0;const sfx_whoosh=len=>{const n=performance.now();if(n-lastWh>70&&len>10){lastWh=n;sfx.whoosh(600,2200,.04,.1);}};
 halfPointers(s,{down:(i,r)=>{gest.set(r.id,{kills:0,shown:0,t:0,hist:[[r.x,r.y]],dx:1,dy:0});P[i].trail.push({x:r.x,y:r.y,t:0,brk:true});},move:(i,r)=>sample(i,r),up:(i,r)=>{gest.delete(r.id);P[i].trail.push({x:r.x,y:r.y,t:0,brk:true});}});
 keyboard(s,(i,name,down)=>{const p=P[i];if(!down)return;if(S.phase!=='play'||p.stun>0||p.winded>0||p.keyCd>0)return;
  if(name==='act'){p.keyCd=.6;p.stam-=26;p.swing=.3;const g={kills:0,shown:0,t:0};for(let k=0;k<8;k++){const a=k/8*6.283,b=(k+1)/8*6.283,R=82*L.U,cx=L.bx[i],cy=L.by;slashSeg(i,cx+Math.cos(a)*R,cy+Math.sin(a)*R,cx+Math.cos(b)*R,cy+Math.sin(b)*R,g,-Math.sin(a),Math.cos(a));}fx.ring(L.bx[i],L.by,{r:20*L.U,grow:300,life:.3,color:'#bfe6ff'});sfx.whoosh(500,2500,.08,.2);}
  else{const d=DIRS[name];if(!d)return;p.keyCd=.22;p.stam-=12;p.swing=.2;const cx=L.bx[i],cy=L.by,g={kills:0,shown:0,t:0},R=190*L.U,px=-d[1],py=d[0];
   for(const off of [-34,0,34]){const ox=px*off*L.U,oy=py*off*L.U;slashSeg(i,cx+ox+d[0]*20*L.U,cy+oy+d[1]*20*L.U,cx+ox+d[0]*R,cy+oy+d[1]*R,g,d[0],d[1]);}
   p.trail.push({x:cx+d[0]*30*L.U,y:cy+d[1]*30*L.U,t:0,brk:true});p.trail.push({x:cx+d[0]*R,y:cy+d[1]*R,t:0});sfx.whoosh(700,2400,.06,.12);}
  if(p.stam<=0){p.stam=0;p.winded=.9;}
 });
 s.hint('Swipe across the arena to slash along your finger\'s path: it cuts every fighter the line crosses, even on your rival\'s half. Fighters with a shield need a swipe in the direction of their arrow. Slashing drains stamina (rest to refill). Get hit and you lose points. Multi-kills trigger bullet-time; O-Ren arrives with 20% of the clock left. Keys: P1 WASD slash + Space spin, P2 arrows + Enter.');
 if(!await s.pass(0,'Crazy 88: swipe to slash through the masked fighters of the House of Blue Leaves. Cut several in one swipe for a combo, match the arrows on shielded fighters, and watch your stamina.','Both ready — draw your sword',{countdown:3}))return;
 layout();

 s.frame((rdt,tt)=>{
  layout();slow.step(rdt);const dt=rdt*slow.k;shake.step(rdt);fx.step(dt);S.white=Math.max(0,S.white-rdt*2.2);S.monoT=Math.max(0,S.monoT-rdt);S.banner=Math.max(0,S.banner-rdt);
  if(S.phase==='card'){S.card+=rdt;if(S.card>=2.2)S.phase='play';}
  else if(S.phase==='play'){
   S.t+=dt;
   if(!S.bossSpawned&&S.t>=BOSS_AT)spawnBoss();
   S.spawn-=dt;if(S.spawn<=0){const k=clamp(S.t/BOSS_AT,0,1);S.spawn=(lerp(1.5,.55,k))*(S.bossSpawned?1.7:1)*(.75+rnd()*.5);if(!S.bossDead)wave();if(S.t<4)S.spawn+=.6;}
   for(let i=0;i<2;i++){const p=P[i];p.keyCd=Math.max(0,p.keyCd-rdt);p.stun=Math.max(0,p.stun-dt);p.hurt=Math.max(0,p.hurt-dt);p.swing=Math.max(0,p.swing-dt);p.lastSlash+=dt;
    if(p.winded>0){p.winded-=dt;if(p.winded<=0)p.stam=Math.max(p.stam,22);}else if(p.lastSlash>.18&&p.stun<=0)p.stam=Math.min(100,p.stam+(p.lastSlash>.5?30:14)*dt);
    for(const q of p.trail)q.t+=rdt;while(p.trail.length&&p.trail[0].t>.28)p.trail.shift();}
   for(const e of E){e.cd=Math.max(0,e.cd-dt);e.hitCd=Math.max(0,(e.hitCd||0)-dt);e.flash=Math.max(0,e.flash-dt);e.bob+=dt*6;const bi=nearest(e.x,e.y),tx=L.bx[bi],ty=L.by,dx=tx-e.x,dy=ty-e.y,d=Math.hypot(dx,dy)||1;e.face=Math.atan2(dy,dx);
    e.x+=dx/d*e.spd*dt;e.y+=dy/d*e.spd*dt;
    if(d<e.r+30*L.U&&!e.dead){e.dead=true;corpses.push({x:e.x,y:e.y,t:.3,type:e.type,r:e.r,ang:0,puff:true});hurtBride(bi,15,tx,ty-50*L.U);fx.spark(tx,ty,10,'#fff');}}
   E=E.filter(e=>!e.dead);
   for(const k of corpses)k.t+=dt;corpses=corpses.filter(k=>k.t<.8);
   if(boss&&!S.bossDead){updateBoss(dt);}
   if(S.bossDead){S.endT+=rdt;if(S.endT>3.2&&!S.over){S.over=true;done('O-Ren falls');}}
   else if(S.t>=DURATION+(boss?0:0)&&!S.over){S.over=true;done(boss?'O-Ren escapes into the snow':'Crazy 88');}
  }
  draw(tt);
 });
 function done(txt){const a=P[0].score,b=P[1].score;s.finish([a,b],a===b?txt+' — a dead heat':txt);}
 function updateBoss(dt){
  const b=boss;b.cd=Math.max(0,b.cd-dt);b.flash=Math.max(0,b.flash-dt);b.stag=Math.max(0,b.stag-dt);b.gT+=dt;
  if(b.y<L.H*.27){b.y+=dt*120*L.U;b.x=L.W/2;return;}
  if(b.gT>1.5){b.gT=0;b.guard=['l','r','u','d'][Math.floor(rnd()*4)];}
  b.x=L.W/2+Math.sin(S.t*.8)*L.W*.28;b.y=L.H*.27+Math.sin(S.t*1.3)*L.H*.05;b.face=Math.sin(S.t*.8)>0?1:-1;
  b.summon-=dt;if(b.summon<=0){b.summon=2.6;const e=edge();spawn('grunt',e.x,e.y);const e2=edge();spawn('runner',e2.x,e2.y);}
  if(b.wind>0){b.wind-=dt;if(b.wind<=0){hurtBride(b.target,22,L.bx[b.target],L.by-50*L.U);b.atk=3.6;b.tx=b.x;}}
  else if(b.stag<=0){b.atk-=dt;if(b.atk<=0){b.wind=1;b.target=nearest(b.x,b.y);fx.pop(b.x,b.y-b.r-24,'!',{color:'#ff3b2f',size:34*L.U,life:.6});sfx.draw();}}
 }
 // ----- drawing
 function enemy(e){
  const r=e.r,T=TYPES[e.type],a=e.face;x.save();x.translate(e.x,e.y+Math.sin(e.bob)*1.5);
  x.fillStyle='#00000055';x.beginPath();x.ellipse(0,r*.6,r*1.1,r*.45,0,0,6.3);x.fill();
  x.rotate(a+Math.PI/2);x.fillStyle=e.flash>0?'#fff':T.col;x.beginPath();x.ellipse(0,r*.1,r*1.05,r*.68,0,0,6.3);x.fill();
  if(e.type==='runner'){x.fillStyle='#bbb';x.fillRect(-r*.2,-r*.5,r*.4,r);}
  x.strokeStyle='#9aa8c4';x.lineWidth=Math.max(2,r*.12);x.beginPath();x.moveTo(r*.7,-r*.1);x.lineTo(r*.8,-r*1.35);x.stroke();
  x.fillStyle='#d9c3a8';x.beginPath();x.arc(0,-r*.12,r*.55,0,6.3);x.fill();x.fillStyle='#050505';x.beginPath();x.arc(0,-r*.2,r*.56,Math.PI,Math.PI*2);x.fill();x.fillRect(-r*.5,-r*.28,r*1,r*.26);
  x.fillStyle='#fff';x.fillRect(-r*.28,-r*.2,r*.16,r*.07);x.fillRect(r*.12,-r*.2,r*.16,r*.07);
  if(e.type==='shield'){const d=DIRS[e.dir];x.restore();x.save();x.translate(e.x,e.y);x.fillStyle='rgba(120,220,255,.35)';x.strokeStyle='#8fe3ff';x.lineWidth=2.5;x.beginPath();x.arc(0,0,r*1.35,Math.atan2(-d[1],-d[0])-1.0+Math.PI,Math.atan2(-d[1],-d[0])+1.0+Math.PI);x.lineTo(0,0);x.closePath();x.fill();x.stroke();
   label(x,ARROW[e.dir],d[0]*r*1.7,d[1]*r*1.7-r*.2,clamp(r*1.1,16,30),{fill:'#fff',stroke:'#0a2a6a'});}
  if(e.type==='heavy'){x.restore();x.save();x.translate(e.x,e.y);for(let k=0;k<e.max;k++){x.fillStyle=k<e.hp?'#ff5a5a':'#ffffff30';x.beginPath();x.arc((k-(e.max-1)/2)*r*.5,-r*1.3,r*.16,0,6.3);x.fill();}}
  x.restore();
 }
 function bride(i,tt){
  const p=P[i],cx=L.bx[i],cy=L.by,U=L.U,hs=clamp(60*U,34,88);x.save();x.translate(cx,cy);
  if(p.stun>0)x.translate(Math.sin(tt*60)*2,0);
  x.fillStyle='#00000066';x.beginPath();x.ellipse(0,hs*.35,hs*.7,hs*.3,0,0,6.3);x.fill();
  // aura ring
  x.strokeStyle=i?'#ff9fc655':'#78b6ff55';x.lineWidth=3;x.beginPath();x.arc(0,0,hs*.8+Math.sin(tt*4)*2,0,6.3);x.stroke();
  // katana
  const a=p.aim+(p.swing>0?Math.sin(p.swing*30)*.4:0);x.save();x.rotate(a);x.strokeStyle='#e6eef7';x.lineWidth=Math.max(2,4*U);x.beginPath();x.moveTo(hs*.35,0);x.lineTo(hs*1.25,0);x.stroke();x.strokeStyle='#222';x.lineWidth=Math.max(3,6*U);x.beginPath();x.moveTo(hs*.2,0);x.lineTo(hs*.4,0);x.stroke();x.restore();
  // jumpsuit shoulders
  x.fillStyle=p.hurt>0?'#ffb0a0':'#f2d11e';x.beginPath();x.ellipse(0,hs*.32,hs*.62,hs*.4,0,0,6.3);x.fill();x.fillStyle='#111';x.fillRect(-hs*.58,hs*.28,hs*1.16,hs*.08);
  s.sprite(x,i,0,-hs*.08,hs*1.1,{exact:true,mood:p.stun>0?'sad':p.winded>0?'angry':p.swing>0?'win':'walking'});
  x.restore();
 }
 function drawBoss(){
  const b=boss;if(!b)return;const r=b.r;x.save();x.translate(b.x,b.y);
  x.fillStyle='#00000055';x.beginPath();x.ellipse(0,r*.6,r*1.2,r*.45,0,0,6.3);x.fill();
  if(b.wind>0){x.strokeStyle=`rgba(255,59,47,${.5+.4*Math.sin(S.t*40)})`;x.lineWidth=3;x.beginPath();x.arc(0,0,r*1.8*(1-b.wind*.3),0,6.3);x.stroke();const tp=L.bx[b.target];x.restore();x.save();x.strokeStyle='#ff3b2f88';x.setLineDash([8,8]);x.lineWidth=2;x.beginPath();x.moveTo(b.x,b.y);x.lineTo(tp,L.by);x.stroke();x.setLineDash([]);x.translate(b.x,b.y);}
  x.fillStyle=b.flash>0?'#fff':b.stag>0?'#b9c6e8':'#f4f6fb';x.beginPath();x.ellipse(0,r*.15,r*1.25,r*.8,0,0,6.3);x.fill();x.fillStyle='#d9304a';x.beginPath();x.ellipse(0,r*.3,r*.5,r*.35,0,0,6.3);x.fill();
  x.fillStyle='#0c0c12';x.beginPath();x.ellipse(0,-r*.3,r*.78,r*.8,0,0,6.3);x.fill();x.fillStyle='#e6cdb4';x.beginPath();x.arc(0,-r*.2,r*.5,0,6.3);x.fill();x.fillStyle='#0c0c12';x.beginPath();x.arc(0,-r*.35,r*.52,Math.PI,Math.PI*2);x.fill();x.fillRect(-r*.5,-r*.4,r,r*.1);
  x.fillStyle='#c4161c';x.beginPath();x.arc(0,-r*.02,r*.07,0,6.3);x.fill();
  x.strokeStyle='#e6eef7';x.lineWidth=4;x.beginPath();x.moveTo(r*.9*b.face,0);x.lineTo(r*1.9*b.face,-r*.8);x.stroke();
  const d=DIRS[b.guard];x.restore();x.save();x.translate(b.x,b.y);
  if(b.stag<=0){x.strokeStyle='#8fe3ff';x.lineWidth=4;x.beginPath();x.arc(0,0,r*1.55,Math.atan2(-d[1],-d[0])+Math.PI-.8,Math.atan2(-d[1],-d[0])+Math.PI+.8);x.stroke();label(x,ARROW[b.guard],d[0]*r*2.1,d[1]*r*2.1,clamp(r*1.1,18,34),{fill:'#fff',stroke:'#0a2a6a'});}
  else label(x,'STAGGERED',0,-r*1.6,clamp(r*.5,12,22),{fill:'#ffe48a'});
  x.restore();
 }
 function draw(tt){
  const {W,H,U}=L;x.save();shake.apply(x);
  const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0a1630');bg.addColorStop(1,'#0e2448');x.fillStyle=bg;x.fillRect(-10,-10,W+20,H+20);
  // floor boards
  x.strokeStyle='#1d3a6e55';x.lineWidth=1;for(let i=0;i<H;i+=34*U){x.beginPath();x.moveTo(0,i);x.lineTo(W,i);x.stroke();}
  x.strokeStyle='#2a508c44';x.lineWidth=3;x.beginPath();x.arc(W/2,H*.55,Math.min(W,H)*.34,0,6.3);x.stroke();x.beginPath();x.arc(W/2,H*.55,Math.min(W,H)*.2,0,6.3);x.stroke();
  // shoji wall + lanterns
  x.fillStyle='#1c3566';x.fillRect(0,0,W,H*.1);x.strokeStyle='#8fb4ff55';x.lineWidth=2;for(let i=0;i<=14;i++){x.beginPath();x.moveTo(W*i/14,0);x.lineTo(W*i/14,H*.1);x.stroke();}x.beginPath();x.moveTo(0,H*.05);x.lineTo(W,H*.05);x.stroke();
  for(let i=0;i<7;i++){const lx=W*(i+.5)/7,g=x.createRadialGradient(lx,H*.1,2,lx,H*.1,50*U);g.addColorStop(0,'rgba(170,210,255,.55)');g.addColorStop(1,'rgba(120,170,255,0)');x.fillStyle=g;x.fillRect(lx-60*U,0,120*U,H*.3);x.fillStyle='#cfe3ff';x.beginPath();x.ellipse(lx,H*.1,7*U,10*U,0,0,6.3);x.fill();}
  fx.drawDecals(x);
  for(const k of corpses){const a=1-k.t/.8;x.globalAlpha=a*.7;if(k.puff){x.fillStyle='#bfd0ee';x.beginPath();x.arc(k.x,k.y,k.r*(1+k.t),0,6.3);x.fill();}else{x.fillStyle='#07070c';x.beginPath();x.ellipse(k.x,k.y+k.r*.3,k.r*1.1,k.r*.45,k.ang,0,6.3);x.fill();}x.globalAlpha=1;}
  const list=[...E].sort((a,b)=>a.y-b.y);for(const e of list)enemy(e);drawBoss();for(let i=0;i<2;i++)bride(i,tt);
  // slash trails
  for(let i=0;i<2;i++){const p=P[i],tr=p.trail;if(tr.length<2)continue;for(let k=1;k<tr.length;k++){if(tr[k].brk)continue;const a=1-tr[k].t/.28;x.lineCap='round';x.strokeStyle=p.winded>0?`rgba(160,170,190,${a*.6})`:`rgba(120,200,255,${a*.5})`;x.lineWidth=14*U*a;x.beginPath();x.moveTo(tr[k-1].x,tr[k-1].y);x.lineTo(tr[k].x,tr[k].y);x.stroke();x.strokeStyle=`rgba(255,255,255,${a})`;x.lineWidth=4.5*U*a;x.stroke();}}
  fx.draw(x);
  x.restore();
  mono(x,W,H,S.monoT>0?clamp(S.monoT/.35,0,1):0);
  x.fillStyle='rgba(30,80,200,.10)';x.fillRect(0,0,W,H);
  // HUD
  const fs=clamp(Math.min(W,H*1.4)*.032,12,22);
  for(let i=0;i<2;i++){const p=P[i],hw=W/2,bw=hw*.62,bx=i*hw+hw/2-bw/2,by=H-clamp(H*.045,18,28);
   label(x,String(p.score),i*hw+hw/2,H*.06,fs*1.7,{fill:i?'#ff9fc6':'#8fc4ff',stroke:'#000'});label(x,`${p.kills} kills`,i*hw+hw/2,H*.06+fs*1.5,fs*.75,{fill:'#fff',stroke:'#000'});
   x.fillStyle='#000a';rr(x,bx-2,by-2,bw+4,12,6);x.fill();x.fillStyle=p.winded>0?'#889':p.stam>30?'#6ad0ff':'#ffb347';rr(x,bx,by,Math.max(0,bw*p.stam/100),8,4);x.fill();
   label(x,p.winded>0?'WINDED':p.stun>0?'STUNNED':'STAMINA',i*hw+hw/2,by-10,fs*.6,{fill:'#fff',stroke:'#000',alpha:.8});
   if(p.hurt>0){x.fillStyle=`rgba(255,40,30,${p.hurt*.4})`;x.fillRect(i*hw,0,hw,H);}}
  const left=Math.max(0,DURATION-S.t);label(x,`${Math.floor(left/60)}:${String(Math.ceil(left)%60).padStart(2,'0')}`,W/2,H*.055,fs*1.2,{fill:'#fff3b9',stroke:'#000'});
  if(boss&&!S.bossDead){const bw=Math.min(W*.5,340),bx=W/2-bw/2,by=H*.115;x.fillStyle='#000a';rr(x,bx-2,by-2,bw+4,14,7);x.fill();x.fillStyle='#e0304a';rr(x,bx,by,Math.max(0,bw*boss.hp/BOSS_HP),10,5);x.fill();label(x,'O-REN ISHII',W/2,by+22,fs*.8,{fill:'#fff',stroke:'#000'});}
  flash(x,W,H,S.white*.85);
  if(S.banner>0){const a=Math.min(1,S.banner*3,(2.2-S.banner)*4);x.fillStyle=`rgba(0,0,0,${.85*a})`;x.fillRect(0,0,W,H*.14);x.fillRect(0,H*.86,W,H*.14);x.globalAlpha=a;label(x,'CHAPTER SIX: O-REN ISHII',W/2,H*.5,clamp(W*.05,18,44),{fill:'#e9c84a',stroke:'#000',font:`900 ${clamp(W*.05,18,44)}px Georgia, serif`});subtitle(x,W,H,S.bossLine,1,H*.92);x.globalAlpha=1;}
  if(S.bossDead&&S.endT<2.8)label(x,'O-REN DOWN',W/2,H*.45,clamp(W*.08,24,64),{fill:'#fff',stroke:'#7a1d12',alpha:Math.min(1,S.endT*3)});
  if(S.phase==='card')titleCard(x,W,H,S.card,{chapter:5,title:'HOUSE OF BLUE LEAVES',sub:'swipe to slash · match the arrows · mind your stamina',life:2.2});
  else filmOverlay(x,W,H,tt,{grain:.3,vignette:.5});
  s.setScores([P[0].score,P[1].score]);s.status(`${s.players[0].name} ${P[0].score} · ${s.players[1].name} ${P[1].score} · swipe to slash`);
 }
}
Object.assign(exports,{crazy88});
