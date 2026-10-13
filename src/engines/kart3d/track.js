// Mario Kart 3D courses. A course is a closed 3D ribbon: a centre line sampled every DS units, each sample carrying a
// frame (T forward, R right, U up), half width and flags (glue = anti-gravity, rails, gap, ramp surface). Karts live in
// track space (s along, d across, h above), so loops, corkscrews and wall rides need no special physics.
// World axes: Y up; yaw 0 faces +X and a right turn increases yaw (towards +Z).
const DS=6,D2R=Math.PI/180;
const ease=t=>t*t*(3-2*t);
const tFrom=(yaw,pitch)=>{const cp=Math.cos(pitch);return [cp*Math.cos(yaw),Math.sin(pitch),cp*Math.sin(yaw)];};
const rFrom=yaw=>[-Math.sin(yaw),0,Math.cos(yaw)];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const norm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];};

// Piece fields: len | turn+r | loop+r; pitch/roll (deg, eased to by the end), half, shift (lateral, loops),
// glue, rail (1 left, 2 right, 3 both), gap, surf ('ramp'|'glide'), lip {kick,glide}, flex ('A'|'B': solved lengths),
// boxes [f,[offsets]], coins [f0,f1,offset], pads [[f,offset]], ring f.
function pieceLen(p){if(p.loop)return 2*Math.PI*p.r;if(p.turn&&p.r)return Math.abs(p.turn)*D2R*p.r;return p.len;}
function trace(pieces,opt,lens){
 let yaw=0,pitch=0,roll=0,half=opt.half,P=[0,0,0];
 const S=[{P,yaw,pitch,roll,half,piece:-1}],marks=[];
 pieces.forEach((pc,pi)=>{
  const len=lens[pi],n=Math.max(1,Math.round(len/DS)),y0=yaw,p0=pitch,r0=roll,h0=half;
  const y1=y0+(pc.turn||0)*D2R,p1=pc.pitch!=null?pc.pitch*D2R:p0,r1=pc.roll!=null?pc.roll*D2R:r0,hw1=pc.half??h0,start=S.length-1;
  let ePrev=0;
  for(let k=1;k<=n;k++){const t=k/n,e=ease(t),tm=(k-.5)/n;
   const ym=y0+(y1-y0)*tm,pm=pc.loop?p0+2*Math.PI*tm:p0+(p1-p0)*ease(tm);
   const T=tFrom(ym,pm),R0=rFrom(ym),sh=(pc.shift||0)*(e-ePrev);ePrev=e;
   P=[P[0]+T[0]*DS+R0[0]*sh,P[1]+T[1]*DS,P[2]+T[2]*DS+R0[2]*sh];
   yaw=y0+(y1-y0)*t;pitch=pc.loop?p0+2*Math.PI*t:p0+(p1-p0)*e;roll=r0+(r1-r0)*e;half=h0+(hw1-h0)*e;
   S.push({P,yaw,pitch,roll,half,piece:pi});}
  if(pc.loop)pitch=p0;
  roll=Math.atan2(Math.sin(roll),Math.cos(roll));
  marks.push({pi,start,end:S.length-1});
 });
 return {S,marks};
}
function buildCourse(def){
 const pieces=def.pieces.map(p=>({...p}));
 // 'rest' turn closes the yaw to a full circle
 const sumTurn=pieces.reduce((a,p)=>a+(typeof p.turn==='number'?p.turn:0),0);for(const p of pieces)if(p.turn==='rest')p.turn=360*(def.turns||1)-sumTurn;
 const lens=pieces.map(pieceLen);
 // solve the two flex straights so the loop closes horizontally
 for(let it=0;it<3;it++){const {S}=trace(pieces,def,lens),e=S[S.length-1].P;const fa=pieces.findIndex(p=>p.flex==='A'),fb=pieces.findIndex(p=>p.flex==='B');if(fa<0||fb<0)break;
  const ya=yawAt(pieces,fa),yb=yawAt(pieces,fb),ax=Math.cos(ya),az=Math.sin(ya),bx=Math.cos(yb),bz=Math.sin(yb),det=ax*bz-az*bx;if(Math.abs(det)<.2)throw new Error('kart course: flex straights are parallel');
  const da=(-e[0]*bz+e[2]*bx)/det,db=(-ax*e[2]+az*e[0])/det;lens[fa]+=da;lens[fb]+=db;
  if((lens[fa]<DS*4||lens[fb]<DS*4)&&it===2)throw new Error(`kart course ${def.id}: flex lengths ${lens[fa].toFixed(0)} ${lens[fb].toFixed(0)}`);}
 const {S,marks}=trace(pieces,def,lens);
 const N=S.length-1,err=S[N].P;
 const c={id:def.id,N,DS,L:N*DS,lens,closeErr:Math.hypot(...err),
  px:new Float32Array(N),py:new Float32Array(N),pz:new Float32Array(N),T:new Float32Array(N*3),R:new Float32Array(N*3),U:new Float32Array(N*3),
  half:new Float32Array(N),kg:new Float32Array(N),kn:new Float32Array(N),glue:new Uint8Array(N),rail:new Uint8Array(N),gap:new Uint8Array(N),surf:new Uint8Array(N),
  ramps:[],boxes:[],coins:[],pads:[],rings:[],decor:def.decor||{},startS:def.startS??60,arena:!!def.arena};
 for(let i=0;i<N;i++){const f=i/N,P=S[i].P;c.px[i]=P[0]-err[0]*f;c.py[i]=P[1]-err[1]*f;c.pz[i]=P[2]-err[2]*f;c.half[i]=S[i].half;}
 // flags: a sample belongs to the piece that produced it (sample 0 to the last piece)
 for(let i=0;i<N;i++){const pc=pieces[S[i].piece<0?pieces.length-1:S[i].piece];c.glue[i]=pc.glue?1:0;c.rail[i]=pc.rail??def.rail??3;c.gap[i]=pc.gap?1:0;c.surf[i]=pc.surf==='ramp'?1:pc.surf==='glide'?2:0;if(pc.gap)c.rail[i]=0;}
 // frames from the closed centre line
 for(let i=0;i<N;i++){const a=(i-1+N)%N,b=(i+1)%N;const T=norm([c.px[b]-c.px[a],c.py[b]-c.py[a],c.pz[b]-c.pz[a]]);
  let R=rFrom(S[i].yaw),U=norm(cross(R,T));R=norm(cross(T,U));const ro=S[i].roll,cr=Math.cos(ro),sr=Math.sin(ro);
  const R2=[R[0]*cr-U[0]*sr,R[1]*cr-U[1]*sr,R[2]*cr-U[2]*sr],U2=[U[0]*cr+R[0]*sr,U[1]*cr+R[1]*sr,U[2]*cr+R[2]*sr];
  c.T.set(T,i*3);c.R.set(R2,i*3);c.U.set(U2,i*3);}
 for(let i=0;i<N;i++){const a=((i-1+N)%N)*3,b=((i+1)%N)*3,dT=[(c.T[b]-c.T[a])/(2*DS),(c.T[b+1]-c.T[a+1])/(2*DS),(c.T[b+2]-c.T[a+2])/(2*DS)];
  c.kg[i]=dT[0]*c.R[i*3]+dT[1]*c.R[i*3+1]+dT[2]*c.R[i*3+2];c.kn[i]=dT[0]*c.U[i*3]+dT[1]*c.U[i*3+1]+dT[2]*c.U[i*3+2];}
 // objects
 for(const m of marks){const pc=pieces[m.pi],s0=m.start*DS,s1=m.end*DS,at=f=>s0+(s1-s0)*f;
  if(pc.lip)c.ramps.push({s:s1,kick:pc.lip.kick||80,glide:!!pc.lip.glide});
  if(pc.boxes)for(const [f,offs] of pc.boxes)for(const o of offs)c.boxes.push({s:at(f),d:o,t:0});
  if(pc.coins)for(const [f0,f1,o] of pc.coins){const n=Math.max(2,Math.round((f1-f0)*(s1-s0)/34));for(let k=0;k<n;k++)c.coins.push({s:at(f0+(f1-f0)*k/(n-1)),d:o,t:0});}
  if(pc.pads)for(const [f,o] of pc.pads)c.pads.push({s:at(f),d:o,len:44,w:30});
  if(pc.ring!=null)c.rings.push(at(pc.ring));}
 let minY=Infinity,maxY=-Infinity;for(let i=0;i<N;i++){minY=Math.min(minY,c.py[i]);maxY=Math.max(maxY,c.py[i]);}c.minY=minY;c.maxY=maxY;
 c.spawn=def.spawn||[{s:c.startS-40,d:-c.half[0]*.42,psi:0},{s:c.startS-40,d:c.half[0]*.42,psi:0}];
 return c;
}
function yawAt(pieces,k){let y=0;for(let i=0;i<k;i++)y+=(typeof pieces[i].turn==='number'?pieces[i].turn:0)*D2R;return y;}

