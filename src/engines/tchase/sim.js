// Judgment Day Chase simulation (no drawing, Node-testable): makeWorld(opts) + step(w,dt,input).
// Top-down road, y = distance forward. The camera cruises at w.speed; the player rides inside a box around the cruise
// line (P.rel = how far ahead of it). Enemies have their own world speed. Fairness rules (owner: cops came from the
// bottom and you died at once): everything that comes from behind shows a warning arrow first and drives in slowly,
// hits cost health instead of a life, and there is a short shield at the start and after big hits.
const {seededRandom,clamp}=require("src/utils.js");
const D=require("src/engines/tchase/data.js");
const {makeCourse}=require("src/engines/tchase/road.js");

const WARN=1.4;            // seconds a warning shows before a chaser drives in from behind
const REL=[-170,260];      // how far behind/ahead of the cruise line the player may ride
const lerp=(a,b,t)=>a+(b-a)*t;

function makeWorld({stage=0,seed='x',run=null,loop=0,viewAhead=640,viewBehind=260}={}){
 const st=D.STAGES[stage%D.STAGES.length],course=makeCourse(st,seed+':'+stage+':'+loop),rand=seededRandom(seed+':tcsim:'+stage+':'+loop);
 const veh=D.VEHICLES[st.vehicle],cards=run?.cards||{};
 const maxHp=veh.hp+30*(cards.armor|0);
 const P={x:course.road(0).c,y:0,rel:0,tx:null,trel:null,vx:0,vrel:0,yaw:0,hp:run?Math.min(maxHp,Math.max(run.hp|0,maxHp*.6)):maxHp,maxHp,veh:st.vehicle,
  gun:run?.gun&&D.GUNS[run.gun]?run.gun:veh.gun,fireT:0,spin:0,grenades:Math.min(3+2*(cards.m79|0),run?.grenades??3),gMax:3+2*(cards.m79|0),
  nitro:run?.nitro??60,nitroOn:false,shieldT:0,shieldCD:0,invT:2.5,air:0,airT:0,slowT:0,freeze:0,smoke:0,oilT:4,rocketT:3,sideT:1,
  dead:false,hitT:0,ramT:0};
 const w={st,stage,loop,course,rand,seed,t:0,P,cards,
  speed:st.speed*(1+.08*loop),camY:0,dist:0,progress:0,heat:st.heat[0]*(1+.25*loop),
  E:[],B:[],EB:[],G:[],R:[],O:[],K:[],fx:[],decals:[],pops:[],warns:[],events:[],
  score:run?.score|0,stageScore:0,combo:1,comboT:0,kills:0,takedowns:0,near:0,
  phase:'play',boss:null,bossDone:false,outro:null,slow:1,slowT:0,shake:0,flash:0,banner:null,
  cardOffer:null,rigDone:false,spawnT:1.2,staticAt:2600,uid:1,viewAhead,viewBehind,
  log:[]};
 return w;}

// ------------------------------------------------------------------ helpers
const nid=w=>w.uid++;
function pop(w,text,x,y,col='#fff',big=false){w.pops.push({text,x,y,col,big,t:0,life:big?1.6:1});}
function burst(w,x,y,kind,n=12,o={}){for(let i=0;i<n;i++){const a=w.rand()*6.283,v=(o.v||160)*(.3+w.rand());w.fx.push({kind,x,y,vx:Math.cos(a)*v+(o.vx||0),vy:Math.sin(a)*v+(o.vy||0),t:0,life:(o.life||.6)*(.6+w.rand()*.6),r:(o.r||3)*(.6+w.rand()*.8),spin:w.rand()*6});}}
function boom(w,x,y,size=1){w.fx.push({kind:'boom',x,y,vx:0,vy:w.speed*.5,t:0,life:.75*size+.15,r:46*size});burst(w,x,y,'fire',18*size|0,{v:220*size,life:.7,r:6*size,vy:w.speed*.5});burst(w,x,y,'smoke',10*size|0,{v:90,life:1.4,r:12*size,vy:w.speed*.6});burst(w,x,y,'debris',10*size|0,{v:320*size,life:.9,r:3});
 w.decals.push({kind:'scorch',x,y,r:34*size});w.shake=Math.max(w.shake,8*size);w.flash=Math.max(w.flash,.25*size);w.log.push(['boom',size]);}
function addScore(w,pts,x,y,label){if(pts>0){pts=Math.round(pts*w.combo);w.combo=Math.min(8,w.combo+(label==='TAKEDOWN'?1:.5));w.comboT=3;}w.score+=pts;w.stageScore+=pts;
 if(x!=null)pop(w,(label?label+' ':'')+(pts>0?'+':'')+pts,x,y,pts<0?'#ff6b6b':label?'#ffd23f':'#fff',!!label);}
function hurtPlayer(w,dmg,src){const P=w.P;if(P.dead||dmg<=0)return;if(P.invT>0)return;
 if(P.shieldT>0){P.shieldT=0;P.invT=.5;pop(w,'SHIELD!',P.x,P.y+40,'#c58bff');w.log.push(['shield']);return;}
 const isRam=String(src).startsWith('ram');if(w.cards.ram&&isRam)dmg*=.5;if(P.nitroOn&&isRam)dmg*=.5;
 P.hp-=dmg;P.hitT=.35;w.shake=Math.max(w.shake,Math.min(14,dmg*.7));w.combo=Math.max(1,w.combo-1);
 if(dmg>=12)P.invT=.9;else P.invT=Math.max(P.invT,src==='bullet'?.3:.18);w.log.push(['hurt',src,dmg]);
 if(P.hp<=0){P.hp=0;P.dead=true;boom(w,P.x,P.y,1.6);w.phase='dead';w.slow=.3;w.slowT=1.2;w.log.push(['dead',src]);}}

