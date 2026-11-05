// Major League Baseball, in the style of Ken Griffey Jr. Presents Major League Baseball (SNES) (ROADMAP D4). Two games:
//  - `major-league-fielding` (engine baseballfield): a real game. Batting view from behind the plate: the fielding side
//    picks a pitch (fastball, curve, slider, change-up) and taps where to throw it; the batter holds a finger to aim the
//    bat and lets go to swing (timing pulls or pushes it, high or low lifts or chops it). A ball in play cuts to the field
//    view: the nearest fielder runs it down (drag to steer him yourself), catches flies, and you tap a base to throw;
//    runners go on their own (GO / BACK to send or hold them). Balls, strikes, walks, force and tag outs, the third-out
//    run rule, innings (1, 3 or 9 in the Arcade; 1 on the board), extra innings, walk-offs.
//  - `major-league-bats` (engine baseball): a Home Run Derby in the same batting view: ten outs each against batting
//    practice pitches; any swing that is not a home run is an out. Most home runs wins (longest breaks a tie).
// Lineups: your character leads off and pitches; your roster fills the order, then the Major League cast (data/majorLeague.js).
// Harry Doyle calls it. vs CPU: the other dugout pitches, swings and fields with the brains in baseballRules.js.
// Online: each phase has one phone in charge: the pitcher's phone sends the pitch {pt}, the batter's phone judges the
// swing {sw}, the fielding phone runs the play (streams {fs}, takes {rn} runner calls, ends with {pl}); setup from the seed.
const {store}=require('src/state.js');
const {isCpu,cpuSkill}=require('src/engines/cpuKit.js');
const {fullBleed}=require('src/engines/fullBleed.js');
const {audioContext,holdMusic,releaseMusic,vibrate}=require('src/audio.js');
const R=require('src/engines/baseballRules.js');
const A=require('src/engines/griffeyArt.js');
const {ML_RATINGS,ML_IDS,DOYLE,TEAM_NAMES}=require('src/data/majorLeague.js');
const STOP=Symbol('stop');
const clamp=R.clamp;

function makeSound(){let a=null,bus=null,nb=null;const on=()=>!!store.profile?.settings.sound;
 const ok=()=>{a=audioContext();if(!a)return false;if(!bus){bus=a.createGain();bus.gain.value=.5;bus.connect(a.destination);}return true;};
 const noise=()=>nb||=(()=>{const b=a.createBuffer(1,a.sampleRate*2,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b;})();
 const burst=(t,d,v,f,q=1,type='bandpass')=>{const n=a.createBufferSource(),fl=a.createBiquadFilter(),g=a.createGain();n.buffer=noise();fl.type=type;fl.frequency.value=f;fl.Q.value=q;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);n.connect(fl).connect(g).connect(bus);n.start(t,Math.random());n.stop(t+d+.05);};
 const tone=(f,t,d,v,type='triangle')=>{const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(bus);o.start(t);o.stop(t+d+.05);};
 return {crack(q=1){if(!on()||!ok())return;const t=a.currentTime;burst(t,.12,.9*q,2400,1.2);tone(520,t,.08,.25*q,'square');},
  pop(){if(!on()||!ok())return;const t=a.currentTime;burst(t,.07,.6,900,1.5);},
  whoosh(){if(!on()||!ok())return;const t=a.currentTime;burst(t,.18,.15,1600,.6,'highpass');},
  crowd(k=1){if(!on()||!ok())return;const t=a.currentTime;burst(t,1.6*k,.12*k,800,.5);burst(t+.1,1.4*k,.08*k,1500,.7);},
  boo(){if(!on()||!ok())return;const t=a.currentTime;[180,170].forEach((f,i)=>tone(f,t+i*.2,.5,.06,'sawtooth'));},
  // the ballpark organ: the old "Charge!" bugle call, then a short original vamp
  organ(kind='charge'){if(!on()||!ok())return;const t=a.currentTime,seq=kind==='charge'?[[392,0,.16],[523,.18,.16],[659,.36,.16],[784,.54,.32],[659,.9,.14],[784,1.06,.5]]:[[523,0,.2],[659,.22,.2],[784,.44,.2],[698,.66,.4]];
   for(const [f,dt,d] of seq){tone(f,t+dt,d,.08,'square');tone(f*2,t+dt,d,.03,'sine');}}};}

