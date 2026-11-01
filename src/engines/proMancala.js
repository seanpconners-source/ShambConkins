// Tony Hawk's Pro Mancala (game id greed-island-mancala, engine 'mancala'). The Kalah rules, CPU, online relay and
// hot-seat flow are the old Greed Island game's (strategyRules.js mancalaMove, cpuBoards pickMancala, classicBoards
// netTurns); everything seen and heard is new: a title sequence (Tony... Hawk's... Pro... Mancala... EXTREME
// EDITION!!) over original skate-punk, a skateboard-deck board with glass gems, a THPS2-style screen around it (score,
// special meter, trick strings with multipliers, COMBO!!! on every store landing, bails when you get robbed or set the
// other player up, the special trick), both players' big-head skaters riding their own halfpipes, guest skaters going by,
// and an end-of-run tally. Trick points are just for show: the stores decide the winner, exactly as before.
const {newMancala,mancalaMoves,mancalaMove}=require("src/engines/strategyRules.js");
const {isCpu,cpuHotseat}=require("src/engines/cpuKit.js");
const B=require("src/engines/cpuBoards.js");
const {netTurns}=require("src/engines/classicBoards.js");
const {fullBleed}=require("src/engines/fullBleed.js");
const {store}=require("src/state.js");
const {saveProfile}=require("src/profile.js");
const audio=require("src/audio.js");
const {USER_PORTRAITS}=require("src/data/userPortraits.js");
const A=require("src/engines/proMancalaArt.js");
const S=require("src/engines/proMancalaAudio.js");
const {thps,clamp}=A;
const TAU=Math.PI*2;
const wait=(s,ms)=>s.wait?s.wait(ms):s.delay(ms);
const pickOf=list=>list[Math.floor(Math.random()*list.length)];
const fmt=n=>Math.round(n).toLocaleString('en-US');
const ease=t=>t<.5?2*t*t:1-(-2*t+2)**2/2;

// ------------------------------------------------------------------ trick vocabulary
const FLIPS=[['Ollie',{}],['Kickflip',{flip:1}],['Heelflip',{flip:-1}],['Pop Shove-It',{shove:1}],['Varial Kickflip',{flip:1,shove:1}],['Hardflip',{flip:1,shove:-1}],
 ['360 Flip',{flip:1,shove:2}],['Impossible',{flip:1,boardSpin:1}],['Varial Heelflip',{flip:-1,shove:1}],['Double Kickflip',{flip:2}],['Inward Heelflip',{flip:-1,shove:-1}],
 ['Laser Flip',{flip:-1,shove:2}],['Triple Kickflip',{flip:3}],['Ghetto Bird',{flip:1,shove:1,spin:.5}],['Kickflip Underflip',{flip:2,shove:1}],['Hospital Flip',{flip:1.5,shove:1}]];
const GRABS=['Indy','Melon','Madonna','Benihana','Judo','Stalefish','Method','Airwalk','Crossbone','Rocket Air','Japan Air','Tailgrab'];
const GRINDS=['50-50','5-0 Grind','Nosegrind','Crooked Grind','Smith Grind','Feeble Grind','Bluntslide','Tailslide','Overcrook','Salad Grind','Suski Grind','Noseblunt'];
const SPECIALS=['THE 900','McTWIST','CHRIST AIR','KICKFLIP McTWIST','THE 1080','SACKTAP','FRONTFLIP','BARREL ROLL','HANDSTAND KICKFLIP','THE MANCALA 900','FINGERFLIP AIRWALK'];
const GOOD=['RADICAL!','BADASS!','SICK!','GNARLY!','TUBULAR!','SHRED IT!',"RIPPIN'!",'BOOYAH!','DUDE!!','HELL YEAH!','HOLY SHIT!','FUCK YEAH!','SICK AS FUCK!','GODDAMN!','SHIT-HOT!',
 'RAD AS HELL!','NO FUCKING WAY!','KILLER!','STOKED!','EPIC!','FILTHY!','STEEZY!','GNAR GNAR!','HUCK IT!','DOPE!','BALLER!','MOTHERFUCKIN RAD!','PURE SHRED!','BITCHIN!'];
const BAD=['BAIL!','SLAMMED!','EAT SHIT!','OUCH!','BRUTAL!','FACEPLANT!','DAMN SON!','YARD SALE!','SHIT!','GRAVEL RASH!','THAT HAD TO HURT!','KISS THE CONCRETE!','WHAT THE HELL WAS THAT?!'];
const COMBO_WORDS=['COMBO!!!','COMBO x3!!!','MEGA COMBO!!!!','SICK COMBO!!!!!','INSANE COMBO!!!!!!','GODLIKE COMBO!!!!!!!'];
const TAGS=['PRO MANCALA','SHAMB SK8','STORE OR DIE'];
const PCOL=['#ff3b30','#2f8bff'];

// ------------------------------------------------------------------ layout (recomputed when the screen changes)
function layout(W,H){const port=H>=W*1.05,lay={W,H,port};
 if(port){const L=Math.min(W-8,760),geo=A.deckGeometry(L),bx=W/2,by=Math.round(H*.5);lay.geo=geo;lay.bx=bx;lay.by=by;
  const topEnd=by-geo.D/2-6,botStart=by+geo.D/2+geo.edge+geo.wheel+4,hudH=Math.max(64,Math.min(110,H*.1));
  lay.panel=[{x:0,y:botStart,w:W,h:H-botStart},{x:0,y:0,w:W,h:topEnd}];
  lay.pipeRect=[{x:6,y:botStart+hudH,w:W-12,h:H-botStart-hudH-6},{x:6,y:hudH+8,w:W-12,h:topEnd-hudH-8}];
 }else{const pw=clamp(W*.24,170,300),L=Math.min(W-pw*2-16,H*.42*4.02,900),geo=A.deckGeometry(L),bx=W/2,by=Math.round(H*.56);lay.geo=geo;lay.bx=bx;lay.by=by;
  lay.panel=[{x:W-pw-4,y:0,w:pw,h:H},{x:4,y:0,w:pw,h:H}];
  lay.pipeRect=lay.panel.map(p=>({x:p.x,y:p.y+p.h*.46,w:p.w,h:p.h*.54-6}));}
 lay.pipes=lay.pipeRect.map((r,i)=>({geo:A.pipeGeo(r),tag:TAGS[i],seed:i*7+3}));
 lay.horizon=port?Math.max(30,lay.pipes[1].geo.floor-lay.pipes[1].geo.R*1.35):Math.max(40,Math.min(lay.by-lay.geo.D*1.1,H*.32));
 const hu=clamp(Math.min(W,H)/24,11,30);lay.hu=hu;
 lay.hud=lay.panel.map((p,i)=>({x:p.x+10,y:p.y+(port?(i===1?8:8):(i===0?48:10))}));
 const cw=port?Math.min(118,W*.29):Math.min(p0w(lay)*.62,150);lay.card=lay.panel.map((p,i)=>{const h=cw*1.18;return port?{x:p.x+p.w-cw-8,y:p.y+(i===1?48:10),w:cw,h}:{x:p.x+(p.w-cw)/2,y:lay.hud[i].y+hu*4.4,w:cw,h:Math.min(h,lay.pipeRect[i].y-(lay.hud[i].y+hu*4.4)-6)};});
 lay.trick=lay.panel.map((p,i)=>port?{x:W/2,y:i===1?lay.pipes[1].geo.floor-lay.pipes[1].geo.R*1.25:lay.pipes[0].geo.floor-lay.pipes[0].geo.R*1.3,w:W*.94}:{x:W/2,y:Math.max(hu*2.6,lay.by-lay.geo.D*.5-hu*3.2),w:W-p0w(lay)*2-20});
 lay.cones=port?[[W*.08,lay.by+lay.geo.D*.62,lay.hu*.9],[W*.93,lay.by-lay.geo.D*.62,lay.hu*.8]]:[[lay.bx-lay.geo.L*.55,lay.by+lay.geo.D*.75,hu],[lay.bx+lay.geo.L*.56,lay.by+lay.geo.D*.8,hu*.9]];
 return lay;}