// ------------------------------------------------------------------ spawning
function foe(w,type,x,y,v,o={}){const F=D.FOES[type];const e={id:nid(w),type,x,y,v,vx:0,w:F.w,h:F.h,hp:F.hp*(1+.35*w.loop)*(o.hpK||1),max:F.hp*(1+.35*w.loop)*(o.hpK||1),ram:F.ram,state:'go',t:0,cd:1+w.rand()*1.5,lane:x,dead:false,flash:0,yaw:0,boss:!!F.boss,col:o.col,hit:0,...o};w.E.push(e);return e;}
function warnBehind(w,type,x,o={}){w.warns.push({type,x,t:WARN,o});w.log.push(['warn',type]);}
function lanes(w,y){const r=w.course.road(y),n=r.lanes,lw=r.w/n;return Array.from({length:n},(_,i)=>r.c-r.w/2+lw*(i+.5));}
function freeLane(w,y,avoid=60){const L=lanes(w,y);for(let k=0;k<6;k++){const x=L[w.rand()*L.length|0];if(!w.E.some(e=>Math.abs(e.y-y)<120&&Math.abs(e.x-x)<avoid))return x;}return null;}
function threat(w){let s=0;for(const e of w.E)if(!e.dead)s+={cruiser:1,moto:.7,swat:2,heli:2.4,truck:.4}[e.type]||0;return s;}
function pickMix(w){const m=w.st.mix,keys=Object.keys(m).filter(k=>!['spikes','roadblock','civ'].includes(k));let tot=0;for(const k of keys)tot+=m[k];let r=w.rand()*tot;for(const k of keys){r-=m[k];if(r<=0)return k;}return keys[0];}
function spawnStep(w,dt){const P=w.P,top=P.y+w.viewAhead+120,bot=P.y-w.viewBehind-60;
 // warnings: the chaser drives in once its arrow has shown
 for(const k of w.warns){k.t-=dt;if(k.t<=0&&!k.done){k.done=true;const type=k.type,y=w.P.y-w.viewBehind-50;
  if(type==='cruiser')foe(w,'cruiser',k.x,y,w.speed+150,{state:'chase'});
  else if(type==='moto')foe(w,'moto',k.x,y,w.speed+180,{state:'chase'});
  else if(type==='boss')spawnBoss(w,k.o.kind,k.x,y);}}
 w.warns=w.warns.filter(k=>k.t>-.4);
 if(w.boss&&!w.boss.dead&&w.boss.type!=='heliboss'&&w.boss.type!=='t1000foot'){return;}// the boss fight keeps the road clear (helicopter and foot chase bring help)
 // civilians: always some traffic ahead to weave through
 if(w.st.mix.civ){const civs=w.E.filter(e=>e.type==='civ'||e.type==='truck').length;if(civs<3+w.st.mix.civ*.6&&w.rand()<dt*2.2){const x=freeLane(w,top);if(x!=null){const big=w.rand()<.15;foe(w,big?'truck':'civ',x,top,w.speed*(.5+w.rand()*.18),{col:w.rand()*6|0,state:'cruise'});}}}
 // statics: roadblocks and spikes by distance, announced well ahead
 if(P.y>w.staticAt&&!w.boss){const m=w.st.mix,tot=(m.roadblock||0)+(m.spikes||0);if(tot){const kind=w.rand()*tot<(m.roadblock||0)?'roadblock':'spikes';placeStatic(w,kind,P.y+w.viewAhead+900);}w.staticAt=P.y+5200+w.rand()*4200-w.heat*250;}
 // chasers by heat budget
 w.spawnT-=dt;if(w.spawnT>0)return;w.spawnT=.5+w.rand()*.6;
 if(threat(w)>=w.heat)return;const type=pickMix(w);
 if(type==='cruiser'||type==='moto'){if(w.rand()<.62){const r=w.course.road(w.camY-w.viewBehind);warnBehind(w,type,clamp(P.x+(w.rand()-.5)*160,r.c-r.w/2+30,r.c+r.w/2-30));}
  else{const x=freeLane(w,top);if(x!=null)foe(w,type,x,top,w.speed*.55,{state:'ambush'});}}
 else if(type==='swat'){const x=freeLane(w,top,90);if(x!=null)foe(w,'swat',x,top,w.speed*.7,{state:'block'});}
 else if(type==='heli'&&!w.E.some(e=>e.type==='heli')){foe(w,'heli',P.x+(w.rand()-.5)*200,P.y+w.viewAhead+200,w.speed,{state:'enter',alt:1,life:22});w.banner={text:'POLICE HELICOPTER',t:2};}
}
function placeStatic(w,kind,y){const r=w.course.road(y);
 if(kind==='spikes'){const side=w.rand()<.5?-1:1;foe(w,'spikes',r.c+side*r.w/4,y,0,{w:r.w/2-20,state:'static'});w.banner={text:'SPIKE STRIP AHEAD!',t:1.8};}
 else{const n=Math.max(3,Math.round(r.w/70)),gap=w.rand()*n|0,lw=r.w/n;for(let i=0;i<n;i++){if(i===gap)continue;foe(w,'roadcar',r.c-r.w/2+lw*(i+.5),y+(i%2)*14,0,{w:Math.min(64,lw-6),state:'static',yaw:(i%2?.25:-.25)});}
  w.banner={text:'ROADBLOCK AHEAD! FIND THE GAP',t:2};}
 w.log.push(['static',kind]);}

// ------------------------------------------------------------------ bosses
function spawnBoss(w,kind,x,y){const P=w.P;let e;
 if(kind==='heliboss')e=foe(w,'heliboss',P.x,P.y+w.viewAhead+260,w.speed,{state:'enter',alt:1});
 else if(kind==='tanker'){e=foe(w,'tanker',x,y,w.speed+120,{state:'chase'});e.valves=[{dx:-14,dy:30,hp:60,max:60},{dx:14,dy:-10,hp:60,max:60},{dx:0,dy:-50,hp:60,max:60}].map(v=>({...v,hp:v.hp*(1+.35*w.loop),max:v.max*(1+.35*w.loop)}));}
 else if(kind==='t1000foot')e=foe(w,'t1000foot',x,y,w.speed+160,{state:'run',knock:0,need:3,puddle:0});
 else e=foe(w,kind,x,y,w.speed+160,{state:'chase'});
 w.boss=e;w.banner={text:D.FOES[kind].name,t:2.6,boss:true};const ry=P.y+w.viewAhead*.5;drop(w,w.course.road(ry).c-40,ry,'repair');drop(w,w.course.road(ry).c+40,ry+60,'grenade');drop(w,w.course.road(ry).c,ry+140,'grenade');w.log.push(['boss',kind]);return e;}
function startBoss(w){if(w.boss)return;const kind=w.st.boss==='heli'?'heliboss':w.st.boss;
 // clear the road for the duel (civilians stay)
 for(const e of w.E)if(e.type!=='civ'&&e.type!=='truck'&&!e.boss&&e.type!=='heli'){if(e.type==='roadcar'||e.type==='spikes'){e.dead=true;continue;}if(Math.abs(e.y-w.P.y)<w.viewAhead)wreck(w,e,false);else e.dead=true;}
 if(kind==='heliboss')spawnBoss(w,kind,w.P.x,0);else warnBehind(w,'boss',w.P.x,{kind});w.phase='boss';}

// ------------------------------------------------------------------ enemy AI
function wreck(w,e,score=true,label=null){if(e.dead)return;e.dead=true;const F=D.FOES[e.type];
 if(e.type==='moto'){burst(w,e.x,e.y,'debris',10,{v:200});burst(w,e.x,e.y,'fire',8,{v:120});w.shake=Math.max(w.shake,4);}else boom(w,e.x,e.y,e.type==='swat'||e.type==='heli'?1.4:1);
 if(score){addScore(w,F.pts,e.x,e.y,label);if(F.pts>0)w.kills++;}
 if(label==='TAKEDOWN'){w.takedowns++;w.P.nitro=Math.min(100,w.P.nitro+30);w.slow=.35;w.slowT=.55;w.log.push(['takedown',e.type]);}
 if(F.pts>0&&w.rand()<.4)drop(w,e.x,e.y);
 // a crashed car keeps burning on the road for a moment
 if(e.type!=='moto'&&e.type!=='heli')w.decals.push({kind:'wreck',x:e.x,y:e.y,r:e.w*.6,yaw:e.yaw+w.rand()-.5});}
function drop(w,x,y,kind){if(!kind){const P=w.P,r=w.rand();kind=P.hp<P.maxHp*.45&&r<.35?'repair':r<.3?'grenade':r<.55?'nitro':r<.68?'weapon':r<.75?'shield':r<.88?'repair':'cash';}
 w.K.push({id:nid(w),kind,x,y,v:w.speed*.4,t:0});}
