// Temple Run (Boulder Run revamp): the runner. Pure logic, no drawing, so the CPU's run and tests can play it headless.
// Controls (from the engine): swipe up = jump, down = slide (in the air: drop fast, then slide), left/right = turn in a
// corner's window, else move one lane. The chaser (the boulder on stage 1) is CHASE metres behind; a stumble lets it right
// up to you, and a second stumble before it drops back again means it gets you.
const T=require("src/engines/trun/track.js");

const V0=9,VMAX=17.5,ACC=.05,G=30,JUMP=10.4,SLIDE=.78,STAND=1.75,DUCK=.8,WINDOW=8,CHASE=14,CLOSE=2.2,BACK=1.1;

function makeRunner(course,{who=0}={}){
 const C=course;
 const R={who,seg:C.get(0),a:0,u:0,lane:1,y:0,vy:0,slide:0,v:V0,t:0,coins:0,alive:true,dead:null,deadAt:0,
  turnQ:null,turnQT:0,lastStumble:-99,chase:CHASE,slowT:0,air:false,events:[],hit:new Set(),got:new Set(),
  dist(){return R.seg.s0+R.a;},score(){return Math.floor(R.dist()+R.coins*10);},
  // a corner is near: inside the turn window of the current straight
  inWindow(){return R.a>R.seg.len-WINDOW;},
  input(k){if(!R.alive)return;
   if(k==='up'){if(!R.air){R.vy=JUMP;R.air=true;R.slide=0;R.ev('jump');}}
   else if(k==='down'){if(R.air){R.vy=Math.min(R.vy,-18);R.slideQ=true;}else{R.slide=SLIDE;R.ev('slide');}}
   else if(k==='left'||k==='right'){const side=k==='left'?'L':'R';
    if(R.inWindow()){const ok=R.seg.turn==='T'||R.seg.turn===side;if(ok){R.turnQ=side;R.turnQT=.6;}}
    else{const nl=Math.max(0,Math.min(2,R.lane+(side==='L'?-1:1)));if(nl!==R.lane){R.lane=nl;R.ev('lane');}}}},
  ev(t,o){R.events.push({t,at:R.t,...o});},
  kill(kind){if(!R.alive)return;R.alive=false;R.dead=kind;R.deadAt=R.t;R.ev('dead',{kind});},
  stumble(){if(R.t-R.lastStumble<7.5&&R.lastStumble>0){R.chase=0;R.kill('caught');return;}
   R.lastStumble=R.t;R.chase=CLOSE;R.slowT=.9;R.ev('stumble');},
  step(dt){if(!R.alive){R.t+=dt;return;}
   R.t+=dt;R.v=Math.min(VMAX,V0+ACC*R.t);
   const sp=R.v*(R.slowT>0?.72:1);R.slowT=Math.max(0,R.slowT-dt);
   const a0=R.a;R.a+=sp*dt;
   // lateral: glide to the lane
   const tu=C.laneU(R.lane);R.u+=(tu-R.u)*Math.min(1,dt*14);
   // vertical
   if(R.air||R.y>0){R.vy-=G*dt;R.y+=R.vy*dt;if(R.y<=0){const overGap=R.gapAt(R.a);if(!overGap){R.y=0;R.vy=0;R.air=false;R.ev('land');if(R.slideQ){R.slideQ=false;R.slide=SLIDE;R.ev('slide');}}}}
   R.slide=Math.max(0,R.slide-dt);
   // gaps: no floor under you = fall; below the path = gone
   if(!R.air&&R.gapAt(R.a)){R.air=true;R.vy=Math.min(R.vy,0);}
   if(R.y<-.6){R.kill('fall');return;}
   // chaser drops back
   if(R.chase<CHASE)R.chase=Math.min(CHASE,R.chase+BACK*dt*(R.t-R.lastStumble>2?2.2:.6));
   // obstacles crossed this step
   const seg=R.seg;
   for(const o of seg.obs){if(R.hit.has(o))continue;
    if(o.kind==='gap')continue;
    const half=o.kind==='block'?.55:o.kind==='arch'||o.kind==='fire'?.35:.25;
    if(R.a+.25<o.at-half||a0-.25>o.at+half)continue;
    if(o.kind==='root'){if(R.y<.32){R.hit.add(o);R.stumble();}}
    else if(o.kind==='log'){if(R.y<.72){R.hit.add(o);R.kill('trip');}}
    else if(o.kind==='arch'||o.kind==='fire'){const top=R.y+(R.slide>0?DUCK:STAND);if(top>1.12){R.hit.add(o);R.kill(o.kind==='fire'?'burn':'smack');}}
    else if(o.kind==='block'){let worst=0;for(const l of o.lanes){const ov=(.55+.3)-Math.abs(R.u-C.laneU(l));if(ov>worst)worst=ov;}
     if(worst>.32){R.hit.add(o);R.kill('smack');}else if(worst>0){R.hit.add(o);R.stumble();R.u+=R.u>C.laneU(o.lanes[0])?.25:-.25;}}}
   // coins
   for(const c of seg.coins){if(R.got.has(c))continue;if(c.at>R.a+.4)break;if(c.at<a0-.4)continue;
    const cu=C.laneU(c.lane),body=R.y+(R.slide>0?.4:.9);if(Math.abs(cu-R.u)<.62&&Math.abs(body-c.y)<1){R.got.add(c);R.coins++;R.ev('coin');}}
   // corner
   const cc=seg.len+T.CORNER/2;
   if(R.turnQ){R.turnQT-=dt;if(R.a>=cc-.6||R.turnQT<0&&R.a>seg.len){R.doTurn(R.turnQ);}else if(R.turnQT<0)R.turnQ=null;}
   if(R.alive&&R.a>seg.len+T.CORNER-.2){R.y=0;R.kill('edge');}},
  gapAt(a){for(const o of R.seg.obs)if(o.kind==='gap'&&a>o.at+.15&&a<o.at+o.len-.15)return o;return null;},
  doTurn(side){const seg=R.seg,cc=seg.len+T.CORNER/2,over=R.a-cc;
   const n=C.follow(seg,side);R.seg=n;
   // keep moving: what was past the corner centre carries on along the new straight; sideways offset becomes along
   R.a=-T.CORNER/2+Math.max(-.5,over);R.turnQ=null;R.hit=new Set();R.got=new Set();R.ev('turn',{side});
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
   const lead=o.kind==='gap'?v*.2:o.kind==='arch'||o.kind==='fire'?v*.22:v*.24;
   if(d<lead+v*.04){done.add(key);if(rnd()<err)continue;
    if(o.kind==='arch'||o.kind==='fire')R.input('down');else R.input('up');}
   break;}
  if(laneFor!=null&&laneFor!==R.lane&&react<=0){R.input(laneFor<R.lane?'left':'right');react=.12;if(laneFor===R.lane)laneFor=null;}};}

// play a whole run headless (CPU opponent / tests): returns {score,dist,coins,dead,t}
function simulate(seed,{skill=.7,rnd,maxT=400,dt=1/30}={}){
 const C=T.makeCourse(seed),R=makeRunner(C),bot=makeBot(R,{skill,rnd:rnd||Math.random});
 while(R.alive&&R.t<maxT){bot(dt);R.step(dt);R.events.length=0;}
 return {score:R.score(),dist:Math.floor(R.dist()),coins:R.coins,dead:R.dead,t:+R.t.toFixed(1)};}

Object.assign(exports,{makeRunner,makeBot,simulate,V0,VMAX,STAND,DUCK,CHASE,CLOSE,SLIDE});
