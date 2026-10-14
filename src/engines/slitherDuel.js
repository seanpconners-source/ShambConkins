// Snake vs. Snake, rebuilt as a slither.io-style neon duel: two glowing snakes glide freely around a hex-tile arena,
// eat orbs to grow, and die if their head touches the other snake's body (it bursts into big orbs for the taker).
// Both at once: drag on your own half like a joystick to steer; drag far to boost (it burns length).
// 75 seconds; orbs are points, a kill is +50.
const {clamp,seededRandom}=require("src/utils.js");
const {voice,noise,makeShake,halfPointers,keyboard,label,SANS}=require("src/engines/tarantinoKit.js");
const {makeBits,vignette}=require("src/engines/retroKit.js");
const {vibrate}=require("src/audio.js");

const SKIN=[['#29d8ff','#0b6cff'],['#ff9a2e','#ff3f8e']],ORB=['#ff5ad9','#4fe6ff','#8dff6a','#ffd23f','#ff7a3a','#b78bff'];
const SECONDS=75;

async function snakeduel(s){
 const [c,x]=s.canvas(680,420,{fill:true});s.body.classList.add('drag-arena-body');s.controls([]);s.shared=true;s.updateScores();s.ownHud(true,true);
 const shake=makeShake(),bits=makeBits(),rand=seededRandom(s.seed+':slither');let t=0,state='wait',W=s.W,H=s.H,K=1;
 const score=[0,0],kills=[0,0];let orbs=[],snakes=[],pops=[];
 const keys=[{l:false,r:false,u:false},{l:false,r:false,u:false}];
 const fingers=halfPointers(s,{});
 keyboard(s,(i,name,down)=>{if(name in keys[i])keys[i][name]=down;if(name==='act')keys[i].u=down;});
 s.hint('P1 left half, P2 right half. Hold and drag like a joystick: your snake turns toward the drag direction. Drag far to boost (it burns length). Eat orbs to grow and score; run your rival into your body for +50. Walls are deadly. Keys: A/D or ←/→ turn, W/↑ boost.');
 const unit=()=>Math.min(W,H)/420;
 function spawnOrb(big=false,px,py,col){orbs.push({x:px??(20+rand()*(W-40)),y:py??(60+rand()*(H-80)),r:big?7:3.2+rand()*2,v:big?5:1,c:col||ORB[Math.floor(rand()*ORB.length)],ph:rand()*6});}
 function makeSnake(i){const px=i?W*.75:W*.25,py=H*(i?.35:.65),a=i?Math.PI:0;const body=[];for(let k=0;k<30;k++)body.push({x:px-Math.cos(a)*k*4,y:py-Math.sin(a)*k*4});return {i,a,body,len:60,alive:true,respawn:0,boost:false,inv:1.5};}
 function kill(sn,by){if(!sn.alive)return;sn.alive=false;sn.respawn=2.2;for(let k=0;k<sn.body.length;k+=3)spawnOrb(true,sn.body[k].x+(rand()-.5)*8,sn.body[k].y+(rand()-.5)*8,SKIN[sn.i][k%6<3?0:1]);
  const h=sn.body[0];bits.burst(h.x,h.y,{n:40,speed:200,color:SKIN[sn.i][0],life:1,size:4});noise(.6,.12,{f0:1800,f1:80});shake.kick(10);vibrate(50);s.react?.(sn.i,'sad',1.5);
  if(by!==undefined){kills[by]++;score[by]+=50;pops.push({x:h.x,y:h.y,text:'+50 KILL',t:1.2,c:SKIN[by][0]});s.react?.(by,'win',1.4);voice(660,.12,.05,'triangle');voice(880,.18,.05,'triangle',{delay:.1});}}
 function respawn(sn){const i=sn.i;let best=null,bd=-1;for(let k=0;k<8;k++){const px=60+rand()*(W-120),py=80+rand()*(H-140),o=snakes[1-i],d=o.alive?Math.min(...o.body.filter((_,q)=>q%4===0).map(b=>Math.hypot(b.x-px,b.y-py))):999;if(d>bd){bd=d;best={px,py};}}
  const a=Math.atan2(H/2-best.py,W/2-best.px);sn.body=[];for(let k=0;k<30;k++)sn.body.push({x:best.px-Math.cos(a)*k*4,y:best.py-Math.sin(a)*k*4});Object.assign(sn,{a,len:60,alive:true,inv:1.6});}
 function step(dt){
  const u=unit();
  for(const sn of snakes){
   if(!sn.alive){sn.respawn-=dt;if(sn.respawn<=0&&state==='play')respawn(sn);continue;}
   sn.inv=Math.max(0,sn.inv-dt);
   const f=[...fingers.values()].find(q=>q.i===sn.i),k=keys[sn.i];let want=null,boost=k.u;
   if(f){const dx=f.x-f.sx,dy=f.y-f.sy,d=Math.hypot(dx,dy);if(d>12)want=Math.atan2(dy,dx);if(d>90*u)boost=true;}
   if(want!==null){let d=want-sn.a;d=Math.atan2(Math.sin(d),Math.cos(d));sn.a+=clamp(d,-4.2*dt,4.2*dt);}
   sn.a+=((k.r?1:0)-(k.l?1:0))*3.6*dt;
   sn.boost=boost&&sn.len>40;const sp=(sn.boost?230:130)*u;
   if(sn.boost){sn.len-=dt*14;if(Math.random()<dt*8){const tail=sn.body.at(-1);spawnOrb(false,tail.x,tail.y,SKIN[sn.i][0]);}}
   const h=sn.body[0],nx=h.x+Math.cos(sn.a)*sp*dt,ny=h.y+Math.sin(sn.a)*sp*dt;sn.body.unshift({x:nx,y:ny});
   // keep the body length (sum of distances) at sn.len*u*1.6
   let acc=0;const target=sn.len*u*1.8;for(let q=1;q<sn.body.length;q++){acc+=Math.hypot(sn.body[q].x-sn.body[q-1].x,sn.body[q].y-sn.body[q-1].y);if(acc>target){sn.body.length=q+1;break;}}
   if(nx<6||ny<52||nx>W-6||ny>H-6){kill(sn);continue;}
   const hr=(6+Math.min(10,sn.len/40))*u*1.6;
   for(const o of orbs)if(!o.dead&&Math.hypot(o.x-nx,o.y-ny)<hr+o.r*u*1.4){o.dead=true;sn.len+=o.v*2.2;score[sn.i]+=o.v;if(Math.random()<.5)voice(900+o.v*80+Math.random()*200,.04,.02,'sine');}
  }
  // head vs other body
  for(const sn of snakes){if(!sn.alive||sn.inv>0)continue;const o=snakes[1-sn.i];if(!o.alive)continue;const h=sn.body[0],hr=(6+Math.min(10,sn.len/40))*unit()*1.4;
   for(let q=3;q<o.body.length;q+=2){const b=o.body[q],br=(6+Math.min(10,o.len/40))*unit()*1.5;if(Math.hypot(b.x-h.x,b.y-h.y)<hr*.7+br*.8){kill(sn,o.i);break;}}}
  orbs=orbs.filter(o=>!o.dead);while(orbs.length<70)spawnOrb();
 }
 const ballCache=new Map();
 function ball(col,r){r=Math.max(2,Math.round(r));const key=col+r;let cv=ballCache.get(key);if(!cv){cv=document.createElement('canvas');cv.width=cv.height=r*2+2;const g=cv.getContext('2d'),gr=g.createRadialGradient(r*.7,r*.7,r*.1,r+1,r+1,r);gr.addColorStop(0,'#ffffff');gr.addColorStop(.25,col);gr.addColorStop(1,'#000000aa');g.fillStyle=gr;g.beginPath();g.arc(r+1,r+1,r,0,Math.PI*2);g.fill();ballCache.set(key,cv);if(ballCache.size>80)ballCache.delete(ballCache.keys().next().value);}return cv;}
 function drawSnake(sn){if(!sn.alive)return;const u=unit(),r=(6+Math.min(10,sn.len/40))*u*1.6,[c1,c2]=SKIN[sn.i];
  x.save();if(sn.inv>0&&Math.sin(t*30)<0)x.globalAlpha=.45;if(sn.boost){x.shadowColor=c1;x.shadowBlur=18;}
  const b1=ball(c1,r),b2=ball(c2,r);for(let q=sn.body.length-1;q>=0;q-=2){const b=sn.body[q];x.drawImage(Math.floor(q/6)%2?b1:b2,b.x-r-1,b.y-r-1);}
  x.restore();const h=sn.body[0];s.sprite(x,sn.i,h.x,h.y,r*3.1,{exact:true});}
 s.frame(dt=>{
  W=s.W;H=s.H;t+=dt;shake.step(dt);bits.step(dt);for(const p of pops)p.t-=dt;pops=pops.filter(p=>p.t>0);
  if(state==='play'){step(dt);if(t>=SECONDS){state='over';const fin=[score[0],score[1]];setTimeout(()=>s.finish(fin,`Snake vs. Snake · ${fin[0]}–${fin[1]} · kills ${kills[0]}–${kills[1]}`),1400);}}
  x.setTransform(1,0,0,1,0,0);x.fillStyle='#0a0c14';x.fillRect(0,0,W,H);if(shake.mag>.3)x.translate((Math.random()-.5)*shake.mag,(Math.random()-.5)*shake.mag);
  // hex floor
  const R=26*unit()+8;x.strokeStyle='#1b2236';x.lineWidth=1;x.beginPath();for(let row=0;row*R*1.5<H+R;row++)for(let col=0;col*R*1.732<W+R;col++){const cx=col*R*1.732+(row%2)*R*.866,cy=row*R*1.5;for(let k=0;k<6;k++){const a=Math.PI/6+k*Math.PI/3,X=cx+Math.cos(a)*R*.95,Y=cy+Math.sin(a)*R*.95;k?x.lineTo(X,Y):x.moveTo(X,Y);}x.closePath();}x.stroke();
  x.strokeStyle='#ff3b5c';x.shadowColor='#ff3b5c';x.shadowBlur=14;x.lineWidth=3;x.strokeRect(5,51,W-10,H-56);x.shadowBlur=0;
  for(const o of orbs){const rr=o.r*unit()*1.4*(1+.15*Math.sin(t*4+o.ph));x.fillStyle=o.c;x.shadowColor=o.c;x.shadowBlur=10;x.beginPath();x.arc(o.x,o.y,rr,0,Math.PI*2);x.fill();}x.shadowBlur=0;
  for(const sn of snakes)drawSnake(sn);bits.draw(x);
  for(const p of pops)label(x,p.text,p.x,p.y-(1.2-p.t)*40,20,{fill:p.c,alpha:clamp(p.t*2,0,1)});
  // HUD
  for(let i=0;i<2;i++)label(x,`${s.players[i].name} ${score[i]}`,i?W-130:12,24,18,{fill:SKIN[i][0],align:i?'right':'left',font:`900 18px ${SANS}`});
  const left=Math.max(0,Math.ceil(SECONDS-t));label(x,state==='over'?'TIME!':String(left),W/2,W<560?72:24,20,{fill:left<=10?'#ff5a5a':'#ffffffcc'});
  for(const f of fingers.values()){x.strokeStyle=SKIN[f.i][0]+'55';x.lineWidth=2;x.beginPath();x.arc(f.sx,f.sy,36,0,Math.PI*2);x.stroke();}
  vignette(x,W,H,.4);s.setScores(score);
  s.debug={engine:'snakeduel',snakes,orbs:orbs.length,score,kills,state};
 });
 if(!await s.pass(0,`Snake vs. Snake, slither style. ${s.players[0].name} steers on the LEFT half, ${s.players[1].name} on the RIGHT: hold and drag like a joystick, drag far to boost. Eat orbs, and make your rival crash into your body. ${SECONDS} seconds.`,'Both ready — slither!',{countdown:3}))return;
 W=s.W;H=s.H;snakes=[makeSnake(0),makeSnake(1)];for(let k=0;k<70;k++)spawnOrb();state='play';t=0;
}
Object.assign(exports,{snakeduel});
