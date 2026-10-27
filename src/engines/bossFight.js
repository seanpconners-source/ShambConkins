// BOSS FIGHT engine: Cuphead-style co-op shoot-'em-up. Both humans fly planes (their heads in the cockpit) against one
// huge multi-phase boss. Data: src/data/bosses.js. Attacks: bossAttacks.js. Bodies: bossBodies.js. Scenes: bossScenes.js.
// Controls: drag your half to fly (relative), auto-fire; TAP (or a second finger tap) = parry a pink bullet, revive a
// partner bubble, else SUPER when the meter is full; flick up = SUPER. Keys: P1 WASD+Space, P2 arrows+Enter.
// Online (s.online) it is co-op on two phones: each phone flies its own plane and runs its own copy of the boss's attacks
// (same seed), and judges only what hits its own plane; the partner's plane is shown from snapshots (its shots are for
// show). Player 1's phone owns the boss's hit points: the other phone sends its damage {d}, player 1's phone streams the
// HP, phase and KO / defeat, and both follow. Reviving the partner's bubble sends {rv}. Both swap finals for the scores.
const {clamp}=require("src/utils.js");
const {netField}=require("src/engines/netField.js");
const {store}=require("src/state.js");
const {soloProgress}=require("src/solo.js");
const {sound,tone,vibrate}=require("src/audio.js");
const {ownedPointers}=require("src/engines/duelControls.js");
const {portraitURL}=require("src/assets.js");
const {CHARACTERS}=require("src/characters.js");
const {entityArtSpec,queueEntityArt}=require("src/entityMedia.js");
const {headDisplayURL}=require("src/headCutouts.js");
const {BOSSES,bossById}=require("src/data/bosses.js");
const {PATTERNS,SIGNATURES,K,STEPS}=require("src/engines/bossAttacks.js");
const STEP_NAME=new Map(Object.entries(STEPS).map(([n,f])=>[f,n]));
const {BODIES,drawMinion}=require("src/engines/bossBodies.js");
const {makeScene}=require("src/engines/bossScenes.js");
const TAU=Math.PI*2,H=640,PR=5.5,PARRY_R=34,HUD_Y=596,PCOL=['#ffd36e','#ff8ec8'],PDARK=['#b8791a','#b0316d'];
// 1P arcade: one plane alone, so the boss has less HP and fires a little less; the player gets a 4th heart (no partner revives)
const SOLO_K={hp:.5,dens:.7},SOLO_HP=5;
const ease={inout:u=>u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2,in:u=>u*u*u,out:u=>1-Math.pow(1-u,3)};
const KIND_COL={orb:null,qmark:'#b07cff',needle:'#e8f1ff',ice:'#8fe3ff',big:null,bolt:'#ffe08a',pill:'#7fd0ff',plate:'#fff',coin:'#ffd23c',fire:'#ff8a1f',hammer:'#9aa6b6',candy:'#ff4d8d',bill:'#7fe08a',weapon:'#c9ced6',balloon:'#ff4a5a',bomb:'#3a3a48'};
const ORIENTED=new Set(['needle','bolt','ice','fire','weapon','hammer']);
const heartPath=(g,x,y,s)=>{g.beginPath();g.moveTo(x,y+s*.35);g.bezierCurveTo(x-s*.6,y-s*.1,x-s*.35,y-s*.65,x,y-s*.28);g.bezierCurveTo(x+s*.35,y-s*.65,x+s*.6,y-s*.1,x,y+s*.35);g.closePath();};
const hashStr=str=>{let h=2166136261;for(const c of str)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
function seeded(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}

async function bossfight(s){
 const boss=bossById(s.game.bossId)||BOSSES[0];
 const tier=clamp(Math.round(Number(s.game.tier)||boss.tier||2),1,4);
 const alone=!!s.solo,maxHp=alone?SOLO_HP:3;
 const net=s.online||null,me=net?net.me:0,them=1-me,host=!net||me===0;let nf=null,netReady=!net;
 // gw: online, this phone mirrors player 1's attack world (no director of its own). netW: online both phones share one field
 // width (the narrower of the two screens' fields), so every bullet flies the same way on both
 const gw=!!net&&!host;let netW=0;
 const kTab0=alone?{...K[tier],dens:K[tier].dens*SOLO_K.dens}:K[tier],hpScale=(.75+.125*tier)/(.75+.125*(boss.tier||2))*(alone?SOLO_K.hp:1);
 const [c,x]=s.canvas(420,640,{fill:true});s.body.classList.add('drag-arena-body');document.querySelector('.game-shell')?.classList.add('boss-shell');s.queueCanvasFit?.();
 s.shared=true;if(!alone){s.cooperative=true;s.cooperativeLabel='BOSS FIGHT';}s.updateScores();
 const reduce=!!store.profile?.settings.reducedMotion,sfxOn=()=>!!store.profile?.settings.sound,musicOn=()=>!!store.profile?.settings.music;
 const body=BODIES[boss.body]||BODIES.bust,look=boss.look||{},pal=boss.pal;
 let W=420,k=1,ox=0,oy=0,cw=0,ch=0,bs=1,wide=false,YMIN=260;
 // wide arena (landscape/desktop): the field stretches to the screen, the boss sits centre stage and each player starts on
 // their own side of it; guns and the MEGA BEAM aim at the boss. Portrait screens keep the original 420-560 wide field.
 // the wider field spreads attacks out and leaves more room to dodge, so wide arenas hit harder (tuned by tests/bossdiff.mjs)
 const WIDE_K={dens:1.3,spd:1.1,tele:1,restMul:.78,dmg:.96},kWide={dens:kTab0.dens*WIDE_K.dens,spd:kTab0.spd*WIDE_K.spd,rest:kTab0.rest*WIDE_K.restMul,tele:kTab0.tele*WIDE_K.tele};let kTab=kTab0;
 const WIDE_AT=720,W_MAX=1700,spawnX=i=>alone?W/2:wide?W/2+(i?1:-1)*clamp(W*.3,250,380):W*(i?.7:.3),spawnY=()=>wide?B.hy+150:500;
 const B={x:210,y:-260,hx:210,hy:150,hp:Math.round(boss.hp*hpScale),max:Math.round(boss.hp*hpScale),phase:0,flash:0,tw:null,deadR:0,hidden:0,pose:'idle',poseT:0,open:0,glow:0,lookX:0,lookY:0,drawX:210,drawY:-260,shown:0,chip:1,sq:1};
 const P=(alone?[0]:[0,1]).map(i=>({i,x:spawnX(i),y:500,tx:spawnX(i),ty:500,aim:-Math.PI/2,hp:maxHp,inv:0,ghost:0,out:false,gx:0,gy:0,meter:0,fire:0,sup:0,supT:0,dmg:0,parries:0,kills:0,key:{u:0,d:0,l:0,r:0},parryT:0,vx:0,hitFlash:0,barrage:0}));
 const bullets=[],pshots=[],minions=[],hazards=[],warns=[],fx=[],runs=[],says={text:'',t:0};
 let T=0,modeT=0,mode='intro',timeScale=1,hitstop=0,shakeMag=0,flashWhite=0,lastSay=-99,bannerQ=[],sigShown=[false,false,false],finished=false,duration=0,musicT=0,musicStep=0,sfxT={},scene=null,sceneKey='',koDone=false,koBoom=0,directorRun=null,intro={skip:false};
 const log={dmg:0,hits:[0,0],src:{}};
 // ---- boss face (portrait when the unlock character exists in the roster; emoji plate otherwise)
 const hasChar=CHARACTERS.some(ch2=>ch2.id===boss.unlockId),faceImgs={};
 if(hasChar)try{queueEntityArt(entityArtSpec('character',CHARACTERS.find(ch2=>ch2.id===boss.unlockId)));}catch{}
 function faceImage(mood){if(!hasChar)return null;const now=performance.now();let e=faceImgs[mood];
  if(!e||(!e.ok&&!e.err&&now-e.at>4000)||(e.err&&now-e.at>9000)){let src=null;try{src=portraitURL(boss.unlockId,mood);}catch{}if(!src){faceImgs[mood]={img:null,at:now,ok:false,err:false};return null;}
   if(e&&e.src===src&&!e.err){e.at=now;return e.ok?e.img:null;}
   const img=new Image();e={src,img,at:now,ok:false,err:false};faceImgs[mood]=e;img.onload=()=>{if(img.naturalWidth)e.ok=true;};img.onerror=()=>{e.err=true;};try{img.src=headDisplayURL(src);}catch{e.err=true;}}
  return e.ok?e.img:null;}
 const A={t:0,look:{x:0,y:0},open:0,glow:0,phase:0,dmg:0,pal,v:look,pose:'idle',
  face(g,cx,cy,size,o={}){const mood=mode==='ko'?'sad':B.phase>0?'angry':'normal';const img=faceImage(mood)||faceImage('normal');const r=o.clipR||size*.46;
   g.save();g.translate(cx,cy);if(o.tilt)g.rotate(o.tilt);
   if(img){g.beginPath();g.ellipse(0,0,r,r*1.06,0,0,TAU);g.clip();const sc=Math.max(r*2/img.naturalWidth,r*2.1/img.naturalHeight)*1.02;g.fillStyle=pal[3];g.fillRect(-r,-r*1.1,r*2,r*2.2);g.drawImage(img,-img.naturalWidth*sc/2,-img.naturalHeight*sc/2,img.naturalWidth*sc,img.naturalHeight*sc);g.restore();g.save();g.translate(cx,cy);if(o.tilt)g.rotate(o.tilt);g.beginPath();g.ellipse(0,0,r,r*1.06,0,0,TAU);g.lineWidth=4;g.strokeStyle='#140a0c';g.stroke();g.restore();return true;}
   if(o.emoji!==false){const gr=g.createRadialGradient(-r*.3,-r*.3,2,0,0,r);gr.addColorStop(0,'#fff');gr.addColorStop(1,pal[3]);g.beginPath();g.arc(0,0,r,0,TAU);g.fillStyle=gr;g.fill();g.lineWidth=4;g.strokeStyle='#140a0c';g.stroke();g.font=`${r*1.25}px "Segoe UI Emoji","Apple Color Emoji",Arial`;g.textAlign='center';g.textBaseline='middle';g.fillStyle='#000';g.fillText(boss.icon,0,r*.06);}
   g.restore();return false;}};
 // ---- layout (portrait field 420-560 x 640, centred and scaled to the canvas)
 function layout(){const cw2=s.W,ch2=s.H;if(cw2===cw&&ch2===ch)return;cw=cw2;ch=ch2;const nw=netW||clamp(Math.round(H*cw/ch),420,W_MAX),old=W;
  if(nw!==old&&old){const r=nw/old;for(const g of [bullets,pshots,minions,hazards,warns,fx])for(const e of g){if(e.x!==undefined)e.x*=r;if(e.tx!==undefined&&g===minions)e.tx*=r;}for(const p of P){p.x*=r;p.tx*=r;p.gx*=r;}B.x*=r;B.hx=nw/2;}
  W=nw;k=Math.min(cw/W,ch/H);ox=(cw-W*k)/2;oy=(ch-H*k)/2;const wasWide=wide;wide=W>=WIDE_AT;kTab=wide?kWide:kTab0;YMIN=wide?90:260;B.hy=wide?185:150;bs=(wide?1.25:clamp(W/420,1,1.15))*(look.size||1)*.97;B.hx=W/2;if(mode==='intro'||!B.tw)B.x=B.x||B.hx;
  if(!old||mode==='intro'||wasWide!==wide)for(const p of P)if(p.hp>0){p.x=p.tx=spawnX(p.i);p.y=p.ty=spawnY();}
  for(const p of P){p.ty=clamp(p.ty,YMIN,580);p.y=clamp(p.y,YMIN,580);}
  scene=makeScene(boss.scene,pal,cw,ch);sprites.clear();bossBuf=null;vignette=null;}
 // ---- sprites for bullets
 const sprites=new Map();let bossBuf=null,vignette=null;
 function bulletSprite(b){const col=b.pink?'#ff7ad0':(b.col||KIND_COL[b.kind]||pal[2]),r=Math.round(b.r*2)/2,key=(b.pink?'P':'')+b.kind+col+r;let sp=sprites.get(key);if(sp)return sp;
  const sc=Math.max(1,k),R=r*1.5+4,sz=Math.ceil(R*2*sc),cv=document.createElement('canvas');cv.width=cv.height=sz;const g=cv.getContext('2d');g.translate(sz/2,sz/2);g.scale(sc,sc);g.lineJoin='round';
  const ink='#140a0c',orb=(rr,fill)=>{g.beginPath();g.arc(0,0,rr,0,TAU);g.fillStyle=fill;g.fill();g.lineWidth=2.6;g.strokeStyle=ink;g.stroke();};
  const kd=b.pink?'pink':b.kind;
  if(kd==='needle'){g.beginPath();g.moveTo(r*2.2,0);g.lineTo(-r*1.2,r*.6);g.lineTo(-r*1.2,-r*.6);g.closePath();g.fillStyle=col;g.fill();g.lineWidth=2.5;g.strokeStyle=ink;g.stroke();g.fillStyle='#fff';g.fillRect(-r*.8,-1,r*2,2);}
  else if(kd==='bolt'){g.beginPath();g.moveTo(r*2.6,0);g.lineTo(0,r*.7);g.lineTo(-r*1.6,0);g.lineTo(0,-r*.7);g.closePath();g.fillStyle=col;g.fill();g.lineWidth=2.5;g.strokeStyle=ink;g.stroke();g.fillStyle='#fff';g.fillRect(-r,-1.2,r*2.2,2.4);}
  else if(kd==='ice'){g.beginPath();g.moveTo(r*2,0);g.lineTo(0,r*.9);g.lineTo(-r*1.2,0);g.lineTo(0,-r*.9);g.closePath();g.fillStyle=col;g.fill();g.lineWidth=2.5;g.strokeStyle=ink;g.stroke();g.fillStyle='rgba(255,255,255,.7)';g.fillRect(-r*.3,-r*.3,r*1.3,r*.25);}
  else if(kd==='fire'){g.beginPath();g.moveTo(r*1.6,0);g.bezierCurveTo(r*.4,r*1.2,-r*1.2,r*.9,-r*2,0);g.bezierCurveTo(-r*1.2,-r*.9,r*.4,-r*1.2,r*1.6,0);g.fillStyle=col;g.fill();g.lineWidth=2.5;g.strokeStyle=ink;g.stroke();g.beginPath();g.ellipse(-r*.1,0,r*.8,r*.4,0,0,TAU);g.fillStyle='#ffe66a';g.fill();}
  else if(kd==='weapon'){g.fillStyle=col;g.fillRect(-r*1.5,-r*.35,r*3,r*.7);g.lineWidth=2.4;g.strokeStyle=ink;g.strokeRect(-r*1.5,-r*.35,r*3,r*.7);g.fillStyle='#8a5a2a';g.fillRect(-r*1.5,-r*.35,r*.9,r*.7);}
  else if(kd==='hammer'){g.fillStyle='#8a5a2a';g.fillRect(-r*1.4,-r*.2,r*2.2,r*.4);g.fillStyle=col;g.fillRect(r*.2,-r*.8,r*1,r*1.6);g.lineWidth=2.4;g.strokeStyle=ink;g.strokeRect(r*.2,-r*.8,r,r*1.6);}
  else if(kd==='bill'){g.fillStyle=col;g.fillRect(-r*1.3,-r*.8,r*2.6,r*1.6);g.lineWidth=2.4;g.strokeStyle=ink;g.strokeRect(-r*1.3,-r*.8,r*2.6,r*1.6);g.fillStyle='#1d6a2e';g.font=`bold ${r*1.2}px Arial`;g.textAlign='center';g.textBaseline='middle';g.fillText('$',0,1);}
  else if(kd==='coin'){orb(r,col);g.fillStyle='#8a5a00';g.font=`bold ${r*1.3}px Arial`;g.textAlign='center';g.textBaseline='middle';g.fillText('$',0,1);}
  else if(kd==='qmark'){orb(r,col);g.fillStyle='#fff';g.font=`bold ${r*1.4}px Arial Black,Arial`;g.textAlign='center';g.textBaseline='middle';g.fillText('?',0,1);}
  else if(kd==='plate'){orb(r,'#fff');g.beginPath();g.arc(0,0,r*.65,0,TAU);g.strokeStyle='#f08fc4';g.lineWidth=2.5;g.stroke();g.beginPath();g.arc(0,0,r*.25,0,TAU);g.fillStyle='#f08fc4';g.fill();}
  else if(kd==='pill'){g.rotate(.6);g.beginPath();g.rect(-r*1.2,-r*.6,r*1.2,r*1.2);g.fillStyle='#fff';g.fill();g.beginPath();g.rect(0,-r*.6,r*1.2,r*1.2);g.fillStyle='#ff5a8a';g.fill();g.lineWidth=2.4;g.strokeStyle=ink;g.strokeRect(-r*1.2,-r*.6,r*2.4,r*1.2);}
  else if(kd==='candy'){orb(r,col);g.strokeStyle='#fff';g.lineWidth=2.4;g.beginPath();g.arc(0,0,r*.55,0,4.2);g.stroke();}
  else if(kd==='balloon'){orb(r,col);g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.ellipse(-r*.35,-r*.4,r*.2,r*.32,0,0,TAU);g.fill();}
  else if(kd==='bomb'){orb(r,'#2e2e3a');g.fillStyle='#ffb02e';g.fillRect(-1.5,-r-5,3,6);g.fillStyle='#fff';g.beginPath();g.arc(-r*.3,-r*.3,r*.2,0,TAU);g.fill();}
  else if(kd==='pink'){const gr=g.createRadialGradient(0,0,1,0,0,r);gr.addColorStop(0,'#fff');gr.addColorStop(.45,'#ff9ae0');gr.addColorStop(1,'#e0409e');orb(r,gr);g.fillStyle='#fff';g.beginPath();for(let i=0;i<10;i++){const a=i/10*TAU-1.57,rr=i%2?r*.28:r*.6;g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}g.closePath();g.fill();}
  else{const gr=g.createRadialGradient(-r*.25,-r*.25,1,0,0,r);gr.addColorStop(0,'#fff');gr.addColorStop(.35,col);gr.addColorStop(1,shade(col));orb(r,b.kind==='big'?gr:gr);if(b.kind==='big'){g.beginPath();g.arc(0,0,r*.55,.4,4.2);g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=2;g.stroke();}}
  sp={cv,sc,half:sz/2/sc};sprites.set(key,sp);return sp;}
 function shade(col){if(col[0]!=='#'||col.length<7)return '#601020';const n=parseInt(col.slice(1,7),16);return `rgb(${(n>>16&255)*.55|0},${(n>>8&255)*.55|0},${(n&255)*.55|0})`;}
 // ---- helpers
 const alive=()=>P.filter(p=>p.hp>0);
 const mate=p=>P[1-p.i]||p; // alone: no partner to revive
 const sum=f=>P.reduce((a,p)=>a+f(p),0);
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 function shake(m){if(!reduce)shakeMag=Math.max(shakeMag,m);}
 function sfx(n){if(!sfxOn())return;const now=performance.now();if(now-(sfxT[n]||0)<(n==='shot'?140:60))return;sfxT[n]=now;
  switch(n){case 'shot':tone(150+Math.random()*30,.05,.012,'square');break;case 'charge':tone(110,.4,.016,'sawtooth');setTimeout(()=>tone(220,.25,.012,'sawtooth'),120);break;case 'boom':tone(55,.35,.05,'sawtooth');tone(90,.2,.03,'square');break;case 'spawn':tone(520,.08,.018,'triangle');break;case 'wall':tone(95,.18,.03,'square');break;
   case 'hit':tone(180+Math.random()*60,.03,.008,'square');break;case 'hurt':tone(130,.25,.05,'sawtooth');tone(80,.3,.04,'square');break;case 'parry':sound('rare');break;case 'super':tone(330,.5,.04,'sawtooth');tone(660,.4,.03,'square');break;case 'kill':tone(700,.06,.02,'triangle');break;}}
 function burst(px,py,col,n,sp=160,life=.6,r=3){if(reduce)n=Math.ceil(n/2);for(let i=0;i<n&&fx.length<420;i++){const a=Math.random()*TAU,v=sp*(.3+Math.random()*.9);fx.push({k:'p',x:px,y:py,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:life*(.6+Math.random()*.6),max:life,col,r:r*(.6+Math.random()*.8)});}}
 const ring=(px,py,col,r1=60,life=.45)=>fx.push({k:'r',x:px,y:py,life,max:life,col,r:r1});
 const text=(px,py,str,col='#fff',size=15,life=.9)=>fx.push({k:'t',x:px,y:py,life,max:life,col,str,size});
 function banner(str,sub,life=2,col='#ffd23c'){bannerQ.push({str,sub,t:0,life,col});}
 // ---- F: API handed to attacks
 const F={get W(){return W;},get wide(){return wide;},H,get k(){return kTab;},pal,boss:B,rand:()=>s.random(),
  alive,target(){const a=alive();return a.length?a[Math.floor(F.rand()*a.length)]:{x:W/2,y:480};},
  nearest(px,py){let best=null,bd=1e9;for(const p of P){if(p.hp<=0)continue;const d=(p.x-px)**2+(p.y-py)**2;if(d<bd){bd=d;best=p;}}return best||{x:W/2,y:480};},
  aim:(a,b)=>Math.atan2(b.y-a.y,b.x-a.x),downs(m){if(!wide)return [Math.PI/2];const a=alive();return a.length?a.map(p=>F.aim(m,p)):[Math.PI/2];},targets(){if(!wide)return [F.target()];const a=alive();return a.length?a:[F.target()];},
  muzzle(name){const m=body.muz[name]||body.muz.center;return{x:B.drawX+m[0]*bs,y:B.drawY+m[1]*bs};},
  bullet(o){if(gw||bullets.length>460)return o;const b=Object.assign({x:0,y:0,vx:0,vy:0,r:7,kind:'orb',age:0},o);if(o.pink)b.r=Math.max(b.r,o.reflect?o.r||20:8);bullets.push(b);spawned('b',b);return b;},
  shot(px,py,a,sp,o){return F.bullet(Object.assign({x:px,y:py,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp},o));},
  minion(o){if(gw||minions.length>16)return null;const m=Object.assign({age:0,hp:3,r:14,kind:'drone',flash:0},o);m.max=m.hp;minions.push(m);spawned('m',m);return m;},
  minionCount:()=>minions.length,
  hazard(o){if(gw||hazards.length>48)return o;const h=Object.assign({age:0,tele:0,dur:1,x0:o.x,y0:o.y},o);h.tele=Math.max(0,h.tele);hazards.push(h);spawned('h',h);return h;},
  warn(o){const w=Object.assign({t:0,dur:1},o);if(!gw&&warns.length<60){warns.push(w);spawned('w',w);}return w;},
  pose(n,sec){B.pose=n;B.poseT=sec;},
  move(px,py,sec,e='inout'){B.tw={x0:B.x,y0:B.y,x1:px,y1:py,t:0,dur:Math.max(.01,sec),e:ease[e]||ease.inout};},
  vanish(sec){B.hidden=sec;},shake(m){shake(m);if(net&&host)netOp(['sh',m]);},sfx(n){sfx(n);if(net&&host)netOp(['sfx',n]);},
  say(str){if(T-lastSay<7||mode!=='fight')return;lastSay=T;says.text=str;says.t=2.4;if(net&&host)netOp(['say',str]);},
  clear(){bullets.length=0;hazards.length=0;warns.length=0;if(net&&host)netOp(['clr']);}};
 // ---- run scheduler
 function startRun(gen,isDirector){const r={g:gen,wait:0,dir:!!isDirector};runs.push(r);if(isDirector)directorRun=r;}
 function stepRuns(dt){for(let i=runs.length-1;i>=0;i--){const r=runs[i];r.wait-=dt;let guard=0;while(r.wait<=0&&guard++<40){let res;try{res=r.g.next();}catch(e){console.error('boss attack failed',e);res={done:true};}
   if(res.done){runs.splice(i,1);if(r.dir)directorRun=null;break;}r.wait=Math.max(.008,Number(res.value)||.008);}}}
 function* director(){yield .9;const phase=B.phase;let queue=[];
  for(;;){if(B.phase!==phase)return;if(!queue.length){queue=boss.attacks[phase].slice();for(let i=queue.length-1;i>0;i--){const j=Math.floor(F.rand()*(i+1));[queue[i],queue[j]]=[queue[j],queue[i]];}
    if(phase>0){const si=queue.findIndex(e=>(Array.isArray(e)?e[0]:e)===boss.sig);if(si>0){const [e]=queue.splice(si,1);queue.unshift(e);}}}
   const e=queue.shift(),[name,params]=Array.isArray(e)?e:[e,{}];const pat=PATTERNS[name];if(!pat){yield .5;continue;}
   if(name===boss.sig&&!sigShown[phase]){sigShown[phase]=true;banner('SIGNATURE MOVE',SIGNATURES[name]||name.toUpperCase(),1.7,'#ff7a3a');if(net)netOp(['bn','SIGNATURE MOVE',SIGNATURES[name]||name.toUpperCase(),1.7,'#ff7a3a']);}
   yield* pat(F,params||{});B.deadR=0;yield (.5+(phase===0?.3:0))*kTab.rest;}}
 // ---- phases / end states
 const thresholds=[B.max*2/3,B.max/3];
 function startPhase(n){if(net&&host)netOp(['ph',n]);mode='phase';modeT=0;B.phase=n;runs.length=0;directorRun=null;B.deadR=0;B.tw={x0:B.x,y0:B.y,x1:B.hx,y1:B.hy,t:0,dur:.8,e:ease.inout};B.hidden=0;
  for(const b of bullets)burst(b.x,b.y,'#fff',1,40,.3);bullets.length=0;hazards.length=0;warns.length=0;for(const m of minions)burst(m.x,m.y,'#ffd23c',6);minions.length=0;
  for(const p of P)p.inv=Math.max(p.inv,3);shake(16);flashWhite=.5;sound('rare');vibrate(60);
  for(const p of P)if(p.hp<=0&&p.out){p.out=false;p.hp=1;p.inv=3;p.ghost=0;p.x=p.tx=spawnX(p.i);p.y=p.ty=spawnY();text(p.x,p.y-30,'SECOND WIND!','#7dffb0',16,1.4);}
  banner(`PHASE ${n+1}!`,boss.phaseLines[n]||'',2.3,'#ff4b3a');}
 function endPhase(){mode='fight';modeT=0;if(!gw)startRun(director(),true);}
 function hitBoss(dmg,px,py,owner,super_,remote=false){if(!remote&&(mode!=='fight'||B.hidden>0||B.shown<1))return false;if(remote&&mode!=='fight')return false;if(wide&&owner>=0&&!remote)dmg*=WIDE_K.dmg;
  // online the other phone only reports its damage (player 1's phone owns the HP)
  if(net&&!host){B.flash=.07;if(owner>=0){const p=P[owner];p.dmg+=dmg;if(!super_)p.meter=Math.min(100,p.meter+.42*dmg);}netDmg+=dmg;return true;}
  B.hp-=dmg;B.flash=.07;B.chip=Math.max(B.chip,(B.hp+dmg)/B.max);
  if(owner>=0&&!remote){const p=P[owner];p.dmg+=dmg;if(!super_)p.meter=Math.min(100,p.meter+.42*dmg);}log.dmg+=dmg;
  if(s.debug.holdPhase)B.hp=Math.max(B.hp,B.phase<2?thresholds[B.phase]+1:1);if(B.hp<=0){B.hp=0;startKO();return true;}
  if(B.phase<2&&B.hp<=thresholds[B.phase]){B.hp=thresholds[B.phase];startPhase(B.phase+1);}return true;}
 function startKO(){if(net&&host)netOp(['ko']);mode='ko';modeT=0;timeScale=.35;runs.length=0;directorRun=null;B.deadR=0;bullets.length=0;hazards.length=0;warns.length=0;for(const m of minions)burst(m.x,m.y,'#ffd23c',8);minions.length=0;for(const p of P)p.inv=99;duration=Math.round(T-introEnd);shake(18);flashWhite=.6;sound('win');vibrate(120);for(const p of P)s.react(p.i,'win',3);}
 function startLose(){if(mode==='ko'||mode==='lose')return;if(net&&host)netOp(['lose']);mode='lose';modeT=0;timeScale=.5;runs.length=0;directorRun=null;duration=Math.round(T-introEnd);sound('lose');vibrate(200);for(const p of P)s.react(p.i,'sad',3);}
 const introEnd=4.4;
 async function finish(won){if(finished)return;finished=true;const t=duration||Math.round(T-introEnd),bonus=won?250+Math.max(0,Math.round((120-t)*3)):0;
  // online: each phone counts its own plane, then the two swap
  if(net){const mine={dmg:P[me].dmg,parries:P[me].parries,kills:P[me].kills};nf.finish(mine);const o=await nf.remoteDone();if(o){P[them].dmg=+o.dmg||0;P[them].parries=o.parries|0;P[them].kills=o.kills|0;}if(!s.alive)return;}
  const sc=P.map(p=>Math.round(p.dmg+p.parries*50+p.kills*10+bonus));
  if(alone){soloProgress(s,sc[0],0,'');s.solo.won=won;s.finish([sc[0],0],won?`${boss.name} is down in ${t}s! ${P[0].parries} parries, ${sc[0]} points.`:`${boss.name} wins this round. ${sc[0]} points.`);return;}
  s.cooperative=true;s.shared=true;s.teamResult={kind:'boss',won,tied:false,humanTotal:sc[0]+sc[1],cpuTotal:0,cpuScores:[0,0],duration:t,bossId:boss.id};
  s.setScores(sc);s.finish(sc,won?`${boss.name} is down in ${t}s! ${P[0].parries+P[1].parries} parries, ${sc[0]+sc[1]} team points.`:`${boss.name} wins this round. Team points: ${sc[0]+sc[1]}.`);}
 // ---- player actions
 function hurt(p,src){if(p.hp<=0||p.inv>0||p.sup>0||mode!=='fight'||net&&p.i!==me)return false;p.hp--;log.hits[p.i]++;log.src[src||'?']=(log.src[src||'?']||0)+1;if(s.debug.immortal&&p.hp<=0)p.hp=1;p.inv=1.9;shake(7);sfx('hurt');vibrate(40);burst(p.x,p.y,'#fff',12,200,.5);ring(p.x,p.y,'#ff4b3a',44);s.react(p.i,'sad');
  if(p.hp<=0){p.ghost=5;p.out=false;p.gx=p.x;p.gy=p.y;p.sup=0;text(p.x,p.y-30,'DOWN!','#ff5a5a',16,1.2);if(!alive().length&&host)startLose();nf?.push();}return true;}
 function revive(p,by){p.hp=2;p.inv=2.4;p.ghost=0;p.out=false;p.x=p.tx=clamp(p.gx,22,W-22);p.y=p.ty=clamp(p.gy,YMIN,580);burst(p.x,p.y,'#7dffb0',22,220,.7,3.5);ring(p.x,p.y,'#7dffb0',70,.6);text(p.x,p.y-34,'REVIVED!','#7dffb0',17,1.3);sound('unlock');s.react(p.i,'happy');s.react(by.i,'happy');}
 function act(i,onlySuper){const p=P[i];if(p.hp<=0||finished)return;if(mode==='intro'){if(T>1.6&&!intro.skip&&modeT<3.3){intro.skip=true;modeT=3.3;}return;}if(mode!=='fight'&&mode!=='phase')return;
  const o=mate(p);if(!onlySuper){if(o.hp<=0&&o.ghost>0&&Math.hypot(p.x-o.gx,p.y-o.gy)<62){netOp(['rv']);revive(o,p);return;}
   let best=null,bd=PARRY_R*PARRY_R;for(const b of bullets){if(!b.pink||b.friendly)continue;const d=(b.x-p.x)**2+(b.y-p.y)**2;if(d<bd+(b.r*b.r)){bd=d;best=b;}}
   if(best){parry(p,best);return;}}
  if(p.meter>=100&&p.sup<=0)superOn(p);}
 function parry(p,b){if(net&&b._id)netOp(['pa',b._id,b.reflect?1:0]);p.inv=Math.max(p.inv,.65);p.parryT=.45;p.parries++;p.meter=Math.min(100,p.meter+(b.reflect?30:20));hitstop=.07;burst(b.x,b.y,'#ff9ae0',16,220,.6,3);ring(b.x,b.y,'#ff9ae0',50,.45);text(p.x,p.y-34,b.reflect?'REFLECT!':'PARRY!','#ff9ae0',16,.9);sfx('parry');vibrate(18);s.react(p.i,'happy');
  if(b.reflect){b.friendly=true;b.pink=false;b.reflect=false;b.step=null;b.homeBoss=true;b.dmg=70;b.col='#ffe66a';b.kind='big';sprites.size>300&&sprites.clear();}else b.dead=true;}
 function superOn(p){p.meter=0;p.sup=p.i===0?1.9:1.5;p.supT=p.sup;p.barrage=0;hitstop=.16;flashWhite=.35;shake(10);sfx('super');vibrate(40);text(p.x,p.y-44,p.i===0?'MEGA BEAM!':'STAR BARRAGE!','#ffe66a',17,1.1);s.react(p.i,'win',2);
  for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];if(Math.hypot(b.x-p.x,b.y-p.y)<220){burst(b.x,b.y,'#fff',2,80,.3,2);netGone(b);bullets.splice(i,1);}}}
 // ---- input
 const touch=[null,null];const GAIN=1.45;
 ownedPointers(s,(i,p,id)=>{let t=touch[i];if(!t||t.id!==id){t=touch[i]={id,lx:p.x,ly:p.y,sx:p.x,sy:p.y,t0:performance.now(),maxd:0};}
   else{P[i].tx=clamp(P[i].tx+(p.x-t.lx)/k*GAIN,22,W-22);P[i].ty=clamp(P[i].ty+(p.y-t.ly)/k*GAIN,YMIN,580);t.lx=p.x;t.ly=p.y;t.maxd=Math.max(t.maxd,Math.hypot(p.x-t.sx,p.y-t.sy));}},
  (i,id,info)=>{const t=touch[i];if(!t||t.id!==id)return;touch[i]=null;if(info&&info.cancelled)return;const dur=performance.now()-t.t0,pt=info?.point;
   if(dur<260&&t.maxd<18)act(i,false);else if(pt&&dur<340&&t.sy-pt.y>70&&Math.abs(pt.x-t.sx)<(t.sy-pt.y)*.8)act(i,true);},alone?()=>0:net?()=>me:undefined);
 s.on(s.c,'pointerdown',ev=>{if(s.paused||!s.alive)return;const p=s.pointer(ev),i=net?me:alone||p.x<s.W/2?0:1;if(touch[i]&&touch[i].id!==ev.pointerId)act(i,false);});
 const KEYS={w:[0,'u'],s:[0,'d'],a:[0,'l'],d:[0,'r'],arrowup:[1,'u'],arrowdown:[1,'d'],arrowleft:[1,'l'],arrowright:[1,'r']};
 for(const type of ['keydown','keyup'])s.on(document,type,ev=>{const key=(ev.key||'').toLowerCase();const b=KEYS[key];const isAct=key===' '||key==='spacebar'||key==='enter';if(!b&&!isAct)return;ev.preventDefault();if(s.paused||!s.alive)return;
  if(b)P[alone?0:net?me:b[0]].key[b[1]]=type==='keydown'?1:0;else if(type==='keydown'&&!ev.repeat)act(net?me:key==='enter'&&!alone?1:0,false);});
 s.resetOnPause?.(()=>{for(const p of P)p.key={u:0,d:0,l:0,r:0};touch.fill(null);});
 s.hint(alone?'Drag anywhere to fly (the plane follows your finger movement). You auto-fire; your guns aim at the boss on wide screens. TAP while touching a PINK bullet to PARRY it: brief invulnerability and super meter. Tap or flick up with a full meter for your SUPER. You have 4 hearts and no partner, so dodge! Keys: WASD or arrows + Space.':'Drag on your half of the screen to fly (the plane follows your finger movement). You auto-fire; on wide screens you start on your side of the boss and your guns aim at it. TAP (or tap with a second finger) while touching a PINK bullet to PARRY it: brief invulnerability and super meter. Tap or flick up with a full meter for your SUPER. If your partner is a bubble, fly into it and tap to revive within 5 seconds. Keys: P1 WASD + Space, P2 arrows + Enter.');
 // ---- autopilot (debug / tests): s.debug.autopilot=[true,true] (a number = reaction time in s), s.debug.steps (sim speed), s.debug.immortal, s.debug.hits
 const DIRS=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[.7,.7],[-.7,.7],[.7,-.7],[-.7,-.7]];
 function danger(qx,qy,look){let d=0;for(const b of bullets){if(b.friendly)continue;const bx=b.x+b.vx*look,by=b.y+b.vy*look,r=PR+b.r+7,dd=(bx-qx)**2+(by-qy)**2;if(dd<r*r)d+=1000;else if(dd<5000)d+=200/(dd+1);}
  for(const m of minions){if(m.hidden)continue;const dd=(m.x-qx)**2+(m.y-qy)**2,r=m.r+PR+14;if(dd<r*r)d+=800;}
  for(const h of hazards){if(h.age+look<h.tele-.05||h.age>h.tele+h.dur)continue;if(hazHit(h,qx,qy,PR+10))d+=1500;}
  for(const w of warns){if(w.mark==='safe'||w.shape==='wedge'||w.shape==='lock')continue;if(w.shape==='rect'&&Math.abs(qx-w.x)<w.w/2+12&&Math.abs(qy-w.y)<w.h/2)d+=700;else if(w.shape==='circle'&&Math.hypot(qx-w.x,qy-w.y)<w.r+16)d+=700;}
  if(B.deadR>0&&Math.hypot(qx-B.drawX,qy-B.drawY)<B.deadR+PR+16)d+=1500;return d;}
 function autopilot(p){if(p.hp<=0)return;let best=null,bs2=1e9;const homeX=wide?spawnX(p.i):B.x+(p.i?70:-70),homeY=wide?spawnY():470;
  for(const d of DIRS)for(const st of [34,80]){const qx=clamp(p.x+d[0]*st,22,W-22),qy=clamp(p.y+d[1]*st,YMIN,580);const sc=danger(qx,qy,.12)+danger(qx,qy,.3)*.8+Math.abs(qx-homeX)*.02+Math.abs(qy-homeY)*.012+(st===80?.4:0);if(sc<bs2){bs2=sc;best=[qx,qy];}}
  p.tx=best[0];p.ty=best[1];const o=mate(p);
  if(o.hp<=0&&o.ghost>0){p.tx=o.gx;p.ty=o.gy;if(Math.hypot(p.x-o.gx,p.y-o.gy)<50)act(p.i,false);}
  for(const b of bullets)if(b.pink&&!b.friendly&&Math.hypot(b.x-p.x,b.y-p.y)<PARRY_R-4){act(p.i,false);break;}
  if(p.meter>=100)act(p.i,true);}
 // ---- collisions
 function hazHit(h,px,py,pr){const ax=h.shape==='beam'&&h.cx!==undefined?h.cx:h.x,ay=h.shape==='beam'&&h.cy!==undefined?h.cy:h.y;
  if(h.shape==='rect'){return Math.abs(px-ax)<h.w/2+pr&&Math.abs(py-ay)<h.h/2+pr;}
  if(h.shape==='circle')return Math.hypot(px-ax,py-ay)<h.r+pr;
  if(h.shape==='beam'){const ex=ax+Math.cos(h.a)*h.len,ey=ay+Math.sin(h.a)*h.len,dx=ex-ax,dy=ey-ay,l2=dx*dx+dy*dy||1;let u=((px-ax)*dx+(py-ay)*dy)/l2;u=clamp(u,0,1);return Math.hypot(px-(ax+dx*u),py-(ay+dy*u))<h.w/2+pr;}
  return false;}
 function bossCircles(){const o=[];for(const [cx,cy,r] of body.hit)o.push([B.drawX+cx*bs,B.drawY+cy*bs,r*bs]);return o;}
 // ---- update
 function updatePlayers(dt){for(const p of P){const i=p.i;if(net&&i===them){stepPuppet(p,dt);continue;}p.inv=Math.max(0,p.inv-dt);p.parryT=Math.max(0,p.parryT-dt);
   const ap=s.debug.autopilot&&s.debug.autopilot[i];if(ap&&mode==='fight'){if(typeof ap!=='number')autopilot(p);else if((p.apT=(p.apT||0)-dt)<=0){p.apT=ap;autopilot(p);}}
   if(p.hp<=0){if(p.ghost>0){p.ghost-=dt;const o=mate(p);if(o.hp>0){const d=Math.hypot(o.x-p.gx,o.y-p.gy)||1,sp=Math.min(d,46*dt);p.gx+=(o.x-p.gx)/d*sp;p.gy+=(o.y-p.gy)/d*sp;}p.gy-=8*dt;p.gx=clamp(p.gx,24,W-24);p.gy=clamp(p.gy,YMIN-20,590);
     if(p.ghost<=0){p.ghost=0;p.out=true;burst(p.gx,p.gy,'#bfe0ff',16,140,.6);text(p.gx,p.gy-20,'POP...','#bfe0ff',14,1);}}continue;}
   const kx=p.key.r-p.key.l,ky=p.key.d-p.key.u;if(kx||ky){const l=Math.hypot(kx,ky);p.tx=clamp(p.tx+kx/l*330*dt,22,W-22);p.ty=clamp(p.ty+ky/l*330*dt,YMIN,580);}
   const dx=p.tx-p.x,dy=p.ty-p.y,l=Math.hypot(dx,dy),mx=Math.min(l,Math.max(l*dt*16,40*dt),700*dt);if(l>.01){p.x+=dx/l*mx;p.y+=dy/l*mx;}p.vx+=((dx)-p.vx)*Math.min(1,dt*10);
   if(wide){if(B.hidden<=0&&B.deadR<=0&&B.shown>=1)for(const [cx,cy,r] of bossCircles()){const ex=p.x-cx,ey=p.y-cy,d=Math.hypot(ex,ey)||1,rr=r+26;if(d<rr){p.x=clamp(cx+ex/d*rr,22,W-22);p.y=clamp(cy+ey/d*rr,YMIN,580);p.tx=p.x;p.ty=p.y;}}
    let ax=B.drawX,ay=B.drawY+20,ad=Math.hypot(ax-p.x,ay-p.y)*.8;for(const m of minions){if(m.hidden||m.dead)continue;const d=Math.hypot(m.x-p.x,m.y-p.y);if(d<ad&&d<420){ad=d;ax=m.x;ay=m.y;}}
    const want=Math.atan2(ay-p.y,ax-p.x);let da=want-p.aim;da=Math.atan2(Math.sin(da),Math.cos(da));p.aim+=da*Math.min(1,dt*12);}else p.aim=-Math.PI/2;
   if(p.sup>0){p.sup-=dt;superTick(p,dt);}
   p.fire-=dt;if(p.fire<=0&&(mode==='fight'||mode==='phase')){p.fire=.15;sfx('shot');const ca=Math.cos(p.aim),sa=Math.sin(p.aim);for(const ox2 of [-7,7])pshots.push({x:p.x-sa*ox2+ca*18,y:p.y+ca*ox2+sa*18,vx:ca*900,vy:sa*900,o:i,dmg:1,r:4});}}}
 function superTick(p,dt){if(p.i===0){p.beamT=(p.beamT||0)-dt;if(p.beamT<=0){p.beamT=.1;const ca=Math.cos(p.aim),sa=Math.sin(p.aim),off=(qx,qy)=>Math.abs((qx-p.x)*sa-(qy-p.y)*ca),ahead=(qx,qy)=>(qx-p.x)*ca+(qy-p.y)*sa>0;
    for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];if(!b.friendly&&off(b.x,b.y)<30&&ahead(b.x,b.y)){burst(b.x,b.y,'#fff',2,60,.25,2);netGone(b);bullets.splice(i,1);}}
    for(const m of minions)if(!m.hidden&&off(m.x,m.y)<30+m.r&&ahead(m.x,m.y))damageMinion(m,4,p.i);
    for(const [cx,cy,r] of bossCircles())if(off(cx,cy)<r+23&&ahead(cx,cy)){hitBoss(7,cx,cy,p.i,true);break;}}}
  else{p.barrage-=dt;if(p.barrage<=0){p.barrage=.06;p.star=(p.star||0)+1;const a=p.aim+Math.sin(p.star*1.7)*1.1;pshots.push({x:p.x,y:p.y-10,vx:Math.cos(a)*520,vy:Math.sin(a)*520,o:p.i,dmg:5,r:6,homing:true,star:true,life:2.2});}
   const rad=(1-p.sup/p.supT)*300;for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];if(!b.friendly&&Math.hypot(b.x-p.x,b.y-p.y)<rad){burst(b.x,b.y,'#fff',2,60,.25,2);netGone(b);bullets.splice(i,1);}}}}
 function damageMinion(m,dmg,owner){
  // online the other phone reports its damage; the kill is player 1's phone's call (until then the minion is just hidden here)
  if(gw){if(owner!==me||!(dmg>0))return;if(m._id)mh.set(m._id,(mh.get(m._id)||0)+dmg);m.hp-=dmg;m.flash=.08;if(m.hp<=0&&!m.dead){m.dead=true;m.guess=T;}return;}
  m.hp-=dmg;m.flash=.08;if(m.hp<=0&&!m.dead){m.dead=true;m.killer=owner;}}
 function updateShots(dt){for(let i=pshots.length-1;i>=0;i--){const q=pshots[i];q.life=(q.life??1.4)-dt;
   if(q.homing){let tx=B.drawX,ty=B.drawY+20,bd=1e9;for(const m of minions){if(m.hidden)continue;const d=(m.x-q.x)**2+(m.y-q.y)**2;if(d<bd){bd=d;tx=m.x;ty=m.y;}}
    if(B.shown>=1&&mode==='fight'&&bd>1e8){}const want=Math.atan2(ty-q.y,tx-q.x),cur=Math.atan2(q.vy,q.vx);let d=want-cur;d=Math.atan2(Math.sin(d),Math.cos(d));const na=cur+clamp(d,-7*dt,7*dt);const sp=560;q.vx=Math.cos(na)*sp;q.vy=Math.sin(na)*sp;}
   q.x+=q.vx*dt;q.y+=q.vy*dt;let hit=false;
   for(const m of minions){if(m.hidden||m.dead)continue;if((m.x-q.x)**2+(m.y-q.y)**2<(m.r+q.r+3)**2){damageMinion(m,q.dmg,q.o);hit=true;burst(q.x,q.y,PCOL[q.o],2,90,.25,2);sfx('hit');break;}}
   if(!hit&&B.hidden<=0)for(const [cx,cy,r] of bossCircles()){if((cx-q.x)**2+(cy-q.y)**2<(r+q.r)**2){if(mode==='fight'&&B.shown>=1){if(!(net&&q.o===them))hitBoss(q.dmg,q.x,q.y,q.o,false);burst(q.x,q.y,PCOL[q.o],q.star?6:2,110,.3,2);sfx('hit');}hit=true;break;}}
   if(hit||q.life<=0||q.y<-30||q.y>H+30||q.x<-40||q.x>W+40)pshots.splice(i,1);}}
 function updateBullets(dt){for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];b.age+=dt;if(b.step)b.step(F,b,dt);if(b.dead){bullets.splice(i,1);continue;}
   if(b.ax)b.vx+=b.ax*dt;if(b.ay)b.vy+=b.ay*dt;
   if(b.homeBoss){const dx=B.drawX-b.x,dy=B.drawY+30-b.y,l=Math.hypot(dx,dy)||1;b.vx=dx/l*620;b.vy=dy/l*620;if(l<70&&B.hidden<=0){const ok=!b.remote&&hitBoss(b.dmg||60,b.x,b.y,-1,true);burst(b.x,b.y,'#ffe66a',34,320,.8,4);ring(b.x,b.y,'#ffe66a',90,.6);text(b.x,b.y-20,'BIG HIT!','#ffe66a',18,1);shake(8);if(ok){const w=net?P[me]:P.find(p=>p.hp>0);if(w)w.dmg+=b.dmg||60;}bullets.splice(i,1);continue;}}
   b.x+=b.vx*dt;b.y+=b.vy*dt;
   if(b.bounce){if(b.x<b.r){b.x=b.r;b.vx=Math.abs(b.vx);b.bounce--;}else if(b.x>W-b.r){b.x=W-b.r;b.vx=-Math.abs(b.vx);b.bounce--;}if(b.y<b.r&&b.vy<0){b.vy=Math.abs(b.vy);}}
   if(b.spin)b.rot=(b.rot||0)+dt*8;
   const out=(b.keep&&b.age<3)?false:(b.x<-70||b.x>W+70||b.y<-90||b.y>H+70);
   if(out||b.age>(b.life||14)){bullets.splice(i,1);continue;}
   if(b.friendly)continue;
   for(const p of P){if(p.hp<=0)continue;const r=PR+b.r*.82;if((b.x-p.x)**2+(b.y-p.y)**2<r*r){if(hurt(p,'bullet:'+b.kind)){burst(b.x,b.y,'#fff',4,100,.3,2);netGone(b);bullets.splice(i,1);}break;}}}}
 function stepHazard(h,dt,judge){h.age+=dt;const act2=h.age>=h.tele;
   if(h.follow){const mz=F.muzzle('center');h.cx=mz.x;h.cy=mz.y;}else{h.cx=h.x;h.cy=h.y;}
   if(act2){if(h.vx)h.x+=h.vx*dt;if(h.vy)h.y+=h.vy*dt;if(h.da)h.a+=h.da*dt;
    if(h.tween){const u=clamp((h.age-h.tele)/h.tween.t,0,1),e=ease.out(u),fx0=h.tween.fromX!==undefined?h.tween.fromX:h.x0,fy0=h.tween.fromY!==undefined?h.tween.fromY:h.y0;h.x=fx0+(h.tween.x-fx0)*e;h.y=fy0+(h.tween.y-fy0)*e;}
    if(h.pend){const th=h.pend.amp*Math.sin((h.age-h.tele)*TAU/h.pend.period+(h.pend.phase||0));h.x=h.cx+Math.sin(th)*h.pend.len;h.y=h.cy+Math.cos(th)*h.pend.len;h.th=th;}}
   else if(h.tween){h.x=h.tween.x;h.y=h.tween.y;}
   if(judge&&act2&&mode==='fight'&&h.age-h.tele>.05&&h.age<=h.tele+h.dur)for(const p of P){if(p.hp>0&&hazHit(h,p.x,p.y,PR))hurt(p,'hazard:'+(h.kind||h.shape));}}
 function updateHazards(dt){for(let i=hazards.length-1;i>=0;i--){const h=hazards[i];stepHazard(h,dt,true);if(h.age>h.tele+h.dur)hazards.splice(i,1);}}
 function updateMinions(dt){if(gw){updateNetMinions(dt);return;}for(let i=minions.length-1;i>=0;i--){const m=minions[i];m.age+=dt;m.flash=Math.max(0,m.flash-dt);if(m.step)m.step(F,m,dt);
   if(m.dead||m.hp<=0){const was=m.dead||!m.expire;minions.splice(i,1);if(net)netOp(['mk',m._id,m.expire?-1:m.killer??-1,m.expire?1:0]);if(m.expire)continue;burst(m.x,m.y,'#ffd23c',12,170,.55,3);ring(m.x,m.y,'#ffd23c',m.r*2.6,.35);sfx('kill');
    if(m.killer!==undefined&&m.killer>=0){const p=P[m.killer];p.kills++;p.meter=Math.min(100,p.meter+6);}
    if(m.onDie)try{m.onDie(F,m);}catch(e){console.error(e);}continue;}
   if(m.y>H+70||m.x<-80||m.x>W+80||m.y<-100){minions.splice(i,1);if(net)netOp(['mk',m._id,-1,1]);continue;}
   if(!m.hidden&&mode==='fight')for(const p of P)if(p.hp>0&&Math.hypot(p.x-m.x,p.y-m.y)<m.r+PR+2){hurt(p,'minion:'+m.kind);}}}
 function updateBoss(dt){B.shown=Math.min(1,B.shown+dt*2);B.flash=Math.max(0,B.flash-dt);B.chip=Math.max(B.hp/B.max,B.chip-dt*.35);B.hidden=Math.max(0,B.hidden-dt);
  if(B.tw){B.tw.t+=dt;const u=Math.min(1,B.tw.t/B.tw.dur),e=B.tw.e(u);B.x=B.tw.x0+(B.tw.x1-B.tw.x0)*e;B.y=B.tw.y0+(B.tw.y1-B.tw.y0)*e;if(u>=1)B.tw=null;}
  B.poseT-=dt;if(B.poseT<=0)B.pose='idle';
  const to=B.pose==='fire'?1:B.pose==='windup'?.65:B.pose==='roar'?1:B.pose==='spin'?.5:0;B.open+=(to-B.open)*Math.min(1,dt*9);B.glow+=((B.pose==='windup'||B.pose==='roar'?1:0)-B.glow)*Math.min(1,dt*5);
  const t0=F.nearest(B.x,B.y),lx=clamp((t0.x-B.x)/200,-1,1),ly=clamp((t0.y-B.y)/320,-1,1);B.lookX+=(lx-B.lookX)*Math.min(1,dt*6);B.lookY+=(ly-B.lookY)*Math.min(1,dt*6);
  const bob=B.tw||B.pose==='dive'||B.deadR>0?0:1;B.drawX=B.x+Math.sin(T*.9)*10*bob+(mode==='phase'||mode==='ko'?(Math.random()-.5)*8:0);B.drawY=B.y+Math.sin(T*1.7)*5*bob+(mode==='phase'||mode==='ko'?(Math.random()-.5)*6:0);
  B.sq=B.pose==='windup'?1+Math.sin(T*18)*.012:B.pose==='roar'?1.05+Math.sin(T*30)*.02:1;
  if(B.deadR>0&&mode==='fight')for(const p of P)if(p.hp>0&&Math.hypot(p.x-B.drawX,p.y-B.drawY)<B.deadR+PR)hurt(p,'body');}
 function updateFx(dt){for(let i=fx.length-1;i>=0;i--){const e=fx[i];e.life-=dt;if(e.life<=0){fx.splice(i,1);continue;}if(e.k==='p'){e.x+=e.vx*dt;e.y+=e.vy*dt;e.vx*=1-dt*2.2;e.vy*=1-dt*2.2;e.vy+=(e.g||0)*dt;}else if(e.k==='t')e.y-=22*dt;}
  for(const w of warns){w.t+=dt;if(w.follow&&w.t<(w.freeze??99)&&w.follow.hp>0){w.x=w.follow.x;w.y=w.follow.y;}}for(let i=warns.length-1;i>=0;i--)if(warns[i].t>=warns[i].dur)warns.splice(i,1);
  says.t=Math.max(0,says.t-dt);for(const b of bannerQ)b.t+=dt;while(bannerQ.length&&bannerQ[0].t>bannerQ[0].life)bannerQ.shift();}
 function music(dt){if(!musicOn()||document.hidden||mode==='intro'&&modeT<.5)return;const tn=boss.tone,beat=tn.beat/1000/(mode==='fight'?1+B.phase*.12:1);musicT+=dt;if(musicT<beat)return;musicT-=beat;const n=musicStep++%tn.notes.length;tone(tn.base*2**(tn.notes[n]/12),beat*.8,.009,tn.voice);if(tn.bass&&n%2===0)tone(tn.base/2*(n%4===0?1:1.5),beat*.9,.012,'triangle');}
 let introBooms=0;
 function update(dt0,dt){T+=dt;A.t=T;modeT+=dt0;
  if(mode==='intro'){const u=clamp(modeT/1.3,0,1);B.y=B.hy-260*(1-ease.out(u));B.x=B.hx;B.tw=null;B.shown=1;if(modeT>1.3&&introBooms===0){introBooms=1;shake(14);sfx('boom');flashWhite=.25;}
   if(modeT>=introEnd){mode='fight';modeT=0;T=introEnd;banner('',' ',.01);if(!gw)startRun(director(),true);}}
  if(mode==='phase'&&modeT>2.3)endPhase();
  if(mode==='ko'){koBoom-=dt0;if(modeT<1.8&&koBoom<=0){koBoom=.11;const cs=bossCircles()[0]||[B.drawX,B.drawY,60];const a=Math.random()*TAU,rr=Math.random()*cs[2]*1.2;burst(cs[0]+Math.cos(a)*rr,cs[1]+Math.sin(a)*rr,['#ffd23c','#ff7a1a','#fff'][Math.floor(Math.random()*3)],14,260,.7,4);ring(cs[0]+Math.cos(a)*rr,cs[1]+Math.sin(a)*rr,'#ff9a3a',46,.4);sfx('boom');shake(5);}
   if(modeT>=1.8&&!koDone){koDone=true;timeScale=1;B.hidden=99;shake(22);flashWhite=1;vibrate(150);sound('win');const cs=bossCircles()[0];for(let r=0;r<4;r++)ring(cs[0],cs[1],['#fff','#ffd23c','#ff7a1a','#ff3b2f'][r],160+r*60,.8+r*.15);burst(cs[0],cs[1],'#ffd23c',90,520,1.4,5);burst(cs[0],cs[1],'#ff5a2a',70,420,1.2,6);burst(cs[0],cs[1],'#fff',40,600,.9,3);}
   if(modeT>5)finish(true);}
  if(mode==='lose'&&modeT>3.4)finish(false);
  if(mode==='fight'||mode==='phase')stepRuns(dt);
  if(mode!=='lose'||true)updatePlayers(dt);netBoss(dt);updateBoss(dt);
  if(mode==='fight'||mode==='phase'||mode==='lose'){updateHazards(dt);updateMinions(dt);updateBullets(dt);}
  updateShots(dt);updateFx(dt);music(dt0);
  shakeMag*=Math.pow(.02,dt0);flashWhite=Math.max(0,flashWhite-dt0*1.6);}
 // ---- drawing
 const ink='#140a0c';
 function drawBoss(g){if(B.hidden>5)return;const Bw=Math.ceil(470*bs*k),Bh=Math.ceil(420*bs*k);if(!bossBuf||bossBuf.width!==Bw){bossBuf=document.createElement('canvas');bossBuf.width=Bw;bossBuf.height=Bh;}
  const b=bossBuf.getContext('2d');b.setTransform(1,0,0,1,0,0);b.clearRect(0,0,Bw,Bh);b.setTransform(bs*k,0,0,bs*k,Bw/2,Bh/2);
  const sy=B.pose==='dive'?1.06:B.sq,sx=B.pose==='dive'?.96:1/B.sq;b.scale(sx,sy);if(B.pose==='spin'||B.pose==='dive'&&false)b.rotate(0);
  A.look.x=B.lookX;A.look.y=B.lookY;A.open=B.open;A.glow=B.glow;A.phase=B.phase;A.dmg=1-B.hp/B.max;A.pose=B.pose;
  try{body.draw(b,A);}catch(e){if(!drawBoss.err){drawBoss.err=1;console.error('boss body',e);}}
  b.setTransform(bs*k,0,0,bs*k,Bw/2,Bh/2);b.globalCompositeOperation='source-atop';
  const n=Math.floor(A.dmg*9);if(n>0){b.lineJoin='round';for(let i=0;i<n&&i<cracks.length;i++){const cr=cracks[i];b.beginPath();cr.forEach((p,j)=>j?b.lineTo(p[0],p[1]):b.moveTo(p[0],p[1]));b.strokeStyle='rgba(255,255,255,.35)';b.lineWidth=5;b.stroke();b.strokeStyle='rgba(10,0,0,.8)';b.lineWidth=2.6;b.stroke();}}
  if(B.flash>0){b.fillStyle=`rgba(255,255,255,${Math.min(.3,B.flash*5)})`;b.fillRect(-300,-300,600,600);}
  else if(B.phase>0&&mode!=='ko'){b.fillStyle=`rgba(255,40,20,${.05+Math.sin(T*4)*.03*B.phase})`;b.fillRect(-300,-300,600,600);}
  b.globalCompositeOperation='source-over';
  g.save();g.globalAlpha=B.hidden>0?.12:1;g.fillStyle='rgba(0,0,0,.16)';g.beginPath();g.ellipse(B.drawX,B.drawY+122*bs,100*bs,12*bs,0,0,TAU);g.fill();g.drawImage(bossBuf,B.drawX-Bw/2/k,B.drawY-Bh/2/k,Bw/k,Bh/k);g.restore();}
 const cracks=(()=>{const r=seeded(hashStr(boss.id)),out=[];for(let i=0;i<9;i++){let px=(r()-.5)*190,py=(r()-.5)*150;const pts=[[px,py]];for(let j=0;j<4;j++){px+=(r()-.5)*50;py+=r()*34-8;pts.push([px,py]);}out.push(pts);}return out;})();
 function drawWarn(g,w){const u=w.t/w.dur,pulse=.6+Math.sin(w.t*16)*.4,safe=w.mark==='safe',col=w.col||'#ff3b2f';g.save();
  const a=(w.alpha??.2)*(safe?1:(.7+pulse*.6));g.fillStyle=col;g.strokeStyle=col;
  if(w.shape==='rect'){g.globalAlpha=a;g.fillRect(w.x-w.w/2,w.y-w.h/2,w.w,w.h);g.globalAlpha=safe?.6:.55*pulse+.2;g.lineWidth=3;g.setLineDash([12,9]);g.strokeRect(w.x-w.w/2,w.y-w.h/2,w.w,w.h);g.setLineDash([]);
   g.globalAlpha=safe?.75:.9;g.fillStyle=safe?'#d8ffe6':'#fff';g.font='bold 22px Arial Black,Arial';g.textAlign='center';g.textBaseline='middle';if(w.mark){const ys=safe?[w.y-w.h/2+Math.min(w.h,520)*.45]:[w.y-w.h*.3,w.y,w.y+w.h*.3];for(const yy of ys)g.fillText(safe?'SAFE':w.mark,w.x,clamp(yy,260,540));}}
  else if(w.shape==='circle'){g.globalAlpha=a+.1;g.beginPath();g.arc(w.x,w.y,w.r,0,TAU);g.fill();g.globalAlpha=.9;g.lineWidth=3;g.setLineDash([8,6]);g.stroke();g.setLineDash([]);const sh=w.mark==='lock'?w.r*(1.6-.6*Math.min(1,u*1.4)):0;if(sh){g.beginPath();g.arc(w.x,w.y,sh,0,TAU);g.stroke();g.beginPath();g.moveTo(w.x-w.r*1.5,w.y);g.lineTo(w.x+w.r*1.5,w.y);g.moveTo(w.x,w.y-w.r*1.5);g.lineTo(w.x,w.y+w.r*1.5);g.stroke();}
   else if(w.mark&&w.mark!=='safe'){g.fillStyle='#fff';g.font='bold 22px Arial Black,Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(w.mark,w.x,w.y);}}
  else if(w.shape==='wedge'){g.globalAlpha=a;g.beginPath();g.moveTo(w.x,w.y);g.arc(w.x,w.y,w.len,w.a0,w.a1);g.closePath();g.fill();}
  g.restore();}
 function drawHazard(g,h){const act2=h.age>=h.tele,x0=h.cx!==undefined?h.cx:h.x,y0=h.cy!==undefined?h.cy:h.y;g.save();
  const col=h.col||'#ff7a3a',pulse=.6+Math.sin(h.age*30)*.4;
  if(h.shape==='rect'){const px=h.x,py=h.y;if(!act2){g.globalAlpha=.16+.14*Math.sin(h.age*20);g.fillStyle=col;g.fillRect(px-h.w/2,py-h.h/2,h.w,h.h);g.globalAlpha=.7;g.strokeStyle=col;g.lineWidth=2;g.setLineDash([10,8]);g.strokeRect(px-h.w/2,py-h.h/2,h.w,h.h);}
   else{const gr=g.createLinearGradient(px-h.w/2,0,px+h.w/2,0);gr.addColorStop(0,col);gr.addColorStop(.5,'#fff');gr.addColorStop(1,col);const fade=Math.min(1,(h.age-h.tele)*10);g.globalAlpha=fade;
    if(h.kind==='trapdoor'){const x1=px-h.w/2,y1=py-h.h/2;g.fillStyle='#04141c';g.fillRect(x1,y1,h.w,h.h);g.fillStyle=lgv(g,px,y1,py+h.h/2,'#1b6f8a');g.globalAlpha=fade*.85;g.fillRect(x1+8,y1+10,h.w-16,h.h-18);g.globalAlpha=fade;
     for(let k=0;k<4;k++){const fx=x1+18+((k*53+h.age*90*(k%2?1:-1))%(h.w-36)+(h.w-36))%(h.w-36),fy=y1+24+k*(h.h-40)/4;g.fillStyle='#c8d4d8';g.beginPath();g.ellipse(fx,fy,11,6,0,0,TAU);g.fill();g.beginPath();g.moveTo(fx+(k%2?-10:10),fy);g.lineTo(fx+(k%2?-18:18),fy-6);g.lineTo(fx+(k%2?-18:18),fy+6);g.fill();g.fillStyle='#c8161d';g.fillRect(fx+(k%2?3:-7),fy+1,4,2);}
     g.strokeStyle=ink;g.lineWidth=4;g.strokeRect(x1,y1,h.w,h.h);g.fillStyle='#3a3d44';g.fillRect(x1,y1,h.w,7);g.fillRect(x1,py+h.h/2-7,h.w,7);}
    else if(h.kind==='wall'||h.kind==='wave'||h.kind==='tentacle'||h.kind==='door'){g.fillStyle=lgv(g,px,py-h.h/2,py+h.h/2,col);g.fillRect(px-h.w/2,py-h.h/2,h.w,h.h);g.lineWidth=3;g.strokeStyle=ink;g.strokeRect(px-h.w/2,py-h.h/2,h.w,h.h);g.fillStyle='rgba(255,255,255,.35)';g.fillRect(px-h.w/2,py-h.h/2,h.w,4);}
    else{g.fillStyle=gr;g.fillRect(px-h.w/2,py-h.h/2,h.w,h.h);g.fillStyle='rgba(255,255,255,.55)';g.fillRect(px-3,py-h.h/2,6,h.h);g.strokeStyle='#fff';g.lineWidth=2;g.globalAlpha=fade*pulse;for(let yy=py-h.h/2;yy<py+h.h/2;yy+=36){g.beginPath();g.moveTo(px-h.w/2,yy);g.lineTo(px+h.w/2,yy+18);g.stroke();}}}}
  else if(h.shape==='circle'){const px=h.x,py=h.y;if(h.pend){g.strokeStyle=ink;g.lineWidth=4;g.beginPath();g.moveTo(x0,y0);g.lineTo(px,py);g.stroke();g.strokeStyle='#bbb';g.lineWidth=2;g.stroke();}
   if(!act2){g.globalAlpha=.3+.2*Math.sin(h.age*20);g.fillStyle=col;g.beginPath();g.arc(px,py,h.r,0,TAU);g.fill();if(h.pend){g.globalAlpha=.4;g.strokeStyle=col;g.setLineDash([6,6]);g.beginPath();g.arc(x0,y0,h.pend.len,Math.PI/2-h.pend.amp,Math.PI/2+h.pend.amp);g.stroke();}}
   else{const rr=h.r*(h.kind==='blast'?1+(h.age-h.tele)*.8:1);const gr=g.createRadialGradient(px,py,2,px,py,rr);gr.addColorStop(0,'#fff');gr.addColorStop(.5,col);gr.addColorStop(1,h.kind==='puddle'?'rgba(40,120,40,.6)':shadeC(col));g.globalAlpha=h.kind==='puddle'?(.55+.2*pulse)*Math.min(1,(h.tele+h.dur-h.age)*2):1;g.fillStyle=gr;g.beginPath();g.arc(px,py,rr,0,TAU);g.fill();if(h.kind!=='puddle'){g.lineWidth=3.5;g.strokeStyle=ink;g.stroke();}if(h.pend){spikesC(g,px,py,rr);}}}
  else if(h.shape==='beam'){const ex=x0+Math.cos(h.a)*h.len,ey=y0+Math.sin(h.a)*h.len;
   if(!act2){if(h.wedge){g.globalAlpha=.1+.05*Math.sin(h.age*14);g.fillStyle='#ff3b2f';g.beginPath();g.moveTo(x0,y0);g.arc(x0,y0,h.len,h.wedge[0],h.wedge[1]);g.fill();}g.globalAlpha=.5+.4*Math.sin(h.age*22);g.strokeStyle='#ff3b2f';g.lineWidth=2.5;g.setLineDash([14,10]);g.beginPath();g.moveTo(x0,y0);g.lineTo(ex,ey);g.stroke();}
   else{const f=Math.min(1,(h.age-h.tele)*9);g.globalAlpha=f;g.lineCap='round';g.strokeStyle=ink;g.lineWidth=h.w+8;g.beginPath();g.moveTo(x0,y0);g.lineTo(ex,ey);g.stroke();g.strokeStyle=col;g.lineWidth=h.w;g.stroke();g.strokeStyle='#fff';g.lineWidth=h.w*.4*(.8+.2*pulse);g.stroke();ell0(g,x0,y0,h.w*.8,col);}}
  g.restore();}
 const lgv=(g,x,y0,y1,col)=>{const gr=g.createLinearGradient(0,y0,0,y1);gr.addColorStop(0,col);gr.addColorStop(1,shadeC(col));return gr;};
 const shadeC=col=>shade(col[0]==='#'&&col.length>=7?col:'#a03020');
 function ell0(g,x2,y2,r,col){g.fillStyle=col;g.globalAlpha=.8;g.beginPath();g.arc(x2,y2,r,0,TAU);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(x2,y2,r*.5,0,TAU);g.fill();}
 function spikesC(g,px,py,rr){g.fillStyle='#8a8f98';for(let i=0;i<10;i++){const a=i/10*TAU+T;g.beginPath();g.moveTo(px+Math.cos(a-.15)*rr,py+Math.sin(a-.15)*rr);g.lineTo(px+Math.cos(a)*(rr+14),py+Math.sin(a)*(rr+14));g.lineTo(px+Math.cos(a+.15)*rr,py+Math.sin(a+.15)*rr);g.fill();}}
 function drawPlane(g,p){const i=p.i,inv=p.inv>0&&!p.parryT&&Math.floor(T*14)%2===0;if(inv)return;const bank=clamp(p.vx*.01,-.35,.35),main=PCOL[i],dark=PDARK[i];
  g.save();g.translate(p.x,p.y);
  if(p.sup>0){g.globalAlpha=.5+.3*Math.sin(T*30);g.fillStyle=main;g.beginPath();g.arc(0,0,40,0,TAU);g.fill();g.globalAlpha=1;}
  if(p.parryT>0){g.globalAlpha=Math.min(1,p.parryT*3);g.strokeStyle='#ff9ae0';g.lineWidth=4;g.beginPath();g.arc(0,0,22+(.45-p.parryT)*90,0,TAU);g.stroke();g.globalAlpha=1;}
  g.rotate(p.aim+Math.PI/2+bank*.5);g.lineJoin='round';g.lineWidth=3;g.strokeStyle=ink;
  const fl=10+Math.sin(T*50+i)*5;g.fillStyle='#ffb02e';g.beginPath();g.moveTo(-5,16);g.lineTo(0,16+fl+8);g.lineTo(5,16);g.fill();g.fillStyle='#fff6c0';g.beginPath();g.moveTo(-2.5,16);g.lineTo(0,16+fl);g.lineTo(2.5,16);g.fill();
  if(i===0){g.fillStyle=dark;g.beginPath();g.moveTo(-8,8);g.lineTo(-28,26);g.lineTo(-8,20);g.closePath();g.fill();g.stroke();g.beginPath();g.moveTo(8,8);g.lineTo(28,26);g.lineTo(8,20);g.closePath();g.fill();g.stroke();
   g.fillStyle=main;g.beginPath();g.moveTo(0,-30);g.lineTo(8,-4);g.lineTo(34,18);g.lineTo(34,24);g.lineTo(9,18);g.lineTo(6,28);g.lineTo(-6,28);g.lineTo(-9,18);g.lineTo(-34,24);g.lineTo(-34,18);g.lineTo(-8,-4);g.closePath();g.fill();g.stroke();g.fillStyle='#fff';g.fillRect(-2,-26,4,40);}
  else{g.fillStyle=dark;g.fillRect(-4,10,8,20);g.strokeRect(-4,10,8,20);g.fillStyle=main;g.beginPath();g.rect(-36,-2,72,11);g.fill();g.stroke();g.beginPath();g.rect(-32,-16,64,10);g.fill();g.stroke();g.beginPath();g.moveTo(-26,-6);g.lineTo(-26,-2);g.moveTo(26,-6);g.lineTo(26,-2);g.stroke();
   g.beginPath();g.moveTo(-6,-22);g.lineTo(0,-34);g.lineTo(6,-22);g.closePath();g.fillStyle=dark;g.fill();g.stroke();g.fillStyle='#fff';g.fillRect(-3,2,6,6);}
  g.globalAlpha=.5;g.fillStyle='#bfe8ff';g.beginPath();g.arc(0,0,20,0,TAU);g.fill();g.globalAlpha=1;g.lineWidth=3;g.stroke();g.restore();
  s.sprite(g,i,p.x,p.y,32,{exact:true,mood:p.parryT>0?'happy':p.inv>0?'sad':'walking'});
  g.save();g.translate(p.x,p.y);g.fillStyle='#fff';g.strokeStyle=ink;g.lineWidth=1.5;g.beginPath();g.arc(0,0,3.6,0,TAU);g.fill();g.stroke();g.fillStyle='#e63b3b';g.beginPath();g.arc(0,0,1.8,0,TAU);g.fill();g.restore();}
 function drawGhost(g,p){const wob=Math.sin(T*3+p.i)*4,x2=p.gx+wob,y2=p.gy,u=p.ghost/5;g.save();g.globalAlpha=.9;const gr=g.createRadialGradient(x2-8,y2-8,2,x2,y2,28);gr.addColorStop(0,'rgba(255,255,255,.9)');gr.addColorStop(1,'rgba(160,210,255,.45)');g.fillStyle=gr;g.beginPath();g.arc(x2,y2,27,0,TAU);g.fill();g.lineWidth=3;g.strokeStyle='rgba(255,255,255,.9)';g.stroke();g.restore();
  s.sprite(g,p.i,x2,y2,30,{exact:true,mood:'sad'});g.save();g.strokeStyle=u<.35?'#ff5a5a':'#7dffb0';g.lineWidth=4;g.beginPath();g.arc(x2,y2,33,-1.57,-1.57+TAU*u);g.stroke();
  const o=mate(p);g.fillStyle='#fff';g.strokeStyle=ink;g.lineWidth=3;g.font='bold 13px Arial Black,Arial';g.textAlign='center';g.textBaseline='middle';const lab=o.hp>0?'TAP ME!':'...';g.strokeText(lab,x2,y2-44);g.fillText(lab,x2,y2-44);g.restore();}
 function drawPShots(g){for(const q of pshots){g.fillStyle=PCOL[q.o];if(q.star){g.save();g.translate(q.x,q.y);g.rotate(T*10);g.beginPath();for(let i=0;i<10;i++){const a=i/10*TAU,r=i%2?3.5:8;g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();g.fill();g.lineWidth=1.5;g.strokeStyle=ink;g.stroke();g.restore();}
   else if(q.vx){g.save();g.translate(q.x,q.y);g.rotate(Math.atan2(q.vy,q.vx)+Math.PI/2);g.fillRect(-2.2,-9,4.4,16);g.fillStyle='#fff';g.fillRect(-.9,-8,1.8,12);g.restore();}
   else{g.fillRect(q.x-2.2,q.y-9,4.4,16);g.fillStyle='#fff';g.fillRect(q.x-.9,q.y-8,1.8,12);}}}
 function drawBeam(g,p){if(p.i!==0||p.sup<=0)return;const f=Math.min(1,(p.supT-p.sup)*8)*Math.min(1,p.sup*4),w=46*(.9+.1*Math.sin(T*50))*f;g.save();const gr=g.createLinearGradient(p.x-w/2,0,p.x+w/2,0);gr.addColorStop(0,'rgba(255,200,60,0)');gr.addColorStop(.2,'#ffb02e');gr.addColorStop(.5,'#fff');gr.addColorStop(.8,'#ffb02e');gr.addColorStop(1,'rgba(255,200,60,0)');g.fillStyle=gr;if(wide){const len=Math.hypot(W,H);g.translate(p.x,p.y);g.rotate(p.aim+Math.PI/2);const gr2=g.createLinearGradient(-w/2,0,w/2,0);gr2.addColorStop(0,'rgba(255,200,60,0)');gr2.addColorStop(.2,'#ffb02e');gr2.addColorStop(.5,'#fff');gr2.addColorStop(.8,'#ffb02e');gr2.addColorStop(1,'rgba(255,200,60,0)');g.fillStyle=gr2;g.fillRect(-w/2,-len,w,len-10);}else g.fillRect(p.x-w/2,0,w,p.y-10);g.restore();}
 function drawBullet(g,b){const sp=bulletSprite(b);let rot=b.rot||0;if(ORIENTED.has(b.kind)&&!b.spin)rot=Math.atan2(b.vy,b.vx);if(b.kind==='bomb'){const pl=1+Math.sin(b.age*(b.age>1?24:6))*.1;g.save();g.translate(b.x,b.y);g.scale(pl,pl);g.drawImage(sp.cv,-sp.half,-sp.half,sp.half*2,sp.half*2);g.restore();return;}
  if(rot||b.pink){g.save();g.translate(b.x,b.y);if(rot)g.rotate(rot);if(b.pink){const pl=1+Math.sin(T*10+b.x)*.08;g.scale(pl,pl);}g.drawImage(sp.cv,-sp.half,-sp.half,sp.half*2,sp.half*2);g.restore();if(b.pink){g.save();g.globalAlpha=.55+.3*Math.sin(T*9);g.strokeStyle='#ff9ae0';g.lineWidth=2;g.beginPath();g.arc(b.x,b.y,b.r+6+Math.sin(T*9)*2,0,TAU);g.stroke();g.restore();}}
  else g.drawImage(sp.cv,b.x-sp.half,b.y-sp.half,sp.half*2,sp.half*2);}
 function drawHud(g){const y=HUD_Y;const gr=g.createLinearGradient(0,y-10,0,H);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.7)');g.fillStyle=gr;g.fillRect(0,y-14,W,H-y+14);
  for(const p of P){const left=p.i===0,bx=left?8:W-8,dir=left?1:-1;g.save();
   g.globalAlpha=p.hp<=0?.5:1;s.sprite(g,p.i,bx+dir*19,y+25,34,{exact:true,mood:p.hp<=0?'sad':p.inv>0?'sad':'walking'});
   for(let h=0;h<maxHp;h++){const hx=bx+dir*(54+h*21);heartPath(g,hx,y+13,20);g.fillStyle=h<p.hp?'#ff3b5a':'rgba(40,10,20,.7)';g.fill();g.lineWidth=2.4;g.strokeStyle=ink;g.stroke();if(h<p.hp){g.fillStyle='rgba(255,255,255,.6)';g.beginPath();g.arc(hx-4,y+7,2.4,0,TAU);g.fill();}}
   const mw=92+(maxHp-3)*21,mx=left?bx+42:bx-42-mw,my=y+27,full=p.meter>=100;g.fillStyle='rgba(0,0,0,.75)';g.fillRect(mx-2,my-2,mw+4,13);g.fillStyle=full?`hsl(${(T*400)%360},90%,60%)`:PCOL[p.i];g.fillRect(mx,my,mw*p.meter/100,9);g.fillStyle='rgba(255,255,255,.35)';g.fillRect(mx,my,mw*p.meter/100,3);g.lineWidth=1.5;g.strokeStyle=ink;g.strokeRect(mx-2,my-2,mw+4,13);
   g.font='bold 8px Arial Black,Arial';g.textBaseline='middle';g.textAlign='center';g.fillStyle=full?'#000':'#fff';g.fillText(full?'SUPER! FLICK UP':'SUPER',mx+mw/2,my+4.8);g.restore();}}
 function drawBossBar(g){const w=Math.min(W-32,760),x0=(W-w)/2,y=30,h=12,f=B.hp/B.max;g.save();g.font='bold 14px Arial Black,Arial';g.textAlign='left';g.textBaseline='bottom';g.lineWidth=4;g.strokeStyle=ink;g.fillStyle='#fff';let nm=boss.name.toUpperCase();g.strokeText(nm,x0,y-3);g.fillText(nm,x0,y-3);
  g.textAlign='right';g.font='bold 10px Arial Black,Arial';const pl=`PHASE ${B.phase+1}/3`;g.strokeText(pl,x0+w,y-3);g.fillStyle='#ffd23c';g.fillText(pl,x0+w,y-3);
  g.fillStyle='rgba(0,0,0,.7)';g.fillRect(x0-2,y-2,w+4,h+4);g.fillStyle='#fff';g.fillRect(x0,y,w*B.chip,h);const hue=[120,40,0][B.phase];g.fillStyle=B.flash>0?'#fff':`hsl(${hue},85%,50%)`;g.fillRect(x0,y,w*f,h);g.fillStyle='rgba(255,255,255,.35)';g.fillRect(x0,y,w*f,3);
  g.strokeStyle=ink;g.lineWidth=3;g.strokeRect(x0-2,y-2,w+4,h+4);g.lineWidth=2;for(const t of [1/3,2/3]){g.beginPath();g.moveTo(x0+w*t,y-2);g.lineTo(x0+w*t,y+h+2);g.stroke();}g.restore();}
 function bigText(g,str,cx,cy,size,col,sc=1,rot=0,maxW){g.save();g.translate(cx,cy);g.rotate(rot);g.scale(sc,sc);g.font=`900 ${size}px "Arial Black",Impact,Arial,sans-serif`;if(maxW){const mw=g.measureText(str).width;if(mw>maxW)g.scale(maxW/mw,maxW/mw);}g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.lineWidth=size*.2;g.strokeStyle=ink;g.strokeText(str,0,0);g.lineWidth=size*.08;g.strokeStyle='#fff';g.strokeText(str,0,size*-.0);g.fillStyle=col;g.fillText(str,0,0);g.restore();}
 const pop=u=>u<.25?ease.out(u/.25)*1.15:u<.4?1.15-.15*((u-.25)/.15):1;
 function drawCinematics(g){
  if(mode==='intro'){const t=modeT;
   if(t>.9&&t<3.5){const u=clamp((t-.9)/.4,0,1),out=clamp((3.5-t)/.3,0,1),e=ease.out(u),yy=H*.5;g.save();g.globalAlpha=Math.min(out,1);g.translate((1-e)*-W,0);
    g.fillStyle='rgba(10,6,4,.86)';g.fillRect(0,yy-48,W,118);g.fillStyle=pal[2];g.fillRect(0,yy-48,W,5);g.fillRect(0,yy+65,W,5);
    bigText(g,boss.name.toUpperCase(),W/2,yy-8,34,'#ffe9b0',1,0,W-36);g.font='italic 700 15px Georgia,serif';g.textAlign='center';g.fillStyle=pal[2];g.fillText(boss.epithet,W/2,yy+20);g.font='11px Arial';g.fillStyle='#d7cdb8';g.fillText('FROM  '+boss.source.toUpperCase(),W/2,yy+40);
    const q=boss.quote.slice(0,Math.floor((t-1.3)*38));if(q){g.font='italic 12px Georgia,serif';g.fillStyle='#fff';wrapText(g,'“'+q+(q.length<boss.quote.length?'':'”'),W/2,yy+86,W-50,15);}g.restore();}
   if(t>=1.6&&t<4.2){g.save();g.globalAlpha=clamp((t-1.6)*2,0,1)*clamp((4.2-t)*3,0,1);g.fillStyle='rgba(0,0,0,.55)';g.fillRect(14,H*.74,W-28,64);g.fillStyle='#fff';g.font='bold 12px Arial';g.textAlign='center';g.fillText('DRAG to fly · you auto-fire',W/2,H*.74+17);g.fillStyle='#ff9ae0';g.fillText('TAP on a PINK bullet = PARRY',W/2,H*.74+34);g.fillStyle='#ffe66a';g.fillText('Full meter: 2nd TAP or FLICK UP = SUPER',W/2,H*.74+50);g.restore();}
   if(t>=3.3&&t<4.15){const u=(t-3.3)/.85;bigText(g,'READY?',W/2,H*.38,64,'#ffe66a',pop(Math.min(1,u*2)),Math.sin(t*20)*.02);}
   if(t>=4.1&&t<introEnd+.9){const u=(t-4.1)/.8;g.save();g.globalAlpha=clamp(1.2-u,0,1);bigText(g,'WALLOP!',W/2,H*.38,72,'#ff4b3a',pop(Math.min(1,u*3))*(1+u*.2),-.06);g.restore();}}
  const bq=bannerQ[0];if(bq&&bq.str){const u=bq.t/bq.life,a=clamp(Math.min(bq.t*6,(bq.life-bq.t)*4),0,1);g.save();g.globalAlpha=a;
   if(bq.str==='SIGNATURE MOVE'){g.fillStyle='rgba(10,6,4,.78)';g.fillRect(0,H*.36,W,54);g.fillStyle=bq.col;g.fillRect(0,H*.36,W,3);g.fillRect(0,H*.36+51,W,3);g.font='bold 11px Arial';g.textAlign='center';g.fillStyle=bq.col;g.fillText('SIGNATURE MOVE',W/2,H*.36+16);bigText(g,bq.sub,W/2,H*.36+36,24,'#fff',1,0,W-30);}
   else{bigText(g,bq.str,W/2,H*.33,66,bq.col,pop(Math.min(1,bq.t*2.5)),Math.sin(bq.t*40)*.02*(1-u),W-24);if(bq.sub){g.font='italic 700 14px Georgia,serif';g.textAlign='center';g.lineWidth=4;g.strokeStyle=ink;g.fillStyle='#fff';g.strokeText(bq.sub,W/2,H*.33+48);g.fillText(bq.sub,W/2,H*.33+48);}}g.restore();}
  if(mode==='ko'&&modeT>1.9){const t=modeT-1.9,u=Math.min(1,t/.5);g.save();g.fillStyle=`rgba(0,0,0,${Math.min(.55,t*.6)})`;g.fillRect(0,0,W,H);bigText(g,'KNOCKOUT!',W/2,H*.36,64,'#ffd23c',pop(u)*(1+Math.sin(t*6)*.02),-.05,W-20);
   if(t>.6){g.globalAlpha=clamp((t-.6)*2,0,1);g.font='italic 700 14px Georgia,serif';g.textAlign='center';g.fillStyle='#fff';wrapText(g,'“'+boss.koLine+'”',W/2,H*.36+52,W-50,17);g.font='bold 13px Arial';g.fillStyle='#ffe9b0';const dmg=Math.round(sum(p=>p.dmg)),par=sum(p=>p.parries),tm=duration;g.fillText(`DAMAGE ${dmg}   PARRIES ${par}   TIME ${Math.floor(tm/60)}:${String(tm%60).padStart(2,'0')}`,W/2,H*.36+120);}g.restore();}
  if(mode==='lose'&&modeT>.5){const t=modeT-.5;g.save();g.fillStyle=`rgba(40,0,0,${Math.min(.6,t*.7)})`;g.fillRect(0,0,W,H);bigText(g,'DEFEAT',W/2,H*.36,70,'#ff4b3a',pop(Math.min(1,t*1.5)),.04,W-20);g.globalAlpha=clamp(t,0,1);g.font='italic 700 14px Georgia,serif';g.textAlign='center';g.fillStyle='#fff';wrapText(g,'“'+boss.quote+'”',W/2,H*.36+56,W-50,17);g.font='bold 13px Arial';g.fillStyle='#ffd0c0';g.fillText(`${boss.name} stands (${Math.round(B.hp/B.max*100)}% HP left)`,W/2,H*.36+110);g.restore();}
  if(says.t>0&&mode==='fight'){const a=clamp(says.t*3,0,1);g.save();g.globalAlpha=a;g.font='italic 700 12px Georgia,serif';const tw=Math.min(W-30,g.measureText(says.text).width+22),bx=clamp(B.drawX,tw/2+8,W-tw/2-8),by=B.drawY+128*bs;g.fillStyle='#fffbe8';g.strokeStyle=ink;g.lineWidth=2.5;g.beginPath();g.rect(bx-tw/2,by,tw,24);g.fill();g.stroke();g.fillStyle='#222';g.textAlign='center';g.textBaseline='middle';g.fillText(says.text,bx,by+12.5,tw-10);g.restore();}}
 function wrapText(g,str,cx,y0,maxW,lh){const words=str.split(' ');let line='',y=y0;g.textAlign='center';g.textBaseline='middle';for(const w of words){const t=line?line+' '+w:w;if(g.measureText(t).width>maxW&&line){g.fillText(line,cx,y);line=w;y+=lh;}else line=t;}if(line)g.fillText(line,cx,y);}
 function draw(){if(!scene)return;x.setTransform(1,0,0,1,0,0);scene.draw(x,T,mode==='intro'?2.5:1+B.phase*.25,ox,ox+W*k);
  x.save();x.translate(ox,oy);x.scale(k,k);
  if(shakeMag>.2){x.translate((Math.random()-.5)*shakeMag,(Math.random()-.5)*shakeMag);}
  x.beginPath();x.rect(-4,-4,W+8,H+8);x.clip();
  drawBoss(x);
  for(const w of warns)drawWarn(x,w);for(const h of hazards)drawHazard(x,h);
  for(const m of minions){if(m.hidden||m.guess)continue;x.save();x.translate(m.x,m.y);const pl=m.flash>0?1.15:1;x.scale(pl,pl);if(m.kind==='hound'||m.kind==='rocket'||m.kind==='glove'){}drawMinion(x,m,T);if(m.max>6&&m.hp<m.max){x.fillStyle='rgba(0,0,0,.6)';x.fillRect(-m.r,m.r+6,m.r*2,4);x.fillStyle='#ff5a5a';x.fillRect(-m.r,m.r+6,m.r*2*m.hp/m.max,4);}x.restore();}
  for(const p of P)if(p.hp<=0&&p.ghost>0)drawGhost(x,p);
  for(const p of P)drawBeam(x,p);
  for(const b of bullets)drawBullet(x,b);drawPShots(x);
  for(const p of P)if(p.hp>0)drawPlane(x,p);
  for(const e of fx){const u=e.life/e.max;if(e.k==='p'){x.globalAlpha=Math.min(1,u*1.6);x.fillStyle=e.col;x.beginPath();x.arc(e.x,e.y,e.r*(.4+u*.6),0,TAU);x.fill();}
   else if(e.k==='r'){x.globalAlpha=u;x.strokeStyle=e.col;x.lineWidth=5*u+1;x.beginPath();x.arc(e.x,e.y,e.r*(1-u)+6,0,TAU);x.stroke();}
   else{x.globalAlpha=Math.min(1,u*2);x.font=`900 ${e.size}px "Arial Black",Arial`;x.textAlign='center';x.textBaseline='middle';x.lineWidth=4;x.strokeStyle=ink;x.strokeText(e.str,e.x,e.y);x.fillStyle=e.col;x.fillText(e.str,e.x,e.y);}x.globalAlpha=1;}
  drawBossBar(x);drawHud(x);drawCinematics(x);
  if(flashWhite>0){x.fillStyle=`rgba(255,255,255,${Math.min(.85,flashWhite)*(reduce?.4:1)})`;x.fillRect(-10,-10,W+20,H+20);}
  x.restore();
  // curtains over the margins + film overlay
  x.setTransform(1,0,0,1,0,0);if(ox>1){x.fillStyle='rgba(8,4,2,.45)';x.fillRect(0,0,ox,ch);x.fillRect(cw-ox,0,ox,ch);x.fillStyle=pal[2];x.globalAlpha=.7;x.fillRect(ox-2,0,2,ch);x.fillRect(cw-ox,0,2,ch);x.globalAlpha=1;}
  if(oy>1){x.fillStyle='rgba(8,4,2,.62)';x.fillRect(0,0,cw,oy);x.fillRect(0,ch-oy,cw,oy);}
  if(!vignette){vignette=document.createElement('canvas');vignette.width=Math.ceil(W*k);vignette.height=Math.ceil(H*k);const vg=vignette.getContext('2d'),gr=vg.createRadialGradient(vignette.width/2,vignette.height/2,Math.min(vignette.width,vignette.height)*.4,vignette.width/2,vignette.height/2,Math.max(vignette.width,vignette.height)*.72);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(20,8,0,.5)');vg.fillStyle=gr;vg.fillRect(0,0,vignette.width,vignette.height);}
  x.drawImage(vignette,ox,oy);
  if(!reduce){x.fillStyle='rgba(255,230,180,.035)';x.fillRect(ox,oy,W*k,H*k);if(Math.random()<.12){x.fillStyle='rgba(255,255,255,.12)';x.fillRect(Math.random()*cw,0,1,ch);}}}
 // ---- online co-op (see the top of the file)
 // One attack world, run by player 1's phone (the director, every bullet, hazard, warning and minion, the boss's moves). Every
 // thing it makes gets an id and goes to the other phone in order with its state at send time (`spawned` → ops 'b'/'h'/'w'/'m');
 // the other phone rebuilds it, moves it on by the time since (hT = its estimate of player 1's clock, `catchUp`) and flies
 // plain bullets itself (same field width, so they fly the same way); bullets with a step get position fixes (sb), minions
 // and the boss follow snapshots. Each phone judges only its own plane and tells the other what its plane took out:
 // 'bx' a bullet that hit it or that its super cleared, 'pa' a parried bullet, 'mh' minion damage (player 1's phone calls
 // the kill: 'mk'), 'd' boss damage (player 1's phone owns the HP), 'rv' a revive. Phase / KO / defeat ride the same stream
 // ('ph','ko','lose'), so a bullet made after a phase change is never cleared by it.
 let netDmg=0,nid=0,ops=[],opN=0,hT=0,lat=.05,lastMsgAt=0,theirW=0,pingT=0,mapT=0;const MODES=['intro','fight','phase','ko','lose'],mh=new Map(),pings=[],ids=new Map();
 function netOp(o){if(net)ops.push(o);}
 function spawned(kind,o){if(!net||!host)return;o._id=++nid;ids.set(nid,o);ops.push([kind,o]);}
 function netGone(b){if(net&&b._id){ops.push(['bx',b._id]);ids.delete(b._id);}}
 const r2=v=>Math.round(v*100)/100;
 // a bullet / hazard / warning / minion as plain data: functions dropped (steps by name), numbers rounded, a warning that
 // follows a plane names it by its index
 function ser(o){const d={};for(const k in o){const v=o[k];if(k==='_id'||k==='onDie'||k==='hits')continue;
   if(k==='step'){const n=STEP_NAME.get(v);if(n)d.step=n;continue;}
   if(k==='follow'&&v&&typeof v==='object'){if(Number.isInteger(v.i))d.fp=v.i;continue;}
   if(typeof v==='function'||v===undefined)continue;d[k]=typeof v==='number'?Math.round(v*100)/100:v;}return d;}
 function live(kind,o){return (kind==='b'?bullets:kind==='h'?hazards:kind==='w'?warns:minions).includes(o);}
 // the partner's plane: eased toward its snapshots; it fires for show only
 function stepPuppet(p,dt){const k2=1-Math.exp(-dt*14);if(p.nx!=null){p.x+=(p.nx*W-p.x)*k2;p.y+=(p.ny-p.y)*k2;p.gx+=(p.ngx*W-p.gx)*k2;p.gy+=(p.ngy-p.gy)*k2;}
  p.inv=Math.max(0,p.inv-dt);p.parryT=Math.max(0,p.parryT-dt);if(p.sup>0)p.sup-=dt;
  p.fire-=dt;if(p.hp>0&&p.fire<=0&&(mode==='fight'||mode==='phase')){p.fire=.15;const ca=Math.cos(p.aim),sa=Math.sin(p.aim);for(const ox2 of [-7,7])pshots.push({x:p.x-sa*ox2+ca*18,y:p.y+ca*ox2+sa*18,vx:ca*900,vy:sa*900,o:p.i,dmg:0,r:4});}}
 function netPack(){const p=P[me],o={p:[r2(p.x/W),Math.round(p.y),r2(p.aim),p.hp,r2(p.ghost),r2(p.gx/W),Math.round(p.gy),r2(Math.max(0,p.sup)),r2(p.supT),p.inv>0?1:0,p.parryT>0?1:0,Math.round(p.meter)]};
  if(gw){if(netDmg>0){ops.push(['d',Math.round(netDmg*100)/100]);netDmg=0;}for(const [id,dm] of mh)ops.push(['mh',id,r2(dm)]);mh.clear();
   const now=performance.now();if(now-pingT>2000){pingT=now;ops.push(['pi',Math.round(now)]);}}
  if(host){o.b=[Math.round(B.hp*10)/10,B.phase,MODES.indexOf(mode)];o.T=Math.round(T*1000)/1000;
   o.B=[r2(B.x),r2(B.y),B.pose,r2(B.poseT),r2(B.hidden),B.deadR|0,B.flash>0?1:0];
   o.mn=minions.filter(m=>m._id).map(m=>[m._id,r2(m.x),r2(m.y),r2(m.hp),m.hidden?1:0,r2(m.ang||0)]);
   o.sb=bullets.filter(b=>b._id&&(b.step||b.homeBoss)).map(b=>[b._id,r2(b.x),r2(b.y),r2(b.vx),r2(b.vy)]);
   // let go of ids that are gone (bullets that flew off, expired hazards...)
   if(T-mapT>2){mapT=T;const keep=new Set([...bullets,...hazards,...warns,...minions]);for(const [id,v] of ids)if(!keep.has(v))ids.delete(id);}}
  if(ops.length){const l=[];for(const op of ops){const k=op[0];if(k==='b'||k==='h'||k==='w'||k==='m'){if(live(k,op[1]))l.push([k,op[1]._id,ser(op[1])]);}else l.push(op);}ops=[];if(l.length)o.o={n:++opN,l};}
  return o;}
 // move something just rebuilt here on by t seconds (it was made t ago on player 1's phone); nothing is judged on the way
 function catchUp(kind,o,t){if(!(t>0))return;const st=1/30;
  if(kind==='w'){o.t+=t;return;}
  if(kind==='m'){o.age+=t;return;}
  for(let u=0;u<t;u+=st){const dt=Math.min(st,t-u);
   if(kind==='b'){o.age+=dt;if(o.step)o.step(F,o,dt);if(o.ax)o.vx+=o.ax*dt;if(o.ay)o.vy+=o.ay*dt;o.x+=o.vx*dt;o.y+=o.vy*dt;
    if(o.bounce){if(o.x<o.r){o.x=o.r;o.vx=Math.abs(o.vx);o.bounce--;}else if(o.x>W-o.r){o.x=W-o.r;o.vx=-Math.abs(o.vx);o.bounce--;}if(o.y<o.r&&o.vy<0)o.vy=Math.abs(o.vy);}}
   else if(kind==='h')stepHazard(o,dt,false);}}
 function makeFrom(kind,id,d,t){const o=Object.assign({},d);if(d.step)o.step=STEPS[d.step]||null;if(kind==='w'&&Number.isInteger(d.fp))o.follow=P[d.fp]||null;delete o.fp;o._id=id;
  if(kind==='b'){if(bullets.length>520)return;bullets.push(o);}else if(kind==='h')hazards.push(o);else if(kind==='w')warns.push(o);else{o.tx=o.x;o.ty=o.y;o.step=null;minions.push(o);}
  ids.set(id,o);catchUp(kind,o,t);}
 function dropBullet(id,fxOn){const b=ids.get(id);ids.delete(id);if(!b)return;const i=bullets.indexOf(b);if(i<0)return;if(fxOn)burst(b.x,b.y,'#fff',2,60,.25,2);bullets.splice(i,1);}
 // the other phone's ops, in the order they happened there
 function applyOps(l,age){for(const op of l){if(!Array.isArray(op))continue;const k=op[0];
   if(gw){if(k==='b'||k==='h'||k==='w'||k==='m'){if(op[2]&&typeof op[2]==='object')makeFrom(k,op[1],op[2],age);continue;}
    if(k==='ph'){if(op[1]>B.phase&&mode!=='ko'&&mode!=='lose')startPhase(op[1]);continue;}
    if(k==='ko'){if(mode!=='ko'){B.hp=0;startKO();}continue;}
    if(k==='lose'){if(mode!=='lose'&&mode!=='ko')startLose();continue;}
    if(k==='clr'){bullets.length=0;hazards.length=0;warns.length=0;continue;}
    if(k==='mk'){const m=ids.get(op[1]);ids.delete(op[1]);const i=m?minions.indexOf(m):-1;if(i<0)continue;minions.splice(i,1);
     if(!op[3]){burst(m.x,m.y,'#ffd23c',12,170,.55,3);ring(m.x,m.y,'#ffd23c',m.r*2.6,.35);sfx('kill');if(op[2]===me){P[me].kills++;P[me].meter=Math.min(100,P[me].meter+6);}}continue;}
    if(k==='say'){says.text=String(op[1]||'');says.t=2.4;continue;}
    if(k==='bn'){banner(op[1],op[2],op[3],op[4]);continue;}
    if(k==='sfx'){sfx(op[1]);continue;}
    if(k==='sh'){shake(+op[1]||0);continue;}
    if(k==='po'){const rtt=(performance.now()-op[1])/1000;if(rtt>=0&&rtt<5){pings.push(rtt);if(pings.length>8)pings.shift();lat=Math.min(...pings)/2;}continue;}}
   else{if(k==='d'){if(mode==='fight')hitBoss(+op[1]||0,B.x,B.y,them,false,true);continue;}
    if(k==='mh'){const m=ids.get(op[1]);if(m&&minions.includes(m)&&!m.dead)damageMinion(m,+op[2]||0,them);continue;}
    if(k==='pi'){ops.push(['po',op[1]]);continue;}}
   if(k==='bx'){dropBullet(op[1],true);continue;}
   if(k==='pa'){const b=ids.get(op[1]);if(!b||!bullets.includes(b))continue;burst(b.x,b.y,'#ff9ae0',16,220,.6,3);ring(b.x,b.y,'#ff9ae0',50,.45);
    if(op[2]){b.friendly=true;b.pink=false;b.reflect=false;b.step=null;b.homeBoss=true;b.remote=true;b.dmg=70;b.col='#ffe66a';b.kind='big';}else dropBullet(op[1],false);continue;}
   if(k==='rv'){const p=P[me];if(p.hp<=0&&p.ghost>0)revive(p,P[them]);continue;}}}
 function netUnpack(d){if(!d)return;const q=P[them],a=d.p;
  if(Array.isArray(a)){const first=q.nx==null;q.nx=a[0];q.ny=a[1];q.aim=a[2];q.hp=a[3];q.ghost=a[4];q.ngx=a[5];q.ngy=a[6];if(a[7]>0&&q.sup<=0){q.sup=a[7];q.supT=a[8]||q.sup;}q.inv=a[9]?Math.max(q.inv,.3):q.inv;if(a[10])q.parryT=.45;q.meter=a[11];q.out=q.hp<=0&&q.ghost<=0;
   if(first){q.x=q.tx=q.nx*W;q.y=q.ty=q.ny;}
   if(host&&mode==='fight'&&!alive().length)startLose();}
  // this phone's estimate of player 1's clock: its stamp + half the round trip. Messages held up by a stall arrive in a
  // burst and never pull the clock back; a lone late one pulls it back a little (player 1's phone pauses in hit-stops)
  let age=0;
  if(gw&&Number.isFinite(d.T)){const now=performance.now(),tgt=d.T+lat,lone=now-lastMsgAt>25;lastMsgAt=now;if(tgt>hT)hT=tgt;else if(lone)hT+=(tgt-hT)*.2;age=Math.max(0,Math.min(8,hT-d.T));}
  if(d.o&&Array.isArray(d.o.l))applyOps(d.o.l,age);
  if(!gw)return;
  // player 1's phone owns the boss's HP, its moves and the minions; this phone follows (ops first: they came before this state)
  if(Array.isArray(d.b)){const [hp,ph,md]=d.b;B.hp=Math.min(B.hp,hp);if(ph>B.phase&&mode!=='ko'&&mode!=='lose')startPhase(ph);
   if(MODES[md]==='ko'&&mode!=='ko'){B.hp=0;startKO();}else if(MODES[md]==='lose'&&mode!=='lose'&&mode!=='ko')startLose();}
  if(Array.isArray(d.B)&&mode!=='intro'){const [bx,by,pose,poseT,hid,deadR,fl]=d.B;B.nx=bx;B.ny=by;if(pose!==B.pose||poseT>B.poseT+.1){B.pose=pose;B.poseT=poseT;}B.hidden=hid;B.deadR=deadR;if(fl)B.flash=Math.max(B.flash,.07);}
  if(Array.isArray(d.mn))for(const [id,mx,my,hp,hid,ang] of d.mn){const m=ids.get(id);if(!m)continue;m.tx=mx;m.ty=my;m.shp=hp;m.hp=Math.min(m.hp,hp);m.hidden=!!hid;m.ang=ang;}
  if(Array.isArray(d.sb))for(const [id,bx,by,vx,vy] of d.sb){const b=ids.get(id);if(!b||b.remote)continue;b.vx=vx;b.vy=vy;const px=bx+vx*age,py=by+vy*age;if(Math.hypot(px-b.x,py-b.y)>60){b.x=px;b.y=py;}else{b.x+=(px-b.x)*.5;b.y+=(py-b.y)*.5;}}
  if(T-mapT>2){mapT=T;const keep=new Set([...bullets,...hazards,...warns,...minions]);for(const [id,v] of ids)if(!keep.has(v))ids.delete(id);}}
 // the other phone's minions: shown where player 1's phone has them, hit here, killed there ('mk'); a kill guessed here that
 // player 1's phone doesn't confirm within 1.5 s shows the minion again
 function updateNetMinions(dt){const k2=1-Math.exp(-dt*14);for(const m of minions){m.age+=dt;m.flash=Math.max(0,m.flash-dt);if(m.tx!=null){m.x+=(m.tx-m.x)*k2;m.y+=(m.ty-m.y)*k2;}
   if(m.guess&&T-m.guess>1.5){m.guess=0;m.dead=false;m.hp=Math.max(1,m.shp||1);}
   if(!m.hidden&&!m.guess&&mode==='fight')for(const p of P)if(p.hp>0&&Math.hypot(p.x-m.x,p.y-m.y)<m.r+PR+2)hurt(p,'minion:'+m.kind);}}
 // the boss on the other phone glides to where player 1's phone has it
 function netBoss(dt){if(!gw||B.nx==null||mode==='intro')return;const k2=1-Math.exp(-dt*12);B.tw=null;if(mode==='fight'||mode==='phase')T+=(hT-T)*Math.min(1,dt*2);
  if(Math.hypot(B.nx-B.x,B.ny-B.y)>220){B.x=B.nx;B.y=B.ny;}else{B.x+=(B.nx-B.x)*k2;B.y+=(B.ny-B.y)*k2;}}
 if(net){nf=netField(s,{hz:20,pack:netPack,unpack:(i,d)=>netUnpack(d),onEvent:e=>{if(Number.isFinite(e.pw))theirW=e.pw;}});
  // both phones fly one field: the narrower of the two screens' own widths (the wider phone shows it with curtains)
  // (the screen's own width is read once the canvas has its real size: a few frames in)
  let myW=0;
  void (async()=>{for(let i=0;i<6||!(cw>0&&ch>0);i++){await new Promise(r=>requestAnimationFrame(r));if(!s.alive)return;}
   myW=clamp(Math.round(H*cw/ch),420,W_MAX);nf.event({pw:myW});
   while(!theirW&&s.alive&&!nf.gone)await new Promise(r=>setTimeout(r,30));if(!s.alive)return;
   netW=Math.min(myW,theirW||myW);cw=-1;layout();await nf.start('go');hT=T;netReady=true;})();}
 // ---- main loop
 s.debug={get boss(){return B;},get players(){return P;},get bullets(){return bullets;},get minions(){return minions;},get hazards(){return hazards;},get mode(){return mode;},get time(){return T;},bossId:boss.id,tier,autopilot:[false,false],
  setBossHp(v){B.hp=Math.max(1,Math.min(B.max,v));if(B.phase<2&&B.hp<=thresholds[B.phase]&&mode==='fight')startPhase(B.phase+1);},
  skipIntro(){if(mode==='intro'){modeT=Math.max(modeT,introEnd);}},
  killBoss(){if(mode==='fight'){B.hp=1;hitBoss(5,B.x,B.y,0,true);}},killPlayers(){for(const p of P){p.inv=0;p.sup=0;p.hp=1;hurt(p);}},
  F,act,hurt,get duration(){return duration;},get hits(){return log.hits;},get hitSrc(){return log.src;},get wide(){return wide;},steps:1,immortal:false,nodraw:false,holdPhase:false,get dmg(){return sum(p=>p.dmg);}};
 let msAvg=0;s.debug.ms=()=>msAvg;
 // online test bot: the autopilot flies this phone's plane
 if(net)s.debug.bot=()=>{if(!s.debug.autopilot[me]){s.debug.autopilot[me]=.12;return 'drive';}return '';};
 // (online there is no hit-stop: it would hold back one phone's copy of the shared attack world)
 s.frame(dt0=>{layout();if(finished)return;
  if(net){if(!netReady){draw();return;}nf.tick(dt0);if(gw)hT+=dt0*timeScale;}
  const t0=performance.now();if(hitstop>0&&!net){hitstop-=dt0;draw();return;}hitstop=0;for(let j=0,n=Math.max(1,s.debug.steps|0);j<n&&!finished;j++)update(dt0,dt0*timeScale);s.setScores(P.map(p=>Math.round(p.dmg+p.parries*50+p.kills*10)));
  const pct=Math.round(B.hp/B.max*100);s.status(`BOSS FIGHT · ${boss.name} · phase ${B.phase+1}/3 · ${pct}% HP · `+P.map((p,i)=>s.players[i].name+' '+(p.hp>0?'♥'.repeat(p.hp):p.ghost>0?'👻 '+Math.ceil(p.ghost)+'s':'💤')).join(' / '));
  if(finished||s.debug.nodraw)return;draw();msAvg+=(performance.now()-t0-msAvg)*.05;});
}
Object.assign(exports,{bossfight});