// ---------------------------------------------------------------- queries
const wrapS=(c,s)=>((s%c.L)+c.L)%c.L;
const sdiff=(c,a,b)=>{let d=wrapS(c,b-a);if(d>c.L/2)d-=c.L;return d;};// shortest signed distance a→b along the loop
const idx=(c,s)=>Math.round(wrapS(c,s)/DS)%c.N;
function frame(c,s,o={P:[0,0,0],T:[0,0,0],R:[0,0,0],U:[0,0,0]}){
 const u=wrapS(c,s)/DS,i=Math.floor(u)%c.N,j=(i+1)%c.N,t=u-Math.floor(u);
 o.P[0]=c.px[i]+(c.px[j]-c.px[i])*t;o.P[1]=c.py[i]+(c.py[j]-c.py[i])*t;o.P[2]=c.pz[i]+(c.pz[j]-c.pz[i])*t;
 for(const k of ['T','R','U']){const A=c[k],v=o[k];let l=0;for(let q=0;q<3;q++){v[q]=A[i*3+q]+(A[j*3+q]-A[i*3+q])*t;l+=v[q]*v[q];}l=Math.sqrt(l)||1;v[0]/=l;v[1]/=l;v[2]/=l;}
 o.half=c.half[i]+(c.half[j]-c.half[i])*t;o.kg=c.kg[i]+(c.kg[j]-c.kg[i])*t;o.kn=c.kn[i]+(c.kn[j]-c.kn[i])*t;o.i=t<.5?i:j;
 return o;
}
function point(c,s,d,h=0,out=[0,0,0]){const f=frame(c,s,scratch);for(let q=0;q<3;q++)out[q]=f.P[q]+f.R[q]*d+f.U[q]*h;return out;}
const scratch={P:[0,0,0],T:[0,0,0],R:[0,0,0],U:[0,0,0]};
// Nearest track coordinates of a world point, searching around a hint (track-space s).
function project(c,Q,hintS,span=48){
 const hi=idx(c,hintS);let best=hi,bd=Infinity;
 for(let k=-span;k<=span;k++){const i=(hi+k+c.N*4)%c.N,dx=Q[0]-c.px[i],dy=Q[1]-c.py[i],dz=Q[2]-c.pz[i];
  // ignore samples whose plane is far from the point vertically in their own frame (stacked track pieces)
  const d2=dx*dx+dy*dy+dz*dz;if(d2<bd){bd=d2;best=i;}}
 const i=best,dx=Q[0]-c.px[i],dy=Q[1]-c.py[i],dz=Q[2]-c.pz[i];
 const s=i*DS+(dx*c.T[i*3]+dy*c.T[i*3+1]+dz*c.T[i*3+2]);const f=frame(c,s,scratch);
 const v=[Q[0]-f.P[0],Q[1]-f.P[1],Q[2]-f.P[2]];
 return {s:wrapS(c,s),d:dot(v,f.R),h:dot(v,f.U),half:f.half,i:f.i};
}
const surfaceAt=(c,s,d)=>{const i=idx(c,s);return !c.gap[i]&&Math.abs(d)<=c.half[i]+2;};

