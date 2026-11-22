// Tin Cup Tour (arcade trackball golf) physics: plain data, Node-testable (tests/golf-sim.mjs).
// Units: metres, seconds, radians. World: x east, z north, y up. A COURSE HOLE gives height(x,z), normal(x,z), lie(x,z),
// trees [{x,z,r,h,cr,ch}] (trunk radius r to height h, canopy radius cr at height ch), cup {x,z}, wind {x,z} m/s.
// FLIGHT: a golf ball with drag and lift from its spin (backspin climbs, side spin curves: draw/fade/hook/slice), wind;
// then BOUNCES (by lie: firm fairway, soft rough, dead sand, holding green; backspin checks it up or spins it back) and
// ROLLS on the slopes (rolling resistance by lie, gravity down the slope) until it stops, finds the cup, a hazard or OB.
// Everything after the shot is pure arithmetic on the shot numbers (sent as numbers online), so both phones agree.
const G=9.81,RHO=1.2,BALL_M=.04593,BALL_R=.02135,AREA=Math.PI*BALL_R*BALL_R,CUP_R=.054,YD=.9144;
// clubs: ball speed at 100% (m/s), launch angle (deg), backspin (rpm), roll factor; arcade-tuned (driver ~280 yd total)
const CLUBS=[
 {id:'dr',name:'Driver',short:'DR',v:73,loft:11.5,spin:2700,kind:'wood'},
 {id:'3w',name:'3 Wood',short:'3W',v:68,loft:14,spin:3300,kind:'wood'},
 {id:'5w',name:'5 Wood',short:'5W',v:64.5,loft:16.5,spin:4000,kind:'wood'},
 {id:'4i',name:'4 Iron',short:'4i',v:60,loft:19,spin:4600,kind:'iron'},
 {id:'5i',name:'5 Iron',short:'5i',v:57.5,loft:21.5,spin:5200,kind:'iron'},
 {id:'6i',name:'6 Iron',short:'6i',v:55,loft:24.5,spin:6000,kind:'iron'},
 {id:'7i',name:'7 Iron',short:'7i',v:52,loft:28,spin:6900,kind:'iron'},
 {id:'8i',name:'8 Iron',short:'8i',v:49,loft:31.5,spin:7700,kind:'iron'},
 {id:'9i',name:'9 Iron',short:'9i',v:46,loft:35.5,spin:8500,kind:'iron'},
 {id:'pw',name:'Pitching Wedge',short:'PW',v:42,loft:41,spin:9300,kind:'wedge'},
 {id:'sw',name:'Sand Wedge',short:'SW',v:35,loft:52,spin:10200,kind:'wedge'},
 {id:'pt',name:'Putter',short:'PT',v:6,loft:0,spin:0,kind:'putter'},
];
// lies: bounce restitution, bounce friction (how much speed along the ground a bounce keeps), rolling resistance (m/s^2 per
// g... as a friction coefficient), how much the lie takes off the NEXT shot (power kept, accuracy spread)
const LIES={
 tee:{e:.3,keep:.66,roll:.16,next:1,spread:0,name:'Tee'},
 fair:{e:.3,keep:.66,roll:.16,next:1,spread:0,name:'Fairway'},
 fringe:{e:.28,keep:.68,roll:.13,next:.97,spread:.2,name:'Fringe'},
 green:{e:.22,keep:.42,roll:.065,next:1,spread:0,name:'Green'},
 rough:{e:.18,keep:.45,roll:.32,next:.82,spread:.9,name:'Rough'},
 deep:{e:.1,keep:.3,roll:.55,next:.62,spread:1.6,name:'Deep Rough'},
 sand:{e:.05,keep:.15,roll:1.2,next:.6,spread:1.2,name:'Bunker'},
 waste:{e:.16,keep:.4,roll:.6,next:.78,spread:1,name:'Desert'},
 path:{e:.55,keep:.88,roll:.05,next:1,spread:0,name:'Cart Path'},
 water:{e:0,keep:0,roll:9,next:1,spread:0,name:'Water',hazard:'water'},
 ob:{e:.2,keep:.5,roll:.4,next:1,spread:0,name:'Out of Bounds',hazard:'ob'},
};
const DT=1/240;
const spinR=rpm=>rpm*2*Math.PI/60;
// a shot from the swing: club, aim yaw (rad, 0 = +z, + = toward +x... computed from the target), power 0..1.2, curve (-1 hook ..
// +1 slice for a righty, i.e. + bends right), spin adjust (-1 less backspin .. +1 more), lie of the ball, launch tweak (deg)
function launch(sh,club,lie){const L=LIES[lie]||LIES.fair,c=club;
 const p=Math.max(0,sh.power),over=Math.max(0,p-1),lieK=c.kind==='putter'?1:lie==='sand'&&c.kind==='wedge'?.86:L.next,v=c.v*Math.min(p,1.15)*lieK;
 const loft=(c.loft+(sh.loftAdj||0))*Math.PI/180,yaw=sh.yaw;
 // the curve tilts the spin axis (side spin) and pushes the start line a little the other way (like a real draw/fade)
 const curve=Math.max(-1.6,Math.min(1.6,(sh.curve||0)*(1+over*3))),startOff=-curve*.018,dir=yaw+startOff;
 const hv=Math.cos(loft)*v,vy=Math.sin(loft)*v;
 const back=spinR(c.spin*(1+(sh.spin||0)*.45)*(lie==='rough'||lie==='deep'?.55:1)),side=back*curve*.28;
 // spin vector: backspin about the axis to the left of travel (so lift is up), side spin about the up axis
 const dx=Math.sin(dir),dz=Math.cos(dir);
 return {x:sh.x,y:sh.y,z:sh.z,vx:dx*hv,vy,vz:dz*hv,w:[-dz*back,-side,dx*back],putt:c.kind==='putter'};}
