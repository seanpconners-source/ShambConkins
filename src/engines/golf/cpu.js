// Tin Cup Tour CPU golfer (and the "caddie" that picks a club for a person). Plays like a person would: from far away it
// lays up along the hole to a spot in the fairway, in range it goes at the flag; it TRIES shots with the real physics (wind,
// slopes, trees, water) and keeps the best, then its hand shakes by skill. Putts: reads the break by trying lines.
const P=require("src/engines/golf/physics.js");
const C=require("src/engines/golf/courses.js");
const PEN={water:70,ob:70,sand:16,waste:9,deep:12,rough:6,fringe:1.5,green:0,fair:0,tee:0,path:2,cup:-5};
// the point along the hole's centre line `d` metres further on from the closest point to (x,z)
function along(hole,x,z,d){const [,t]=C.polyDist(hole.pts,x,z);let want=t+d,acc=0;const p=hole.pts;
 for(let i=0;i+1<p.length;i++){const a=p[i],b=p[i+1],L=Math.hypot(b.x-a.x,b.z-a.z);if(acc+L>=want||i===p.length-2){const f=Math.max(0,Math.min(1,(want-acc)/L));return {x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f};}acc+=L;}
 return {x:p[p.length-1].x,z:p[p.length-1].z};}
const yawTo=(x,z,tx,tz)=>Math.atan2(tx-x,tz-z);
function sim(hole,ball,lie,club,yaw,power,curve=0){const S=P.makeShot(hole,{x:ball.x,y:hole.height(ball.x,ball.z),z:ball.z,yaw,power,curve},club,lie);return S.run(45);}
// the club a person would take for distance D (m) from this lie: the shortest club whose full flat total reaches D
function suggestClub(D,lie){const list=P.CLUBS.filter(c=>c.kind!=='putter'&&(c.id!=='dr'||lie==='tee'));
 let pick=list[0];for(const c of list){if(P.clubDistance(c,1,'fair').total>=D*.97)pick=c;}return pick;}
// best shot from here. opts: skill 0..1, rand(), quick (fewer tries)
function plan(hole,ball,lie,{skill=.6,rand=Math.random,wind}={}){
 const cup=hole.cup,D=Math.hypot(cup.x-ball.x,cup.z-ball.z);
 if(lie==='green'||(lie==='fringe'&&D<18))return planPutt(hole,ball,lie,skill,rand);
 const clubs=P.CLUBS.filter(c=>c.kind!=='putter'&&(c.id!=='dr'||lie==='tee'));
 const reach=Math.max(...clubs.map(c=>P.clubDistance(c,1,lie).total))*(P.LIES[lie]?.next||1);
 // target: the flag if we can get there, else a lay-up spot in the fairway
 let target=cup,goFlag=true;if(D>reach*1.02){goFlag=false;target=along(hole,ball.x,ball.z,Math.min(reach*.96,D-60));}
 const Dt=Math.hypot(target.x-ball.x,target.z-ball.z),base=yawTo(ball.x,ball.z,target.x,target.z);
 // two or three clubs around the distance
 const sorted=clubs.map(c=>({c,d:P.clubDistance(c,1,lie).total*(P.LIES[lie]?.next||1)})).sort((a,b)=>a.d-b.d);
 let i0=sorted.findIndex(s=>s.d>=Dt*.98);if(i0<0)i0=sorted.length-1;const cand=[sorted[i0],sorted[Math.min(sorted.length-1,i0+1)],sorted[Math.max(0,i0-1)]].filter((v,i,a)=>a.indexOf(v)===i);
 let best=null;
 for(const {c,d} of cand){const pw0=Math.min(1,Math.max(.35,Dt/Math.max(1,d)));
  for(const dp of [-.08,-.04,0,.03,.06])for(const dy of [-.05,-.025,0,.025,.05]){const pw=Math.max(.3,Math.min(1,pw0+dp)),yaw=base+dy;
   const r=sim(hole,ball,lie,c,yaw,pw);const miss=Math.hypot(r.x-target.x,r.z-target.z);
   const sc=miss+(r.why==='water'||r.why==='ob'?PEN.water:PEN[r.lie]??8)+(goFlag?0:Math.max(0,Math.hypot(r.x-cup.x,r.z-cup.z)-Math.hypot(target.x-cup.x,target.z-cup.z))*.3);
   if(!best||sc<best.sc)best={sc,club:c,yaw,power:pw,r};}}
 return shake(best,skill,rand,false);}
function planPutt(hole,ball,lie,skill,rand){const cup=hole.cup,base=yawTo(ball.x,ball.z,cup.x,cup.z),D=Math.hypot(cup.x-ball.x,cup.z-ball.z),pt=P.CLUBS.find(c=>c.kind==='putter');
 let best=null;const pw0=Math.min(1.05,Math.sqrt(D/28)+.04);
 for(const dy of [-.09,-.06,-.04,-.02,0,.02,.04,.06,.09])for(const dp of [-.12,-.06,0,.05,.1,.16]){const pw=Math.max(.05,Math.min(1.1,pw0*(1+dp))),yaw=base+dy*Math.min(1,8/Math.max(2,D))*1.6;
  const r=sim(hole,ball,lie,pt,yaw,pw);const sc=r.why==='holed'?-1+dp*.01:Math.hypot(r.x-cup.x,r.z-cup.z)+(r.lie!=='green'?3:0);if(!best||sc<best.sc)best={sc,club:pt,yaw,power:pw,r};}
 return shake(best,skill,rand,true);}
// a person's hand: power and line errors by skill (normal-ish), a little curve
function shake(b,skill,rand,putt){const g=()=>(rand()+rand()+rand()-1.5)*2,k=1-skill;
 const power=Math.max(.05,b.power*(1+g()*(putt?.05+.07*k:.025+.07*k))),yaw=b.yaw+g()*(putt?.006+.03*k:.01+.035*k),curve=putt?0:g()*(.05+.35*k);
 return {club:b.club,yaw,power,curve,expect:b.r};}
Object.assign(exports,{plan,planPutt,suggestClub,along,yawTo,PEN});