function damageFoe(w,e,dmg,how){if(e.dead||dmg<=0)return;
 if(e.type==='t1000foot'){e.hit=.12;e.v-=how==='bullet'?14:0;e.splash=(e.splash||0)+1;if(how==='grenade'&&e.state!=='puddle'){e.state='puddle';e.t=0;e.knock++;e.v=w.speed*.2;addScore(w,1500*e.knock,e.x,e.y,'KNOCKDOWN');w.slow=.3;w.slowT=.7;w.log.push(['knock',e.knock]);if(e.knock>=e.need)bossBeaten(w,e);}return;}
 if(e.type==='tanker'){// only the valves break; bullets aim at them
  return;}
 if(e.type==='civ'||e.type==='truck'){e.hp-=dmg;e.flash=.1;if(e.hp<=0){wreck(w,e,true);}return;}
 e.hp-=dmg;e.flash=.1;if(e.hp<=0){if(e.boss)bossBeaten(w,e);else wreck(w,e,true,how==='ram'?'TAKEDOWN':null);}}
function bossBeaten(w,e){if(w.bossDone)return;w.bossDone=true;w.phase='outro';const F=D.FOES[e.type];
 if(e.type!=='t1000foot'&&e.type!=='tanker'){boom(w,e.x,e.y,2.2);setTimeout0(w,.25,()=>boom(w,e.x+20,e.y+30,1.4));setTimeout0(w,.5,()=>boom(w,e.x-24,e.y-20,1.6));e.dead=true;}
 addScore(w,F.pts||4000,e.x,e.y,'BOSS DOWN');w.slow=.25;w.slowT=1.2;w.outro={kind:e.type,t:0};w.log.push(['bossDown',e.type]);}
function setTimeout0(w,d,fn){w.events.push({t:w.t+d,fn});}

function stepFoe(w,e,dt){const P=w.P;e.t+=dt;e.flash=Math.max(0,e.flash-dt);e.hit=Math.max(0,(e.hit||0)-dt);e.cd-=dt;
 const dy=e.y-P.y,dx=P.x-e.x;
 switch(e.type){
  case 'civ':case 'truck':{// cruise in lane, now and then change lanes (blinker first)
   if(e.blink>0){e.blink-=dt;if(e.blink<=0)e.lane=e.toLane;}else if(w.rand()<dt*.12){const L=lanes(w,e.y),x=L[w.rand()*L.length|0];if(Math.abs(x-e.lane)>20&&Math.abs(x-e.lane)<90){e.toLane=x;e.blink=.9;e.bdir=Math.sign(x-e.lane);}}
   e.vx=clamp((e.lane-e.x)*2.2,-90,90);break;}
  case 'cruiser':{// chase behind you, line up, flash and ram from the side or the back
   const want=w.speed+(P.rel-0)*.0+clamp(-dy*1.6+30,-200,260);e.v=lerp(e.v,P.y>e.y-60?want:w.speed*.9,dt*1.6);
   if(e.state==='ambush'){e.v=lerp(e.v,w.speed*.55,dt);if(dy<240)e.state='chase';}
   else if(e.state==='chase'){const side=Math.sign(e.x-P.x)||1,tx=P.x+side*(P.veh==='bike'?34:48);e.vx=clamp((tx-e.x)*3,-260,260);if(Math.abs(dy)<70&&e.cd<=0){e.state='tell';e.t=0;e.rdir=-side;}}
   else if(e.state==='tell'){e.vx*=.8;if(e.t>.38){e.state='ram';e.t=0;}}
   else if(e.state==='ram'){e.vx=e.rdir*420;if(e.t>.32){e.state='chase';e.cd=1.6+w.rand()*1.2;}}
   else if(e.state==='spin'){e.yaw+=dt*9;e.v=lerp(e.v,w.speed*.6,dt*2);e.vx*=.97;if(e.t>1.3){e.state='chase';e.yaw=0;}}
   break;}
  case 'moto':{const want=w.speed+clamp(-dy*1.4+70,-200,300);e.v=lerp(e.v,want,dt*1.8);
   if(e.state==='ambush'){e.v=w.speed*.55;if(dy<260)e.state='chase';}
   const tx=P.x+(e.id%2?-70:70);e.vx=clamp((tx-e.x)*2.4+Math.sin(e.t*3)*40,-240,240);
   if(e.state==='spin'){e.yaw+=dt*10;if(e.t>1)e.state='chase',e.yaw=0;}
   if(e.cd<=0&&Math.abs(dy)<380&&e.state!=='spin'){if(!e.aim){e.aim=.45;}else{e.aim-=dt;if(e.aim<=0){e.aim=0;e.cd=2.2+w.rand();shoot(w,e,P.x+(w.rand()-.5)*30,P.y,480,3);}}}
   break;}
  case 'swat':{if(e.state==='block'){e.v=lerp(e.v,dy<280?w.speed+P.vrel*.5:w.speed*.72,dt*1.4);e.vx=clamp((P.x-e.x)*1.2,-120,120);}
   if(e.cd<=0&&Math.abs(dy)<420){if(!e.aim)e.aim=.6;else{e.aim-=dt;if(e.aim<=0){e.aim=0;e.cd=2.3;for(let i=0;i<3;i++)setTimeout0(w,i*.12,()=>!e.dead&&shoot(w,e,P.x+(w.rand()-.5)*40,P.y,520,3));}}}
   break;}
  case 'roadcar':case 'spikes':e.v=0;break;
  case 'heli':{e.life-=dt;const ty=P.y+w.viewAhead*.55;e.v=w.speed+clamp((ty-e.y)*1.5,-200,200);e.vx=clamp((P.x-e.x)*.9,-160,160);
   if(e.life<=0){e.v+=260;if(e.y>P.y+w.viewAhead+300)e.dead=true;break;}
   heliAttack(w,e,dt,false);break;}
  case 'towtruck':bossTruck(w,e,dt,dy);break;
  case 't1000foot':bossFoot(w,e,dt,dy);break;
  case 't1000bike':bossBike(w,e,dt,dy);break;
  case 'heliboss':{const ty=P.y+w.viewAhead*(e.state==='dive'?.28:.5);e.v=w.speed+clamp((ty-e.y)*1.6,-260,260);e.vx=clamp((P.x+Math.sin(e.t*.7)*120-e.x)*1.1,-220,220);heliAttack(w,e,dt,true);break;}
  case 'tanker':bossTanker(w,e,dt,dy);break;}
 // oil slicks spin chasers out
 if(e.type==='cruiser'||e.type==='moto'){for(const o of w.O)if(Math.abs(o.x-e.x)<o.r&&Math.abs(o.y-e.y)<o.r&&e.state!=='spin'){e.state='spin';e.t=0;e.v*=.7;pop(w,'SPIN OUT!',e.x,e.y,'#4fc3ff');}}}