// ---------------------------------------------------------------- the courses
// Rainbow Road: rolling hills with no rails, a jump over the void, an anti-gravity wall ride, a loop-the-loop,
// a barrel-roll corkscrew you drive upside down, dash panels and a glider ramp.
function rainbowRoad(){
 return buildCourse({id:'rainbow-road',half:64,rail:3,startS:60,pieces:[
  // side 1: start straight and rolling hills with no rails
  {len:200,flex:'A',boxes:[[.9,[-36,-12,12,36]]]},
  {len:140,pitch:11,rail:0},{len:150,pitch:-11,rail:0,coins:[[.1,.9,0]]},{len:150,pitch:11,rail:0},{len:140,pitch:0,rail:0},
  {turn:-42,r:230,roll:-12},{turn:42,r:230,roll:12,coins:[[.3,.7,-22]]},{len:50,roll:0},
  // turn 1
  {turn:90,r:300,roll:14,coins:[[.2,.8,24]],ring:.5},
  {len:90,roll:0,pads:[[.7,0]]},
  // side 2: jump over the void, item boxes, glider ramp
  {len:110,pitch:13,surf:'ramp',rail:0,lip:{kick:30}},
  {len:210,pitch:-6,gap:true},
  {len:110,pitch:0,rail:0},
  {len:200,boxes:[[.45,[-40,-14,14,40]]],pads:[[.9,0]]},
  {len:130,pitch:16,surf:'glide',rail:0,lip:{kick:40,glide:true}},
  {len:640,pitch:-11,gap:true},
  {len:220,pitch:0,rail:0,boxes:[[.6,[-36,-12,12,36]]]},
  // turn 2: anti-gravity wall ride
  {len:60,glue:true,pads:[[.4,-20]]},
  {turn:30,r:250,roll:72,glue:true,coins:[[.3,1,0]]},{turn:30,r:250,glue:true,coins:[[0,1,0]],ring:.5},{turn:30,r:250,roll:0,glue:true},
  // side 3: loop-the-loop and a dash-panel drop
  {len:140,glue:true,pads:[[.55,0]]},
  {loop:true,r:150,shift:-150,glue:true,coins:[[.15,.85,0]]},
  {len:110,glue:true},
  {len:450,rail:2,coins:[[.1,.5,-30],[.5,.9,30]]},
  {len:240,pitch:-12,pads:[[.35,-24],[.35,24]]},
  {len:180,pitch:0,boxes:[[.6,[-36,-12,12,36]]]},
  {turn:-50,r:210,roll:-14},{turn:50,r:210,roll:14},{len:40,roll:0},
  // turn 3
  {turn:90,r:280,roll:18},
  {len:60,roll:0},
  // side 4: climb, then the barrel-roll corkscrew
  {len:200,flex:'B',pitch:6,coins:[[.2,.8,-20]]},{len:150,pitch:0},
  {len:70,glue:true,pads:[[.5,0]]},
  {len:840,roll:360,glue:true,coins:[[.15,.85,-26]],ring:.5},
  {len:70,glue:true},
  // turn 4 back to the line
  {turn:'rest',r:300,roll:14},
  {len:100,roll:0}
 ]});
}
// Balloon Battle arena: a wide floating rainbow ring with rolling hills, a rail round the outside and the void in the middle.
function battleRing(){
 const R=500,q=[];for(let k=0;k<8;k++)q.push({turn:45,r:R,pitch:[6,0,-6,0][k%4],rail:1});
 const c=buildCourse({id:'battle-ring',half:210,rail:1,arena:true,startS:0,pieces:q});
 c.spawn=[{s:0,d:0,psi:0},{s:c.L/2,d:0,psi:Math.PI}];
 c.boxes=[];for(let k=0;k<12;k++)c.boxes.push({s:(k+.25)*c.L/12,d:k%2?-110:90,t:0});for(let k=0;k<6;k++)c.boxes.push({s:(k+.75)*c.L/6,d:0,t:0});
 return c;
}

Object.assign(exports,{DS,buildCourse,rainbowRoad,battleRing,frame,point,project,surfaceAt,wrapS,sdiff,idx,cross,dot,norm});
