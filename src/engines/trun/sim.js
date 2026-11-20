// Temple Run (Boulder Run revamp): the runner. Pure logic, no drawing, so the CPU's run and tests can play it headless.
// Controls (from the engine): swipe up = jump, down = slide (in the air: drop fast, then slide), left/right = turn in a
// corner's window, else move one lane. The chaser (the boulder on stage 1) is CHASE metres behind; a stumble lets it right
// up to you, and a second stumble before it drops back again means it gets you.
const T=require("src/engines/trun/track.js");

const POW={magnet:12,boost:5,shield:20,idol:12};// idol (the golden idol): coins count double
const ZONE_BONUS=250,CALM=3.1,V0=9,VMAX=17.5,ACC=.05,G=30,JUMP=10.4,SLIDE=.78,STAND=1.75,DUCK=.8,WINDOW=8,CHASE=14,CLOSE=2.2,BACK=1.1;

function makeRunner(course,{who=0}={}){
 const C=course;
 const R={who,seg:C.get(0),zone0:C.get(0).zone,a:0,u:0,lane:1,y:0,vy:0,slide:0,v:V0,t:0,coins:0,alive:true,dead:null,deadAt:0,
  turnQ:null,turnQT:0,lastStumble:-99,jumpQ:0,bonus:0,calm:0,zone:C.get(0).zone,mile:0,pow:null,powT:0,safeT:0,chase:CHASE,slowT:0,air:false,events:[],hit:new Set(),got:new Set(),
  dist(){return R.seg.s0+R.a;},score(){return Math.floor(R.dist()+R.coins*10+R.bonus);},
  // a corner is near: inside the turn window of the current straight
  inWindow(){return R.a>R.seg.len-WINDOW;},
  input(k){if(!R.alive)return;
   if(k==='up'){if(!R.air){R.vy=JUMP;R.air=true;R.slide=0;R.ev('jump');}else R.jumpQ=.22;}// pressed just before landing: jump on touchdown
   else if(k==='down'){if(R.air){R.vy=Math.min(R.vy,-18);R.slideQ=true;}else{R.slide=SLIDE;R.ev('slide');}}
   else if(k==='left'||k==='right'){const side=k==='left'?'L':'R';
    if(R.inWindow()){const ok=R.seg.turn==='T'||R.seg.turn===side;if(ok){R.turnQ=side;R.turnQT=.6;}}
    else{const nl=Math.max(0,Math.min(2,R.lane+(side==='L'?-1:1)));if(nl!==R.lane){R.lane=nl;R.ev('lane');}}}},
  ev(t,o){R.events.push({t,at:R.t,...o});},
  kill(kind){if(!R.alive)return;if(R.pow==='shield'&&kind!=='fall'&&kind!=='edge'&&kind!=='caught'){R.pow=null;R.safeT=1.2;R.ev('shieldPop');return;}R.alive=false;R.dead=kind;R.deadAt=R.t;R.ev('dead',{kind});},
  stumble(){if(R.pow==='shield'){R.pow=null;R.safeT=1.2;R.ev('shieldPop');return;}if(R.t-R.lastStumble<7.5&&R.lastStumble>0){R.chase=0;R.kill('caught');return;}
   R.lastStumble=R.t;R.chase=CLOSE;R.slowT=.9;R.ev('stumble');},
  step(dt){if(!R.alive){R.t+=dt;return;}
   R.t+=dt;R.v=Math.min(VMAX,V0+ACC*R.t);
   if(R.pow){R.powT-=dt;if(R.powT<=0){if(R.pow==='boost')R.safeT=1.2;R.pow=null;R.ev('powEnd');}}
   R.safeT=Math.max(0,R.safeT-dt);
   R.calm=Math.max(0,R.calm-dt);const calmK=R.calm>.9?.55:R.calm>0?.55+.45*(1-R.calm/.9):1;
   const boost=R.pow==='boost',sp=R.v*(boost?1.6:R.slowT>0?.72:1)*calmK;if(R.calm>0)R.chase=CHASE;R.slowT=Math.max(0,R.slowT-dt);
   const a0=R.a;R.a+=sp*dt;
   // lateral: glide to the lane
   const tu=C.laneU(R.lane);R.u+=(tu-R.u)*Math.min(1,dt*12);
   // vertical
   if(R.air||R.y>0){R.vy-=G*dt;R.y+=R.vy*dt;if(R.y<=0){const overGap=R.gapAt(R.a);if(!overGap){R.y=0;R.vy=0;R.air=false;R.ev('land');if(R.slideQ){R.slideQ=false;R.slide=SLIDE;R.ev('slide');}else if(R.jumpQ>0){R.jumpQ=0;R.vy=JUMP;R.air=true;R.ev('jump');}}}}
   R.jumpQ=Math.max(0,R.jumpQ-dt);
   {const m=Math.floor(R.dist()/500);if(m>R.mile){R.mile=m;R.ev('mile',{m:m*500});}}
   R.slide=Math.max(0,R.slide-dt);
   // gaps: no floor under you = fall; below the path = gone
   if(!R.air&&R.gapAt(R.a)&&!(boost||R.safeT>0)){R.air=true;R.vy=Math.min(R.vy,0);}
   if((boost||R.safeT>0)&&R.y<0&&R.y>-.6){R.y=0;R.vy=0;R.air=false;}
   if(R.y<-.6){R.kill('fall');return;}
   // chaser drops back
   if(R.chase<CHASE)R.chase=Math.min(CHASE,R.chase+BACK*dt*(R.t-R.lastStumble>2?2.2:.6));
   // obstacles crossed this step
   const seg=R.seg;
   for(const o of seg.obs){if(R.hit.has(o)||boost||R.safeT>0)continue;
    if(o.kind==='gap')continue;
    const slideK=T.SLIDE_KINDS.has(o.kind),half=o.kind==='block'?.55:slideK?.35:o.kind==='spikes'?.4:.25;
    if(R.a+.25<o.at-half||a0-.25>o.at+half)continue;
    if(o.kind==='root'){if(R.y<.32){R.hit.add(o);R.stumble();}}
    else if(o.kind==='log'){if(R.y<.72){R.hit.add(o);R.kill('trip');}}
    else if(o.kind==='spikes'){if(R.y<.5){R.hit.add(o);R.kill('spiked');}}
    else if(slideK){const top=R.y+(R.slide>0?DUCK:STAND);if(top>1.12){R.hit.add(o);if(o.kind==='web')R.stumble();else R.kill({fire:'burn',blades:'sliced',darts:'darted'}[o.kind]||'smack');}}
    else if(o.kind==='block'){let worst=0;for(const l of o.lanes){const ov=(.55+.3)-Math.abs(R.u-C.laneU(l));if(ov>worst)worst=ov;}
     if(worst>.32){R.hit.add(o);R.kill('smack');}else if(worst>0){R.hit.add(o);R.stumble();R.u+=R.u>C.laneU(o.lanes[0])?.25:-.25;}}}
   // coins
   const mag=R.pow==='magnet'?7:0;
   for(const c of seg.coins){if(R.got.has(c))continue;if(c.at>R.a+.4+mag)break;if(c.at<a0-.4)continue;
    const cu=C.laneU(c.lane),body=R.y+(R.slide>0?.4:.9);if(mag||Math.abs(cu-R.u)<.62&&Math.abs(body-c.y)<1){R.got.add(c);R.coins+=R.pow==='idol'?2:1;R.ev('coin',{mag:!!mag,c,x2:R.pow==='idol'});}}
   for(const q of seg.pows||[]){if(R.got.has(q))continue;if(q.at>R.a+.5||q.at<a0-.5)continue;
    if(Math.abs(C.laneU(q.lane)-R.u)<.7&&R.y<1.6){R.got.add(q);R.pow=q.kind;R.powT=POW[q.kind];R.ev('power',{kind:q.kind});}}
   // corner
   const cc=seg.len+T.CORNER/2;
   if((boost||R.safeT>0)&&!R.turnQ&&R.a>seg.len-1)R.turnQ=seg.turn==='T'?(seg.k%2?'L':'R'):seg.turn,R.turnQT=1;
   if(R.turnQ){R.turnQT-=dt;if(R.a>=cc-.6||R.turnQT<0&&R.a>seg.len){R.doTurn(R.turnQ);}else if(R.turnQT<0)R.turnQ=null;}
   if(R.alive&&R.a>seg.len+T.CORNER-.2){R.y=0;R.kill('edge');}},
  // Save Me (spend coins): back on your feet where you fell, the chaser knocked back, a moment of safety
  revive(){if(R.alive)return;const seg=R.seg,how=R.dead;R.alive=true;R.dead=null;R.y=0;R.vy=0;R.air=false;R.slide=0;R.slideQ=false;R.jumpQ=0;
   R.safeT=2.5;R.chase=CHASE;R.lastStumble=-99;R.slowT=0;
   if(how==='fall'){const g=R.gapAt(R.a)||seg.obs.find(o=>o.kind==='gap'&&R.a>o.at-1&&R.a<o.at+o.len+1);if(g)R.a=g.at+g.len+.4;}
   if(how==='edge'||R.a>seg.len){R.a=Math.min(R.a,seg.len+T.CORNER/2-.7);R.turnQ=seg.turn==='T'?'L':seg.turn;R.turnQT=1;}
   for(const o of seg.obs)if(Math.abs(o.at-R.a)<3)R.hit.add(o);R.ev('revive');},
  gapAt(a){for(const o of R.seg.obs)if(o.kind==='gap'&&a>o.at+.15&&a<o.at+o.len-.15)return o;return null;},
  doTurn(side){const seg=R.seg,cc=seg.len+T.CORNER/2,over=R.a-cc;
   const n=C.follow(seg,side);R.seg=n;
   // keep moving: what was past the corner centre carries on along the new straight; sideways offset becomes along
   R.a=-T.CORNER/2+Math.max(-.5,over);R.turnQ=null;R.hit=new Set();R.got=new Set();R.ev('turn',{side,k:seg.k});
   if(n.zone!==R.zone){R.zone=n.zone;R.bonus+=ZONE_BONUS;R.calm=CALM;R.ev('zone',{zone:n.zone});}
   C.prune(n.k);}};
 return R;}

