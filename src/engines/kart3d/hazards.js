// Animated track characters (Mario Kart stage gimmicks): Moo Moos wandering over the road and Monty Moles popping out
// of the field (Moo Moo Meadows), Sidestepper crabs and leaping Cheep Cheeps (Cheep Cheep Beach), Thwomps and fire bars
// (Bowser's Castle). Every hazard is a pure function of race time, so all racers and the time-trial ghost see the
// same thing. state() gives track-space parts {s,d,h,r} (centre along/across/up and hit radius) plus pose info.
const {sdiff,wrapS,idx}=require("src/engines/kart3d/track.js");
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),sm=t=>t*t*(3-2*t);
const PER={cow:10,mole:3.6,cheep:3.4,crab:5.2,thwomp:4.2,firebar:4.5};
// hit: what touching it does to a kart; msg: the pop-up word
const KIND={cow:{hit:'spin',msg:'MOO!',col:'#fff3c8'},mole:{hit:'spin',msg:'MONTY MOLE!',col:'#d9a066'},cheep:{hit:'spin',msg:'CHEEP CHEEP!',col:'#ff7a6a'},
 crab:{hit:'spin',msg:'PINCHED!',col:'#ff6a5a'},thwomp:{hit:'squash',msg:'THWOMP!',col:'#c8d0e0'},firebar:{hit:'spin',msg:'BURNT!',col:'#ffb040'}};
function state(c,hz,t){
 const per=hz.per||PER[hz.kind],ph=hz.ph||0,u=(((t+ph)/per)%1+1)%1,rh=c.roadHalf[idx(c,hz.s)];
 switch(hz.kind){
  case 'cow':{// ambles across and back, stopping to graze at each kerb
   const A=hz.span??rh*.78,w=u<.5?u*2:2-u*2,e=sm(clamp((w-.08)/.84,0,1)),d=-A+2*A*e,moving=w>.08&&w<.92;
   return {parts:[{s:hz.s,d,h:0,r:15}],dir:u<.5?1:-1,moving,step:t*7+ph,live:true};}
  case 'crab':{// quick sideways scuttle
   const A=hz.span??rh*.8,w=u<.5?u*2:2-u*2,e=sm(clamp((w-.1)/.8,0,1));
   return {parts:[{s:hz.s,d:-A+2*A*e,h:0,r:11}],dir:u<.5?1:-1,moving:w>.1&&w<.9,step:t*14+ph,live:true};}
  case 'mole':{// pops up, hops, ducks back into its hole
   const up=u<.12?sm(u/.12):u<.55?1:u<.66?1-sm((u-.55)/.11):0,hop=u>.25&&u<.45?Math.sin((u-.25)/.2*Math.PI)*14:0;
   return {parts:[{s:hz.s,d:hz.d,h:-13+13*up+hop,r:10}],hole:true,live:up>.6,up};}
  case 'cheep':{// leaps out of the sea in a low arc over the road (alternate sides each time), hitting anyone in its path
   const n=Math.floor((t+ph)/per),side=n%2?-1:1,A=rh+46,leap=u<.55,v=u/.55,d=leap?side*(-A+2*A*v):side*A,h=leap?(hz.peak||22)*4*v*(1-v):-30;
   return {parts:[{s:hz.s,d,h,r:11}],dir:side,leap,pitch:leap?Math.atan2((hz.peak||22)*4*(1-2*v),2*A):0,live:leap&&Math.abs(d)<rh+8};}
  case 'thwomp':{// hovers, shakes, slams down, rises again
   const H=74,h=u<.55?H:u<.6?H*(1-sm((u-.55)/.05)):u<.8?0:H*sm((u-.8)/.2);
   return {parts:[{s:hz.s,d:hz.d,h,r:hz.r||19}],shake:u>.42&&u<.55,landed:u>=.6&&u<.62,live:h<16,warn:u>.3&&u<.6};}
  case 'firebar':{// a bar of fireballs spinning round a post in the road
   const a=(t+ph)/per*TAU*(hz.rev?-1:1),L=hz.len||42,parts=[];for(let r=0;r<=L;r+=L/5)parts.push({s:hz.s+Math.cos(a)*r,d:hz.d+Math.sin(a)*r,h:9,r:7});
   return {parts,angle:a,live:true};}
 }
 return {parts:[],live:false};
}
// does kart k (track space s,d,h) touch the hazard right now?
function touches(c,st,k){if(!st.live)return false;for(const p of st.parts){const ds=sdiff(c,p.s,k.s),dd=k.d-p.d,dh=k.h-p.h;if(Math.abs(dh)>22)continue;if(ds*ds+dd*dd<(p.r+8)*(p.r+8))return true;}return false;}
Object.assign(exports,{state,touches,KIND,PER,wrapS});
