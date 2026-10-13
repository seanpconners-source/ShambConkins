// Kart physics in track space (see track.js). Grounded karts integrate (s, d, psi, v) on the ribbon with Frenet
// kinematics; airborne karts (ramps, crests, edges, gaps) fly in world space under gravity and are projected back onto
// the ribbon to land. Mario Kart Tour handling: auto-accelerate, swipe to steer, drift with blue/orange/purple
// mini-turbo sparks, auto tricks off ramps (jump boost), gliders, dash panels, Lakitu rescue.
const T=require("src/engines/kart3d/track.js");

const G=270,TOP=330,BOOST=465,TURN=1.55,DRIFT_LV=[.65,1.35,2.3],MT=[0,.55,1,1.45];
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const wrapA=a=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;};

function makeKart(c,i){
 const sp=c.spawn[i];
 const k={i,s:T.wrapS(c,sp.s),d:sp.d,psi:sp.psi||0,v:0,h:0,air:false,P:[0,0,0],V:[0,0,0],F:[1,0,0],N:[0,1,0],R:[0,0,1],visYaw:0,
  drift:0,driftT:0,spark:0,hop:0,boostT:0,boostMax:0,coins:0,spin:0,spinA:0,tumble:0,shrink:0,star:0,bullet:0,inv:0,squash:0,
  glide:false,trick:0,trickOn:false,airT:0,falling:0,lakitu:0,safeS:T.wrapS(c,sp.s),glue:0,lap:0,half:false,prog:0,steer:0,wall:0,ink:0,prevS:T.wrapS(c,sp.s)};
 pose(c,k);return k;
}
const F1={P:[0,0,0],T:[0,0,0],R:[0,0,0],U:[0,0,0]},F2={P:[0,0,0],T:[0,0,0],R:[0,0,0],U:[0,0,0]};
function setBoost(k,dur){k.boostT=Math.max(k.boostT,dur);k.boostMax=Math.max(k.boostMax,dur);}
function sparkLevel(k){return k.driftT>=DRIFT_LV[2]?3:k.driftT>=DRIFT_LV[1]?2:k.driftT>=DRIFT_LV[0]?1:0;}
function endDrift(k,ctx,reward=true){if(!k.drift)return;const lv=sparkLevel(k);k.drift=0;k.driftT=0;k.spark=0;if(reward&&lv>0){setBoost(k,MT[lv]);ctx?.ev?.(k,'miniturbo',lv);}}
// type: 'spin' (banana, green shell), 'hard' (red shell, star), 'tumble' (bob-omb, blue shell, bullet)
function hit(k,type,ctx){
 if(k.star>0||k.bullet>0||k.inv>0||k.lakitu>0||k.falling>0)return false;
 endDrift(k,ctx,false);k.boostT=0;
 if(type==='tumble'){k.tumble=1.35;k.v*=.25;}else{k.spin=type==='hard'?1.15:.95;k.v*=type==='hard'?.3:.45;}
 k.spinA=0;k.inv=k.tumble>0?2.2:1.8;k.coins=Math.max(0,k.coins-(type==='tumble'?3:2));ctx?.ev?.(k,'hit',type);return true;
}
function launch(c,k,kick,glide,ctx,kind){
 const f=T.frame(c,k.s,F1),cp=Math.cos(k.psi),sp=Math.sin(k.psi);
 for(let q=0;q<3;q++){k.P[q]=f.P[q]+f.R[q]*k.d+f.U[q]*.5;k.V[q]=(f.T[q]*cp+f.R[q]*sp)*k.v+f.U[q]*kick;}
 k.air=true;k.airT=0;k.h=.5;k.glide=!!glide;k.trick=0;k.trickOn=kick>0;k.hop=0;if(k.drift)endDrift(k,ctx,true);
 ctx?.ev?.(k,kind||(glide?'glide':kick>0?'ramp':'air'));
}
function respawn(c,k,ctx){
 k.s=T.wrapS(c,k.safeS-40);k.d=0;k.psi=0;k.v=0;k.air=false;k.h=0;k.falling=0;k.glide=false;k.lakitu=1.4;k.drift=0;k.driftT=0;k.boostT=0;k.spin=0;k.tumble=0;k.bullet=0;k.prevS=k.s;
 k.coins=Math.max(0,k.coins-2);ctx?.ev?.(k,'lakitu');
}
// inp: {steer:-1..1, drift:-1|0|1 (drift wanted in that direction)}
function stepKart(c,k,inp,dt,ctx={}){
 k.inv=Math.max(0,k.inv-dt);k.star=Math.max(0,k.star-dt);k.shrink=Math.max(0,k.shrink-dt);k.squash=Math.max(0,k.squash-dt);k.ink=Math.max(0,k.ink-dt);
 k.boostT=Math.max(0,k.boostT-dt);if(k.boostT<=0)k.boostMax=0;k.hop=Math.max(0,k.hop-dt);k.landT=Math.max(0,(k.landT||0)-dt);k.wall=Math.max(0,k.wall-dt);
 if(k.spin>0){k.spin-=dt;k.spinA+=dt*15;}if(k.tumble>0){k.tumble-=dt;k.spinA+=dt*5;}
 if(k.bullet>0){k.bullet-=dt;if(k.bullet<=0){k.inv=Math.max(k.inv,.8);ctx.ev?.(k,'bulletEnd');}}
 k.steer+=(clamp(inp.steer||0,-1,1)-k.steer)*Math.min(1,dt*14);
 if(k.lakitu>0){k.lakitu-=dt;k.v=0;if(k.lakitu<=0)k.inv=Math.max(k.inv,1.2);pose(c,k);return;}
 if(k.falling>0){k.falling+=dt;k.V[1]-=G*1.2*dt;for(let q=0;q<3;q++)k.P[q]+=k.V[q]*dt;if(k.falling>1.15)respawn(c,k,ctx);pose(c,k);return;}
 if(k.air){stepAir(c,k,inp,dt,ctx);pose(c,k);return;}
 const f=T.frame(c,k.s,F1),i=f.i,glue=c.glue[i];k.glue+=((glue?1:0)-k.glue)*Math.min(1,dt*6);
 // drifting
 const canDrift=k.v>110&&k.spin<=0&&k.tumble<=0&&k.bullet<=0;
 if(!k.drift&&inp.drift&&canDrift){k.drift=inp.drift;k.driftT=0;k.hop=.24;ctx.ev?.(k,'hop');}
 else if(k.drift&&(inp.drift!==k.drift||!canDrift))endDrift(k,ctx,canDrift);
 let yaw=0;const steer=k.steer;
 if(k.bullet>0){k.psi*=Math.pow(.02,dt);k.d*=Math.pow(.3,dt);}
 else if(k.spin>0||k.tumble>0)yaw=0;
 else if(k.drift){const into=clamp(steer*k.drift,-1,1);yaw=k.drift*(1.2+.75*into)*clamp(k.v/200,.5,1);const before=sparkLevel(k);k.driftT+=dt*(.95+.55*Math.max(0,into));const lv=sparkLevel(k);if(lv!==before)ctx.ev?.(k,'spark',lv);k.spark=lv;}
 else yaw=steer*TURN*clamp(k.v/90,0,1)*(1-.18*clamp(k.v/TOP,0,1.4));
 k.psi=wrapA(k.psi+yaw*dt);
 // speed
 k.offroad=!glue&&Math.abs(k.d)>(f.roadHalf??f.half)+2;
 let top=TOP*(k.topMul||1)*(k.offroad&&k.star<=0&&k.boostT<=0?.55:1)*(1+.008*k.coins)*(k.shrink>0?.72:1)*(k.star>0?1.12:1)*(k.drift?.985:1),acc=280*(1-.55*clamp(k.v/top,0,1));
 if(k.boostT>0){top=Math.max(top,BOOST*(k.shrink>0?.8:1));acc=1200;}
 if(k.bullet>0){top=620;acc=1500;}
 if(k.spin>0||k.tumble>0)k.v*=Math.pow(.12,dt);
 else if(k.v<top)k.v=Math.min(top,k.v+acc*dt);else k.v=Math.max(top,k.v-(k.v>TOP*1.05?260:120)*dt);
 if(!glue&&k.bullet<=0)k.v=Math.max(0,k.v-G*.3*f.T[1]*Math.cos(k.psi)*dt);
 // move (Frenet frame)
 const prevS=k.s,den=Math.max(.35,1-f.kg*k.d),ds=k.v*Math.cos(k.psi)/den*dt;
 k.s=T.wrapS(c,k.s+ds);k.d+=k.v*Math.sin(k.psi)*dt;k.psi=wrapA(k.psi-f.kg*ds);k.prevS=prevS;
 const j=T.idx(c,k.s),half=c.half[j],rail=c.rail[j],lim=half-8;
 if(k.bullet>0){k.d=clamp(k.d,-lim,lim);pose(c,k);return;}
 // rails
 const side=k.d>lim?1:k.d<-lim?-1:0;
 if(side&&(rail&(side>0?2:1))){k.d=side*lim;const into=Math.sin(k.psi)*side;if(into>0){k.psi=Math.atan2(-Math.sin(k.psi)*.25,Math.cos(k.psi));if(k.wall<=0){k.v*=1-.45*into;if(into>.4)endDrift(k,ctx,false);if(into>.12)ctx.ev?.(k,'wall',into);}else k.v=Math.max(0,k.v-50*dt);k.wall=.2;}}
 // ramps, gaps, edges, crests
 for(const r of c.ramps){if(T.sdiff(c,prevS,r.s)>0&&T.sdiff(c,k.s,r.s)<=0&&Math.abs(k.d)<=half){k.v=Math.max(k.v,r.glide?340:320);launch(c,k,r.kick,r.glide,ctx);pose(c,k);return;}}
 if(c.gap[j]||Math.abs(k.d)>half+3){launch(c,k,0,false,ctx);pose(c,k);return;}
 if(!glue&&k.landT<=0&&f.kn<0&&f.U[1]>.5&&k.v*k.v*(-f.kn)>G*f.U[1]*1.2){launch(c,k,22,false,ctx,'crest');k.trickOn=false;pose(c,k);return;}
 // dash panels
 for(const p of c.pads){const ds2=T.sdiff(c,p.s,k.s);if(ds2>-p.len/2&&ds2<p.len/2&&Math.abs(k.d-p.d)<p.w/2+6){if(k.boostT<.7)ctx.ev?.(k,'pad');setBoost(k,.95);}}
 if(Math.abs(k.d)<half*.6&&k.lakitu<=0&&!c.surf[j])k.safeS=k.s;
 k.h=0;pose(c,k);
}
function stepAir(c,k,inp,dt,ctx){
 k.airT+=dt;
 if(k.glide){
  const a=k.steer*1.05*dt,cs=Math.cos(a),sn=Math.sin(a),vx=k.V[0],vz=k.V[2];k.V[0]=vx*cs-vz*sn;k.V[2]=vx*sn+vz*cs;
  k.V[1]=Math.max(k.V[1]-G*(k.V[1]>0?.7:.42)*dt,-105);const hs=Math.hypot(k.V[0],k.V[2]);if(hs<330){k.V[0]*=330/hs;k.V[2]*=330/hs;}
 }else{k.V[1]-=G*dt;const a=k.steer*.35*dt,cs=Math.cos(a),sn=Math.sin(a),vx=k.V[0],vz=k.V[2];k.V[0]=vx*cs-vz*sn;k.V[2]=vx*sn+vz*cs;}
 for(let q=0;q<3;q++)k.P[q]+=k.V[q]*dt;
 if(k.trickOn&&k.airT>.12)k.trick=Math.min(1,k.trick+dt/.5);
 const prevH=k.h,pr=T.project(c,k.P,k.s);k.prevS=k.s;k.s=pr.s;k.d=pr.d;k.h=pr.h;
 {const f=T.frame(c,k.s,F1);k.psi=Math.atan2(T.dot(k.V,f.R),T.dot(k.V,f.T));}
 if(pr.h<=.5&&prevH>=-10&&T.surfaceAt(c,pr.s,pr.d)){land(c,k,ctx);return;}
 if(!k.trickOn&&k.airT>.32){k.trickOn=true;}
 if(pr.h<-34||k.airT>6||k.P[1]<c.minY-500){k.air=false;k.glide=false;k.falling=.001;ctx.ev?.(k,'fall');}
}
function land(c,k,ctx){
 const f=T.frame(c,k.s,F1),vT=T.dot(k.V,f.T),vR=T.dot(k.V,f.R);
 k.v=Math.min(Math.hypot(vT,vR)*.97,BOOST);k.psi=Math.atan2(vR,vT);if(Math.abs(k.psi)>2.4){k.psi=0;k.v*=.4;}
 const half=c.half[T.idx(c,k.s)];k.d=clamp(k.d,-half+8,half-8);
 k.air=false;k.h=0;k.landT=.3;const tricked=k.trickOn&&k.trick>=.6;k.glide=false;k.trick=0;k.trickOn=false;
 if(tricked){setBoost(k,.5);ctx.ev?.(k,'trick');}ctx.ev?.(k,'land',k.airT);
}
// World position and orientation for drawing (and kart/item contact in world space).
function pose(c,k){
 let N,F;
 if(k.air||k.falling>0){const pr=T.frame(c,k.s,F2);N=k.falling>0?[0,1,0]:[pr.U[0],pr.U[1],pr.U[2]];
  if(k.glide||k.falling>0){N=[N[0]*.3,N[1]*.3+.7,N[2]*.3];}
  let v=k.V,dn=T.dot(v,N);F=[v[0]-N[0]*dn,v[1]-N[1]*dn,v[2]-N[2]*dn];if(Math.hypot(...F)<1)F=k.F.slice();
  F=T.norm(F);N=T.norm(N);k.P2=k.P;
 }else{
  const f=T.frame(c,k.s,F2),cp=Math.cos(k.psi),sp=Math.sin(k.psi);
  const hopH=k.hop>0?Math.sin(k.hop/.24*Math.PI)*5:0,tumH=k.tumble>0?Math.sin(clamp(k.tumble/1.35,0,1)*Math.PI)*26:0,lakH=k.lakitu>0?k.lakitu*36:0;
  const hh=hopH+tumH+lakH+(k.bullet>0?10:0);
  k.P2=[f.P[0]+f.R[0]*k.d+f.U[0]*hh,f.P[1]+f.R[1]*k.d+f.U[1]*hh,f.P[2]+f.R[2]*k.d+f.U[2]*hh];
  F=[f.T[0]*cp+f.R[0]*sp,f.T[1]*cp+f.R[1]*sp,f.T[2]*cp+f.R[2]*sp];N=[f.U[0],f.U[1],f.U[2]];
  k.V=[F[0]*k.v,F[1]*k.v,F[2]*k.v];
 }
 k.F=F;k.N=N;k.R=T.cross(F,N);
 // drawn facing: drift slide, spin-outs
 const vy=(k.drift?k.drift*.42:0)+(k.spin>0?k.spinA:0);k.visYaw+=(vy-k.visYaw)*(k.spin>0?1:.25);if(k.spin<=0&&Math.abs(k.visYaw)>Math.PI)k.visYaw=wrapA(k.visYaw);
}

// Autopilot (tests, demo): follows the racing line, drifts long corners, aims at item boxes.
function autoInput(c,k,{target=0}={}){
 const look=70+k.v*.45;let turn=0;for(let a=0;a<look;a+=12){const f=T.frame(c,k.s+a,F1);turn+=f.kg*12;}
 {const rh=T.frame(c,k.s+look*.5,F1).roadHalf;if(rh)target=clamp(target,-rh*.65,rh*.65);}
 const want=turn*.75+Math.atan2(target-k.d,look),err=wrapA(want-k.psi);
 let steer=clamp(err*3.2,-1,1),drift=0;
 if(k.drift&&Math.abs(turn)>.18&&Math.sign(turn)===k.drift)drift=k.drift;else if(!k.drift&&Math.abs(turn)>.55&&k.v>220)drift=Math.sign(turn);
 return {steer,drift};
}

Object.assign(exports,{G,TOP,BOOST,DRIFT_LV,MT,makeKart,stepKart,hit,setBoost,endDrift,launch,respawn,pose,sparkLevel,autoInput,wrapA,clamp});