// ---------------------------------------------------------------- bot: reads the path ahead like a player would
// skill 0..1; rnd = random stream (seeded for the CPU so both phones agree)
function makeBot(R,{skill=.7,rnd=Math.random}={}){
 const done=new Set();let laneFor=null,react=0;
 return function think(dt){if(!R.alive)return;react-=dt;
  const seg=R.seg,v=R.v,err=(1-skill)*.55*(.6+v/VMAX*.7);
  // turn
  if(R.inWindow()&&!R.turnQ&&R.a>seg.len-5){const side=seg.turn==='T'?(rnd()<.5?'L':'R'):seg.turn;
   if(!done.has('turn'+seg.k)){done.add('turn'+seg.k);if(rnd()>err*.35)R.input(side==='L'?'left':'right');}}
  for(const o of seg.obs){const d=o.at-R.a;if(d<-1)continue;if(d>v*1.6)break;
   const key=seg.k+':'+o.at;if(done.has(key))continue;
   if(o.kind==='block'){const free=[0,1,2].filter(l=>!o.lanes.includes(l));if(!free.includes(R.lane)){const want=free.reduce((b,l)=>Math.abs(l-R.lane)<Math.abs(b-R.lane)?l:b,free[0]);
     if(d<v*.9){done.add(key);if(rnd()>err){laneFor=want;}else laneFor=null;}}else done.add(key);continue;}
   const sl=T.SLIDE_KINDS.has(o.kind),lead=o.kind==='gap'?v*.2:sl?v*.22:o.kind==='spikes'?v*.22:v*.24;
   if(d<lead+v*.04){done.add(key);if(rnd()<err)continue;
    if(sl)R.input('down');else R.input('up');}
   break;}
  if(laneFor!=null&&laneFor!==R.lane&&react<=0){R.input(laneFor<R.lane?'left':'right');react=.12;if(laneFor===R.lane)laneFor=null;}};}

// play a whole run headless (CPU opponent / tests): returns {score,dist,coins,dead,t}
function simulate(seed,{skill=.7,rnd,maxT=400,dt=1/30}={}){
 const C=T.makeCourse(seed),R=makeRunner(C),bot=makeBot(R,{skill,rnd:rnd||Math.random});
 while(R.alive&&R.t<maxT){bot(dt);R.step(dt);R.events.length=0;}
 return {score:R.score(),dist:Math.floor(R.dist()),coins:R.coins,dead:R.dead,t:+R.t.toFixed(1)};}

Object.assign(exports,{ZONE_BONUS,POW,makeRunner,makeBot,simulate,V0,VMAX,STAND,DUCK,CHASE,CLOSE,SLIDE});