async function griffeyBall(s){
 const derby=s.game.engine==='baseball'||s.game.id==='major-league-bats';
 try{require('src/data/baseballSprites.js').preloadBaseball();}catch{}
 const [c,x]=s.canvas(680,780,{fill:true}),fb=fullBleed(s,{bg:'#0b1020'});
 const net=s.online||null,cpu=isCpu(s);if(net||cpu)s.hotseat=true;s.shared=true;
 const calm=!!store.profile?.settings.reducedMotion,snd=makeSound();holdMusic(6*3600);s.cleanup(()=>releaseMusic());
 // ---- teams and lineups (from the seed, so both phones agree; online the roster part is left out: each phone has its own)
 let known=new Set();try{known=new Set(require('src/characters.js').CHARACTERS.map(q=>q.id));}catch{}
 const nameOf=id=>{try{return require('src/characters.js').character(id)?.name||id;}catch{return id;}};
 const short=n=>String(n).split(' · ')[0].replace(/^[^A-Za-z]*/,'').split(' ').slice(-1)[0].toUpperCase().slice(0,11);
 const rosterOf=owner=>{if(net)return [];try{const {availableCharacters}=require('src/profile.js');return availableCharacters(store.profile,owner)||[];}catch{return [];}};
 const used=new Set(s.players.map(p=>p.character));
 const teams=[0,1].map(t=>{const p=s.players[t],pool=[...rosterOf(p.owner)].filter(id=>known.has(id)&&!used.has(id));
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(s.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  const ids=[p.character];for(const id of pool){if(ids.length>=6)break;ids.push(id);used.add(id);}
  const cast=ML_IDS.filter(id=>known.has(id)&&!used.has(id));for(let i=cast.length-1;i>0;i--){const j=Math.floor(s.random()*(i+1));[cast[i],cast[j]]=[cast[j],cast[i]];}
  for(const id of cast){if(ids.length>=9)break;ids.push(id);used.add(id);}
  while(ids.length<9)ids.push(p.character);
  const lineup=ids.map(id=>({id,name:short(nameOf(id)),r:R.ratings(id,ML_RATINGS[id])}));
  return {t,name:String(p.name).replace(/\s*\(CPU\)/i,'').split(' ')[0].toUpperCase().slice(0,10),club:TEAM_NAMES[Math.floor(s.random()*TEAM_NAMES.length)],lineup,pitcher:lineup[0],order:0,runs:0,hits:0,line:[]};});
 const ctrl=t=>net?(t===net.me?'local':'remote'):cpu&&t===1?'cpu':'local';
 const skill=()=>cpuSkill(s);
 const st={phase:'intro',view:'bat',innings:1,inning:1,half:0,outs:0,count:R.newCount(),bases:[null,null,null],ui:null,pitch:null,swing:null,bx:{x:0,y:0,plane:'mid',bunt:false},rubber:0,netSteer:{},play:null,
  say:'',sayT:0,banner:null,fast:false,auto:false,derby:derby?{p:0,hr:[0,0],long:[0,0],outs:0,pitches:0}:null,res:null,pressId:null,pressT:-9,steer:null,runCmd:null};
 let T=0;const W8=async ms=>{if(!await s.wait(st.fast?ms*.15:calm?ms*.7:ms))throw STOP;};
 const say=(kind,secs=2.6)=>{const l=DOYLE[kind];if(!l)return;st.say=l[Math.floor(Math.random()*l.length)];st.sayT=T+secs;};
 const banner=(text,color='#ffd23f',secs=1.6,logo=null)=>{st.banner={text,color,t0:T,until:T+secs,logo};};
 const bat=()=>teams[st.half&1],fld=()=>teams[1-(st.half&1)],batter=()=>bat().lineup[bat().order%9];
 // ---- online: one reader; stream messages are handled at once, the rest wait in a queue for recv(type)
 const box={q:[],wait:null};
 if(net)void (async()=>{for(;;){const m=await net.next();if(!m||!s.alive){box.closed=true;box.wait?.();return;}
   if(m.fs){if(st.play?.viewer)st.play.snap(m.fs);continue;}if(m.rn){if(st.play&&!st.play.viewer)st.runCmd=m.rn;continue;}
   if(m.sa||m.sl){const [n,u,v]=m.sa||m.sl;st.netSteer[n]={u:+u||0,v:+v||0,locked:!!m.sl};continue;}
   if(m.bx){const [bx,by,bu,pl]=m.bx;Object.assign(st.bx,{x:clamp(+bx||0,-1,1),y:clamp(+by||0,-1,1),bunt:!!bu,plane:['lo','mid','hi'][pl]||'mid'});continue;}box.q.push(m);box.wait?.();}})();
 async function recv(key){for(;;){const i=box.q.findIndex(m=>m[key]!==undefined);if(i>=0)return box.q.splice(i,1)[0][key];if(box.closed)return null;await new Promise(r=>box.wait=r);box.wait=null;}}
 const send=m=>{if(net)net.send(m);};
 // ---- layout
 let BL=null,bgKey='';const lay=()=>{const k=s.W+'x'+s.H;if(k!==bgKey){bgKey=k;BL=A.batLayout(s.W,s.H);}return BL;};
 let hits=[];
 // ---- one pitch: the fielding side's choice, then the swing (or the take), judged by the batting side
 // ---- one pitch, the way Ken Griffey baseball plays it: the pitcher moves along the rubber, picks a pitch and steers it in
 // flight (aftertouch) until it is LOCK of the way in; the batter moves around the batter's box (that is where the bat's sweet
 // spot crosses the plate), swings (the bat meets the ball SWING_LAG after the tap) and picks the swing: level, up (lift it)
 // or down (beat it into the ground); or squares to bunt.
 const STEER={fast:[.3,.25],curve:[.45,.85],slider:[.85,.3],change:[.4,.45]},PLANE={hi:.62,mid:0,lo:-.62},SWING_LAG=.1,LOCK=.72;
 const sweetU=()=>-.2+st.bx.x*1.05;
 const flightK=()=>st.pitch&&T>=st.pitch.rel?(T-st.pitch.rel)/st.pitch.plan.T:0;
 const steerOf=()=>!st.pitch?{u:0,v:0}:st.pitch.steer||st.netSteer[st.pitch.pn]||{u:0,v:0};
 function finalPlan(){const p=st.pitch.plan,sv=steerOf();return {...p,u:p.u+sv.u,v:p.v+sv.v};}
 const capSteer=(kind,u,v)=>{const c=STEER[kind]||STEER.fast;return {u:clamp(u,-1,1)*c[0],v:clamp(v,-1,1)*c[1]};};
 let pn=0,bxSent=0;
 const sendBox=(force)=>{if(!net||ctrl(st.half)!=='local'||(!force&&T-bxSent<.1))return;bxSent=T;send({bx:[Math.round(st.bx.x*100)/100,Math.round(st.bx.y*100)/100,st.bx.bunt?1:0,{lo:0,mid:1,hi:2}[st.bx.plane]]});};
 // this phone pitches: tell the batter's phone where the steering ended up once the pitch is locked
 function lockLater(n){void (async()=>{try{while(st.pitch?.pn===n&&flightK()<LOCK)await W8(16);}catch{return;}if(st.pitch?.pn===n){st.pitch.locked=true;const sv=st.pitch.steer;send({sl:[n,sv.u,sv.v]});}})();}
 // the batter's side of a pitch on this phone (a human or the CPU); returns once the ball is past
 async function batterWindow(cpuBat,count){let cpuAt=null,read=false;
  while(T<st.pitch.arrive+R.WINDOW+.05){
   if(cpuBat&&!read&&flightK()>=.55){read=true;const cs=R.cpuSwing(finalPlan(),count,skill(),Math.random);
    if(cs){st.bx.x=clamp((cs.cu+.2)/1.05,-1,1);st.bx.plane=cs.cv>.31?'hi':cs.cv<-.31?'lo':'mid';cpuAt=st.pitch.arrive+cs.dt-SWING_LAG;}}
   if(cpuAt!=null&&!st.swing&&T>=cpuAt)doSwing();await W8(16);}
  if(net&&!st.pitch.steer){const t1=T;while(!st.netSteer[st.pitch.pn]?.locked&&T-t1<1.5)await W8(16);}}
 async function onePitch(){const ft=1-st.half,bt=st.half;st.pitch=null;st.swing=null;st.botSwing=false;st.phase='pitch';pn++;let plan;
  const pr=fld().pitcher.r;
  if(ctrl(ft)==='local'){const ch=await new Promise(res=>{st.ui={mode:'pitch',kind:null,res};});st.ui=null;plan=R.pitchPlan(ch.kind,st.rubber*.55,0,pr.control,Math.random);plan.rub=st.rubber;plan.pn=pn;send({pt:plan});}
  else if(ctrl(ft)==='cpu'){await W8(650);const ch=R.cpuPitch(st.count,skill(),Math.random);plan=R.pitchPlan(ch.kind,ch.u,ch.v,pr.control*(.8+.3*skill()),Math.random);plan.rub=clamp(ch.u*.7+(Math.random()-.5)*.5,-1,1);}
  else{plan=await recv('pt');if(!plan)plan=R.pitchPlan('fast',0,0,.8,Math.random);}
  const windup=.8,t0=T;st.pitch={plan,pn:plan.pn||pn,t0,rel:t0+windup,arrive:t0+windup+plan.T,steer:ctrl(ft)==='remote'?null:{u:0,v:0}};st.phase='swing';snd.whoosh();
  if(ctrl(ft)==='local')lockLater(st.pitch.pn);
  let result;
  if(ctrl(bt)==='remote'){result=await recv('sw');if(!result)result={r:'ball'};if(result.dt!=null&&!st.swing)st.swing={t:st.pitch.arrive+result.dt-SWING_LAG};while(T<st.pitch.arrive+.15)await W8(16);}
  else{await batterWindow(ctrl(bt)==='cpu',st.count);result=judge();send({sw:result});}
  st.bx.bunt=false;st.bx.plane='mid';sendBox(true);return result;}
 function doSwing(){if(st.swing||!st.pitch||T<st.pitch.rel||st.bx.bunt)return;st.swing={t:T,u:sweetU(),v:PLANE[st.bx.plane]??0,y:st.bx.y};snd.whoosh();}
 function judge(){const plan=finalPlan(),sw=st.swing,br=batter().r;
  if(!sw&&st.bx.bunt){const du=plan.u-sweetU();if(Math.abs(du)<.6&&Math.abs(plan.v)<.9){const th=(Math.random()-.5)*84*R.D2R,hit={mph:Math.round(24+Math.random()*16+br.contact*6),phi:Math.round(-8+Math.random()*16),theta:Math.round(th*1000)/1000};
    return {r:Math.abs(th)>45*R.D2R||R.flight(hit).foul?'foul':'hit',hit,bunt:true};}
   return {r:R.inZone(plan.u,plan.v)?'strike':'ball'};}
  if(!sw)return {r:R.inZone(plan.u,plan.v)?'strike':'ball'};
  // standing up in the box meets the ball sooner, before a breaking ball has finished breaking; deep in the box, later
  const y=sw.y||0,fw=Math.max(0,y),meet={...plan,u:plan.u-plan.bx*.17*fw,v:plan.v-plan.by*.17*fw},dt=sw.t+SWING_LAG-(st.pitch.arrive-y*.035);
  const c=R.contact(meet,dt,sw.u,sw.v,derby?{...br,boost:11}:br,Math.random),out={dt:Math.round((sw.t+SWING_LAG-st.pitch.arrive)*1000)/1000};
  if(c.kind==='miss')return {r:'swing',...out};
  if(c.kind==='foul')return {r:'foul',hit:{mph:c.mph,phi:c.phi,theta:c.theta},...out};
  const hit={mph:Math.round(c.mph*10)/10,phi:Math.round(c.phi*10)/10,theta:Math.round(c.theta*1000)/1000};const f=R.flight(hit);return {r:f.foul?'foul':'hit',hit,q:c.q,...out};}
 // ---- a plate appearance; returns when it ends
 async function plateAppearance(){st.count=R.newCount();const who=batter();Object.assign(st.bx,{x:0,y:0,plane:'mid',bunt:false});banner(`${who.name} AT BAT`,st.half?'#9ad7ff':'#ffd23f',1.1);
  for(;;){const res=await onePitch();st.res={...res,t:T};
   if(res.r==='hit'||(res.hit&&res.r==='foul'))snd.crack(clamp((res.hit.mph-50)/60,.3,1));else snd.pop();
   if(res.r==='hit'){const out=await runPlay(res.hit);bat().order++;return out;}
   (st.plog||=[]).push(res.r);const tl=R.tally(st.count,res.r);st.count=tl.count;
   if(tl.walk){say('walk');const w=R.walk(st.bases.map(b=>!!b));const nb=[...st.bases];if(nb[0]){if(nb[1]){if(nb[2])scoreRun(nb[2]);nb[2]=nb[1];}nb[1]=nb[0];}nb[0]=who;st.bases=nb;void w;bat().order++;await W8(900);return;}
   if(tl.k){say('strikeout');banner('STRIKE THREE!','#ff8a7a',1.2);st.outs++;bat().order++;snd.boo();await W8(1100);return;}
   say(res.r==='ball'?'ball':res.r==='foul'?'foul':res.r==='swing'?'swing':'strike',2);await W8(res.r==='foul'?1100:700);}}
 const scoreRun=()=>{bat().runs++;snd.crowd(.8);};
 // ---- the ball in play: the fielding side's phone (or the CPU) runs it; the other phone online watches the stream
 async function runPlay(hit){const f=R.flight(hit);st.view='field';st.phase='play';st.playT0=T;st.cam=null;const auth=ctrl(1-st.half)!=='remote';
  const P=st.play=makePlay(f,auth);let sum;
  if(auth){sum=await P.done;send({pl:sum});}else{sum=await recv('pl');if(!sum)sum={outs:0,runs:0,bases:[null,null,null],kind:'single'};}
  // apply: outs, runs (the fielding phone has already left out runs that don't count), runners
  (st.log||=[]).push(sum.text+(sum.runs?` +${sum.runs}`:''));st.outs+=sum.outs;bat().runs+=sum.runs;if(sum.kind!=='out'&&sum.kind!=='fc')bat().hits++;
  const byId=id=>bat().lineup.find(q=>q.id===id)||batter();st.bases=sum.bases.map(id=>id?byId(id):null);
  say(sum.kind==='hr'?'homer':sum.kind==='triple'?'triple':sum.kind==='double'?'double':sum.kind==='single'?'single':sum.dp?'double_play':'out',3);
  banner(sum.text,sum.kind==='out'||sum.kind==='fc'?'#ff8a7a':'#ffd23f',1.8);if(sum.kind==='hr'){snd.crowd(1.6);snd.organ('charge');}else if(sum.kind!=='out')snd.crowd(.9);
  await W8(1500);st.play=null;st.view='bat';return sum;}
 // the play itself
 function makePlay(f,auth){let resolve;const done=new Promise(r=>resolve=r);
  const fielders=R.POSITIONS.map((p,i)=>({i,k:p.k,x:p.x,y:p.y,r:i===0?fld().pitcher.r:fld().lineup[(i)%9].r,id:i===0?fld().pitcher.id:fld().lineup[i%9].id}));
  const startBases=[...st.bases],runners=[];
  // runners: the batter heads to first; those on base go when forced or when the ball isn't catchable in the air
  const catchable=fielders.some(fe=>R.intercept(f,fe.x,fe.y,27*(.85+.3*fe.r.speed)).air);
  runners.push({who:batter(),base:0,k:0,dir:1,state:'run',delay:R.BATTER_START,batter:true});
  for(let b=2;b>=0;b--){const who=startBases[b];if(!who)continue;const forced=startBases.slice(0,b).every(Boolean);runners.push({who,base:b+1,k:0,dir:1,state:catchable&&!forced?'tag':catchable&&forced?'tag':'run',delay:.05,forced});}
  const P={f,t:0,auth,viewer:!auth,fielders,runners,ball:{mode:'flight'},outs:0,runs:0,scorers:[],ended:false,lastEvent:0,landed:false,thrown:0,log:[],hr:f.hr,
   kindOut:null,snapT:0,snaps:[]};
  P.snap=fs=>{P.snaps.push({at:T,...fs});if(P.snaps.length>4)P.snaps.shift();};
  if(!auth)return P;
  // chaser: whoever gets to the ball first
  const pickChaser=()=>{let best=null;for(const fe of fielders){if(fe.k==='C'&&f.dist>40)continue;const it=R.intercept(f,fe.x,fe.y,27*(.85+.3*fe.r.speed),5,P?.t?.15:.45,P?.t||0);if(!best||it.t<best.it.t)best={fe,it};}return best;};
  P.chase=pickChaser();
  const finish=(why)=>{if(P.ended)return;P.ended=true;
   // the third out on a force (or the batter before first) wipes out the runs scored on the play
   let runs=P.runs;if(st.outs+P.outs>=3&&P.forceThird)runs=0;
   const bases=[null,null,null];for(const r of runners)if(r.state==='safe'&&r.base>=1&&r.base<=3)bases[r.base-1]=r.who.id;
   const bR=runners[0];let kind=P.hr?'hr':bR.state==='out'?'out':bR.base>=3?'triple':bR.base===2?'double':'single';if(kind==='single'&&P.outs&&bR.state==='safe')kind='fc';
   const text=P.hr?`HOME RUN! ${Math.round(f.dist)} FT`:kind==='out'?(P.caught?'FLY OUT':P.outs>1?'DOUBLE PLAY!':'OUT!'):kind==='fc'?'FIELDER’S CHOICE':kind.toUpperCase()+'!';
   resolve({outs:P.outs,runs,bases,kind,text,dp:P.outs>1});};
  // the ball's place right now
  P.ballPos=()=>{const b=P.ball;if(b.mode==='flight')return R.ballAt(f,P.t);if(b.mode==='held'){const h=fielders[b.holder];return {x:h.x,y:h.y,z:4};}
   if(b.mode==='throw'){const k=clamp((P.t-b.t0)/b.T,0,1);return {x:b.from.x+(b.to.x-b.from.x)*k,y:b.from.y+(b.to.y-b.from.y)*k,z:5+Math.sin(k*Math.PI)*Math.min(14,b.T*9)};}return {x:0,y:0,z:0};};
  const runnerPos=r=>{const p=R.onPath(r.base,clamp(r.k,0,1));return p;};
  const runSpeed=r=>R.RUN*(.82+.32*r.who.r.speed);
  // which runner is heading to base b and hasn't got there
  const comingTo=b=>runners.filter(r=>r.state==='run'&&r.dir>0&&(r.base+1)%4===b%4&&r.base+1===(b===0?4:b));
  const throwTo=(fe,b)=>{const base=R.BASES[b%4],cov=fielders[coverOf(b)],T2=R.throwTime(fe.x,fe.y,base.x,base.y,fe.r.arm);P.ball={mode:'throw',by:fe.i,from:{x:fe.x,y:fe.y},to:{x:base.x,y:base.y},base:b%4,t0:P.t,T:T2,cover:cov.i};P.thrown++;snd.whoosh();};
  const coverOf=b=>{b%=4;if(b===0)return 1;if(b===1)return 2;if(b===3)return 5;const ss=4,sb=3;return P.chase?.fe.i===ss?sb:ss;};
  // the CPU's (and the auto) throw: the lead runner it can still get, else the base ahead of the lead runner
  const bestThrow=fe=>{let best=null;for(const r of runners){if(r.state!=='run'||r.dir<0)continue;const b=r.base+1,base=R.BASES[b%4],tt=R.throwTime(fe.x,fe.y,base.x,base.y,fe.r.arm),rt=(1-r.k)*90/runSpeed(r)+(r.delay||0);if(tt<rt-.1&&(!best||b>best.b))best={b,tt};}
   if(best)return best.b;const lead=runners.filter(r=>r.state==='run').sort((a,b)=>b.base-a.base)[0];return lead?Math.min(4,lead.base+1):null;};
  P.step=dt=>{if(P.ended)return;P.t+=dt;const t=P.t,bp=P.ballPos();
   // fielders: the chaser runs to the ball (steered by the human if they're dragging), others cover bases
   if(P.ball.mode==='flight'&&Math.floor(t*2)!==P.rechase){P.rechase=Math.floor(t*2);P.chase=pickChaser();}
   const ch=P.chase?.fe;for(const fe of fielders){const sp=27*(.85+.3*fe.r.speed);let tx=fe.x,ty=fe.y;
    if(P.ball.mode==='flight'&&fe===ch){const it=P.chase.it,steer=st.steer&&ctrl(1-st.half)==='local';if(steer){tx=fe.x+st.steer.x*50;ty=fe.y+st.steer.y*50;}else{tx=it.x;ty=it.y;}}
    else if(P.ball.mode!=='flight'&&P.ball.holder===fe.i){const steer=st.steer&&ctrl(1-st.half)==='local';if(steer){tx=fe.x+st.steer.x*50;ty=fe.y+st.steer.y*50;}}
    else{const covers=[1,2,coverOf(2),5].indexOf(fe.i);if(covers>=0&&(P.ball.mode!=='flight'||fe!==ch)){const b=R.BASES[[0,1,2,3][covers]];tx=b.x;ty=b.y;}}
    const dx=tx-fe.x,dy=ty-fe.y,d=Math.hypot(dx,dy),mv=Math.min(d,sp*dt);if(d>.1){fe.x+=dx/d*mv;fe.y+=dy/d*mv;}}
   // the ball: caught in the air, picked up, or thrown to a base
   if(P.ball.mode==='flight'){if(P.hr){if(t>f.T+.2&&!P.hrDone){P.hrDone=true;for(const r of runners){r.state='trot';}}}
    else{const landedNow=f.landed&&t>=f.landed.t;if(landedNow&&!P.landed){P.landed=true;for(const r of runners)if(r.state==='tag')r.state='run';}
     for(const fe of fielders){const reach=fe===P.chase?.fe?5.5:3.5;if(t<.4&&bp.z>.4)break;if(Math.hypot(fe.x-bp.x,fe.y-bp.y)<reach&&bp.z<8){if(!P.landed&&bp.z>.4){P.caught=true;P.ball={mode:'held',holder:fe.i,since:t};P.outs++;runners[0].state='out';snd.pop();P.lastEvent=t;
        // after a catch the runners go back; a runner on third tags up on a deep fly
        for(const r of runners.slice(1)){r.state='safe';r.k=0;if(r.base===3&&Math.hypot(bp.x,bp.y)>235&&P.outs+st.outs<3){r.state='run';r.k=0;r.delay=.3;}}}
       else{P.ball={mode:'held',holder:fe.i,since:t};snd.pop();P.lastEvent=t;for(const r of runners)if(r.state==='tag')r.state='run';}break;}}}}
   else if(P.ball.mode==='throw'&&t>=P.ball.t0+P.ball.T){const b=P.ball.base,cov=fielders[P.ball.cover];cov.x=R.BASES[b].x;cov.y=R.BASES[b].y;P.ball={mode:'held',holder:cov.i,since:t,atBase:b};snd.pop();P.lastEvent=t;
    for(const r of comingTo(b===0?4:b)){r.state='out';P.outs++;if(r.batter||r.forced)P.forceThird=st.outs+P.outs>=3;}}
   else if(P.ball.mode==='held'){const h=fielders[P.ball.holder];
    // the holder steps on a base a runner is forced to
    for(let b=1;b<=4;b++){const base=R.BASES[b%4];if(Math.hypot(h.x-base.x,h.y-base.y)<4)for(const r of comingTo(b)){if(r.batter||r.forced){r.state='out';P.outs++;P.forceThird=st.outs+P.outs>=3;P.lastEvent=t;}}}
    const human=ctrl(1-st.half)==='local'&&!st.auto;if(st.throwReq!=null){const b=st.throwReq;st.throwReq=null;throwTo(h,b===4?0:b);}
    else if(!human||t-P.ball.since>2.2){if(P.thrown<3&&runners.some(r=>r.state==='run')){const b=bestThrow(h);if(b!=null&&t-P.ball.since>(human?2.2:.25)){throwTo(h,b===4?0:b);}}}}
   // runners
   for(const r of runners){if(r.state==='trot'){r.k+=dt*runSpeed(r)/90*1.1;if(r.k>=1){r.base++;r.k=0;if(r.base>=4){r.state='scored';P.runs++;}}continue;}
    if(r.state!=='run')continue;if(r.delay>0){r.delay-=dt;continue;}
    if(st.runCmd==='back'&&!r.batter&&r.dir>0&&r.k<.6){r.dir=-1;}
    r.k+=r.dir*dt*runSpeed(r)/90;
    if(r.dir<0&&r.k<=0){r.k=0;r.dir=1;r.state='safe';continue;}
    if(r.k>=1){r.base++;r.k=0;if(r.base>=4){r.state='scored';P.runs++;P.scorers.push(r.who.id);P.lastEvent=t;continue;}
     // keep going? the GO call, a ball still loose deep, or a slow throw to the next base
     const nb=R.BASES[(r.base+1)%4],h=P.ball.mode==='held'?fielders[P.ball.holder]:null,bpos=P.ballPos();
     const ballT=h?R.throwTime(h.x,h.y,nb.x,nb.y,h.r.arm):P.ball.mode==='flight'?(Math.hypot(bpos.x-nb.x,bpos.y-nb.y)/90+1.3):2;
     const ahead=runners.some(o=>o!==r&&o.state!=='out'&&o.state!=='scored'&&o.base===r.base+1&&o.state==='safe');
     const go=!ahead&&(st.runCmd==='go'||(!r.batter||r.base<3)&&90/runSpeed(r)+.45<ballT);if(!go)r.state='safe';}}
   if(st.runCmd)st.runCmd=null;
   // the end: 3 outs, everyone settled with the ball in hand, a home run trotted round, or a long stall
   if(st.outs+P.outs>=3)return finish('outs');
   const moving=runners.some(r=>r.state==='run'||r.state==='trot'||r.state==='tag');
   if(P.hr&&!moving&&P.hrDone){P.runs=runners.filter(r=>r.state==='scored').length;return finish('hr');}
   if(!moving&&P.ball.mode==='held'&&t-P.lastEvent>.6)return finish('settled');
   if(t>20){for(const r of runners)if(r.state==='run'||r.state==='tag'){r.state='safe';if(r.k>.5)r.base++;r.k=0;}return finish('time');}};
  P.done=done;return P;}
 // ---- the stream for the watching phone, and what it shows
 let streamT=0;function streamPlay(P){if(!net||P.viewer||T-streamT<1/15)return;streamT=T;const b=P.ballPos();
  send({fs:{t:P.t,b:[Math.round(b.x*10)/10,Math.round(b.y*10)/10,Math.round(b.z*10)/10],f:P.fielders.map(fe=>[Math.round(fe.x),Math.round(fe.y)]),r:P.runners.map(r=>[r.base,Math.round(r.k*100)/100,r.state])}});}
 function viewState(P){if(!P.viewer)return {ball:P.ballPos(),fielders:P.fielders,runners:P.runners.map(r=>({...r,pos:R.onPath(r.base,clamp(r.k,0,1))}))};
  const sn=P.snaps;if(!sn.length){const b=R.ballAt(P.f,Math.max(0,T-(st.playT0||T)));return {ball:b,fielders:R.POSITIONS.map(p=>({x:p.x,y:p.y})),runners:[]};}
  const a=sn[Math.max(0,sn.length-2)],b=sn[sn.length-1],k=clamp((T-b.at)/(1/15),0,1),L=(u,v)=>u+(v-u)*k;
  return {ball:{x:L(a.b[0],b.b[0]),y:L(a.b[1],b.b[1]),z:L(a.b[2],b.b[2])},fielders:b.f.map(([fx,fy],i)=>({x:a.f[i]?L(a.f[i][0],fx):fx,y:a.f[i]?L(a.f[i][1],fy):fy})),
   runners:b.r.map(([base,kk,state],i)=>({state,pos:R.onPath(base,clamp(kk,0,1)),who:bat().lineup[i===0?bat().order%9:0]}))};}
 // ---- input
 const B=()=>lay();
 function act(id){if(s.paused)return;snd.pop&&vibrate(8);
  if(st.ui?.mode==='pitch'&&id.startsWith('pitch:')){st.ui.res({kind:id.slice(6)});return;}
  if(id==='bunt'){if(ctrl(st.half)==='local'&&!st.swing){st.bx.bunt=!st.bx.bunt;sendBox(true);}return;}
  if(id.startsWith('throw:')){st.throwReq=+id.slice(6);return;}
  if(id==='go'||id==='back'){if(ctrl(st.half)==='local'){if(st.play&&!st.play.viewer)st.runCmd=id;else send({rn:id});}return;}
  if(st.ui?.mode==='innings'&&id.startsWith('inn:')){st.ui.res(+id.slice(4));return;}}
 // who a touch in the batting view belongs to: with both teams on this phone the pitcher has the top of the screen and the
 // batter the bottom; otherwise the whole screen is this phone's player's
 const roleAt=p=>{const L=B(),bl=ctrl(st.half)==='local',fl=!derby&&ctrl(1-st.half)==='local';if(bl&&fl)return p.y<L.H*.45?'pitch':'bat';return bl?'bat':fl?'pitch':null;};
 const drags=new Map();let steerSent=0;
 s.on(c,'pointerdown',ev=>{if(s.paused||!s.alive)return;ev.preventDefault();const p=s.pointer(ev),b=hits.find(h=>h.on!==false&&p.x>=h.X&&p.x<=h.X+h.w&&p.y>=h.Y&&p.y<=h.Y+h.h);
  if(b){st.pressId=b.id;st.pressT=T;act(b.id);return;}s.capture(ev);const d={id:ev.pointerId,x:p.x,y:p.y,kind:null};drags.set(ev.pointerId,d);
  if(st.view==='field'){d.kind='field';return;}
  const role=roleAt(p),L=B();
  if(role==='pitch'){if(st.ui?.mode==='pitch'){d.kind='rubber';d.r0=st.rubber;}else if(st.pitch&&!st.pitch.locked&&st.pitch.steer){d.kind='steer';d.s0={...st.pitch.steer};}}
  else if(role==='bat'){if(p.x<L.W*.5){d.kind='move';d.b0={x:st.bx.x,y:st.bx.y};}
   else{d.kind='swing';if(st.phase==='swing')doSwing();}}});
 s.on(c,'pointermove',ev=>{const d=drags.get(ev.pointerId);if(!d)return;const p=s.pointer(ev),dx=p.x-d.x,dy=p.y-d.y,L=B();
  if(d.kind==='field'&&ctrl(1-st.half)==='local'){const dd=Math.hypot(dx,dy);st.steer=dd>8?{x:dx/Math.max(50,dd),y:-dy/Math.max(50,dd)}:null;return;}
  if(d.kind==='rubber'&&st.ui?.mode==='pitch'){st.rubber=clamp(d.r0+dx/(L.W*.3),-1,1);return;}
  if(d.kind==='steer'&&st.pitch&&!st.pitch.locked&&st.pitch.steer){const sv=capSteer(st.pitch.plan.kind,dx/(L.W*.2),-dy/(L.H*.1));st.pitch.steer=sv;if(T-steerSent>.08){steerSent=T;send({sa:[st.pitch.pn,sv.u,sv.v]});}return;}
  if(d.kind==='move'&&!st.swing){st.bx.x=clamp(d.b0.x+dx/(L.W*.2),-1,1);st.bx.y=clamp(d.b0.y-dy/(L.H*.1),-1,1);sendBox();return;}
  // a swing: flick up as you tap = lift it (fly ball), down = beat it into the ground; it can change until the bat gets there
  if(d.kind==='swing'){const pl=dy<-14?'hi':dy>14?'lo':'mid';if(pl!==st.bx.plane&&(!st.swing||T<st.swing.t+SWING_LAG)){st.bx.plane=pl;if(st.swing)st.swing.v=PLANE[pl];}}});
 for(const ty of ['pointerup','pointercancel'])s.on(c,ty,ev=>{const d=drags.get(ev.pointerId);if(!d)return;s.release(ev);drags.delete(ev.pointerId);if(d.kind==='field')st.steer=null;if(d.kind==='move')sendBox(true);});
 s.on(document,'keydown',ev=>{if(s.paused)return;const k=ev.key;
  if(st.view==='bat'&&ctrl(st.half)==='local'){const m={ArrowLeft:[-.15,0],ArrowRight:[.15,0],ArrowUp:[0,.15],ArrowDown:[0,-.15]}[k];
   if(m&&!st.swing){ev.preventDefault();st.bx.x=clamp(st.bx.x+m[0],-1,1);st.bx.y=clamp(st.bx.y+m[1],-1,1);sendBox();}
   if(k===' '||k==='e'||k==='c'){ev.preventDefault();st.bx.plane=k==='e'?'hi':k==='c'?'lo':'mid';if(st.phase==='swing')doSwing();}if(k==='b')act('bunt');}
  if(!derby&&ctrl(1-st.half)==='local'){if(st.ui?.mode==='pitch'){const m={'1':'fast','2':'curve','3':'slider','4':'change'}[k];if(m)st.ui.res({kind:m});if(k==='a'||k==='d')st.rubber=clamp(st.rubber+(k==='a'?-.2:.2),-1,1);}
   else if(st.pitch&&!st.pitch.locked&&st.pitch.steer){const m={a:[-1,0],d:[1,0],w:[0,1],s:[0,-1]}[k];if(m){const c0=STEER[st.pitch.plan.kind]||STEER.fast,sv=st.pitch.steer;st.pitch.steer=capSteer(st.pitch.plan.kind,sv.u/c0[0]+m[0]*.5,sv.v/c0[1]+m[1]*.5);send({sa:[st.pitch.pn,st.pitch.steer.u,st.pitch.steer.v]});}}}
  if(st.view==='field'){const m={'1':1,'2':2,'3':3,'0':4,'h':4}[k];if(m!=null)act('throw:'+m);}});
 // ---- bots: s.debug.bot() / st.auto play this phone's choices
 let botT=0;function botAct(){if(T<botT)return null;botT=T+(st.fast?.05:.3);
  if(st.ui?.mode==='innings'){st.ui.res(1);return 'innings';}
  if(st.ui?.mode==='pitch'){const ch=R.cpuPitch(st.count,.7,Math.random);st.rubber=clamp(ch.u*.7,-1,1);st.botAim={u:ch.u,v:ch.v};st.ui.res(ch);return 'pitch';}
  // the bot pitcher steers toward where it wanted the pitch
  if(st.pitch&&st.pitch.steer&&!st.pitch.locked&&st.botAim&&ctrl(1-st.half)==='local'&&!derby){const p=st.pitch.plan,c0=STEER[p.kind]||STEER.fast;st.pitch.steer=capSteer(p.kind,(st.botAim.u-p.u)/c0[0],(st.botAim.v-p.v)/c0[1]);send({sa:[st.pitch.pn,st.pitch.steer.u,st.pitch.steer.v]});st.botAim=null;}
  if(st.phase==='swing'&&st.pitch&&ctrl(st.half)==='local'&&!st.swing&&!st.botSwing&&flightK()>=.55){st.botSwing=true;const cs=R.cpuSwing(finalPlan(),st.count,.8,Math.random);
   if(cs){st.bx.x=clamp((cs.cu+.2)/1.05,-1,1);st.bx.plane=cs.cv>.31?'hi':cs.cv<-.31?'lo':'mid';sendBox(true);const at=st.pitch.arrive+cs.dt-SWING_LAG,n=st.pitch.pn;const wait=()=>{if(!s.alive||st.pitch?.pn!==n)return;if(T>=at)doSwing();else requestAnimationFrame(wait);};wait();}return 'swing';}
  return null;}
 // ---- drawing
 function render(){const L=lay(),{W,H}=L;x.setTransform(1,0,0,1,0,0);hits=[];
  if(st.view==='bat')drawBat(L);else drawFieldView(W,H);
  // scoreboard + ticker + banner
  const sz=Math.max(11,Math.min(W*.034,17));
  if(!derby)A.scoreboard(x,8,8,sz,{names:teams.map(t=>t.name),runs:teams.map(t=>t.runs),inning:st.inning,top:st.half===0,balls:st.count.b,strikes:st.count.s,outs:st.outs,bases:st.bases.map(Boolean),innings:st.innings});
  else derbyBoard(sz);
  if(st.say&&st.sayT>T)A.ticker(x,W,8+sz*4.1,st.say,sz*.92,'ml-harry-doyle');
  if(st.banner&&st.banner.until>T){const b=st.banner,k=Math.min(1,(T-b.t0)*4);x.save();x.globalAlpha=Math.min(1,(b.until-T)*3);if(!(b.logo&&A.logo(x,b.logo,W/2,H*.42-(1-k)*20,W*.9,H*.25)))A.bigText(x,W,H*.42-(1-k)*20,b.text,b.color,Math.max(28,Math.min(W*.11,64)));x.restore();}
  if(st.ui?.mode==='innings')drawMenu(W,H);}
 function derbyBoard(sz){const d=st.derby,w=Math.max(150,sz*10);x.save();x.fillStyle='rgba(10,14,30,.88)';A.rr(x,8,8,w,sz*3.4,8);x.fill();x.strokeStyle='#f5c518';x.stroke();x.font=`400 ${sz}px ${A.FONT}`;x.textBaseline='middle';
  [0,1].forEach(i=>{x.fillStyle=A.TEAM_COL[i][0];x.fillRect(14,8+sz*(.45+i*1.25),6,sz);x.fillStyle=d.p===i?'#ffd23f':'#fff';x.textAlign='left';x.fillText(teams[i].name,26,8+sz*(.95+i*1.25));x.textAlign='right';x.fillText(`${d.hr[i]} HR`,w-4,8+sz*(.95+i*1.25));});
  x.font=`800 ${sz*.62}px ${A.BODY}`;x.fillStyle='#fff';x.textAlign='left';x.fillText(`OUTS ${d.outs}/10 · LONGEST ${Math.round(Math.max(...d.long))} FT`,14,8+sz*3.05);x.restore();}
 function drawBat(L){x.drawImage(A.battingBG(L),0,0,L.W,L.H);const ft=1-st.half,bt=st.half,pp=st.pitch;
  // the pitcher where he stands on the rubber: windup, release
  const ph=L.H*(L.wide?.12:.095),rub=pp?(pp.plan.rub||0):(st.ui?.mode==='pitch'?st.rubber:0),mx=L.mound.x+rub*L.zone.w*.32;
  let pose='stand',pk=0;if(pp){const k=T-pp.t0,wu=Math.max(.1,pp.rel-pp.t0-.2);pose=k<wu?'windup':k<wu+.55?'throw':'stand';pk=pose==='windup'?k/wu:(k-wu)/.55;}
  A.player(x,mx,L.mound.y,ph,ft,fld().pitcher.id,{pose,k:pk,t:T,facing:-1,kind:'pitcher'});
  // the strike zone and the pitch (bending with the pitcher's steering)
  const z=L.zone,zx=z.x-z.w/2,zy=z.y-z.h/2;x.save();x.strokeStyle='rgba(255,255,255,.5)';x.lineWidth=2;x.strokeRect(zx,zy,z.w,z.h);x.globalAlpha=.15;x.strokeRect(zx+z.w/3,zy,z.w/3,z.h);x.strokeRect(zx,zy+z.h/3,z.w,z.h/3);x.restore();
  // where this phone's batter's bat meets the zone (faint), and the plane he is swinging on
  if(ctrl(bt)==='local'&&st.phase!=='intro'){const p=A.zoneXY(L,sweetU(),PLANE[st.bx.plane]??0);x.save();x.globalAlpha=st.bx.bunt?.45:.28;x.strokeStyle='#ffd23f';x.lineWidth=2;x.beginPath();x.ellipse(p.x,p.y,z.w*.19,z.w*.1,0,0,7);x.stroke();x.restore();}
  if(pp&&T>=pp.rel){const k=clamp((T-pp.rel)/pp.plan.T,0,1.2),e=Math.min(1,k),pa=R.pitchAt(pp.plan,e),sv=steerOf();pa.u+=sv.u*e*e;pa.v+=sv.v*e*e;
   const end=A.zoneXY(L,pa.u,pa.v),start={x:mx+ph*.25,y:L.mound.y-ph*.85},bx=start.x+(end.x-start.x)*e,by=start.y+(end.y-start.y)*e,r=2+e*e*(z.w*.06);
   if(k<1.15&&!(st.res&&st.res.t>pp.rel&&st.res.r==='hit'&&k>1)){x.fillStyle='rgba(0,0,0,.25)';x.beginPath();x.ellipse(bx,by+r*2+e*z.h*.4,r,r*.4,0,0,7);x.fill();A.ball(x,bx,by,r);}}
  // a hit ball leaving, and fouls flying off
  if(st.res&&st.res.hit&&pp&&T-st.res.t<.8&&T>pp.arrive){const k=(T-pp.arrive)/.8,h=st.res.hit,dx=Math.sin(h.theta)*k*L.W*.7,dy=-k*L.H*(.25+h.phi/90);A.ball(x,L.zone.x+dx,L.zone.y+dy,Math.max(2,6-k*4));}
  const swingK=st.swing?clamp((T-st.swing.t)/.22,0,1):0;A.batter(x,L,bt,batter().id,swingK,st.res&&st.res.r==='hit'?'win':'normal',T,{bx:st.bx.x,by:st.bx.y,bunt:st.bx.bunt&&!st.swing});
  const rs=st.res&&pp&&st.res.t>=pp.t0?st.res:null;A.catcherUmp(x,L,ft,T,{caught:!!(pp&&T>pp.arrive&&T-pp.arrive<.8&&(!rs||(rs.r!=='hit'&&rs.r!=='foul'))),call:!!(rs&&rs.r==='strike'&&T-rs.t<1.2)});
  // the controls / hints for this phone
  const fs=Math.max(12,Math.min(L.W*.04,18)),both=!derby&&ctrl(bt)==='local'&&ctrl(ft)==='local';
  if(both){x.save();x.globalAlpha=.25;x.strokeStyle='#fff';x.setLineDash([6,6]);x.beginPath();x.moveTo(0,L.H*.45);x.lineTo(L.W,L.H*.45);x.stroke();x.restore();}
  if(st.ui?.mode==='pitch'){const kinds=['fast','curve','slider','change'],bw=Math.min(130,(L.W-50)/4),bh=Math.min(52,L.H*.07),x0=L.W/2-bw*2-15,by=both?L.H*.45-bh-14:L.H-(L.wide?58:96);
   A.bigText(x,L.W,by-fs*1.6,`${fld().name}: DRAG TO MOVE ON THE RUBBER · PICK A PITCH`,'#fff',fs*1.05);
   kinds.forEach((k,i)=>{const b={id:'pitch:'+k,X:x0+i*(bw+10),Y:by,w:bw,h:bh,label:R.PITCHES[k].name,sub:`${R.PITCHES[k].mph} MPH`,tone:'dark',hot:st.pressId==='pitch:'+k&&T-st.pressT<.15};hits.push(A.button(x,b));});}
  else if(pp&&pp.steer&&!pp.locked&&ctrl(ft)==='local'&&T>=pp.t0+.2)A.bigText(x,L.W,both?L.H*.45-fs*1.4:L.H-(L.wide?40:74),'DRAG TO STEER THE PITCH','#ffd23f',fs*1.1);
  else if(st.phase==='pitch'&&ctrl(ft)!=='local'&&!derby&&ctrl(bt)!=='local')A.bigText(x,L.W,L.H-(L.wide?40:74),`${fld().name} IS THINKING…`,'#ffe9a8',fs);
  // the batter's pads: drag on the left to move in the box, tap on the right to swing (flick up / down as you tap)
  if(ctrl(bt)==='local'&&st.view==='bat'&&st.phase!=='intro'){const r=Math.min(46,L.W*.11),yb=L.H-r-(L.wide?16:28);x.save();x.lineWidth=2;
   for(const [cx,lab,sub] of [[r+18,'MOVE','in the box'],[L.W-r-18,'SWING','flick ↑ fly · ↓ grounder']]){x.globalAlpha=.32;x.fillStyle='#0b1020';x.beginPath();x.arc(cx,yb,r,0,7);x.fill();x.globalAlpha=.6;x.strokeStyle='#fff';x.stroke();x.globalAlpha=.9;
    x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.font=`400 ${r*.42}px ${A.FONT}`;x.fillText(lab,cx,yb-r*.08);x.font=`700 ${Math.max(9,r*.2)}px ${A.BODY}`;x.fillText(sub,cx,yb+r*.36);}
   x.restore();if(!derby){const bw=r*1.7,bh=r*.7;hits.push(A.button(x,{id:'bunt',X:L.W-r-18-bw/2,Y:yb-r-bh-10,w:bw,h:bh,label:st.bx.bunt?'BUNTING':'BUNT',tone:st.bx.bunt?'gold':'dark',hot:st.pressId==='bunt'&&T-st.pressT<.15}));}}}
 function drawFieldView(W,H){const P=st.play,vs=P?viewState(P):null,ball=vs?vs.ball:{x:0,y:60,z:0};
  const span=W>H*1.15?300:190,focus={x:clamp(ball.x*.85,-200,200),y:clamp(ball.y*.85+30,40,330)};st.cam=st.cam?{x:st.cam.x+(focus.x-st.cam.x)*.12,y:st.cam.y+(focus.y-st.cam.y)*.12}:focus;
  const cam=A.fieldCam(W,H,st.cam,span);A.drawField(x,W,H,cam);
  const ft=1-(st.half&1),bt=st.half&1,h=Math.max(22,cam.k*13);
  if(vs){const list=[];const mv=st.fmove||(st.fmove=[]),thr=P?.ball?.mode==='throw'&&P.t-P.ball.t0<.3?P.ball.by:null;
   vs.fielders.forEach((fe,i)=>{const m=mv[i]||(mv[i]={x:fe.x,y:fe.y,run:0,face:1}),dx=fe.x-m.x,dy=fe.y-m.y;if(Math.hypot(dx,dy)>.05){m.run=T;if(Math.abs(dx)>.02)m.face=dx>0?1:-1;}m.x=fe.x;m.y=fe.y;
    list.push({y:fe.y,draw:()=>{const p=cam.at(fe.x,fe.y);A.player(x,p.x,p.y,h,ft,P.fielders?.[i]?.id||fld().lineup[i%9].id,{pose:thr===i?'throw':T-m.run<.12?'run':'stand',k:thr===i?(P.t-P.ball.t0)/.3:0,t:T,facing:m.face});}});});
   vs.runners.forEach(r=>{if(r.state==='out'||r.state==='scored')return;list.push({y:r.pos.y,draw:()=>{const p=cam.at(r.pos.x,r.pos.y);const rk=r.who?.id||r.id||'r',rm=st.rmove||(st.rmove={}),q=rm[rk]||(rm[rk]={x:r.pos.x,face:1});if(Math.abs(r.pos.x-q.x)>.02)q.face=r.pos.x>q.x?1:-1;q.x=r.pos.x;A.player(x,p.x,p.y,h,bt,r.who?.id||batter().id,{pose:r.state==='run'||r.state==='trot'?'run':'stand',t:T,facing:q.face});}});});
   list.sort((a,b)=>b.y-a.y).forEach(o=>o.draw());A.ballShadow(x,cam,ball);
   if(P&&!P.viewer&&P.chase&&P.ball?.mode==='flight'&&ctrl(ft)==='local'){const fe=P.chase.fe,p=cam.at(fe.x,fe.y);x.save();x.strokeStyle='#ffd23f';x.lineWidth=2;x.beginPath();x.ellipse(p.x,p.y,h*.5,h*.2,0,0,7);x.stroke();x.restore();}}
  // throw buttons for the fielding phone, GO/BACK for the batting phone (none in the Derby: no runners, no throws)
  const bs=Math.min(64,W*.13),pad=10;
  if(ctrl(ft)==='local'&&!derby){const cx=W-pad-bs*1.6,cy=H-pad-bs*1.75-(W>H*1.15?0:24);[[1,1,0,'1ST'],[2,0,-1,'2ND'],[3,-1,0,'3RD'],[4,0,1,'HOME']].forEach(([b,dx,dy,l])=>hits.push(A.button(x,{id:'throw:'+b,X:cx+dx*bs*.95-bs/2,Y:cy+dy*bs*.8-bs*.35,w:bs,h:bs*.7,label:l,tone:'blue',hot:st.pressId==='throw:'+b&&T-st.pressT<.15})));}
  if(ctrl(bt)==='local'&&!derby){const y=H-pad-bs*.8-(W>H*1.15?0:24);hits.push(A.button(x,{id:'back',X:pad,Y:y,w:bs*1.2,h:bs*.75,label:'BACK',tone:'red'}));hits.push(A.button(x,{id:'go',X:pad*2+bs*1.2,Y:y,w:bs*1.2,h:bs*.75,label:'GO!',tone:'green'}));}}
 function drawMenu(W,H){x.save();x.fillStyle='rgba(6,10,24,.86)';x.fillRect(0,0,W,H);if(!A.logo(x,'logo',W/2,H*.2,W*.9,H*.18))A.bigText(x,W,H*.2,'MAJOR LEAGUE BASEBALL','#ffd23f',Math.min(W*.09,52));
  const sz=Math.min(W*.2,110);[0,1].forEach(i=>{const t=teams[i],cx=W*(i?.72:.28),cy=H*.38;A.player(x,cx,cy+sz*.9,sz*1.3,i,t.lineup[0].id,{});x.font=`400 ${Math.min(W*.05,26)}px ${A.FONT}`;x.fillStyle='#fff';x.textAlign='center';x.fillText(`${t.name}`,cx,cy+sz*1.15);x.font=`800 ${Math.min(W*.032,14)}px ${A.BODY}`;x.fillStyle='rgba(255,255,255,.75)';x.fillText(t.club.toUpperCase(),cx,cy+sz*1.38);});
  A.bigText(x,W,H*.66,'HOW MANY INNINGS?','#fff',Math.min(W*.06,30));const bw=Math.min(140,(W-60)/3);[1,3,9].forEach((n,i)=>hits.push(A.button(x,{id:'inn:'+n,X:W/2-bw*1.5-10+i*(bw+10),Y:H*.72,w:bw,h:Math.min(70,H*.09),label:`${n} INNING${n>1?'S':''}`,tone:n===3?'gold':'dark',hot:st.pressId==='inn:'+n&&T-st.pressT<.15})));x.restore();}
 s.frame(dt=>{T+=dt;if(st.auto)botAct();if(st.play&&!st.play.viewer&&!st.play.ended){const k=st.fast?3:1;for(let i=0;i<k;i++)st.play.step(Math.min(dt,1/30));streamPlay(st.play);}render();});
 s.debug={engine:'griffey',st,teams,get T(){return T;},bot:()=>botAct(),hits:()=>hits,layout:()=>lay(),rules:R};
 // ---- the game
 async function game(){
  // innings: picked in the Arcade (player 1's phone online), one inning on the board
  if(store.arcade&&!s.solo?.board){if(!net||net.me===0){st.innings=await new Promise(res=>{st.ui={mode:'innings',res};});st.ui=null;send({inn:st.innings});}else{st.ui=null;st.innings=(await recv('inn'))||1;}}
  else st.innings=1;
  say('start',3);snd.organ('charge');await W8(1500);
  const maxInn=st.innings+2;
  for(st.inning=1;st.inning<=maxInn;st.inning++){for(st.half=0;st.half<2;st.half++){
    if(st.half===1&&st.inning>=st.innings&&teams[1].runs>teams[0].runs)break;   // home team ahead: no bottom half
    st.outs=0;st.bases=[null,null,null];st.count=R.newCount();const before=bat().runs;
    banner(`${st.half?'BOTTOM':'TOP'} OF THE ${ord(st.inning)}`,'#ffe9a8',1.4);await W8(1300);
    while(st.outs<3){await plateAppearance();
     if(st.half===1&&st.inning>=st.innings&&teams[1].runs>teams[0].runs){banner('WALK-OFF!','#ffd23f',2.4);snd.crowd(1.6);snd.organ('charge');await W8(2200);break;}}
    bat().line.push(bat().runs-before);if(st.outs>=3){say('inning',2.2);snd.organ('vamp');await W8(1600);}
    if(st.half===1&&st.inning>=st.innings&&teams[1].runs>teams[0].runs)break;}
   if(st.inning>=st.innings&&teams[0].runs!==teams[1].runs)break;}
  say('end',3);const r=teams.map(t=>t.runs);banner(r[0]===r[1]?'TIE GAME':`${teams[r[0]>r[1]?0:1].name} WIN!`,'#ffd23f',2.6);snd.crowd(1.4);await W8(2600);
  s.finish(r,`Major League Baseball, ${Math.max(st.innings,Math.min(st.inning,st.innings+2))} inning${Math.max(st.innings,Math.min(st.inning,st.innings+2))>1?'s':''}: ${teams[0].name} ${r[0]} · ${teams[1].name} ${r[1]}`);}
 const ord=n=>n+(n%10===1&&n!==11?'ST':n%10===2&&n!==12?'ND':n%10===3&&n!==13?'RD':'TH');
 // ---- the Home Run Derby
 async function homeRunDerby(){const d=st.derby;banner('HOME RUN DERBY','#ffd23f',2.2,'derby-logo');say('start',3);await W8(1300);
  const turns=net?[net.me]:[0,1];
  for(const p of turns){d.p=p;d.outs=0;d.pitches=0;st.half=p;Object.assign(st.bx,{x:0,y:0,plane:'mid',bunt:false});banner(`${teams[p].name} AT THE PLATE`,p?'#9ad7ff':'#ffd23f',1.5);await W8(1300);
   while(d.outs<10&&d.pitches<30){d.pitches++;const plan=R.pitchPlan('fast',(Math.random()-.5)*.7,(Math.random()-.5)*.7,.9,Math.random);plan.T*=1.12;
    st.pitch=null;st.swing=null;st.botSwing=false;st.res=null;st.phase='pitch';await W8(500);pn++;st.pitch={plan,pn,t0:T,rel:T+.8,arrive:T+.8+plan.T,steer:{u:0,v:0}};st.phase='swing';snd.whoosh();
    await batterWindow(ctrl(p)==='cpu',{b:0,s:0});
    const res=judge();st.res={...res,t:T};st.bx.plane='mid';
    if(res.r==='hit'){const f=R.flight(res.hit);snd.crack(.9);if(f.hr){d.hr[p]++;d.long[p]=Math.max(d.long[p],f.dist);banner(`HOME RUN! ${Math.round(f.dist)} FT`,'#ffd23f',1.6);say('homer',2);snd.crowd(1.3);}else{d.outs++;banner(`${Math.round(f.dist)} FT · OUT ${d.outs}`,'#ff8a7a',1.1);}await flyBy(f);}
    else if(res.r==='ball'){await W8(500);}
    else{d.outs++;if(res.r==='foul')snd.crack(.4);else snd.pop();banner(res.r==='foul'?`FOUL · OUT ${d.outs}`:res.r==='strike'?`STRIKE · OUT ${d.outs}`:`MISSED · OUT ${d.outs}`,'#ff8a7a',1);await W8(900);}}
   await W8(800);}
  if(net){send({dfin:{hr:d.hr[net.me],long:d.long[net.me]}});const o=await recv('dfin');const them=1-net.me;if(o){d.hr[them]=o.hr|0;d.long[them]=+o.long||0;}}
  const sc=d.hr.slice(),w=sc[0]!==sc[1]?(sc[0]>sc[1]?0:1):-1;
  banner(w<0?'A TIE!':`${teams[w].name} WINS THE DERBY!`,'#ffd23f',2.4);say('end',2.4);await W8(2400);
  s.finish(sc,`Home Run Derby: ${teams[0].name} ${d.hr[0]} HR (longest ${Math.round(d.long[0])} ft) · ${teams[1].name} ${d.hr[1]} HR (longest ${Math.round(d.long[1])} ft)`);}
 // a hit in the Derby: a quick look at it flying out in the field view
 async function flyBy(f){st.view='field';st.cam=null;st.play={f,viewer:false,ended:true,fielders:R.POSITIONS.map(p=>({...p})),runners:[],t:0,ballPos(){return R.ballAt(f,this.t);},ball:{mode:'flight'}};
  const t0=T;while(T-t0<Math.min(2.4,f.T+.3)){st.play.t=T-t0;await W8(16);}st.play=null;st.view='bat';}
 try{if(derby)await homeRunDerby();else await game();}catch(e){if(e!==STOP)throw e;}
}
Object.assign(exports,{griffeyBall});