function shoot(w,e,tx,ty,speed,dmg){const a=Math.atan2(ty-e.y,tx-e.x);w.EB.push({x:e.x,y:e.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed+w.speed,dmg,t:0,life:1.6});w.log.push(['eshot',e.type]);}
function heliAttack(w,e,dt,boss){const P=w.P;e.atk=(e.atk||0)-dt;
 if(e.strafe){const s=e.strafe;s.t+=dt;if(s.t>s.tell){// fire along the line
   if(!s.f)s.f=0;s.f-=dt;if(s.f<=0&&s.n>0){s.f=.05;s.n--;const k=1-s.n/s.total;const x=lerp(s.x0,s.x1,k),y=lerp(s.y0,s.y1,k)+w.speed*(s.t-s.tell);w.EB.push({x,y,vx:0,vy:w.speed,dmg:3,t:0,life:.12,ground:true});burst(w,x,y,'spark',2,{v:80,vy:w.speed});}
   if(s.n<=0)e.strafe=null;}
  return;}
 if(e.rockets){for(const r of e.rockets){r.t+=dt;if(r.t>=1.2&&!r.done){r.done=true;boom(w,r.x,r.y,.9);if(Math.hypot(P.x-r.x,P.y-r.y)<70&&P.air<=0)hurtPlayer(w,14,'rocket');}}e.rockets=e.rockets.filter(r=>r.t<1.4);if(!e.rockets.length)e.rockets=null;return;}
 if(e.atk>0||e.state==='enter'){if(e.state==='enter'&&e.y<P.y+w.viewAhead*.7)e.state='hover';return;}
 const r=w.rand();
 if(!boss||r<.5){// strafing run: a red line on the road first
  const ang=(w.rand()-.5)*.7,len=520,x0=P.x-Math.sin(ang)*len*.5+(w.rand()-.5)*60,y0=P.y+len*.55,x1=P.x+Math.sin(ang)*len*.5,y1=P.y-len*.45;
  e.strafe={x0,y0,x1,y1,t:0,tell:boss?.75:.95,n:boss?20:14,total:boss?20:14};e.atk=boss?1.6:3.2;w.log.push(['strafe']);}
 else if(r<.8){e.rockets=[0,1,2].map(i=>({x:P.x+(i-1)*70+P.vx*.4,y:P.y+w.speed*.0+(i-1)*30,t:-i*.15}));e.atk=2;w.log.push(['rockets']);}
 else{e.state='dive';e.atk=2.4;setTimeout0(w,2,()=>{if(!e.dead)e.state='hover';});
  if(!w.E.some(q=>q.type==='cruiser'))for(let i=0;i<2;i++)warnBehind(w,'cruiser',P.x+(i?80:-80));}}

function bossTruck(w,e,dt,dy){const P=w.P;
 if(e.state==='chase'){const ty=-150-Math.sin(e.t*.8)*40;e.v=w.speed+P.vrel+clamp((ty-dy)*1.4,-220,300);e.vx=clamp((P.x-e.x)*1.6,-200,200);
  if(e.cd<=0&&dy>-260){e.state='rev';e.t=0;e.lockX=P.x;w.log.push(['rev']);}
  if(e.hp<e.max*.5&&(e.gunT=(e.gunT??1.5)-dt)<=0){e.gunT=1.4;shoot(w,{x:e.x-12,y:e.y+30},P.x,P.y,540,5);}}
 else if(e.state==='rev'){e.v=w.speed+P.vrel-40;e.vx=clamp((e.lockX-e.x)*3,-200,200);if(e.t>.85){e.state='charge';e.t=0;}}
 else if(e.state==='charge'){e.v=w.speed+760;e.vx=0;if(e.t>.75||dy>120){e.state='back';e.t=0;}}
 else if(e.state==='back'){e.v=w.speed-160;e.vx*=.9;if(e.t>.9){e.state='chase';e.cd=1.6+w.rand()*1.4*(e.hp/e.max);}}}
function bossFoot(w,e,dt,dy){const P=w.P;
 if(e.state==='puddle'){e.v=lerp(e.v,w.speed*.25,dt*3);if(e.t>2.6){e.state='reform';e.t=0;}return;}
 if(e.state==='reform'){e.v=w.speed*.4;if(e.t>1.1){e.state='run';e.t=0;e.v=w.speed+300;}return;}
 if(e.state==='run'){const target=-70;e.v=lerp(e.v,w.speed+P.vrel+clamp((target-dy)*1.2,-120,340),dt*2.5);e.vx=clamp((P.x-e.x)*2.2,-300,300);
  if(dy>-150&&dy<-40&&e.cd<=0){e.state='crouch';e.t=0;}}
 else if(e.state==='crouch'){e.v=w.speed+P.vrel;if(e.t>.42){e.state='leap';e.t=0;e.lx=P.x;e.ly=dy;}}
 else if(e.state==='leap'){e.v=w.speed+P.vrel+420;e.vx=clamp((e.lx-e.x)*6,-500,500);if(e.t>.42){e.state='land';e.t=0;e.cd=1.2+w.rand();}}
 else if(e.state==='land'){e.v=w.speed-60;if(e.t>.5)e.state='run';}}
function bossBike(w,e,dt,dy){const P=w.P;const side=e.id%2?1:-1;
 if(e.state==='chase'){e.v=w.speed+P.vrel+clamp((-dy*1.5+10),-200,320);const tx=P.x+side*(Math.sin(e.t*1.3)>0?52:-52);e.vx=clamp((tx-e.x)*2.6,-320,320);
  if(Math.abs(dy)<55&&Math.abs(P.x-e.x)<70&&e.cd<=0){e.state='blade';e.t=0;}
  if((e.gunT=(e.gunT??2)-dt)<=0&&dy<-120){e.gunT=1.6;shoot(w,e,P.x,P.y,560,5);}}
 else if(e.state==='blade'){e.vx=clamp((P.x-e.x)*1.5,-200,200);if(e.t>.35&&!e.struck){e.struck=true;if(Math.abs(P.x-e.x)<56&&Math.abs(P.y-e.y)<60&&P.air<=0){hurtPlayer(w,11,'blade');burst(w,P.x,P.y,'spark',12);}}if(e.t>.6){e.state='chase';e.struck=false;e.cd=1.2+w.rand();}}
 else if(e.state==='spin'){e.yaw+=dt*10;if(e.t>.9){e.state='chase';e.yaw=0;}}}
function bossTanker(w,e,dt,dy){const P=w.P;const left=e.valves.filter(v=>v.hp>0).length;
 if(e.state==='chase'){const ty=-200+Math.sin(e.t*.6)*60;e.v=w.speed+P.vrel+clamp((ty-dy)*1.2,-200,300);e.vx=clamp((P.x+Math.sin(e.t*.9)*80-e.x)*1.2,-160,160);
  if(e.cd<=0&&left>0){e.state=w.rand()<.5?'rev':'side';e.t=0;e.lockX=P.x;}
  if((e.gunT=(e.gunT??1.8)-dt)<=0){e.gunT=1.5;shoot(w,{x:e.x-10,y:e.y+85},P.x,P.y,560,5);}}
 else if(e.state==='rev'){e.v=w.speed+P.vrel-30;e.vx=clamp((e.lockX-e.x)*3,-180,180);if(e.t>.9){e.state='charge';e.t=0;}}
 else if(e.state==='charge'){e.v=w.speed+700;if(e.t>.8||dy>140){e.state='back';e.t=0;}}
 else if(e.state==='side'){e.v=w.speed+P.vrel+clamp(-dy*2,-200,300);e.vx=clamp((P.x-e.x)*4,-380,380);if(e.t>1.4){e.state='back';e.t=0;}}
 else if(e.state==='back'){e.v=w.speed-150;e.vx*=.9;if(e.t>1){e.state='chase';e.cd=1.3+w.rand()*1.5;}}
 // broken valves spray liquid nitrogen behind the tanker: a freezing fog on the road
 for(const v of e.valves)if(v.hp<=0&&w.rand()<dt*14)w.fx.push({kind:'ln2',x:e.x+v.dx+(w.rand()-.5)*20,y:e.y+v.dy,vx:(w.rand()-.5)*60,vy:w.speed*.55,t:0,life:2.2,r:16+w.rand()*14});
 if(!left&&!e.m79){e.m79=true;w.banner={text:'FIRE THE M79!',t:9,boss:true};w.log.push(['m79']);}}