function p0w(lay){return lay.panel?lay.panel[0].w:150;}

async function proMancala(s){
 const [c,x]=s.canvas(900,600,{fill:true});fullBleed(s,{bg:'#3d78b8'});
 let headOf=null;try{headOf=require("src/engines/broforce.js").headCanvas;}catch{}
 const charOf=i=>s.players[i]?.character||'';
 const nameOf=i=>s.players[i]?.name||('Player '+(i+1));
 const head=(i,mood)=>headOf?headOf(charOf(i),mood||'normal'):null;
 let state=newMancala(),busy=true,phase='intro',moveNo=0;const cpu=isCpu(s);
 const net=netTurns(s,{isTheirs:()=>phase==='play'&&!busy&&state.winner<0&&state.turn===s.online.remote,apply:m=>Number.isInteger(m.p)&&sow(m.p,true)}),theirs=()=>!!net&&state.turn===net.remote;
 const localTurn=()=>!(cpu&&state.turn===1)&&!theirs();
 // stones: every gem keeps its color and its little offset in the bowl
 const gr=A.rnd(9001),newStone=()=>({col:A.GEM_COLORS[Math.floor(gr()*A.GEM_COLORS.length)],jx:gr()-.5,jy:gr()-.5,rot:gr()});
 const stones=Array.from({length:14},(_,i)=>i===6||i===13?[]:Array.from({length:4},newStone)),incoming=Array(14).fill(0);
 const flyers=[],pops=[],sparks=[],waits=[];let shake=0,flash=0,T=0;
 const until=f=>new Promise(r=>waits.push({f,r}));
 // per-player THPS state (trick points are cosmetic)
 const P=[0,1].map(i=>({points:0,shown:0,meter:0,ready:false,best:0,specials:0,bails:0,combos:0,mood:'normal',moodT:0,idleT:2+i*1.7,cardKick:0,cardShake:0,tallyT:0}));
 let combo=null,banner=null,track=null,lockT=0;
 const music=S.createSoundtrack(()=>s.paused||!s.alive);
 audio.stopMusic();s.cleanup(()=>{music.stop();if(store.profile?.settings?.music)try{audio.startMusic();}catch{}});
 // skaters
 const SK=[0,1].map(i=>({ph:i*1.3,amp:1,mode:'ride',queue:[],air:null,bail:null,t:0,face:1,bd:null}));
 const npcs=[];let npcT=9;
 const guestPool=Object.keys(USER_PORTRAITS).filter(k=>k.startsWith('photo:char:')).map(k=>k.slice(11)).filter(id=>id!==charOf(0)&&id!==charOf(1));
 let lay=null,deck=null,park=null,dpr=1,layKey='';
 function relayout(){const W=s.W,H=s.H;dpr=Math.min(2,window.devicePixelRatio||1);const key=W+'x'+H+'@'+dpr;if(key===layKey)return;layKey=key;lay=layout(W,H);deck=A.makeDeck(lay.geo,dpr);park=A.makePark(W,H,dpr,lay);}
 const pitPos=i=>{const p=lay.geo.pits[i];return {x:lay.bx+p.x,y:lay.by+p.y,rx:p.rx,ry:p.ry,store:p.store};};
 const gemR=()=>lay.geo.pr*.31;
 function slot(i,k){const p=pitPos(i),r=gemR(),cap=Math.max(3,Math.floor(.62*(p.rx*p.ry)/(r*r))),layer=Math.floor(k/cap),j=k%cap+layer*.5,t=Math.sqrt((j+.5)/cap),a=j*2.39996+layer*1.1;
  return {x:p.x+Math.cos(a)*t*(p.rx-r*1.1),y:p.y+Math.sin(a)*t*(p.ry-r*1.1)-layer*r*.35};}

 // ---------------------------------------------------------------- feedback helpers
 function setMood(i,m,sec=2.4){P[i].mood=m;P[i].moodT=sec;}
 function pop(text,{x0=null,y0=null,px=null,col=null,dur=1.3,rot=null,big=false,bad=false}={}){const W=lay.W,H=lay.H,hu=lay.hu;
  const pal=bad?[['#ff4040','#a00000'],['#ff7070','#c01010']]:[['#fff35c','#ff9d00'],['#7dfcff','#1d8bff'],['#ff7ce5','#ff1f6d'],['#b6ff4a','#16b000'],['#ffffff','#ffd000']];
  pops.push({text,x:x0??W*(.12+Math.random()*.76),y:y0??H*(.12+Math.random()*.76),px:px??hu*(big?2.6:1.5+Math.random()*.7),grad:col||pickOf(pal),dur,t:0,rot:rot??(Math.random()-.5)*.5,vy:-hu*.6});
  if(pops.length>18)pops.shift();}
 function popNear(i,text,o={}){const p=pitPos(i);pop(text,{x0:p.x+(Math.random()-.5)*p.rx,y0:p.y-p.ry-lay.hu*.6,px:lay.hu*.95,dur:.9,rot:0,...o});}
 function sparkBurst(x0,y0,n=14,sp=260){for(let k=0;k<n;k++){const a=-Math.PI*(.1+Math.random()*.8),v=sp*(.4+Math.random());sparks.push({x:x0,y:y0,vx:Math.cos(a)*v*(Math.random()<.5?-1:1),vy:Math.sin(a)*v,t:0,dur:.35+Math.random()*.4});}}
 function queueTrick(i,anim){const k=SK[i];if(k.queue.length>2)k.queue.shift();k.queue.push(anim);}
 // ---------------------------------------------------------------- the combo (THPS: tricks add up, the multiplier is the trick count)
 function comboAdd(i,tricks){if(!combo||combo.p!==i||combo.phase!=='live')combo={p:i,tricks:[],base:0,mult:0,phase:'live',t:0,chain:0};
  for(const t of tricks){combo.tricks.push(t.name);combo.base+=t.pts;combo.mult++;P[i].meter=Math.min(1,P[i].meter+t.pts/6000);}
  combo.t=0;S.sfx('text');
  if(!P[i].ready&&P[i].meter>=1){P[i].ready=true;S.sfx('special');pop('SPECIAL!',{big:true,col:['#ffffff','#ffe600'],x0:lay.hud[i].x+lay.hu*5,y0:lay.hud[i].y+lay.hu*3.4,dur:1.6,rot:-.08});setMood(i,'silly');}}
 async function landCombo(){if(!combo||combo.phase!=='live')return;const i=combo.p,total=combo.base*Math.max(1,combo.mult);combo.phase='land';combo.t=0;combo.total=total;
  S.sfx('land-combo');P[i].best=Math.max(P[i].best,total);P[i].combos++;if(P[i].ready&&combo.usedSpecial){P[i].ready=false;P[i].meter=0;}
  const word=total>=20000?'GODLIKE!!!':total>=8000?'INSANE!!':total>=3000?pickOf(GOOD):total>=1200?pickOf(['NICE!','SWEET!','CLEAN!','SOLID!','RAD!']):null;if(word)pop(word,{big:total>=3000});
  await wait(s,850);P[i].points+=total;}
 async function bailCombo(why){if(!combo||combo.phase!=='live')return;const i=combo.p;combo.phase='bail';combo.t=0;P[i].bails++;P[i].meter=0;P[i].ready=false;
  shake=Math.max(shake,10);flash=.25;pop(pickOf(BAD),{bad:true,big:true});if(why)pop(why,{bad:true,px:lay.hu*1.05,dur:1.8,y0:lay.trick[i].y+lay.hu*2.4,x0:lay.W/2,rot:0});
  setMood(i,'sad',3);P[i].cardShake=.6;SK[i].queue=[];startBail(i);vibrate(60);await wait(s,900);}
 function vibrate(ms){try{audio.vibrate(ms);}catch{}}

 // ---------------------------------------------------------------- a move
 async function fly(st,from,to,{dur=.32,delay=0,h=null,land}={}){const a={...from},k=incoming[to]++;flyers.push({st,a,to,k,t:-delay,dur,h:h??(18+Math.hypot(a.x-pitPos(to).x,a.y-pitPos(to).y)*.22),land});}
 function plan(before,index,move,rng){const me=before.turn,mine=me?13:6,n=before.pits[index],trail=move.trail,last=trail[trail.length-1],out=[];
  const [fname,fanim]=FLIPS[Math.min(FLIPS.length-1,n-1)];let name=fname,anim={...fanim,name};if(n>=5&&rng()<.65){const gname=GRABS[Math.floor(rng()*GRABS.length)];name+=' to '+gname;anim.grab=true;}
  out.push({name,pts:100+n*75});
  const hits=trail.filter(t=>t===mine).length,gaps=hits-(last===mine?1:0);if(gaps>0)out.push({name:gaps>1?`Store Gap x${gaps}`:'Store Gap',pts:250*gaps});
  if(trail.some(t=>me===0?t>=7&&t<=12:t<=5))out.push({name:'Hip Transfer',pts:150});
  if(trail.length>=13)out.push({name:'Around The World Gap',pts:1000});
  if(move.captured){out.push({name:GRINDS[Math.floor(rng()*GRINDS.length)]+` (Steal ${move.captured})`,pts:300*move.captured});anim={name:'grind',grind:true};}
  if(last===mine&&!move.captured){out.push({name:'Store Landing',pts:500});anim={name:'big',spin:1,grab:true,h:1.15,flip:anim.flip||0};}
  return {tricks:out,anim};}
 function threat(after){// the most the other player can bank at once after this move (captures, store landings)
  const opp=after.turn,store=opp?13:6;let best=0;for(const m of mancalaMoves(after)){const r=mancalaMove(after,m);if(r){const d=r.state.pits[store]-after.pits[store]+(r.extra?2:0);if(d>best)best=d;}}return best;}
 async function sow(index,remote=false){if(!remote&&s.paused||!s.alive||busy||phase!=='play'||theirs()&&!remote)return;const before=state,move=mancalaMove(state,index);if(!move)return;
  if(net&&!remote)net.send({p:index});busy=true;moveNo++;const me=before.turn,mine=me?13:6,rng=A.rnd(moveNo*131+index*17+7),pl=plan(before,index,move,rng);
  const n=before.pits[index],step=n<=6?.15:n<=12?.115:.085,from=pitPos(index);
  // lift the gems out of the bowl and sow them, one bowl after another
  const hand=stones[index].splice(0);S.sfx('ollie');S.sfx('flip');
  let special=false;if(P[me].ready&&(move.extra||move.captured)){special=true;}
  queueTrick(me,special?{name:'special',special:true,spin:2.5,h:1.6,grab:true}:pl.anim);
  move.trail.forEach((to,k)=>{const st=hand[k]||newStone();fly(st,{x:from.x+(Math.random()-.5)*from.rx*.6,y:from.y+(Math.random()-.5)*from.ry*.6},to,{delay:k*step,land:()=>{S.sfx('clack');
   if(to===mine){popNear(to,'+'+(to===move.trail[move.trail.length-1]?500:250),{col:['#fff35c','#ff9d00']});if(k%2===0&&Math.random()<.5)pop(pickOf(GOOD),{px:lay.hu*1.2});}}});});
  await until(()=>!flyers.length);if(!s.alive)return;
  // capture: the last gem and everything opposite grind into the store; the robbed skater slams
  if(move.captured){const last=move.trail[move.trail.length-1],opp=12-last,victim=1-me,dest=pitPos(mine);S.sfx('grind',.9);
   const take=[...stones[last].splice(0),...stones[opp].splice(0)];const src=[pitPos(last),pitPos(opp)];
   take.forEach((st,k)=>fly(st,k===0?src[0]:src[1],mine,{delay:k*.06,dur:.42,land:()=>S.sfx('clack',2)}));sparkBurst(pitPos(opp).x,pitPos(opp).y,22,320);
   pop('STOLEN!',{big:true,col:['#ffffff','#ff2d55']});pop(pickOf(GOOD));setMood(me,'win');setMood(victim,'angry',3);P[victim].cardShake=.7;P[victim].bails++;P[victim].meter*=.5;
   SK[victim].queue=[];startBail(victim);shake=Math.max(shake,8);vibrate(40);await until(()=>!flyers.length);if(!s.alive)return;}
  state=move.state;
  if(special){pl.tricks.push({name:'SPECIAL: '+SPECIALS[Math.floor(rng()*SPECIALS.length)],pts:3000});P[me].specials++;}
  comboAdd(me,pl.tricks);if(special&&combo)combo.usedSpecial=true;
  if(special){S.sfx('special');flash=.5;pop('SPECIAL TRICK!!',{big:true,col:['#ffffff','#38f2ff'],dur:1.8,rot:-.05});}
  // game over: sweep what's left into the stores
  if(state.winner>=0){for(let i=0;i<14;i++)if(i!==6&&i!==13&&stones[i].length){const dst=i<6?6:13,src=pitPos(i);stones[i].splice(0).forEach((st,k)=>fly(st,src,dst,{delay:k*.05+(i%7)*.08,dur:.5,land:()=>S.sfx('clack')}));}
   await until(()=>!flyers.length);syncStones();s.setScores([state.pits[6],state.pits[13]]);await landCombo();if(!s.alive)return;await wait(s,700);return endRun();}
  syncStones();s.setScores([state.pits[6],state.pits[13]]);s.react?.(state.turn,move.extra?'happy':'thinking');
  if(move.extra){// COMBO!!!
   combo.chain++;const lv=combo.chain;S.sfx('combo',lv);shake=Math.max(shake,8+lv*3);flash=.35;vibrate(30+lv*15);
   pop(COMBO_WORDS[Math.min(COMBO_WORDS.length-1,lv-1)],{big:true,px:lay.hu*(2.6+lv*.45),x0:lay.W/2,y0:lay.by-lay.geo.D*.2,col:['#ffffff','#ffd000'],dur:1.7,rot:(Math.random()-.5)*.2});
   pop(pickOf(GOOD),{big:true});pop(pickOf(GOOD));setMood(me,'win');setMood(1-me,lv>1?'angry':'sad');P[me].cardKick=1;
   sparkBurst(pitPos(mine).x,pitPos(mine).y,26,380);await wait(s,650);busy=false;return;}
  // the turn is over: land the combo, or slam if this move hands the other player a big one
  const gained=state.pits[mine]-before.pits[mine],danger=threat(state);
  if(gained===0&&danger>=3)await bailCombo(danger>=6?'YOU JUST SET THEM UP!':'SLOPPY LANDING!');else await landCombo();if(!s.alive)return;
  turnBanner();busy=false;}
 function syncStones(){for(let i=0;i<14;i++){const d=state.pits[i]-stones[i].length;if(d>0)for(let k=0;k<d;k++)stones[i].push(newStone());else if(d<0)stones[i].splice(d);incoming[i]=0;}}
 function turnBanner(){const i=state.turn,who=theirs()?'THEIR RUN':cpu&&i===1?nameOf(i).toUpperCase()+"'S RUN":nameOf(i).toUpperCase()+"'S RUN";banner={text:who,sub:theirs()?'PLAYING ON THEIR PHONE':cpu&&i===1?'':'TAP A BOWL ON YOUR SIDE',t:0,dur:1.6,p:i};
  s.active=i;s.updateScores?.();if(!cpu&&!net)lockT=.55;S.sfx('whoosh',.35,true);}

 // ---------------------------------------------------------------- skaters in their halfpipes
 function startBail(i){const k=SK[i],g=lay.pipes[i].geo,pos=skaterPos(i);k.mode='bail';k.t=0;k.bail={x0:pos.x,y0:pos.y,r0:pos.rot,dir:pos.x<g.cx?1:-1};k.bd={x:pos.x,y:pos.y,vx:(Math.random()-.5)*260,vy:-260,rot:0,vr:14};S.sfx('bail');}
 function skaterPos(i){const p=skaterAt(i);p.y-=lay.pipes[i].geo.depth*.5;return p;}
 function skaterAt(i){const k=SK[i],g=lay.pipes[i].geo;if(k.mode==='air'){const a=k.air,tau=clamp(a.t/a.dur,0,1),side=a.side,x0=g.cx+side*(g.F+g.R*.94),top=g.floor-g.R;
   return {x:x0,y:top-a.h*g.R*4*tau*(1-tau),rot:-side*(Math.PI/2)*(1-Math.sin(Math.PI*tau)),tau,side};}
  if(k.mode==='grind'){const side=k.air.side;return {x:g.cx+side*(g.F+g.R),y:g.floor-g.R*1.08,rot:0,side};}
  const u=g.L*k.amp*Math.sin(k.ph),p=A.pipePoint(g,u);return {x:p.x,y:p.y,rot:p.rot};}
 function stepSkater(i,dt){const k=SK[i],g=lay.pipes[i].geo,cross=1.05+g.R/400;
  if(k.mode==='ride'){const before=Math.cos(k.ph);k.ph+=dt*Math.PI/cross;k.amp=Math.min(1,k.amp+dt*.35);const after=Math.cos(k.ph);
   if(before*after<=0&&k.amp>=.97){const side=Math.sign(Math.sin(k.ph))||1;let tr=k.queue.shift();if(!tr&&Math.random()<.35)tr={name:'idle',h:.3+Math.random()*.25,grab:Math.random()<.4,flip:Math.random()<.3?1:0};
    if(tr){k.ph=side>0?Math.PI/2:-Math.PI/2;if(tr.grind){k.mode='grind';k.t=0;k.air={side,trick:tr};S.sfx('grind',.85);}else{k.mode='air';k.air={side,trick:tr,t:0,h:tr.h||.55,dur:.7+(tr.h||.55)*.42};if(tr.name!=='idle'){S.sfx('ollie');if(tr.flip||tr.shove)S.sfx('flip');}}}}}
  else if(k.mode==='air'){k.air.t+=dt;if(k.air.t>=k.air.dur){if(k.air.trick.bail){startBail(i);return;}k.mode='ride';k.ph=(k.air.side>0?Math.PI/2:-Math.PI/2)+.02;if(k.air.trick.name!=='idle')S.sfx('land',k.air.trick.special?1.4:1);}}
  else if(k.mode==='grind'){k.t+=dt;const pos=skaterPos(i);if(Math.random()<dt*40)sparks.push({x:pos.x,y:pos.y+g.R*.06,vx:(Math.random()-.5)*200,vy:-Math.random()*180,t:0,dur:.4});if(k.t>.9){k.mode='ride';k.ph=(k.air.side>0?Math.PI/2:-Math.PI/2)+.02;S.sfx('land');}}
  else if(k.mode==='bail'){k.t+=dt;const b=k.bd;if(b){b.vy+=900*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.rot+=b.vr*dt;if(b.y>g.floor-g.depth*.5-4){b.y=g.floor-g.depth*.5-4;b.vy*=-.35;b.vr*=.6;b.vx*=.8;if(Math.abs(b.vy)<40)b.vy=0;}
    const lo=g.cx-g.F-g.R*.9,hi=g.cx+g.F+g.R*.9;if(b.x<lo||b.x>hi){b.vx*=-.6;b.x=clamp(b.x,lo,hi);}}
   if(k.t>2.1){k.mode='ride';k.ph=0;k.amp=.15;k.bd=null;}}}
 function drawSkater(i){const k=SK[i],g=lay.pipes[i].geo,u=g.R*.115,o=A.OUTFITS[i],hd=head(i,P[i].mood);x.save();
  if(k.mode==='bail'){const b=k.bail,t=k.t,fall=clamp(t/.55,0,1),e=ease(fall),gx=b.x0+(g.cx+b.dir*g.F*.3-b.x0)*e,gy=b.y0+(g.floor-g.depth*.5-u*.5-b.y0)*e-Math.sin(fall*Math.PI)*g.R*.25;
   if(k.bd){x.save();x.translate(k.bd.x,k.bd.y);x.rotate(k.bd.rot);A.drawBoard(x,u,o,k.bd.rot*.5,0);x.restore();}
   x.translate(gx,gy);if(t<2.1-.35){x.rotate(b.r0+(Math.PI/2*b.dir-b.r0)*e+(fall<1?Math.sin(t*20)*.3:0));A.drawSkater(x,u,{crouch:.1,arms:[2.4,.5,-2.3,-.6],noBoard:true,face:b.dir,squash:1},hd,o);}
   else{const up=clamp((t-1.75)/.35,0,1);x.rotate(Math.PI/2*b.dir*(1-up));A.drawSkater(x,u,{crouch:.6-up*.3,noBoard:up<.9,face:b.dir},hd,o);}
   x.restore();return;}
  const pos=skaterPos(i);x.translate(pos.x,pos.y);x.rotate(pos.rot);
  if(k.mode==='air'){const a=k.air,tr=a.trick,tau=pos.tau,e=ease(tau),mid=Math.sin(Math.PI*tau);
   const pose={face:a.side,crouch:.35+.55*mid,spin:Math.PI*tau+(tr.spin||0)*TAU*e,flip:(tr.flip||0)*TAU*clamp((tau-.1)/.6,0,1),shove:(tr.shove||0)*Math.PI*clamp((tau-.1)/.6,0,1),
    grab:tr.grab&&tau>.2&&tau<.78,arms:tr.grab?[.4,-.3,-2.2,.3]:[2.4,-.6,-2.4,.6],boardY:(tr.flip||tr.shove)&&tau>.1&&tau<.7?u*.4*mid:0,boardRot:(tr.boardSpin||0)*TAU*clamp((tau-.1)/.6,0,1)};
   if(tr.special){x.save();x.globalAlpha=.25;for(let j=1;j<=3;j++){const sp=Math.PI*tau+(tr.spin)*TAU*ease(clamp(tau-j*.04,0,1));x.save();x.translate(0,j*u*.9);A.drawSkater(x,u,{...pose,spin:sp},null,{...o,shirt:'#9ff6ff',shirt2:'#fff'});x.restore();}x.restore();}
   A.drawSkater(x,u,pose,hd,o);}
  else if(k.mode==='grind'){A.drawSkater(x,u,{face:-k.air.side,crouch:.45,arms:[1.6,-.3,-1.6,.3],lean:-k.air.side*.12},hd,o);}
  else{const dir=Math.cos(k.ph)>=0?1:-1,bottom=1-Math.abs(Math.sin(k.ph));A.drawSkater(x,u,{face:dir,crouch:.2+.45*bottom,arms:[1.2,-.5,-1.0,.5],lean:dir*.08*bottom},hd,o);}
  x.restore();}
 // guest skaters: someone from the roster ollies over the board or grinds its edge, now and then
 function spawnNpc(){if(!guestPool.length||!lay)return;const id=pickOf(guestPool),dir=Math.random()<.5?1:-1,kind=Math.random()<.55?'ollie':'grind';let nm='';try{nm=require('src/characters.js').character(id)?.name||'';}catch{}
  npcs.push({id,nm,dir,kind,t:0,dur:2.6,o:A.OUTFITS[2+Math.floor(Math.random()*2)],flip:Math.random()<.6?1:0});S.sfx('roll',2.4,.25);}
 function drawNpc(n){const W=lay.W,geo=lay.geo,tau=n.t/n.dur,u=clamp(geo.D*.07,4,14),x0=n.dir>0?-u*6:W+u*6,x1=n.dir>0?W+u*6:-u*6,px=x0+(x1-x0)*tau,deckL=lay.bx-geo.L/2,deckR=lay.bx+geo.L/2;
  const over=clamp((n.dir>0?px-deckL:deckR-px)/(geo.L),0,1),inside=px>deckL&&px<deckR;let py=lay.by+geo.D/2+geo.edge+geo.wheel+u*.3,rot=0,pose={face:n.dir,crouch:.3,arms:[1.2,-.4,-1.2,.4]};
  if(n.kind==='ollie'){const a=Math.sin(Math.PI*over);if(inside){py-=a*(geo.D+geo.edge+u*4);pose.crouch=.4+.5*a;pose.flip=n.flip*TAU*over;pose.grab=!n.flip&&a>.3;}
   if(inside&&!n.popped){n.popped=1;S.sfx('ollie');S.sfx('flip');}if(!inside&&n.popped===1&&over>=1){n.popped=2;S.sfx('land');}}
  else{if(inside){py=lay.by+geo.D/2-u*.1;pose.crouch=.5;pose.lean=-n.dir*.1;if(!n.popped){n.popped=1;S.sfx('ollie');S.sfx('grind',geo.L/(W/n.dur)*1);}if(Math.random()<.6)sparks.push({x:px-n.dir*u*1.2,y:py+u*.3,vx:-n.dir*(80+Math.random()*160),vy:-Math.random()*160,t:0,dur:.35});}
   else if(n.popped===1){n.popped=2;S.sfx('land');}}
  x.save();x.translate(px,py);x.rotate(rot);A.drawSkater(x,u,pose,headOf?headOf(n.id,'normal'):null,n.o);x.restore();
  if(n.nm&&tau>.08&&tau<.92)thps(x,n.nm.toUpperCase(),px,py-u*8.6,lay.hu*.7,{fill:'#fff',alpha:.9,maxW:lay.hu*10});}

 // ---------------------------------------------------------------- drawing: board, gems, HUD, text
 function drawBoard(){const geo=lay.geo,dk=deck,sx=shake?(Math.random()-.5)*shake*.4:0;x.drawImage(dk.c,lay.bx-dk.ox+sx,lay.by-dk.oy,dk.w,dk.h);
  const legal=phase==='play'&&!busy&&localTurn()&&lockT<=0?mancalaMoves(state):[],r=gemR(),pulse=.5+.5*Math.sin(T*6);
  for(const i of legal){const p=pitPos(i);x.save();x.shadowColor='#ffe600';x.shadowBlur=10+pulse*10;x.strokeStyle=`rgba(255,230,0,${.55+.4*pulse})`;x.lineWidth=2.5;A.ell(x,p.x,p.y,p.rx+2,p.ry+2);x.stroke();x.restore();}
  for(let i=0;i<14;i++){const list=stones[i];for(let k=0;k<list.length;k++){const q=slot(i,k),st=list[k];A.drawGem(x,st.col,q.x+st.jx*r*.35,q.y+st.jy*r*.35,r,dpr);}}
  // count plates: small badges on the bowls, big THPS numbers over the stores
  const hu=lay.hu;for(let i=0;i<14;i++){const p=pitPos(i),n=stones[i].length;
   if(p.store){const yy=lay.by-geo.D/2-hu*.75;thps(x,String(n),p.x,lay.port?yy:yy,hu*1.5,{grad:i===6?['#ffd0d0',PCOL[0]]:['#d6e8ff',PCOL[1]],lw:.26});}
   else{const bx=p.x+p.rx*.78,by=p.y+(i<6?p.ry*.78:-p.ry*.78);x.fillStyle='rgba(0,0,0,.72)';A.ell(x,bx,by,hu*.52,hu*.46);x.fill();x.strokeStyle=i<6?PCOL[0]:PCOL[1];x.lineWidth=1.2;x.stroke();
    x.fillStyle='#fff';x.font=A.font(hu*.62);x.textAlign='center';x.textBaseline='middle';x.fillText(String(n),bx,by+1);}}}
 function drawFlyers(dt){const r=gemR();for(let j=flyers.length-1;j>=0;j--){const f=flyers[j];f.t+=dt;if(f.t<0)continue;const tau=clamp(f.t/f.dur,0,1),b=pitPos(f.to),q=slot(f.to,stones[f.to].length+f.k);
   const tx=q.x,ty=q.y,cx=f.a.x+(tx-f.a.x)*tau,cy=f.a.y+(ty-f.a.y)*tau,lift=f.h*Math.sin(Math.PI*tau);
   x.fillStyle='rgba(0,0,0,.3)';A.ell(x,cx+r*.3,cy+r*.3,r*.9,r*.6);x.fill();A.drawGem(x,f.st.col,cx,cy-lift,r*(1+.35*Math.sin(Math.PI*tau)),dpr);
   if(tau>=1){flyers.splice(j,1);stones[f.to].push(f.st);incoming[f.to]=Math.max(0,incoming[f.to]-1);for(const g of flyers)if(g.to===f.to&&g.k>f.k)g.k--;f.land?.();}}}
 function meterBar(x0,y0,w,h,v,ready){x.save();x.transform(1,0,-.35,1,0,0);const X=x0+y0*.35;x.fillStyle='rgba(0,0,0,.65)';x.fillRect(X-2,y0-2,w+4,h+4);
  if(ready){const fl=.6+.4*Math.sin(T*14);const lg=x.createLinearGradient(X,0,X+w,0);lg.addColorStop(0,'#fff8a0');lg.addColorStop(.5,'#ffe600');lg.addColorStop(1,'#ffffff');x.shadowColor='#ffe600';x.shadowBlur=14*fl;x.fillStyle=lg;x.fillRect(X,y0,w,h);x.shadowBlur=0;
   x.fillStyle=`rgba(255,255,255,${.5*fl})`;x.fillRect(X+((T*1.3)%1)*w,y0,w*.12,h);}
  else{const lg=x.createLinearGradient(X,0,X+w,0);lg.addColorStop(0,'#ff3b00');lg.addColorStop(1,'#ffcc00');x.fillStyle=lg;x.fillRect(X,y0,w*clamp(v,0,1),h);}
  x.strokeStyle='#fff';x.lineWidth=1;x.strokeRect(X-2,y0-2,w+4,h+4);x.restore();}
 function drawHud(i){const h=lay.hud[i],hu=lay.hu,p=P[i];const big=hu*1.9;
  thps(x,fmt(p.shown),h.x,h.y+big*.55,big,{align:'left',grad:['#ffffff','#ffe14d','#ff9d00'],lw:.24,cond:.8});
  meterBar(h.x+2,h.y+big*1.12,hu*8.4,hu*.62,p.meter,p.ready);
  if(p.ready)thps(x,'SPECIAL',h.x+hu*4.3,h.y+big*1.12+hu*.31,hu*.62,{fill:'#000',stroke:'rgba(255,255,255,.0)',lw:0,alpha:.85});
  const turn=phase==='play'&&state.turn===i;thps(x,nameOf(i).toUpperCase(),h.x,h.y+big*1.12+hu*1.5,hu*.9,{align:'left',fill:turn?'#ffe600':'#fff',maxW:hu*9});
  thps(x,`${state.pits[i?13:6]} IN THE STORE`,h.x,h.y+big*1.12+hu*2.45,hu*.62,{align:'left',fill:'#cfe6ff',lw:.28});}
 function drawCard(i){const r=lay.card[i];if(!r||r.h<30)return;const p=P[i],hu=lay.hu,turn=phase==='play'&&state.turn===i;x.save();
  const kick=p.cardKick,sh=p.cardShake?Math.sin(T*60)*p.cardShake*6:0;x.translate(r.x+r.w/2+sh,r.y+r.h/2);x.scale(1+kick*.12,1+kick*.12);x.rotate((i?-1:1)*.035);
  const w=r.w,h=r.h;x.shadowColor='rgba(0,0,0,.5)';x.shadowBlur=10;x.fillStyle='#0a0f1e';x.fillRect(-w/2,-h/2,w,h);x.shadowBlur=0;
  const bg=x.createLinearGradient(0,-h/2,0,h/2);bg.addColorStop(0,i?'#163a8a':'#8a1616');bg.addColorStop(1,'#05070d');x.fillStyle=bg;x.fillRect(-w/2+3,-h/2+3,w-6,h-6);
  x.save();x.beginPath();x.rect(-w/2+3,-h/2+3,w-6,h-6);x.clip();x.strokeStyle='rgba(255,255,255,.07)';x.lineWidth=6;for(let k=-h;k<w+h;k+=14){x.beginPath();x.moveTo(-w/2+k,-h/2);x.lineTo(-w/2+k-h,h/2);x.stroke();}
  const hd=head(i,p.mood);if(hd){const bob=Math.sin(T*3+i)*h*.015,size=Math.min(w*1.05,h*.92);A.drawHead(x,hd,0,h*.3+bob,size,Math.sin(T*1.7+i)*.04,1-kick*.08);}
  x.restore();x.strokeStyle=turn?'#ffe600':PCOL[i];x.lineWidth=turn?3:2;x.strokeRect(-w/2+1.5,-h/2+1.5,w-3,h-3);
  x.fillStyle=PCOL[i];x.fillRect(-w/2,h/2-hu*1.15,w,hu*1.15);thps(x,nameOf(i).toUpperCase(),0,h/2-hu*.58,hu*.85,{fill:'#fff',maxW:w-8});
  x.restore();}
 function drawCombo(){if(!combo)return;const hu=lay.hu,t=lay.trick[combo.p],str=combo.tricks.join(' + '),ph=combo.phase,a=ph==='live'?1:clamp(1.3-combo.t*.9,0,1);if(a<=0){combo=null;return;}
  const popIn=Math.min(1,combo.t*8),col=ph==='bail'?['#ff8080','#ff1010']:null,dy=ph==='bail'?combo.t*hu*2:ph==='land'?-combo.t*hu*1.2:0;
  // the trick string wraps to two lines at most, smaller when long
  const px=clamp(hu*1.15*Math.min(1,46/Math.max(10,str.length)*1.4),hu*.62,hu*1.2);
  thps(x,str,t.x,t.y+dy,px,{fill:ph==='bail'?'#ff4040':'#ffffff',maxW:t.w,alpha:a,scale:.85+.15*popIn});
  const line2=ph==='land'?fmt(combo.total):`${fmt(combo.base)} X ${combo.mult}`;
  thps(x,line2,t.x,t.y+dy+px*.9+hu*.7,hu*(ph==='land'?2:1.45),{grad:col||(ph==='land'?['#e7ffd0','#41e000']:['#fff7a0','#ffbf00']),alpha:a,scale:ph==='land'?1+.25*Math.max(0,1-combo.t*3):1});}
 function drawPops(dt){for(let j=pops.length-1;j>=0;j--){const p=pops[j];p.t+=dt;const tau=p.t/p.dur;if(tau>=1){pops.splice(j,1);continue;}
  const sc=tau<.15?.3+tau/.15*.95:tau<.25?1.25-(tau-.15)/.1*.25:1,a=tau>.7?1-(tau-.7)/.3:1;thps(x,p.text,p.x,p.y+p.vy*p.t,p.px,{grad:p.grad,rot:p.rot,alpha:a,scale:sc,maxW:lay.W*.92,lw:.26});}}
 function drawSparks(dt){for(let j=sparks.length-1;j>=0;j--){const p=sparks[j];p.t+=dt;if(p.t>p.dur){sparks.splice(j,1);continue;}p.vy+=700*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;A.spark(x,p.x,p.y,p.vx,p.vy,1-p.t/p.dur);}}
 function drawBanner(dt){if(!banner)return;banner.t+=dt;const b=banner,tau=b.t/b.dur;if(tau>=1){banner=null;return;}const W=lay.W,hu=lay.hu,slide=tau<.18?1-tau/.18:tau>.82?-(tau-.82)/.18:0,y=lay.trick[b.p].y-hu*1.6;
  x.save();x.translate(slide*W,0);x.fillStyle='rgba(0,0,0,.55)';x.beginPath();x.moveTo(0,y-hu*1.3);x.lineTo(W,y-hu*1.5);x.lineTo(W,y+hu*1.1);x.lineTo(0,y+hu*1.3);x.closePath();x.fill();
  thps(x,b.text,W/2,y-hu*.15,hu*1.7,{grad:b.p?['#d6e8ff','#2f8bff']:['#ffd6d6','#ff3b30'],maxW:W*.9});if(b.sub)thps(x,b.sub,W/2,y+hu*.85,hu*.6,{fill:'#fff'});x.restore();}
 function drawTrack(dt){if(!track)return;track.t+=dt;if(track.t>5.5){track=null;return;}const hu=lay.hu,a=clamp(Math.min(track.t*3,(5.5-track.t)*2),0,1),y=lay.H-hu*2.6;
  x.save();x.globalAlpha=a;x.fillStyle='rgba(0,0,0,.6)';x.fillRect(0,y-hu*.9,Math.min(lay.W*.8,hu*20),hu*2);x.restore();
  thps(x,track.band?`${track.band} — "${track.song}"`:track.song,hu*.6,y-hu*.15,hu*.7,{align:'left',fill:'#fff',alpha:a,maxW:Math.min(lay.W*.78,hu*19)});
  thps(x,'NOW PLAYING',hu*.6,y+hu*.6,hu*.5,{align:'left',fill:'#ffe600',alpha:a});}

 // ---------------------------------------------------------------- title sequence: Tony... Hawk's... Pro... Mancala... EXTREME EDITION!!
 let introT=0,introDone=false;const cues=new Set();const cue=(name,at,fn)=>{if(introT>=at&&!cues.has(name)){cues.add(name);fn();}};
 const INTRO_END=8.2,CUES=['sticks','song','r1','w1','r2','w2','w3','w3b','g4','w4','w5','vs','vs2'];
 // skipping jumps to the face-off: the sounds that were skipped stay quiet, the game music starts at once
 function skipIntro(){if(introT>=INTRO_END-.6)return;const wasMain=cues.has('w5');for(const n of CUES)cues.add(n);if(!wasMain)music.main(t=>{track={...t,t:0};});S.sfx('slam');introT=INTRO_END-.6;}
 function introAudio(){cue('sticks',0,()=>S.sfx('sticks'));cue('song',1.15,()=>music.intro());
  cue('r1',.75,()=>S.sfx('roll',.5,.4));cue('w1',1.2,()=>{S.sfx('slam');shake=6;});cue('r2',1.55,()=>S.sfx('roll',.4,.4));cue('w2',1.95,()=>{S.sfx('slam');shake=6;});
  cue('w3',2.7,()=>{S.sfx('ollie');S.sfx('flip');});cue('w3b',2.95,()=>{S.sfx('land',1.3);shake=7;});
  cue('g4',3.0,()=>S.sfx('grind',.55));cue('w4',3.55,()=>{S.sfx('slam');S.sfx('land',1.5);shake=12;sparkBurst(lay.W*.5,lay.H*.5,40,500);});
  cue('w5',4.55,()=>{S.sfx('combo',3);shake=16;flash=.6;music.main(t=>{track={...t,t:0};});});
  cue('vs',6.1,()=>S.sfx('whoosh',.4,true));cue('vs2',6.45,()=>{S.sfx('slam');shake=8;});}
 function drawIntro(dt){const W=lay.W,H=lay.H,hu=Math.min(W,H)/20;introAudio();
  // backdrop: black with turning orange rays and halftone, the board fading in at the end
  const out=clamp((introT-(INTRO_END-.55))/.55,0,1);x.save();x.globalAlpha=1-out;x.fillStyle='#07070a';x.fillRect(0,0,W,H);
  x.save();x.translate(W/2,H/2);x.rotate(introT*.25);const rays=16;for(let k=0;k<rays;k++){x.fillStyle=k%2?'rgba(255,90,0,.16)':'rgba(255,200,0,.08)';x.beginPath();x.moveTo(0,0);x.arc(0,0,Math.max(W,H),k/rays*TAU,(k+.5)/rays*TAU);x.closePath();x.fill();}x.restore();
  x.fillStyle='rgba(255,255,255,.04)';for(let yy=0;yy<H;yy+=6)for(let xx=(yy/6%2)*3;xx<W;xx+=6)x.fillRect(xx,yy,1.5,1.5);
  const cx=W/2,cy=H*.42,ws=Math.min(W*.9,H*1.1);
  const fly=(t0,dur=.3)=>clamp((introT-t0)/dur,0,1);
  // TONY (rolls in from the left)
  let k=fly(.85,.35);if(k>0)thps(x,'TONY',cx-ws*.18+(1-ease(k))*-W,cy-ws*.2,ws*.13,{fill:'#fff',rot:-.08,lw:.22});
  k=fly(1.6,.35);if(k>0)thps(x,"HAWK'S",cx+ws*.12+(1-ease(k))*W,cy-ws*.2,ws*.13,{fill:'#fff',rot:-.08,lw:.22});
  k=fly(2.7,.25);if(k>0){x.save();x.translate(cx-ws*.32,cy-ws*.065-(1-ease(k))*H);x.rotate(-.08);x.fillStyle='#d61f1f';x.fillRect(-ws*.075,-ws*.045,ws*.15,ws*.09);x.strokeStyle='#000';x.lineWidth=3;x.strokeRect(-ws*.075,-ws*.045,ws*.15,ws*.09);x.restore();
   thps(x,'PRO',cx-ws*.32,cy-ws*.065-(1-ease(k))*H,ws*.075,{fill:'#fff',rot:-.08});}
  // MANCALA grinds in along a rail
  k=fly(3.05,.5);if(k>0){const xx=cx+ws*.06+(1-ease(k))*W*1.1,yy=cy+ws*.03;if(k<1)for(let j=0;j<3;j++)sparks.push({x:xx-ws*.32,y:yy+ws*.11,vx:-200-Math.random()*300,vy:-Math.random()*250,t:0,dur:.4});
   x.strokeStyle='#9aa3ad';x.lineWidth=ws*.012;x.beginPath();x.moveTo(0,yy+ws*.115);x.lineTo(W,yy+ws*.095);x.stroke();
   thps(x,'MANCALA',xx,yy,ws*.2,{grad:['#fffbd0','#ffd000','#ff7a00','#c42a00'],rot:-.06,lw:.2,scale:k<1?1:1+.06*Math.max(0,1-(introT-3.55)*4)});}
  // EXTREME EDITION!! stamped across
  k=fly(4.55,.18);if(k>0){const sc=1+(1-k)*2.2,yy=cy+ws*.24;x.save();x.translate(cx,yy);x.rotate(-.1);x.scale(sc,sc);x.fillStyle='#e01b1b';x.beginPath();x.moveTo(-ws*.46,-ws*.06);x.lineTo(ws*.48,-ws*.075);x.lineTo(ws*.46,ws*.06);x.lineTo(-ws*.48,ws*.075);x.closePath();x.fill();x.strokeStyle='#000';x.lineWidth=4;x.stroke();x.restore();
   thps(x,'EXTREME EDITION!!',cx,yy,ws*.09,{grad:['#ffffff','#ffe600'],rot:-.1,scale:sc,maxW:ws*.9});}
  // face-off cards
  k=fly(6.1,.35);if(k>0){const cw=Math.min(W*.36,H*.3),ch=cw*1.18,yy=H*.8-ch/2;for(const i of [0,1]){const side=i?1:-1,xx=cx+side*(cw*.62)+(1-ease(k))*side*W;
    x.save();x.translate(xx,yy+ch/2);x.rotate(side*.05);x.fillStyle=PCOL[i];x.fillRect(-cw/2-3,-ch/2-3,cw+6,ch+6);x.fillStyle='#111';x.fillRect(-cw/2,-ch/2,cw,ch);const hd=head(i,'win');if(hd)A.drawHead(x,hd,0,ch*.28,Math.min(cw,ch*.9));
    thps(x,nameOf(i).toUpperCase(),0,ch/2-hu*.6,hu*.9,{fill:'#fff',maxW:cw-6});x.restore();}
   const v=fly(6.45,.15);if(v>0)thps(x,'VS',cx,yy+ch/2,hu*2.4*(1+(1-v)*2),{grad:['#ffffff','#ff2d2d'],rot:-.1});}
  thps(x,'TAP TO SKIP',W/2,H-hu*1.2,hu*.55,{fill:'rgba(255,255,255,.55)',stroke:'rgba(0,0,0,.4)',alpha:introT>.4&&introT<6?.6+.4*Math.sin(introT*5):0});
  x.restore();
  if(introT>=INTRO_END)finishIntro();}
 function finishIntro(){if(introDone)return;introDone=true;if(!cues.has('w5'))music.main(t=>{track={...t,t:0};});introT=INTRO_END;phase='play';busy=false;turnBanner();}

 // ---------------------------------------------------------------- end of run tally
 let endT=0,endRes=null,endResolve=null;
 async function endRun(){phase='end';endT=0;combo=null;const w=state.winner;
  // high scores (trick score and best combo), kept in the profile
  const pr=store.profile;let newHigh=-1,newCombo=-1;if(pr){pr.proMancala=pr.proMancala&&typeof pr.proMancala==='object'?pr.proMancala:{};const pm=pr.proMancala;
   for(const i of [0,1]){if(cpu&&i===1)continue;if(!pm.high||P[i].points>pm.high.score){pm.high={name:nameOf(i).slice(0,16),score:P[i].points};newHigh=i;}if(!pm.combo||P[i].best>pm.combo.score){pm.combo={name:nameOf(i).slice(0,16),score:P[i].best};newCombo=i;}}
   try{saveProfile(pr);}catch{}}
  endRes={w,newHigh,newCombo};S.sfx('crowd',1.4,3);if(w<2){setMood(w,'win',99);setMood(1-w,'sad',99);}
  await new Promise(r=>{endResolve=r;});if(!s.alive)return;
  s.finish(w===2?[0,0]:w===0?[1,0]:[0,1],`Tony Hawk's Pro Mancala · stores ${state.pits[6]}–${state.pits[13]}`);}
 function drawEnd(dt){const W=lay.W,H=lay.H,hu=lay.hu,e=endRes;endT+=dt;const a=clamp(endT*2,0,1);x.save();x.globalAlpha=a*.92;x.fillStyle='#04060c';x.fillRect(0,0,W,H);x.restore();
  thps(x,e.w===2?'IT\'S A TIE!':nameOf(e.w).toUpperCase()+' WINS!',W/2,H*.1,hu*2.2,{grad:['#ffffff','#ffd000','#ff7a00'],alpha:a,maxW:W*.92,rot:-.04});
  const colW=Math.min(W*.46,hu*16),rows=[['STONES',i=>state.pits[i?13:6],false],['TRICK SCORE',i=>P[i].points,true],['BEST COMBO',i=>P[i].best,true],['COMBOS',i=>P[i].combos,false],['SPECIALS',i=>P[i].specials,false],['BAILS',i=>P[i].bails,false]];
  for(const i of [0,1]){const cx=W/2+(i?1:-1)*colW*.55,top=H*.18;const hd=head(i,P[i].mood);if(hd)A.drawHead(x,hd,cx,top+hu*6.3,Math.min(colW*.8,hu*7),Math.sin(T*2+i)*.05);
   thps(x,nameOf(i).toUpperCase(),cx,top+hu*7.4,hu*1.1,{fill:e.w===i?'#ffe600':'#fff',maxW:colW});
   rows.forEach(([label,val,count],r)=>{const y=top+hu*(9+r*1.75),v=val(i),k=clamp((endT-.6-r*.35)/.9,0,1),show=count?v*ease(k):(k>0?v:0);
    if(k>0&&k<1&&count&&Math.floor(endT*22)!==Math.floor((endT-dt)*22))S.sfx('tally',Math.floor(k*40));
    thps(x,label,cx,y,hu*.6,{fill:'#9fc3ff',alpha:k>0?1:0});thps(x,fmt(show),cx,y+hu*.75,hu*(r===0?1.3:1),{grad:r===0?['#ffffff','#ffe600']:['#ffffff','#bfe6ff'],alpha:k>0?1:0});});}
  if(e.newHigh>=0&&endT>3)thps(x,'NEW HIGH SCORE!',W/2,H*.86,hu*1.4,{grad:['#ffffff','#ff3df2'],alpha:.6+.4*Math.sin(T*10),rot:-.05});
  else if(e.newCombo>=0&&endT>3)thps(x,'NEW BEST COMBO!',W/2,H*.86,hu*1.3,{grad:['#ffffff','#38f2ff'],alpha:.6+.4*Math.sin(T*10),rot:-.05});
  if(endT>2.5)thps(x,'TAP TO CONTINUE',W/2,H*.94,hu*.6,{fill:'#fff',alpha:.5+.5*Math.sin(T*5)});
  if(endT>7.5&&endResolve){const r=endResolve;endResolve=null;r();}}

 // ---------------------------------------------------------------- input
 s.on(c,'pointerdown',ev=>{ev.preventDefault?.();if(s.paused||!s.alive)return;
  if(phase==='intro'){if(introT>.3)skipIntro();return;}
  if(phase==='end'){if(endT>2.5&&endResolve){const r=endResolve;endResolve=null;r();}return;}
  if(busy||lockT>0||!localTurn())return;const p=s.pointer(ev);let best=-1,bd=1e9;
  for(const i of mancalaMoves(state)){const q=pitPos(i),d=Math.hypot((p.x-q.x)/q.rx,(p.y-q.y)/q.ry);if(d<bd){bd=d;best=i;}}
  if(best>=0&&bd<1.7)void sow(best);});
 s.hint('Kalah rules: tap a bowl on your side to sow its gems counterclockwise, one per bowl (skip the other store). Last gem in your own store = COMBO and you go again. Last gem in an empty bowl of yours steals the bowl opposite. Tricks, gaps, combos and specials score skate points just for show: the stores decide who wins.');

 // ---------------------------------------------------------------- frame
 s.frame(dt=>{T+=dt;relayout();const W=lay.W,H=lay.H;
  const cw=Math.round(W*dpr),ch=Math.round(H*dpr);if(c.width!==cw||c.height!==ch){c.width=cw;c.height=ch;}x.setTransform(dpr,0,0,dpr,0,0);
  for(let i=waits.length-1;i>=0;i--)if(waits[i].f()||!s.alive){waits[i].r();waits.splice(i,1);}
  if(phase==='intro')introT+=dt;lockT=Math.max(0,lockT-dt);music.tick();
  shake=Math.max(0,shake-dt*30);flash=Math.max(0,flash-dt*1.6);
  for(const i of [0,1]){const p=P[i];p.cardKick=Math.max(0,p.cardKick-dt*2.5);p.cardShake=Math.max(0,p.cardShake-dt);
   if(p.moodT>0){p.moodT-=dt;if(p.moodT<=0)p.mood='normal';}else if(phase==='play'){p.idleT-=dt;if(p.idleT<=0){p.idleT=2.5+Math.random()*3;p.mood=state.turn===i&&!busy?pickOf(['think','think','normal','silly']):pickOf(['normal','normal','silly','think','win']);}}
   if(p.shown<p.points){p.shown=Math.min(p.points,p.shown+Math.max(7,(p.points-p.shown)*Math.min(1,dt*5)));p.tallyT-=dt;if(p.tallyT<=0){p.tallyT=.045;S.sfx('tally',Math.floor(p.shown/400));}}
   stepSkater(i,dt);}
  if(phase==='play'){npcT-=dt;if(npcT<=0){npcT=10+Math.random()*9;spawnNpc();}}
  if(combo){combo.t+=dt;}
  x.save();if(shake)x.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
  x.drawImage(park,0,0,W,H);
  drawSkater(1);drawSkater(0);
  drawBoard();drawFlyers(dt);
  for(let j=npcs.length-1;j>=0;j--){const n=npcs[j];n.t+=dt;if(n.t>=n.dur){npcs.splice(j,1);continue;}drawNpc(n);}
  drawSparks(dt);
  for(const i of [0,1]){drawCard(i);drawHud(i);}
  drawCombo();drawPops(dt);drawBanner(dt);drawTrack(dt);
  if(phase==='play'&&!busy){const msg=theirs()?'ON THEIR PHONE…':cpu&&state.turn===1?nameOf(1).toUpperCase()+' IS THINKING…':'';if(msg)thps(x,msg,W/2,lay.by+lay.geo.D/2+lay.geo.edge+lay.geo.wheel+lay.hu*.9,lay.hu*.7,{fill:'#fff',alpha:.6+.4*Math.sin(T*5)});}
  x.restore();
  if(flash>0){x.fillStyle=`rgba(255,255,255,${flash*.6})`;x.fillRect(0,0,W,H);}
  if(phase==='intro')drawIntro(dt);else if(phase==='end'&&endRes)drawEnd(dt);
  s.status(`${nameOf(state.turn)}${theirs()?' · on their phone':''} · stores ${state.pits[6]}–${state.pits[13]}`);
  const centers=lay.geo.pits.map((_,i)=>{const q=pitPos(i);return {x:q.x,y:q.y};});
  s.debug={state,sow,busy,phase,centers,P,skip:()=>{introT=INTRO_END;},bot:net?()=>{if(phase==='intro'){finishIntro();return 'intro';}if(phase==='end'){if(endResolve){const r=endResolve;endResolve=null;r();}return 'end';}if(theirs()||busy||s.paused||state.winner>=0)return null;void sow(pickOf(mancalaMoves(state)));return 'sow';}:null};});
 if(cpu)cpuHotseat(s,{isTurn:()=>phase==='play'&&state.turn===1&&state.winner<0&&!busy,think:()=>sow(B.pickMancala(s,state))});
 S.preload();
 await s.pass(0,"Tony Hawk's Pro Mancala. Bottom bowls belong to player 1, top bowls to player 2. Six bowls each, four gems in each, and your own store in the kicktail. Land in your store for a COMBO and go again; land in an empty bowl of yours to steal the one opposite.");
}
Object.assign(exports,{proMancala});