// FLIGHT + GROUND in one stepper. hole: course hole. Returns a Shot object: step(dt) until done; path for drawing
function makeShot(hole,sh,club,lie){const s=launch(sh,club,lie);
 const S={t:0,phase:s.putt?'roll':'air',b:s,path:[[s.x,s.y,s.z]],done:false,result:null,bounces:0,hitTree:0,lastSafe:{x:sh.x,z:sh.z},apex:s.y,carry:null,start:{x:sh.x,z:sh.z},events:[]};
 if(s.putt){s.vy=0;s.y=hole.height(s.x,s.z);}
 const wind=hole.wind||{x:0,z:0};
 // AFTERTOUCH ("english"): rolling the trackball right after the hit changes the spin in flight. Events [t, spin, side]:
 // spin + = more backspin (bites, climbs) / - = topspin (runs), side + = bends right. Live play pushes them with S.english(),
 // a replay (online watcher, CPU) passes sh.eng. They only act while the ball is in the air.
 const eng=(sh.eng||[]).slice();S.engLog=[];
 S.english=(spin,side)=>{if(S.phase!=='air'||S.done)return;const ev=[+S.t.toFixed(3),+spin.toFixed(3),+side.toFixed(3)];S.engLog.push(ev);applyEng(ev);};
 function applyEng([,spin,side]){const w=S.b.w,vx=S.b.vx,vz=S.b.vz,h=Math.hypot(vx,vz)||1,dx=vx/h,dz=vz/h;
  const back=Math.hypot(w[0],w[2])*(1+Math.max(-.9,Math.min(.9,spin)));w[0]=-dz*back;w[2]=dx*back;w[1]-=side*260;}
 function air(dt){const b=S.b,ax0=b.vx-wind.x,ay0=b.vy,az0=b.vz-wind.z,v=Math.hypot(ax0,ay0,az0)||1e-6;
  const w=b.w,wm=Math.hypot(w[0],w[1],w[2]),Sx=BALL_R*wm/v;
  const Cd=.22+.25*Math.min(.3,Sx),Cl=Math.min(.32,1.6*Sx-2.4*Sx*Sx);
  const kd=.5*RHO*AREA*Cd*v/BALL_M,kl=.5*RHO*AREA*Cl*v*v/BALL_M;
  // lift along w x v (normalised)
  let lx=w[1]*az0-w[2]*ay0,ly=w[2]*ax0-w[0]*az0,lz=w[0]*ay0-w[1]*ax0;const ln=Math.hypot(lx,ly,lz)||1;lx/=ln;ly/=ln;lz/=ln;
  b.vx+=(-kd*ax0+kl*lx)*dt;b.vy+=(-kd*ay0+kl*ly-G)*dt;b.vz+=(-kd*az0+kl*lz)*dt;
  b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;const decay=Math.exp(-dt/22);w[0]*=decay;w[1]*=decay;w[2]*=decay;
  if(b.y>S.apex)S.apex=b.y;
  // trees: trunk (cylinder) and canopy (sphere); a hit knocks the ball down / sideways (seeded from the tree index)
  for(let i=0;i<hole.trees.length;i++){const t=hole.trees[i];const dx=b.x-t.x,dz=b.z-t.z,d2=dx*dx+dz*dz,gy=t.y??hole.height(t.x,t.z);
   if(d2<(t.cr+.1)*(t.cr+.1)&&b.y>gy+t.ch-t.cr&&b.y<gy+t.ch+t.cr){const dy=b.y-(gy+t.ch);if(dx*dx+dy*dy+dz*dz<t.cr*t.cr&&S.hitTree!==i+1){S.hitTree=i+1;S.events.push({k:'tree',t:S.t});
     const k=.22+.18*((i*7919)%10)/10;b.vx*=k;b.vz*=k;b.vy=Math.min(b.vy,0)*.3-1;const sgn=(i%2?1:-1);b.vx+=sgn*1.2;w[0]*=.3;w[1]*=.3;w[2]*=.3;}}
   if(d2<(t.r+BALL_R)*(t.r+BALL_R)&&b.y<gy+t.h){const d=Math.sqrt(d2)||1e-3,nx=dx/d,nz=dz/d,vn=b.vx*nx+b.vz*nz;if(vn<0){b.vx-=1.5*vn*nx;b.vz-=1.5*vn*nz;b.vx*=.5;b.vz*=.5;S.events.push({k:'trunk',t:S.t});}}}
  // ground
  const gy=hole.height(b.x,b.z);if(b.y<=gy+BALL_R*.5&&b.vy<0){land(gy);}}
 function land(gy){const b=S.b,lie=hole.lie(b.x,b.z),L=LIES[lie]||LIES.rough;S.bounces++;b.y=gy;
  if(S.carry==null){S.carry=Math.hypot(b.x-S.start.x,b.z-S.start.z);S.landLie=lie;}
  S.events.push({k:'bounce',lie,v:Math.hypot(b.vx,b.vy,b.vz),t:S.t});
  if(L.hazard==='water'){end('water');return;}
  const n=hole.normal(b.x,b.z),vn=b.vx*n[0]+b.vy*n[1]+b.vz*n[2];
  let tx=b.vx-vn*n[0],ty=b.vy-vn*n[1],tz=b.vz-vn*n[2];
  // backspin bites on the bounce: the along-ground speed loses (and can reverse) by spin x grip of the lie
  const w=b.w,back=Math.hypot(w[0],w[2]),tv=Math.hypot(tx,tz)||1e-6,grip=lie==='green'?2.4:lie==='fair'||lie==='fringe'||lie==='tee'?.55:lie==='rough'?.2:.05;
  const bite=Math.min(tv*1.35,back*BALL_R*.42*grip*Math.min(1,Math.abs(vn)/8));
  let keep=L.keep*(tv-bite)/tv;if(S.bounces>1&&lie==='green')keep=Math.max(keep,-.18);
  tx*=keep;ty*=keep;tz*=keep;const e=L.e*Math.min(1,Math.abs(vn)/3);
  b.vx=tx-vn*e*n[0];b.vy=ty-vn*e*n[1];b.vz=tz-vn*e*n[2];w[0]*=.35;w[1]*=.2;w[2]*=.35;
  if(Math.abs(vn)*e<.9){S.phase='roll';b.vy=0;}}
 function roll(dt){const b=S.b,lie=hole.lie(b.x,b.z),L=LIES[lie]||LIES.rough;
  if(L.hazard==='water'){end('water');return;}
  const n=hole.normal(b.x,b.z);// gravity along the slope
  const gx=-G*n[0]*n[1],gz=-G*n[2]*n[1];// tangential part (approx for gentle slopes)
  let v=Math.hypot(b.vx,b.vz);const mu=L.roll,fric=mu*G,gs=Math.hypot(gx,gz);
  if(v>1e-4){const nvx=b.vx+(gx-fric*b.vx/v)*dt,nvz=b.vz+(gz-fric*b.vz/v)*dt;
   if(nvx*b.vx+nvz*b.vz<0&&gs<fric){b.vx=0;b.vz=0;}else{b.vx=nvx;b.vz=nvz;}}
  else if(gs>fric*1.15){b.vx+=gx*dt;b.vz+=gz*dt;}
  b.x+=b.vx*dt;b.z+=b.vz*dt;b.y=hole.height(b.x,b.z);
  // the cup
  const cx=b.x-hole.cup.x,cz=b.z-hole.cup.z,cd=Math.hypot(cx,cz);v=Math.hypot(b.vx,b.vz);
  if(cd<CUP_R){if(v<1.35){end('holed');return;}if(v<1.9&&!S.lipped){S.lipped=true;S.events.push({k:'lip',t:S.t});const k=-.5;b.vx=b.vx*.45+cx/cd*v*.4*k;b.vz=b.vz*.45+cz/cd*v*.4*k;}}
  if(cd>CUP_R*1.6)S.lipped=false;
  if(v<.02&&Math.hypot(gx,gz)<=mu*G*1.15){end(L.hazard==='ob'?'ob':'stop');return;}}
 function end(why){S.done=true;S.phase='done';const b=S.b;
  S.result={why,x:b.x,z:b.z,lie:why==='holed'?'cup':hole.lie(b.x,b.z),carry:S.carry??0,total:Math.hypot(b.x-S.start.x,b.z-S.start.z),apex:S.apex,t:S.t};}
 S.step=(dt=DT)=>{if(S.done)return;S.t+=dt;while(eng.length&&eng[0][0]<=S.t){const ev=eng.shift();if(S.phase==='air'){S.engLog.push(ev);applyEng(ev);}}if(S.phase==='air')air(dt);else roll(dt);
  const b=S.b;if(!S.done){if(hole.out&&hole.out(b.x,b.z)&&S.phase!=='air'){end('ob');return;}if(S.t>40)end('stop');}
  if(S.path.length===0||S.t-(S.pathT||0)>.03){S.pathT=S.t;S.path.push([b.x,b.y,b.z]);}};
 S.run=(cap=60)=>{while(!S.done&&S.t<cap)S.step();return S.result;};
 S.advance=(sec)=>{S.acc=(S.acc||0)+Math.min(sec,.1);while(S.acc>=DT&&!S.done){S.acc-=DT;S.step();}return S.done;};
 return S;}
// distance a full shot with this club goes on flat ground, no wind (yards): for club pick + the landing marker
const FLAT={height:()=>0,normal:()=>[0,1,0],lie:()=>'fair',trees:[],cup:{x:1e9,z:1e9},wind:{x:0,z:0}};
const carryCache=new Map();
function clubDistance(club,power=1,lie='fair'){const k=club.id+'|'+power+'|'+lie;if(carryCache.has(k))return carryCache.get(k);
 const S=makeShot(FLAT,{x:0,y:0,z:0,yaw:0,power},club,lie==='tee'?'tee':lie);const r=S.run();const out={carry:S.carry||r.total,total:r.total};carryCache.set(k,out);return out;}
Object.assign(exports,{G,BALL_R,CUP_R,YD,CLUBS,LIES,DT,launch,makeShot,clubDistance,FLAT});