// ------------------------------------------------------------------ player weapons
function targets(w){const P=w.P,out=[];for(const e of w.E){if(e.dead||e.type==='civ'||e.type==='truck'||e.type==='spikes')continue;
  if(e.type==='tanker'){for(const v of e.valves)if(v.hp>0)out.push({e,v,x:e.x+v.dx,y:e.y+v.dy,pri:3});continue;}
  if(e.type==='t1000foot'&&e.state==='puddle')continue;
  const d=Math.hypot(e.x-P.x,e.y-P.y);out.push({e,x:e.x,y:e.y,pri:(e.boss?2.2:e.y<P.y?1.4:1)+(e.type==='heli'?.3:0)-d/900});}
 return out;}
function bestTarget(w,range){const P=w.P;let best=null,bs=-1e9;for(const t of targets(w)){const d=Math.hypot(t.x-P.x,t.y-P.y);if(d>range)continue;const s=t.pri*1000-d;if(s>bs){bs=s;best=t;}}return best;}
function fireGun(w,dt){const P=w.P,G=D.GUNS[P.gun],rate=G.rate*(1+.25*(w.cards.rate|0)),dmg=G.dmg*(1+.25*(w.cards.dmg|0));
 P.fireT-=dt;const t=bestTarget(w,G.range);
 if(G.spin){P.spin=t?Math.min(1,P.spin+dt/G.spin):Math.max(0,P.spin-dt*1.5);if(P.spin<1)return null;}
 if(!t||P.fireT>0)return t;P.fireT=1/rate;
 // lead the target a little
 const tvx=t.e.vx||0,tvy=(t.e.v||0)-(w.speed+P.vrel),d=Math.hypot(t.x-P.x,t.y-P.y),tt=d/G.speed,ax=t.x+tvx*tt,ay=t.y+tvy*tt;
 const a0=Math.atan2(ay-P.y,ax-P.x);
 for(let i=0;i<G.pellets;i++){const a=a0+(w.rand()-.5)*G.spread*2;w.B.push({x:P.x+Math.cos(a0)*14,y:P.y+Math.sin(a0)*14,vx:Math.cos(a)*G.speed,vy:Math.sin(a)*G.speed+w.speed+P.vrel,dmg,t:0,life:G.range/G.speed+.05,tg:t});}
 P.aim=a0;w.muzzle={t:.06,a:a0};w.log.push(['fire',P.gun]);return t;}
function throwGrenade(w){const P=w.P;if(P.grenades<=0||P.dead)return false;const t=bestTarget(w,900)||{x:P.x,y:P.y+300,e:null};
 P.grenades--;const tt=.62,ty=t.y+((t.e?.v||w.speed)-w.speed)*tt;w.G.push({x0:P.x,y0:P.y,x1:t.x+(t.e?.vx||0)*tt,y1:ty,t:0,dur:tt,tg:t.e,vy:w.speed});w.log.push(['grenade']);return true;}
function explodeGrenade(w,g){const x=g.x,y=g.y;boom(w,x,y,1.3);
 for(const e of w.E){if(e.dead)continue;const d=Math.hypot(e.x-x,e.y-y)-Math.max(e.w,e.h)*.3;if(d>95)continue;
  if(e.type==='tanker'){if(e.m79){bossBeaten(w,e);}else for(const v of e.valves)if(v.hp>0&&Math.hypot(e.x+v.dx-x,e.y+v.dy-y)<90)v.hp-=35;continue;}
  if(e.type==='spikes'){e.dead=true;continue;}damageFoe(w,e,30,'grenade');}}

