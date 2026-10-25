// Snake vs. Snake, rebuilt as a slither.io-style neon duel: two glowing snakes glide freely around a hex-tile arena,
// eat orbs to grow, and die if their head touches the other snake's body (it bursts into big orbs for the taker).
// Both at once: drag on your own half like a joystick to steer; drag far to boost (it burns length).
// 75 seconds; orbs are points, a kill is +50.
// Online (netField): one fixed arena (NET_W x NET_H) on both phones, turned so you start at the bottom. Each phone moves
// only its own snake and judges only its own death (wall, or its head on the other body as this phone shows it). The
// snake streams {f:{h:[x,y,a],l,b,v,n,i,p}} 20/s and the other phone rebuilds the body along the head's path. Orbs: 70
// pool slots whose places come from the seed and the slot's generation (`p<slot>.<gen>`; eating one moves the slot on, so
// both phones agree), plus orbs a phone drops itself (boost, death). {e:{q:[['e',id]|['a',id,x,y,r,v,c]...]}} eats/adds,
// {e:{die:[by,life],o:[[id,x,y,c]...]}} a death (the killer's +50 comes from it). The end waits for both finals {fin:{p}}.
const {clamp,seededRandom}=require("src/utils.js");
const {voice,noise,makeShake,halfPointers,keyboard,label,SANS}=require("src/engines/tarantinoKit.js");
const {makeBits,vignette}=require("src/engines/retroKit.js");
const {vibrate}=require("src/audio.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
const {netField}=require("src/engines/netField.js");

const SKIN=[['#29d8ff','#0b6cff'],['#ff9a2e','#ff3f8e']],ORB=['#ff5ad9','#4fe6ff','#8dff6a','#ffd23f','#ff7a3a','#b78bff'];
const SECONDS=75,NET_W=420,NET_H=740,POOL=70;

async function snakeduel(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.shared=true;s.updateScores();s.ownHud(true,true);
 const shake=makeShake(),bits=makeBits(),rand=seededRandom(s.seed+':slither');let t=0,state='wait',W=s.W,H=s.H,K=1;
 const on=s.online||null,me=on?on.me:0,them=1-me,T=on?6:52;
 const score=[0,0],kills=[0,0],pts=[0,0];let orbs=[],snakes=[],pops=[];
 const keys=[{l:false,r:false,u:false},{l:false,r:false,u:false}];
 const fingers=halfPointers(s,{chooseOwner:on?()=>me:undefined});
 keyboard(s,(i,name,down)=>{if(on)i=me;if(name in keys[i])keys[i][name]=down;if(name==='act')keys[i].u=down;});
 s.hint(on?'Hold and drag anywhere like a joystick: your snake turns toward the drag direction. Drag far to boost (it burns length). Eat orbs to grow and score; run your rival into your body for +50. Walls are deadly. Keys: A/D or ←/→ turn, W/↑ boost.':'P1 left half, P2 right half. Hold and drag like a joystick: your snake turns toward the drag direction. Drag far to boost (it burns length). Eat orbs to grow and score; run your rival into your body for +50. Walls are deadly. Keys: A/D or ←/→ turn, W/↑ boost.');
 const unit=()=>Math.min(W,H)/420;
 function spawnOrb(big=false,px,py,col){orbs.push({x:px??(20+rand()*(W-40)),y:py??(60+rand()*(H-80)),r:big?7:3.2+rand()*2,v:big?5:1,c:col||ORB[Math.floor(rand()*ORB.length)],ph:rand()*6});}
 function makeSnake(i){const px=i?W*.75:W*.25,py=H*(i?.35:.65),a=i?Math.PI:0;const body=[];for(let k=0;k<30;k++)body.push({x:px-Math.cos(a)*k*4,y:py-Math.sin(a)*k*4});return {i,a,body,len:60,alive:true,respawn:0,boost:false,inv:1.5,life:0};}
 // drop: online, the orbs this phone made for its own snake's body (sent with the death)
 function kill(sn,by,drop){if(!sn.alive)return;sn.alive=false;sn.respawn=2.2;if(drop)orbs.push(...drop);else for(let k=0;k<sn.body.length;k+=3)spawnOrb(true,sn.body[k].x+(rand()-.5)*8,sn.body[k].y+(rand()-.5)*8,SKIN[sn.i][k%6<3?0:1]);
  const h=sn.body[0]||{x:W/2,y:H/2};bits.burst(h.x,h.y,{n:40,speed:200,color:SKIN[sn.i][0],life:1,size:4});noise(.6,.12,{f0:1800,f1:80});shake.kick(10);vibrate(50);s.react?.(sn.i,'sad',1.5);
  if(by!==undefined&&by>=0){kills[by]++;if(!on)score[by]+=50;pops.push({x:h.x,y:h.y,text:'+50 KILL',t:1.2,c:SKIN[by][0]});s.react?.(by,'win',1.4);voice(660,.12,.05,'triangle');voice(880,.18,.05,'triangle',{delay:.1});}}
 function respawn(sn){const i=sn.i,rr=on?Math.random:rand;let best=null,bd=-1;for(let k=0;k<8;k++){const px=60+rr()*(W-120),py=T+28+rr()*(H-T-88),o=snakes[1-i],d=o.alive&&o.body.length?Math.min(...o.body.filter((_,q)=>q%4===0).map(b=>Math.hypot(b.x-px,b.y-py))):999;if(d>bd){bd=d;best={px,py};}}
  const a=Math.atan2(H/2-best.py,W/2-best.px);sn.body=[];for(let k=0;k<30;k++)sn.body.push({x:best.px-Math.cos(a)*k*4,y:best.py-Math.sin(a)*k*4});Object.assign(sn,{a,len:60,alive:true,inv:1.6,life:sn.life+1});}
 // keep the body length (sum of distances) at sn.len*u*1.8
 function trim(sn){let acc=0;const target=sn.len*unit()*1.8;for(let q=1;q<sn.body.length;q++){acc+=Math.hypot(sn.body[q].x-sn.body[q-1].x,sn.body[q].y-sn.body[q-1].y);if(acc>target){sn.body.length=q+1;break;}}}
 // vs CPU: snake 2 chases orbs, looks ahead for walls and bodies, and swerves to the first safe heading
 const cpu=isCpu(s);let netBot=false;
 function cpuWant(i){const sn=snakes[i],u=unit(),sk=cpuSkill(s),h=sn.body[0],look=(5+sk*6)*12*u,rr=on?Math.random:s.random;
  const blocked=a=>{for(let k=1;k<=4;k++){const px=h.x+Math.cos(a)*look*k/4,py=h.y+Math.sin(a)*look*k/4;if(px<14||py<T+8||px>W-14||py>H-14)return true;for(const o of snakes){if(!o.alive)continue;for(let q=o===sn?12:0;q<o.body.length;q+=2){const b=o.body[q];if(Math.hypot(b.x-px,b.y-py)<10*u)return true;}}}return false;};
  let best=null,bs=-1;for(const o of orbs){const d=Math.hypot(o.x-h.x,o.y-h.y),v=o.v/(d+30);if(v>bs){bs=v;best=o;}}
  let want=best?Math.atan2(best.y-h.y,best.x-h.x):Math.atan2(H/2-h.y,W/2-h.x);
  if(blocked(want)||blocked(sn.a)){for(const d of [.5,-.5,1,-1,1.6,-1.6,2.3,-2.3,Math.PI]){if(!blocked(sn.a+d)){want=sn.a+d;break;}}}
  return {want,boost:sk>.5&&best&&sn.len>70&&Math.hypot(best.x-h.x,best.y-h.y)<160*u&&rr()<.3};}
 function cpuThink(){const sn=snakes[1],f=fingers.cpu;if(!sn||!sn.alive||state!=='play'){f.up();return;}
  const u=unit(),{want,boost}=cpuWant(1),cx=W*.75,cy=H*.5,r=boost?120*u:40;
  if(!f.active)f.down(cx,cy);f.move(cx+Math.cos(want)*r,cy+Math.sin(want)*r);}
 // ---- online: the arena turned to this screen (VM like tronCycles: sx=a·wx+b·wy, sy=c·wx+d·wy), orbs, the other snake
 let VM=[1,0,0,1],VK=1,VO=[0,0],R=null,extraN=0;const slotGen=new Int32Array(POOL),outQ=[];let outT=0;
 function view(){const SW=s.W,SH=s.H,top=72,side=SW>SH-top;VM=side?(me?[0,1,-1,0]:[0,-1,1,0]):(me?[-1,0,0,-1]:[1,0,0,1]);
  const vw=side?H:W,vh=side?W:H;VK=Math.min(SW/vw,(SH-top)/vh);VO=[SW/2,top+(SH-top)/2];}
 const toScreen=(wx,wy)=>{if(!on)return [wx,wy];const gx=wx-W/2,gy=wy-H/2;return [VO[0]+VK*(VM[0]*gx+VM[1]*gy),VO[1]+VK*(VM[2]*gx+VM[3]*gy)];};
 const worldXform=()=>{if(on)x.setTransform(VK*VM[0],VK*VM[2],VK*VM[1],VK*VM[3],VO[0]-VK*(VM[0]*W/2+VM[1]*H/2),VO[1]-VK*(VM[2]*W/2+VM[3]*H/2));else x.setTransform(1,0,0,1,0,0);};
 function poolOrb(k,g){const r=seededRandom(`${s.seed}:orb:${k}:${g}`);return {id:`p${k}.${g}`,k,x:20+r()*(W-40),y:T+8+r()*(H-T-28),r:3.2+r()*2,v:1,c:ORB[Math.floor(r()*ORB.length)],ph:r()*6};}
 function myOrb(px,py,big,col){return {id:`${me}x${extraN++}`,x:px,y:py,r:big?7:3.2+Math.random()*2,v:big?5:1,c:col,ph:Math.random()*6};}
 // a pool orb was eaten (by either phone): its slot moves on to the next generation, once
 function poolEaten(k,g){if(!(k>=0&&k<POOL)||slotGen[k]>g)return;slotGen[k]=g+1;orbs=orbs.filter(o=>o.k!==k);orbs.push(poolOrb(k,g+1));}
 function eatId(id){if(typeof id!=='string')return;const m=/^p(\d+)\.(\d+)$/.exec(id);if(m){poolEaten(+m[1],+m[2]);return;}orbs=orbs.filter(o=>o.id!==id);}
 function flushQ(){if(outQ.length){nf.event({q:outQ.splice(0)});}outT=performance.now();}
 const nf=netField(s,{hz:20,
  pack:()=>{const sn=snakes[me];if(!sn)return 0;const h=sn.body[0]||{x:0,y:0};return {h:[+h.x.toFixed(1),+h.y.toFixed(1),+sn.a.toFixed(3)],l:+sn.len.toFixed(1),b:sn.boost?1:0,v:sn.alive?1:0,n:sn.life,i:sn.inv>0?1:0,p:pts[me]};},
  unpack:(i,d)=>{const sn=snakes[them];if(!sn||!d||!Array.isArray(d.h))return;const [hx,hy,ha]=d.h.map(Number);if(![hx,hy,ha].every(Number.isFinite))return;
   if(Number.isFinite(d.p))pts[them]=d.p;sn.boost=!!d.b;sn.inv=d.i?1:0;if(Number.isFinite(d.l))sn.len=clamp(d.l,10,2000);sn.a=ha;
   // a new life starts a fresh body behind the new head, like respawn()
   if(d.n!==sn.life){sn.life=d.n;sn.body=[];for(let k=0;k<30;k++)sn.body.push({x:hx-Math.cos(ha)*k*4,y:hy-Math.sin(ha)*k*4});}
   if(!d.v){sn.alive=false;return;}sn.alive=true;
   const prev=sn.body[0];if(prev){const dist=Math.hypot(hx-prev.x,hy-prev.y),n=Math.min(60,Math.ceil(dist/2.5));const add=[];for(let k=n;k>=1;k--)add.push({x:prev.x+(hx-prev.x)*k/n,y:prev.y+(hy-prev.y)*k/n});sn.body.unshift(...add);}else sn.body=[{x:hx,y:hy}];
   trim(sn);sn.seen=performance.now();},
  onEvent:e=>{if(!snakes.length)return;
   if(Array.isArray(e.q))for(const it of e.q){if(!Array.isArray(it))continue;if(it[0]==='e')eatId(it[1]);else if(it[0]==='a'&&typeof it[1]==='string'&&!orbs.some(o=>o.id===it[1])){const [,id,px,py,r,v,col]=it;if([px,py,r,v].every(Number.isFinite))orbs.push({id,x:px,y:py,r,v,c:String(col),ph:Math.random()*6});}}
   if(Array.isArray(e.die)){const sn=snakes[them],by=e.die[0]===me?me:-1,drop=(Array.isArray(e.o)?e.o:[]).filter(o=>Array.isArray(o)&&typeof o[0]==='string'&&Number.isFinite(o[1])&&Number.isFinite(o[2])).map(([id,px,py,col])=>({id,x:px,y:py,r:7,v:5,c:String(col),ph:Math.random()*6}));
    sn.alive=true;kill(sn,by,drop);}}});
 function step(dt){
  const u=unit();if(cpu)cpuThink();
  for(const sn of snakes){
   if(on&&sn.i!==me){sn.inv=Math.max(0,sn.inv-dt);continue;}
   if(!sn.alive){sn.respawn-=dt;if(sn.respawn<=0&&state==='play'){respawn(sn);nf?.push();}continue;}
   sn.inv=Math.max(0,sn.inv-dt);
   const f=[...fingers.values()].find(q=>q.i===sn.i),k=keys[sn.i];let want=null,boost=k.u;
   if(f){let dx=f.x-f.sx,dy=f.y-f.sy;const d=Math.hypot(dx,dy);if(on)[dx,dy]=[VM[0]*dx+VM[2]*dy,VM[1]*dx+VM[3]*dy];if(d>12)want=Math.atan2(dy,dx);if(d>90*Math.min(s.W,s.H)/420)boost=true;}
   if(on&&netBot){const w=cpuWant(me);want=w.want;boost=w.boost;}
   if(want!==null){let d=want-sn.a;d=Math.atan2(Math.sin(d),Math.cos(d));sn.a+=clamp(d,-4.2*dt,4.2*dt);}
   sn.a+=((k.r?1:0)-(k.l?1:0))*3.6*dt;
   sn.boost=boost&&sn.len>40;const sp=(sn.boost?230:130)*u;
   if(sn.boost){sn.len-=dt*14;if(Math.random()<dt*8){const tail=sn.body.at(-1);if(on){const o=myOrb(tail.x,tail.y,false,SKIN[sn.i][0]);orbs.push(o);outQ.push(['a',o.id,+o.x.toFixed(1),+o.y.toFixed(1),+o.r.toFixed(2),o.v,o.c]);}else spawnOrb(false,tail.x,tail.y,SKIN[sn.i][0]);}}
   const h=sn.body[0],nx=h.x+Math.cos(sn.a)*sp*dt,ny=h.y+Math.sin(sn.a)*sp*dt;sn.body.unshift({x:nx,y:ny});
   trim(sn);
   if(nx<6||ny<T||nx>W-6||ny>H-6){if(on)killMine(-1);else kill(sn);continue;}
   const hr=(6+Math.min(10,sn.len/40))*u*1.6,ate=[];
   for(const o of orbs)if(!o.dead&&Math.hypot(o.x-nx,o.y-ny)<hr+o.r*u*1.4){o.dead=true;sn.len+=o.v*2.2;if(on){pts[me]+=o.v;ate.push(o);}else score[sn.i]+=o.v;if(Math.random()<.5)voice(900+o.v*80+Math.random()*200,.04,.02,'sine');}
   for(const o of ate){outQ.push(['e',o.id]);if(o.k!==undefined){const g=+o.id.split('.')[1];if(slotGen[o.k]<=g){slotGen[o.k]=g+1;orbs.push(poolOrb(o.k,g+1));}}}
  }
  // head vs other body (online: only this phone's own head)
  for(const sn of snakes){if(!sn.alive||sn.inv>0||on&&sn.i!==me)continue;const o=snakes[1-sn.i];if(!o.alive)continue;const h=sn.body[0],hr=(6+Math.min(10,sn.len/40))*unit()*1.4;
   for(let q=3;q<o.body.length;q+=2){const b=o.body[q],br=(6+Math.min(10,o.len/40))*unit()*1.5;if(Math.hypot(b.x-h.x,b.y-h.y)<hr*.7+br*.8){if(on)killMine(o.i);else kill(sn,o.i);break;}}}
  orbs=orbs.filter(o=>!o.dead);if(!on)while(orbs.length<70)spawnOrb();
  if(on&&outQ.length&&performance.now()-outT>80)flushQ();
 }
 // online: this phone's snake died; its orbs and the killer go to the other phone
 function killMine(by){const sn=snakes[me];if(!sn.alive)return;flushQ();const drop=[];for(let k=0;k<sn.body.length;k+=3)drop.push(myOrb(sn.body[k].x+(Math.random()-.5)*8,sn.body[k].y+(Math.random()-.5)*8,true,SKIN[me][k%6<3?0:1]));
  nf.event({die:[by,sn.life],o:drop.map(o=>[o.id,Math.round(o.x),Math.round(o.y),o.c])});kill(sn,by,drop);nf.push();}
 const ballCache=new Map();
 function ball(col,r){r=Math.max(2,Math.round(r));const key=col+r;let cv=ballCache.get(key);if(!cv){cv=document.createElement('canvas');cv.width=cv.height=r*2+2;const g=cv.getContext('2d'),gr=g.createRadialGradient(r*.7,r*.7,r*.1,r+1,r+1,r);gr.addColorStop(0,'#ffffff');gr.addColorStop(.25,col);gr.addColorStop(1,'#000000aa');g.fillStyle=gr;g.beginPath();g.arc(r+1,r+1,r,0,Math.PI*2);g.fill();ballCache.set(key,cv);if(ballCache.size>80)ballCache.delete(ballCache.keys().next().value);}return cv;}
 // online, the other snake's head runs on from its last report for a moment
 function shownBody(sn){if(!on||sn.i===me||!sn.alive||!sn.body.length||!sn.seen)return sn.body;const h=sn.body[0],k=Math.min(.12,(performance.now()-sn.seen)/1000)*(sn.boost?230:130)*unit();return [{x:h.x+Math.cos(sn.a)*k,y:h.y+Math.sin(sn.a)*k},...sn.body];}
 function drawSnake(sn){if(!sn.alive)return;const u=unit(),r=(6+Math.min(10,sn.len/40))*u*1.6,[c1,c2]=SKIN[sn.i],body=shownBody(sn);if(!body.length)return;
  x.save();if(sn.inv>0&&Math.sin(t*30)<0)x.globalAlpha=.45;if(sn.boost){x.shadowColor=c1;x.shadowBlur=18;}
  const b1=ball(c1,r),b2=ball(c2,r);for(let q=body.length-1;q>=0;q-=2){const b=body[q];x.drawImage(Math.floor(q/6)%2?b1:b2,b.x-r-1,b.y-r-1);}
  x.restore();}
 function drawHead(sn){if(!sn.alive)return;const body=shownBody(sn);if(!body.length)return;const u=unit(),r=(6+Math.min(10,sn.len/40))*u*1.6,[X,Y]=toScreen(body[0].x,body[0].y);s.sprite(x,sn.i,X,Y,r*3.1*(on?VK:1),{exact:true});}
 let endWait=false;
 async function netEnd(){if(endWait)return;endWait=true;flushQ();nf.finish({p:pts[me]});const fin=await nf.remoteDone();if(!s.alive)return;if(fin&&Number.isFinite(fin.p))pts[them]=fin.p;
  for(let i=0;i<2;i++)score[i]=pts[i]+50*kills[i];s.setScores(score);setTimeout(()=>s.finish([score[0],score[1]],`Snake vs. Snake · ${score[0]}–${score[1]} · kills ${kills[0]}–${kills[1]}`),900);}
 s.frame(dt=>{
  if(on)view();else{W=s.W;H=s.H;}t+=dt;shake.step(dt);bits.step(dt);for(const p of pops)p.t-=dt;pops=pops.filter(p=>p.t>0);
  if(on&&state==='play'&&R)t=(performance.now()-R.t0)/1000;
  if(state==='play'){step(dt);nf?.tick(dt);if(t>=SECONDS){state='over';if(on)void netEnd();else{const fin=[score[0],score[1]];setTimeout(()=>s.finish(fin,`Snake vs. Snake · ${fin[0]}–${fin[1]} · kills ${kills[0]}–${kills[1]}`),1400);}}}
  if(on&&!endWait)for(let i=0;i<2;i++)score[i]=pts[i]+50*kills[i];
  const SW=s.W,SH=s.H;x.setTransform(1,0,0,1,0,0);x.fillStyle='#0a0c14';x.fillRect(0,0,SW,SH);worldXform();if(shake.mag>.3)x.translate((Math.random()-.5)*shake.mag,(Math.random()-.5)*shake.mag);
  // hex floor
  const R6=26*unit()+8;x.strokeStyle='#1b2236';x.lineWidth=1;x.beginPath();for(let row=0;row*R6*1.5<H+R6;row++)for(let col=0;col*R6*1.732<W+R6;col++){const cx=col*R6*1.732+(row%2)*R6*.866,cy=row*R6*1.5;for(let k=0;k<6;k++){const a=Math.PI/6+k*Math.PI/3,X=cx+Math.cos(a)*R6*.95,Y=cy+Math.sin(a)*R6*.95;k?x.lineTo(X,Y):x.moveTo(X,Y);}x.closePath();}x.stroke();
  x.strokeStyle='#ff3b5c';x.shadowColor='#ff3b5c';x.shadowBlur=14;x.lineWidth=3;x.strokeRect(5,T-1,W-10,H-T-4);x.shadowBlur=0;
  for(const o of orbs){const rr=o.r*unit()*1.4*(1+.15*Math.sin(t*4+o.ph));x.fillStyle=o.c;x.shadowColor=o.c;x.shadowBlur=10;x.beginPath();x.arc(o.x,o.y,rr,0,Math.PI*2);x.fill();}x.shadowBlur=0;
  for(const sn of snakes)drawSnake(sn);bits.draw(x);
  x.setTransform(1,0,0,1,0,0);for(const sn of snakes)drawHead(sn);
  for(const p of pops){const [X,Y]=toScreen(p.x,p.y);label(x,p.text,X,Y-(1.2-p.t)*40,20,{fill:p.c,alpha:clamp(p.t*2,0,1)});}
  // HUD
  for(let i=0;i<2;i++)label(x,`${s.players[i].name} ${score[i]}`,i?SW-(on?12:130):12,on?58:24,18,{fill:SKIN[i][0],align:i?'right':'left',font:`900 18px ${SANS}`});
  const left=Math.max(0,Math.ceil(SECONDS-t));label(x,state==='over'?'TIME!':state==='sync'?'…':String(left),SW/2,on?58:SW<560?72:24,20,{fill:left<=10?'#ff5a5a':'#ffffffcc'});
  for(const f of fingers.values()){x.strokeStyle=SKIN[f.i][0]+'55';x.lineWidth=2;x.beginPath();x.arc(f.sx,f.sy,36,0,Math.PI*2);x.stroke();}
  vignette(x,SW,SH,.4);s.setScores(score);
  s.debug={engine:'snakeduel',snakes,orbs:orbs.length,score,kills,state,pts,bot:on?()=>{netBot=true;return '';}:null};
 });
 const intro=on?`Snake vs. Snake, slither style. You steer the ${me?'orange':'blue'} snake; ${s.players[them].name} plays on the other phone. Hold and drag anywhere like a joystick, drag far to boost. Eat orbs, and make your rival crash into your body. ${SECONDS} seconds.`:`Snake vs. Snake, slither style. ${s.players[0].name} steers on the LEFT half, ${s.players[1].name} on the RIGHT: hold and drag like a joystick, drag far to boost. Eat orbs, and make your rival crash into your body. ${SECONDS} seconds.`;
 if(!await s.pass(0,intro,'Both ready — slither!',{countdown:3}))return;
 if(on){W=NET_W;H=NET_H;snakes=[makeSnake(0),makeSnake(1)];for(let k=0;k<POOL;k++)orbs.push(poolOrb(k,0));state='sync';await nf.start('go');if(!s.alive)return;R={t0:performance.now()};t=0;state='play';}
 else{W=s.W;H=s.H;snakes=[makeSnake(0),makeSnake(1)];for(let k=0;k<70;k++)spawnOrb();state='play';t=0;}
}
Object.assign(exports,{snakeduel});
