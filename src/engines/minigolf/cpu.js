// Sitabout Mini Golf: the CPU golfer (and the test bot). It tries a fan of shots through the real physics (every angle,
// a ladder of powers) at the moment it will putt (moving obstacles included), scores each by where the ball ends up
// (sunk = best; a penalty = very bad; else the walking distance to the cup over the greens), refines around the best
// few, then misses by its skill. plan() is a generator so the game can think a little every frame.
const P=require("src/engines/minigolf/physics.js");
const VMAX=235;
function score(C,o,field){if(o.kind==='sink')return -1000+o.t;if(o.kind!=='stop')return 2000;const d=field(o.x,o.y);return d+(d<6?0:Math.min(30,d*.15));}
function* plan(C,lie,T0,{fine=true,skill=1}={}){
 const field=P.cupField(C),cand=[];let n=0;
 const cup=C.hole.cup,direct=Math.atan2(cup[1]-lie.y,cup[0]-lie.x);
 const pows=[.14,.22,.3,.38,.46,.55,.64,.74,.86,1];
 for(let ai=0;ai<96;ai++){const a=direct+ai*Math.PI*2/96;
  for(const p of pows){const v=p*VMAX,o=P.runShot(C,lie,Math.cos(a)*v,Math.sin(a)*v,T0);cand.push({a,p,o,s:score(C,o,field)});if(++n%40===0)yield n;}}
 cand.sort((a,b)=>a.s-b.s);
 if(fine){const top=cand.slice(0,6);
  for(const c of top)for(let da=-2;da<=2;da++)for(let dp=-2;dp<=2;dp++){if(!da&&!dp)continue;const a=c.a+da*Math.PI/360,p=Math.max(.05,Math.min(1,c.p+dp*.015)),v=p*VMAX,o=P.runShot(C,lie,Math.cos(a)*v,Math.sin(a)*v,T0);cand.push({a,p,o,s:score(C,o,field)});if(++n%40===0)yield n;}
  cand.sort((a,b)=>a.s-b.s);}
 // a golfer who misses by `err` prefers a line that still works when missed a little: try the best few with that error
 let best=cand[0];
 if(skill<1){const err=errOf(skill),top=[];for(const c of cand){if(top.length>=8)break;if(top.some(t=>Math.abs(t.a-c.a)<.03&&Math.abs(t.p-c.p)<.05))continue;top.push(c);}
  let bm=1e9;const rnd=mulberry(Math.round(lie.x*97+lie.y*31+T0*7));
  for(const c of top){let sum=c.s;for(let k=0;k<5;k++){const a=c.a+gauss(rnd)*err.a,p=Math.max(.04,Math.min(1,c.p*(1+gauss(rnd)*err.p))),v=p*VMAX,o=P.runShot(C,lie,Math.cos(a)*v,Math.sin(a)*v,T0);sum+=score(C,o,field);if(++n%40===0)yield n;}
   const m=sum/6;if(m<bm){bm=m;best=c;}}}
 return {a:best.a,p:best.p,res:best.o,score:best.s};
}
// how far a golfer of skill 0..1 misses: angle sd in radians, power sd as a fraction
const errOf=sk=>({a:(.4+(1-sk)*6)*Math.PI/180,p:.015+(1-sk)*.14});
function mulberry(n){return ()=>{n|=0;n=n+0x6D2B79F5|0;let t=Math.imul(n^n>>>15,1|n);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
const gauss=r=>{let u=0;for(let i=0;i<4;i++)u+=r();return (u-2)*1.7;};
function planNow(C,lie,T0,opts){const g=plan(C,lie,T0,opts);for(;;){const r=g.next();if(r.done)return r.value;}}
Object.assign(exports,{VMAX,plan,planNow,errOf,gauss,mulberry});