// ------------------------------------------------------------------ the main step
function step(w,dt,inp={}){
 // slow motion for takedowns and big moments
 if(w.slowT>0){w.slowT-=dt;if(w.slowT<=0)w.slow=1;}const sd=dt*w.slow;w.t+=sd;
 for(const ev of w.events.splice(0))if(ev.t<=w.t)ev.fn();else w.events.push(ev);
 const P=w.P,G=D.GUNS[P.gun],V=D.VEHICLES[P.veh];
 w.shake=Math.max(0,w.shake-sd*30);w.flash=Math.max(0,w.flash-sd*1.8);if(w.banner){w.banner.t-=sd;if(w.banner.t<=0)w.banner=null;}
 if(inp.tx!=null)P.tx=inp.tx;if(inp.trel!=null)P.trel=inp.trel;
 if(w.cardOffer){return;}// paused while choosing a card
 // speed: cruise + nitro; the camera follows the cruise line
 const nOn=!!inp.nitro&&P.nitro>0&&!P.dead;P.nitroOn=nOn;if(nOn)P.nitro=Math.max(0,P.nitro-sd*(28/(1+.4*(w.cards.nitro|0))));else P.nitro=Math.min(100,P.nitro+sd*(2.2+(w.cards.nitro|0)));
 const slowK=P.slowT>0?.72:1,freezeK=1-.4*clamp(P.freeze,0,1);
 const targetSpeed=w.speed*(nOn?1.5:1)*slowK*freezeK;w.cruise=lerp(w.cruise||w.speed,targetSpeed,sd*2.5);
 if(!P.dead){w.camY+=w.cruise*sd;}else w.cruise*=.97;
 // player movement inside its box
 const top=REL[1],bot=REL[0];
 if(!P.dead){let tx=P.tx??P.x,tr=P.trel??P.rel;if(inp.dx)tx=P.x+inp.dx*260;if(inp.dy)tr=P.rel+inp.dy*220;tr=clamp(tr,bot,top);
  const ax=V.ax*(P.freeze>.5?.5:1);P.vx=clamp(P.vx+clamp((tx-P.x)*14-P.vx*5,-ax,ax)*sd,-V.sx,V.sx);if(Math.abs(tx-P.x)<1.5&&Math.abs(P.vx)<40)P.vx*=.8;
  const vr=clamp((tr-P.rel)*5,-360,360);P.vrel=lerp(P.vrel,vr,sd*8);P.rel+=P.vrel*sd;P.rel=clamp(P.rel,bot,top);
  P.x+=P.vx*sd;P.yaw=lerp(P.yaw,clamp(P.vx/V.sx,-1,1)*.35,sd*10);}
 P.y=w.camY+P.rel;w.dist=P.y;
 // walls: scrape
 const wl=w.course.walls(P.y),hw=V.w/2;
 if(P.x-hw<wl.l){P.x=wl.l+hw;if(P.vx<-60){if(Math.abs(P.vx)>300)hurtPlayer(w,1.5,'wall');burst(w,P.x-hw,P.y,'spark',4,{vy:w.speed});}P.vx=Math.abs(P.vx)*.3;}
 if(P.x+hw>wl.r){P.x=wl.r-hw;if(P.vx>60){if(Math.abs(P.vx)>300)hurtPlayer(w,1.5,'wall');burst(w,P.x+hw,P.y,'spark',4,{vy:w.speed});}P.vx=-Math.abs(P.vx)*.3;}
 if(wl.med>2&&Math.abs(P.x-wl.c)<wl.med+hw){const s=Math.sign(P.x-wl.c)||1;P.x=wl.c+s*(wl.med+hw);if(Math.abs(P.vx)>300)hurtPlayer(w,1.5,'wall');P.vx=s*Math.abs(P.vx)*.3;burst(w,P.x-s*hw,P.y,'spark',3,{vy:w.speed});}
 // ramps throw you in the air: over traffic, spikes and roadblocks
 if(P.air<=0&&!P.dead&&w.course.rampAt(P.x,P.y)){P.air=.85+(nOn?.25:0);P.airT=P.air;addScore(w,100,P.x,P.y+30,'AIR');w.log.push(['jump']);}
 if(P.air>0){P.air-=sd;if(P.air<=0){w.shake=Math.max(w.shake,5);burst(w,P.x,P.y,'dust',10,{vy:w.speed});w.log.push(['land']);}}
 P.invT=Math.max(0,P.invT-sd);P.hitT=Math.max(0,P.hitT-sd);P.slowT=Math.max(0,P.slowT-sd);P.freeze=Math.max(0,P.freeze-sd*.6);
 // modern chase-game health: after 4 s without a hit the car patches itself up (the regen card adds more)
 P.calm=(P.hitT>0?0:(P.calm||0)+sd);if(!P.dead&&P.calm>4)P.hp=Math.min(P.maxHp,P.hp+sd*(2.2+.8*(w.cards.regen|0)));else if(w.cards.regen&&!P.dead)P.hp=Math.min(P.maxHp,P.hp+sd*.8*w.cards.regen);
 if(w.cards.shield){P.shieldCD-=sd;if(P.shieldCD<=0&&P.shieldT<=0){P.shieldT=999;P.shieldCD=20;}}
 w.comboT-=sd;if(w.comboT<=0)w.combo=1;
 // weapons
 if(!P.dead){fireGun(w,sd);
  if(inp.grenade)throwGrenade(w);
  if(w.cards.mines){P.oilT-=sd;if(P.oilT<=0&&w.E.some(e=>(e.type==='cruiser'||e.type==='moto')&&e.y<P.y&&P.y-e.y<300)){P.oilT=5/w.cards.mines;w.O.push({x:P.x,y:P.y-30,r:34,t:0,life:6});}}
  if(w.cards.homing){P.rocketT-=sd;if(P.rocketT<=0){const t=bestTarget(w,800);if(t){P.rocketT=4/w.cards.homing;w.R.push({x:P.x,y:P.y,vx:0,vy:w.speed+400,tg:t,t:0});}}}
  if(w.cards.side){P.sideT-=sd;if(P.sideT<=0){P.sideT=.45/w.cards.side;for(const e of w.E)if(!e.dead&&e.type!=='civ'&&e.type!=='truck'&&Math.abs(e.y-P.y)<70&&Math.abs(e.x-P.x)<180){const a=Math.atan2(e.y-P.y,e.x-P.x);w.B.push({x:P.x,y:P.y,vx:Math.cos(a)*1500,vy:Math.sin(a)*1500+w.speed,dmg:.8,t:0,life:.2,tg:{e}});}}}}
 // spawning + boss
 if(w.phase==='play'){w.progress=clamp(P.y/w.st.len,0,1);const h=w.st.heat;w.heat=lerp(h[0],h[1],w.progress)*(1+.25*w.loop)+Math.min(.8,w.kills*.02);spawnStep(w,sd);
  if(!w.rigDone&&w.progress>.42&&w.stage!==1){w.rigDone=true;const x=w.course.road(P.y+w.viewAhead+200).c;foe(w,'truck',x,P.y+w.viewAhead+200,w.speed*.9,{rig:true,state:'rig',hp:9e9,max:9e9});w.banner={text:'WEAPONS RIG! DRIVE INTO THE RAMP',t:3};}
  if(P.y>=w.st.len)startBoss(w);}
 else if(w.phase==='boss'){spawnStep(w,sd);
  if(w.boss?.type==='t1000foot'&&w.rand()<sd*.3)drop(w,w.course.road(P.y+w.viewAhead).c+(w.rand()-.5)*120,P.y+w.viewAhead,'grenade');
  if(w.boss?.type==='tanker'&&w.boss.m79&&P.grenades<=0&&!w.K.some(k=>k.kind==='grenade'))drop(w,P.x,P.y+w.viewAhead*.6,'grenade');
  if(w.boss?.type==='t1000foot'&&!w.bossDone&&w.t-(w.bossT??(w.bossT=w.t))>75)bossBeaten(w,w.boss);}
 else if(w.phase==='outro'){w.outro.t+=sd;}
 // enemies
 for(const e of w.E){if(e.dead)continue;stepFoe(w,e,sd);e.y+=e.v*sd;e.x+=e.vx*sd;e.yaw=e.state==='spin'?e.yaw:lerp(e.yaw,clamp(e.vx/400,-.5,.5),sd*6);
  if(e.type!=='heli'&&e.type!=='heliboss'&&e.type!=='roadcar'&&e.type!=='spikes'){const ew=w.course.walls(e.y);
   if(e.x-e.w/2<ew.l){if(e.vx<-220&&(e.type==='cruiser'||e.type==='moto'||e.type==='swat'))wreck(w,e,true,'TAKEDOWN');e.x=ew.l+e.w/2;e.vx=Math.abs(e.vx)*.3;}
   if(e.x+e.w/2>ew.r){if(e.vx>220&&(e.type==='cruiser'||e.type==='moto'||e.type==='swat'))wreck(w,e,true,'TAKEDOWN');e.x=ew.r-e.w/2;e.vx=-Math.abs(e.vx)*.3;}
   if(ew.med>2&&Math.abs(e.x-ew.c)<ew.med+e.w/2){const s=Math.sign(e.x-ew.c)||1;e.x=ew.c+s*(ew.med+e.w/2);e.vx=s*Math.abs(e.vx)*.3;}}
  // too far behind or ahead: gone (bosses stay)
  if(!e.boss&&(e.y<P.y-w.viewBehind-500||e.y>P.y+w.viewAhead+1600))e.dead=true;}
 collide(w,sd);
 // weapons rig: drive into its ramp from behind
 for(const e of w.E)if(e.rig&&!e.dead&&!w.cardOffer){const dy=e.y-e.h/2-P.y;if(dy>0&&dy<50&&Math.abs(e.x-P.x)<e.w/2){w.cardOffer=dealCards(w,3);e.rig=false;e.state='leave';w.log.push(['rig']);}if(e.state==='leave'){e.v=w.speed+260;}}
 // bullets
 for(const b of w.B){b.t+=sd;b.x+=b.vx*sd;b.y+=b.vy*sd;if(b.t>b.life){b.dead=true;continue;}
  for(const e of w.E){if(e.dead||e.type==='spikes')continue;
   if(e.type==='tanker'){for(const v of e.valves)if(v.hp>0&&Math.abs(b.x-(e.x+v.dx))<14&&Math.abs(b.y-(e.y+v.dy))<14){v.hp-=b.dmg;b.dead=true;burst(w,b.x,b.y,'ln2',3,{v:60,vy:w.speed});if(v.hp<=0){boom(w,b.x,b.y,.7);addScore(w,1500,b.x,b.y,'VALVE');w.log.push(['valve']);}break;}if(b.dead)break;continue;}
   if(e.type==='heli'||e.type==='heliboss'){if(Math.hypot(b.x-e.x,b.y-e.y)<e.w*.45){b.dead=true;damageFoe(w,e,b.dmg,'bullet');burst(w,b.x,b.y,'spark',2,{vy:w.speed});break;}continue;}
   if(e.type==='civ'||e.type==='truck'){if(b.tg?.e!==e)continue;}// bullets aimed at the bad guys pass the traffic
   if(Math.abs(b.x-e.x)<e.w/2+2&&Math.abs(b.y-e.y)<e.h/2+2){b.dead=true;damageFoe(w,e,b.dmg,'bullet');burst(w,b.x,b.y,e.type==='t1000foot'?'metal':'spark',e.type==='t1000foot'?4:2,{vy:w.speed,v:e.type==='t1000foot'?120:80});break;}}}
 w.B=w.B.filter(b=>!b.dead);
 // enemy bullets
 for(const b of w.EB){b.t+=sd;b.x+=b.vx*sd;b.y+=b.vy*sd;if(b.t>b.life){b.dead=true;continue;}
  if(!P.dead&&P.air<=0&&Math.abs(b.x-P.x)<V.w/2+3&&Math.abs(b.y-P.y)<V.h/2+3){b.dead=true;hurtPlayer(w,b.dmg,'bullet');burst(w,b.x,b.y,'spark',4,{vy:w.speed});}}
 w.EB=w.EB.filter(b=>!b.dead);
 // grenades (lobbed arcs)
 for(const g of w.G){g.t+=sd;const k=Math.min(1,g.t/g.dur);if(g.tg&&!g.tg.dead){g.x1=lerp(g.x1,g.tg.x,sd*4);g.y1=lerp(g.y1,g.tg.y,sd*4);}g.x=lerp(g.x0,g.x1,k);g.y=lerp(g.y0+w.cruise*g.t,g.y1,k);g.z=Math.sin(k*Math.PI)*70;if(k>=1){g.dead=true;explodeGrenade(w,g);}}
 w.G=w.G.filter(g=>!g.dead);
 // homing rockets
 for(const r of w.R){r.t+=sd;const t=r.tg;if(t?.e&&!t.e.dead){const tx=t.v?t.e.x+t.v.dx:t.e.x,ty=t.v?t.e.y+t.v.dy:t.e.y,a=Math.atan2(ty-r.y,tx-r.x),sp=900;r.vx=lerp(r.vx,Math.cos(a)*sp,sd*5);r.vy=lerp(r.vy,Math.sin(a)*sp+w.speed,sd*5);
   if(Math.hypot(tx-r.x,ty-r.y)<26){r.dead=true;boom(w,r.x,r.y,.7);if(t.v)t.v.hp-=20;else damageFoe(w,t.e,6,'rocket');}}else r.vy=w.speed+700;
  r.x+=r.vx*sd;r.y+=r.vy*sd;if(r.t>3)r.dead=true;if(w.rand()<.7)w.fx.push({kind:'smoke',x:r.x,y:r.y,vx:0,vy:w.speed*.5,t:0,life:.5,r:5});}
 w.R=w.R.filter(r=>!r.dead);
 // oil, pickups
 for(const o of w.O)o.t+=sd;w.O=w.O.filter(o=>o.t<o.life);
 const mag=w.cards.magnet?220:56;
 for(const k of w.K){k.t+=sd;k.y+=k.v*sd;const d=Math.hypot(k.x-P.x,k.y-P.y);if(d<mag&&!P.dead){k.x=lerp(k.x,P.x,sd*8);k.y=lerp(k.y,P.y,sd*8);}if(d<26&&!P.dead){k.dead=true;pickUp(w,k);}if(k.y<P.y-w.viewBehind-100)k.dead=true;}
 w.K=w.K.filter(k=>!k.dead);
 // the freezing fog of liquid nitrogen
 for(const f of w.fx)if(f.kind==='ln2'&&!P.dead&&Math.hypot(f.x-P.x,f.y-P.y)<f.r+10){P.freeze=Math.min(1.5,P.freeze+sd*1.2);if(w.rand()<sd*3)hurtPlayer(w,2,'freeze');}
 // particles + decals
 for(const f of w.fx){f.t+=sd;f.x+=f.vx*sd;f.y+=f.vy*sd;f.vx*=.96;if(f.kind!=='boom'&&f.kind!=='ln2')f.vy=lerp(f.vy,w.cruise*.95,sd*2);}
 w.fx=w.fx.filter(f=>f.t<f.life);if(w.fx.length>700)w.fx.splice(0,w.fx.length-700);
 w.decals=w.decals.filter(d=>d.y>P.y-w.viewBehind-400);if(w.decals.length>120)w.decals.splice(0,w.decals.length-120);
 for(const p of w.pops){p.t+=sd;p.y+=w.cruise*sd*.9;}w.pops=w.pops.filter(p=>p.t<p.life);
 // tire marks + smoke when hurt
 if(!P.dead&&P.hp<P.maxHp*.35&&w.rand()<sd*14)w.fx.push({kind:'smoke',x:P.x+(w.rand()-.5)*10,y:P.y-V.h*.3,vx:0,vy:w.cruise*.7,t:0,life:.9,r:7});
 if(!P.dead&&Math.abs(P.vx)>V.sx*.7&&w.rand()<sd*20)w.decals.push({kind:'skid',x:P.x,y:P.y-V.h*.3,r:4});
 w.E=w.E.filter(e=>!e.dead||e===w.boss);}

