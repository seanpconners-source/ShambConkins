// Paddy's Pool CPU: looks for pot shots (ghost-ball aim into every pocket with clear paths), tries the best few with the
// real physics (speed and draw/follow variations), keeps the one that pots and leaves the best next shot; if nothing pots,
// plays a safety that doesn't foul. Skill (0..1) adds aim and speed error. Async: one simulation per tick so frames keep going.
const PH=require("src/engines/pool/physics.js");
const RU=require("src/engines/pool/rules.js");
const {R,HX,HY}=PH;
const tick=()=>new Promise(r=>setTimeout(r,0));
function segClear(balls,ax,ay,bx,by,skip,rad=2*R){const ex=bx-ax,ey=by-ay,L2=ex*ex+ey*ey||1;
 for(const q of balls){if(!q.on||skip.includes(q.id))continue;const u=Math.max(0,Math.min(1,((q.x-ax)*ex+(q.y-ay)*ey)/L2));if(Math.hypot(q.x-ax-ex*u,q.y-ay-ey*u)<rad-.05)return false;}return true;}
function aimPoint(p){return [(p.mouth[0][0]+p.mouth[1][0])/2,(p.mouth[0][1]+p.mouth[1][1])/2];}
// every straight pot: {t,pocket,gx,gy,dir,cut,d1,d2,score}
function potShots(balls,T,cue,tg){
 const out=[];
 for(const b of balls){if(!b.on||!tg.includes(b.id))continue;
  T.pockets.forEach((p,pi)=>{const [px,py]=aimPoint(p);let ux=px-b.x,uy=py-b.y;const d2=Math.hypot(ux,uy);ux/=d2;uy/=d2;
   if(p.kind==='side'&&Math.abs(uy)<.55)return;   // too shallow for a side pocket
   const gx=b.x-ux*2*R,gy=b.y-uy*2*R,ax=gx-cue.x,ay=gy-cue.y,d1=Math.hypot(ax,ay);if(d1<.5)return;
   const cut=Math.acos(Math.max(-1,Math.min(1,(ax*ux+ay*uy)/d1)));if(cut>1.35)return;
   if(!segClear(balls,b.x,b.y,px,py,[b.id,0]))return;if(!segClear(balls,cue.x,cue.y,gx,gy,[b.id,0]))return;
   const score=-(d1*.35+d2*.8)/(Math.cos(cut)**1.6)-(p.kind==='side'?6:0);
   out.push({t:b.id,pocket:pi,gx,gy,dir:[ax/d1,ay/d1],cut,d1,d2,score});});}
 return out.sort((a,b)=>b.score-a.score);
}
function speedFor(s){const a=5,v2=Math.sqrt(40*40+2*a*s.d2*1.6)*1.3;return Math.min(320,Math.max(30,v2/Math.max(.25,Math.cos(s.cut))+Math.sqrt(2*a*s.d1)*1.2));}
function judgeSim(m,balls,T,shot){
 const c=PH.clone(balls),cue=c.find(b=>b.id===0);if(shot.place){cue.x=shot.place.x;cue.y=shot.place.y;cue.on=true;}
 const on=c.filter(b=>b.on&&b.id).map(b=>b.id);PH.strike(cue,shot.dir,shot.speed,shot.side||0,shot.vert||0);const rec=PH.simulate(c,T,{maxT:12});
 const mm={...m,call:shot.call??m.call,group:m.group.slice(),fouls:m.fouls.slice()};const out=RU.judge(mm,on,rec);return {out,balls:c,rec};
}
function nextShotValue(m,balls,T,out){
 const cue=balls.find(b=>b.id===0);if(!cue.on)return -60;
 const mm={...m,group:m.group.slice(),isBreak:false};if(out.assign){mm.group[m.turn]=out.assign;mm.group[1-m.turn]=out.assign==='solid'?'stripe':'solid';mm.open=false;}
 const on=balls.filter(b=>b.on&&b.id).map(b=>b.id);if(!on.length)return 0;const shots=potShots(balls,T,cue,RU.targets(mm,on,m.turn));
 return shots.length?Math.max(-30,shots[0].score)+Math.min(3,shots.length)*3:-40;
}
async function planShot({m,balls,T,skill=.6,stats={power:1,spin:.4},kitchen=false,bih=false,rand=Math.random}){
 const cue=balls.find(b=>b.id===0),maxV=330*stats.power,spin=stats.spin;
 const on=balls.filter(b=>b.on&&b.id).map(b=>b.id),tg=RU.targets(m,on,m.turn);
 // the break
 if(m.isBreak){const head=balls.filter(b=>b.on&&b.id).sort((a,b)=>a.x-b.x)[0];let place=null;if(bih){place={x:-HX/2,y:(rand()-.5)*10};cue.x=place.x;cue.y=place.y;}
  const dx=head.x-cue.x,dy=head.y-cue.y+(rand()-.5)*.3,L=Math.hypot(dx,dy);return {dir:[dx/L,dy/L],speed:maxV*(.92+rand()*.06),vert:-.12,side:0,place};}
 let places=[null];
 if(bih){places=[];const shots=[];for(const b of balls){if(!b.on||!tg.includes(b.id))continue;T.pockets.forEach((p,pi)=>{const [px,py]=aimPoint(p);let ux=px-b.x,uy=py-b.y;const d=Math.hypot(ux,uy);ux/=d;uy/=d;if(p.kind==='side'&&Math.abs(uy)<.6)return;
   for(const D of [9,15]){const x=b.x-ux*(2*R+D),y=b.y-uy*(2*R+D);if((!kitchen||x<-HX/2)&&PH.freeSpot(balls,x,y,0)&&segClear(balls,b.x,b.y,px,py,[b.id,0])&&segClear(balls,x,y,b.x,b.y,[b.id,0]))shots.push({x,y,score:-(d+D*.3)-(p.kind==='side'?5:0)});}});}
  shots.sort((a,b)=>b.score-a.score);places=shots.slice(0,3).map(s=>({x:s.x,y:s.y}));
  if(!places.length){for(let k=0;k<30&&places.length<2;k++){const x=kitchen?-HX+3+rand()*(HX/2-4):-HX+3+rand()*(2*HX-6),y=-HY+3+rand()*(2*HY-6);if(PH.freeSpot(balls,x,y,0))places.push({x,y});}}}
 let best=null;
 for(const place of places){
  const cpos=place?{x:place.x,y:place.y}:{x:cue.x,y:cue.y};
  const shots=potShots(balls,T,cpos,tg).slice(0,skill>.7?5:3);
  for(const sh of shots){
   const base=speedFor(sh);
   const tries=[[1,0],[1.3,0],[.8,0]];if(skill>.55)tries.push([1,-.6*spin/.5],[1,.6*spin/.5]);
   for(const [kv,vert] of tries){const shot={dir:sh.dir,speed:Math.min(maxV,base*kv),vert:Math.max(-spin,Math.min(spin,vert*.5)),side:0,place,call:sh.pocket};
    const r=judgeSim(m,balls,T,shot);await tick();
    let v=-200;if(r.out.winner===m.turn)v=1000;else if(r.out.winner!==null)v=-1000;else if(!r.out.foul&&r.out.keep&&r.rec.pots.some(p=>p.id===sh.t))v=200+nextShotValue(m,r.balls,T,r.out)+sh.score*.5;else if(!r.out.foul)v=-120;else v=-400;
    if(!best||v>best.v)best={...shot,v};
    if(v>=1000)break;}
   if(best&&best.v>=1000)break;}
 }
 // nothing good: a safety (hit a legal ball, no foul), softly; then random kicks
 if(!best||best.v<0){
  const cpos=places[0]?places[0]:{x:cue.x,y:cue.y};
  const cands=balls.filter(b=>b.on&&tg.includes(b.id)).map(b=>{const dx=b.x-cpos.x,dy=b.y-cpos.y,L=Math.hypot(dx,dy);return {dir:[dx/L,dy/L],L};});
  for(const c of cands.slice(0,4))for(const sp of [55,85,120]){for(const off of [0,.04,-.04]){const a=Math.atan2(c.dir[1],c.dir[0])+off,shot={dir:[Math.cos(a),Math.sin(a)],speed:sp,vert:0,side:0,place:places[0]};const r=judgeSim(m,balls,T,shot);await tick();
   const v=r.out.winner===m.turn?1000:r.out.winner!==null?-1000:r.out.foul?-400:r.out.keep?100:-50;if(!best||v>best.v)best={...shot,v};}}
  for(let k=0;k<10&&(!best||best.v<-100);k++){const a=rand()*6.283,shot={dir:[Math.cos(a),Math.sin(a)],speed:60+rand()*120,vert:0,side:(rand()-.5)*spin,place:places[0]};const r=judgeSim(m,balls,T,shot);await tick();const v=r.out.winner===m.turn?1000:r.out.winner!==null?-1000:r.out.foul?-400:-50;if(v>best.v)best={...shot,v};}
 }
 // skill error
 const err=((1-skill)*1.5+.06)*Math.PI/180,a=Math.atan2(best.dir[1],best.dir[0])+(rand()+rand()+rand()-1.5)*err;
 best.dir=[Math.cos(a),Math.sin(a)];best.speed*=1+(rand()-.5)*(1-skill)*.2;
 return best;
}
Object.assign(exports,{potShots,planShot,aimPoint});
