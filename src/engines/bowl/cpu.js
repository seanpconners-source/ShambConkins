// Kingpin Bowling CPU bowler (plain data, Node-testable). It picks a release like a person would: a hook into the pocket
// on a full rack, a straight ball cross-lane at corner pins, the key pin of a leave otherwise; then its hand shakes by skill.
// Everything goes through physics.trace (the lane only), so it reads the oil like the player's ball does.
const PH=require("src/engines/bowl/physics.js");
// styles: hook bowlers (most), a straight "stroker", a two-hander cranker (big revs)
const STYLES={hook:{revs:380,axis:45,speed:8.3,start:15},stroker:{revs:260,axis:25,speed:8.0,start:12},cranker:{revs:520,axis:55,speed:8.6,start:20},
 straight:{revs:60,axis:5,speed:8.2,start:17}};
// where the ball must be when it reaches z: aim the launch angle so it gets there (bisection; the trace is monotonic in angle)
function aimAt(lane,ball,o,tx,tz){let lo=-.14,hi=.14;
 for(let i=0;i<26;i++){const mid=(lo+hi)/2,tr=PH.trace(lane,ball,PH.release({...o,ang:mid},ball));
  let x;if(tr.gutter)x=tr.x>0?9:-9;else x=tr.x-Math.tan(tr.ang*Math.PI/180)*(tz-PH.Z1);
  if(x>tx)lo=mid;else hi=mid;}return (lo+hi)/2;}
// the target for a set of standing pins [{n,x,z}]: the pocket on a full rack, else the front pin, a little to the side
// that sends it into the rest
function target(standing,hand){
 if(standing.length>=9&&standing.some(p=>p.n===1)){const h=hand||1;return {x:h*PH.BOARD*2.5,z:PH.Z1,pocket:true};}
 let front=standing[0];for(const p of standing)if(p.z<front.z-.01||(Math.abs(p.z-front.z)<.01&&Math.abs(p.x)<Math.abs(front.x)))front=p;
 const cx=standing.reduce((a,p)=>a+p.x,0)/standing.length;
 const off=Math.max(-1,Math.min(1,(cx-front.x)/.3))*.05;// hit the front pin on the side toward the others
 return {x:front.x+off,z:front.z,pocket:false};}
// plan one ball. who: {style, hand, skill 0..1}; rand(): seeded 0..1
function plan({lane,ball,standing,who,rand}){
 const st=STYLES[who.style]||STYLES.hook,hand=who.hand||1,skill=Math.max(0,Math.min(1,who.skill??.6));
 const T=target(standing,hand);
 let o;
 if(T.pocket)o={x:PH.boardX(hand>0?st.start:40-st.start),speed:st.speed,revs:st.revs,axis:st.axis,hand};
 else{// spares: straighter and harder, from the other side of the lane (cross-lane), like the pros do with corner pins
  const side=T.x>0?-1:1,startB=20+side*-8;o={x:PH.boardX(Math.max(5,Math.min(35,startB))),speed:st.speed+.4,revs:Math.min(st.revs,120),axis:Math.min(st.axis,10),hand};}
 const g=()=>(rand()+rand()+rand()-1.5)*2;// ~normal
 const miss=(1-skill)*(T.pocket?5:8)+.9;// boards of aim error at the pins (1 sigma); weak bowlers blow spares too
 const ang=aimAt(lane,ball,o,T.x+g()*miss*PH.BOARD,T.z);
 o.ang=ang+g()*(1-skill)*.0012;o.speed*=1+g()*((1-skill)*.04+.01);o.revs=Math.max(0,o.revs*(1+g()*(1-skill)*.12));
 o.x+=g()*(1-skill)*PH.BOARD*.6;
 return o;}
Object.assign(exports,{STYLES,aimAt,target,plan});