function pickUp(w,k){const P=w.P;w.log.push(['pick',k.kind]);
 if(k.kind==='repair'){P.hp=Math.min(P.maxHp,P.hp+25);pop(w,'+25 REPAIR',P.x,P.y+40,'#5dff7a');}
 else if(k.kind==='grenade'){P.grenades=Math.min(P.gMax+1,P.grenades+1);pop(w,'+1 M79',P.x,P.y+40,'#ffb347');}
 else if(k.kind==='nitro'){P.nitro=Math.min(100,P.nitro+45);pop(w,'NITRO!',P.x,P.y+40,'#4fc3ff');}
 else if(k.kind==='shield'){P.shieldT=999;pop(w,'SHIELD',P.x,P.y+40,'#c58bff');}
 else if(k.kind==='cash'){addScore(w,250,P.x,P.y+40);}
 else if(k.kind==='weapon'){const i=D.GUN_ORDER.indexOf(P.gun),n=D.GUN_ORDER[(i+1+(w.rand()*(D.GUN_ORDER.length-1)|0))%D.GUN_ORDER.length];P.gun=n;P.spin=0;pop(w,D.GUNS[n].name,P.x,P.y+40,'#ffd23f',true);}}

function collide(w,dt){const P=w.P,V=D.VEHICLES[P.veh];
 for(const e of w.E){if(e.dead||e.type==='heli'||e.type==='heliboss')continue;
  const ox=(e.w+V.w)/2-Math.abs(e.x-P.x),oy=(e.h+V.h)/2-Math.abs(e.y-P.y);
  if(e.type==='t1000foot'){if(e.state==='leap'||e.state==='land'){if(ox>0&&oy>0&&P.air<=0&&!e.stabbed){e.stabbed=true;hurtPlayer(w,14,'blade');burst(w,P.x,P.y,'spark',14);pop(w,'STABBED!',P.x,P.y+40,'#ff6b6b');setTimeout0(w,.8,()=>e.stabbed=false);}}continue;}
  if(ox<=0||oy<=0){// near miss: passing close at speed
   if(!e.near&&(e.type==='civ'||e.type==='truck'||e.type==='cruiser')&&Math.abs(e.y-P.y)<(e.h+V.h)/2&&ox>-14&&ox<=0){e.near=true;w.near++;P.nitro=Math.min(100,P.nitro+6);addScore(w,50,P.x,P.y+30,'NEAR MISS');}
   continue;}
  if(P.air>0||P.dead)continue;
  if(e.type==='spikes'){if(!e.popped){e.popped=true;hurtPlayer(w,7,'spikes');P.slowT=2;pop(w,'TIRES SHREDDED!',P.x,P.y+40,'#ff6b6b');w.log.push(['spiked']);}continue;}
  if(e.rig)continue;
  // separate along the smaller overlap, trade lateral speed, damage both
  const rel=Math.abs(P.vx-e.vx)+Math.abs((w.cruise+P.vrel)-e.v)*.6,mP=V.mass*(P.nitroOn?2:1)*(w.cards.ram?1.6:1),mE=e.boss?6:e.type==='swat'||e.type==='truck'?2.2:e.type==='moto'?.5:1;
  if(ox<oy){const s=Math.sign(e.x-P.x)||1;P.x-=s*ox*mE/(mP+mE);e.x+=s*ox*mP/(mP+mE);const pv=P.vx;P.vx=lerp(P.vx,e.vx,mE/(mP+mE))-s*60;e.vx=lerp(e.vx,pv,mP/(mP+mE))+s*(120+rel*.4)*mP/mE;}
  else{const s=Math.sign(e.y-P.y)||1;if(s>0){P.rel-=oy*.6;P.vrel=Math.min(P.vrel,-120);e.v+=80*mP/mE;}else{P.rel+=oy*.6;P.vrel=Math.max(P.vrel,120);e.v-=80*mP/mE;}}
  if(e.ramT>w.t)continue;e.ramT=w.t+.8;
  const hitHard=e.state==='ram'||e.state==='charge'||e.state==='blade';if(e.state==='charge'||e.state==='ram'){e.state=e.boss?'back':'chase';e.t=0;e.cd=Math.max(e.cd,1.4);}
  const toP=hitHard?(e.ram||8)*clamp(rel/300,.6,1.2):rel>170?(e.ram||8)*.3*clamp(rel/300,.3,1):0;if(toP>0)hurtPlayer(w,toP*(e.type==='civ'?.6:1),'ram:'+e.type+(hitHard?'!':''));
  const toE=(2+rel*.012)*mP*(e.boss?.5:1)*(P.nitroOn?2.5:1);damageFoe(w,e,toE,'ram');burst(w,(P.x+e.x)/2,(P.y+e.y)/2,'spark',10,{vy:w.speed});w.log.push(['ram',e.type]);
  if(e.type==='civ'||e.type==='truck')addScore(w,-50,e.x,e.y);}
 // chasers smashing into each other and the traffic: pile-ups
 for(let i=0;i<w.E.length;i++){const a=w.E[i];if(a.dead||a.type==='heli'||a.type==='heliboss'||a.type==='spikes'||a.boss)continue;for(let j=i+1;j<w.E.length;j++){const b=w.E[j];if(b.dead||b.type==='heli'||b.type==='heliboss'||b.type==='spikes'||b.boss)continue;
  const ox=(a.w+b.w)/2-Math.abs(a.x-b.x),oy=(a.h+b.h)/2-Math.abs(a.y-b.y);if(ox<=0||oy<=0)continue;
  const s=Math.sign(b.x-a.x)||1,rel=Math.abs(a.vx-b.vx)+Math.abs(a.v-b.v)*.5;if(ox<oy){a.x-=s*ox/2;b.x+=s*ox/2;}else{const t=Math.sign(b.y-a.y)||1;a.y-=t*oy/2;b.y+=t*oy/2;const va=a.v;a.v=lerp(a.v,b.v,.5);b.v=lerp(b.v,va,.5);}
  if(rel>260){for(const e of [a,b])if(e.type==='cruiser'||e.type==='moto'||e.type==='swat')damageFoe(w,e,rel*.02,'ram');if(a.type!=='civ'&&b.type!=='civ'&&rel>360){/* both chasers */}
   if((a.type==='cruiser'||a.type==='moto')&&a.hp<=0&&!a.dead)wreck(w,a,true,'TAKEDOWN');if((b.type==='cruiser'||b.type==='moto')&&b.hp<=0&&!b.dead)wreck(w,b,true,'TAKEDOWN');}}}}

function dealCards(w,n){const have=w.cards,pool=D.CARDS.filter(c=>(have[c.id]|0)<c.max),out=[];const r=seededRandom(w.seed+':cards:'+w.stage+':'+w.loop+':'+(w.kills|0));while(out.length<n&&pool.length)out.push(pool.splice(r()*pool.length|0,1)[0]);return out;}
function takeCard(w,id){const c=D.CARDS.find(c=>c.id===id);if(!c)return;w.cards[id]=(w.cards[id]|0)+1;const P=w.P;
 if(id==='armor'){P.maxHp+=30;P.hp=P.maxHp;}if(id==='m79'){P.gMax+=2;P.grenades=Math.min(P.gMax,P.grenades+3);}
 if(id==='shield'){P.shieldT=999;P.shieldCD=20;}w.cardOffer=null;w.log.push(['card',id]);}

// a simple autopilot for tests and the 2P/online CPU-free fuzz: stays on the road, dodges, fires grenades at bosses
function bot(w,skill=.8){const P=w.P,V=D.VEHICLES[P.veh],r=w.course.road(P.y+80);let tx=r.c,tr=40,best=-1e9;
 for(let k=-4;k<=4;k++){const x=r.c+k*r.w/9;if(Math.abs(x-r.c)>r.w/2-V.w)continue;let s=-Math.abs(x-P.x)*.2;
  for(const e of w.E){if(e.dead||e.type==='heli'||e.type==='heliboss')continue;const dy=e.y-P.y;if(dy<-120||dy>420)continue;if(Math.abs(e.x-x)<(e.w+V.w)/2+18)s-=e.type==='spikes'?900:e.type==='civ'||e.type==='truck'?500:e.type==='roadcar'?800:300;}
  for(const b of w.EB)if(Math.abs(b.x-x)<20&&b.y>P.y&&b.y-P.y<220)s-=120;
  for(const e of w.E)if(e.rig&&Math.abs(e.x-x)<20)s+=600;
  for(const k of w.K)if(Math.abs(k.x-x)<30&&k.y>P.y)s+=80;
  if(s>best){best=s;tx=x;}}
 if(w.boss&&(w.boss.state==='rev'||w.boss.state==='charge'||w.boss.state==='crouch'))tx=P.x+(P.x<r.c?110:-110);
 const strafe=w.E.find(e=>e.strafe);if(strafe){const s=strafe.strafe,mx=(s.x0+s.x1)/2;tx=P.x+(P.x<mx?-120:120);}
 if(w.rand()>skill)tx+=(w.rand()-.5)*120;
 const gren=P.grenades>0&&(w.boss&&(w.boss.type!=='tanker'||w.boss.m79)&&w.rand()<.02||w.E.some(e=>e.type==='roadcar'&&e.y-P.y<500&&e.y>P.y));
 return {tx,trel:tr,nitro:P.nitro>60&&w.rand()<.5,grenade:gren};}

Object.assign(exports,{makeWorld,step,startBoss,takeCard,dealCards,throwGrenade,bot,targets,REL,WARN});
