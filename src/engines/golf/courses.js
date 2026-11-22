// Shooter McGavin's Pro Tour courses: every hole is made from a seed (same holes every time, on both phones). Terrain is ANALYTIC
// (no grid): height(x,z) = rolling ground + the shapes laid on it (tee pad, green tilt + breaks, bunkers dug in, lakes
// flattened); lie(x,z) from the same shapes (green / fringe / fairway along the centre line / bunkers / water / rough
// bands / OB). Physics and the renderer ask the same functions, so what you see is what the ball rolls on.
// Coordinates: tee at (0,0), the hole heads roughly +z. Metres.
const YD=.9144;
function rng(seed){let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);let x=h>>>0||1;
 return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
// smooth value noise
function noise2(seed){const r=rng('n'+seed),P=new Float32Array(512);for(let i=0;i<512;i++)P[i]=r()*2-1;
 const v=(i,j)=>P[((i*73856093)^(j*19349663))&511];const f=t=>t*t*(3-2*t);
 return (x,z)=>{const i=Math.floor(x),j=Math.floor(z),u=f(x-i),w=f(z-j);
  return (v(i,j)*(1-u)+v(i+1,j)*u)*(1-w)+(v(i,j+1)*(1-u)+v(i+1,j+1)*u)*w;};}
// THEMES: the look + what grows there (the renderer reads look/trees; physics reads lies)
const THEMES={
 desert:{name:'Bat Country Links',sub:'Las Vegas desert, 1971',source:'Fear and Loathing in Las Vegas',amp:7,lakes:.25,trees:['cactus','cactus2','joshua','mesquite'],treeK:.55,
  rough:'waste',wind:[2,7],sky:['#7fb3e0','#f6d7a6'],far:'#b7764a',ground:'#c9a46a'},
 park:{name:'Bushwood Country Club',sub:'members only',source:'Caddyshack',amp:5,lakes:.5,trees:['oak','oak2','elm','pine'],treeK:1,
  rough:'rough',wind:[0,5],sky:['#6aa7e6','#d9ecff'],far:'#4f7d4a',ground:'#5d9a4a'},
 lake:{name:'Waterbury Pro-Am',sub:'tour stop',source:'Happy Gilmore',amp:6,lakes:.85,trees:['pine','pine2','birch','maple'],treeK:1.1,
  rough:'rough',wind:[1,6],sky:['#5f9ee0','#e8f1ff'],far:'#3e6a5c',ground:'#4f8f46'},
};
const COURSES=[{id:'batcountry',theme:'desert',pars:[4,4,3,5,4,4,3,4,5]},{id:'bushwood',theme:'park',pars:[4,5,4,3,4,4,5,3,4]},{id:'waterbury',theme:'lake',pars:[4,3,5,4,4,3,4,5,4]}];
// distance from p to a polyline: [dist, t along (m), side (+ = right of travel)]
function polyDist(pts,x,z){let best=1e9,along=0,acc=0,side=0;
 for(let i=0;i+1<pts.length;i++){const a=pts[i],b=pts[i+1],dx=b.x-a.x,dz=b.z-a.z,L=Math.hypot(dx,dz)||1;
  let t=((x-a.x)*dx+(z-a.z)*dz)/(L*L);t=Math.max(0,Math.min(1,t));const px=a.x+dx*t,pz=a.z+dz*t,d=Math.hypot(x-px,z-pz);
  if(d<best){best=d;along=acc+t*L;side=Math.sign((x-a.x)*dz-(z-a.z)*dx)*-1;}acc+=L;}
 return [best,along,side];}
const inEll=(e,x,z,grow=0)=>{const c=Math.cos(e.rot||0),s=Math.sin(e.rot||0),dx=x-e.x,dz=z-e.z,u=(dx*c+dz*s)/(e.a+grow),v=(-dx*s+dz*c)/(e.b+grow);return u*u+v*v;};
function buildHole(courseId,n,par,theme){const T=THEMES[theme],r=rng(courseId+':'+n+':'+par),N=noise2(courseId+n),N2=noise2(courseId+n+'b');
 // length and shape
 const L=par===3?(140+r()*55):par===4?(305+r()*95):(455+r()*60);
 const pts=[{x:0,z:0}];let dir=(r()-.5)*.25,x=0,z=0;
 const bends=par===3?[]:par===4?[.52+r()*.12]:[.36+r()*.08,.66+r()*.08];
 let last=0;for(const b of [...bends,1]){const seg=(b-last)*L;x+=Math.sin(dir)*seg;z+=Math.cos(dir)*seg;pts.push({x,z});last=b;dir+=(r()-.5)*(par===5?.9:.8);}
 const cup0=pts[pts.length-1];
 // green: an ellipse round the end, the cup somewhere on it
 const endDir=Math.atan2(cup0.x-pts[pts.length-2].x,cup0.z-pts[pts.length-2].z);
 const green={x:cup0.x,z:cup0.z,a:11+r()*5,b:13+r()*6,rot:-endDir+(r()-.5)*.6};
 const cup={x:green.x+(r()-.5)*green.a*.9,z:green.z+(r()-.5)*green.b*.9};
 const tilt={x:(r()-.5)*.045,z:-.02-r()*.035,ox:green.x,oz:green.z};// greens tilt back to front (toward the tee) plus a side lean
 const breaks=[];for(let i=0;i<2;i++)breaks.push({x:green.x+(r()-.5)*green.a,z:green.z+(r()-.5)*green.b,h:(r()-.5)*.6,s:4+r()*4});
 // fairway width along the hole, where it starts
 const fwStart=par===3?L+1:55+r()*35,fwW=t=>14+5*Math.sin(t/37+n)+4*Math.sin(t/13);
 // bunkers: by the landing zone and round the green
 const bunkers=[];const at=(t,off)=>{let acc=0;for(let i=0;i+1<pts.length;i++){const a=pts[i],b=pts[i+1],dl=Math.hypot(b.x-a.x,b.z-a.z);if(acc+dl>=t||i===pts.length-2){const f=Math.min(1,(t-acc)/dl),d=Math.atan2(b.x-a.x,b.z-a.z);return {x:a.x+(b.x-a.x)*f-Math.cos(d)*off,z:a.z+(b.z-a.z)*f+Math.sin(d)*off,d};}acc+=dl;}return {x:0,z:0,d:0};};
 if(par>3){const land=Math.min(L-90,215+r()*40);for(let i=0;i<1+(r()<.6);i++){const side=r()<.5?-1:1,p=at(land+(r()-.5)*40,side*(fwW(land)+4+r()*6));bunkers.push({x:p.x,z:p.z,a:5+r()*5,b:9+r()*7,rot:-p.d+(r()-.5)*.5});}}
 const gb=2+(r()<.5);for(let i=0;i<gb;i++){const ang=r()*Math.PI*2,rad=Math.max(green.a,green.b)+4+r()*3;bunkers.push({x:green.x+Math.cos(ang)*rad,z:green.z+Math.sin(ang)*rad,a:3.5+r()*3,b:6+r()*4,rot:ang});}
 // water: a lake in play on some holes (in front of par-3 greens, beside the fairway, or across it on par 5s)
 const lakes=[];if(r()<T.lakes){const kind=par===3?'front':par===5&&r()<.5?'cross':'side';
  if(kind==='front'){const p=at(L-green.b-16,0);lakes.push({x:p.x,z:p.z,a:22+r()*8,b:9+r()*5,rot:-p.d+Math.PI/2*0});}
  else if(kind==='cross'){const p=at(L*.62,0);lakes.push({x:p.x,z:p.z,a:30,b:12+r()*6,rot:-p.d+Math.PI/2});}
  else{const t=L*(.45+r()*.3),side=r()<.5?-1:1,p=at(t,side*(fwW(t)+16));lakes.push({x:p.x,z:p.z,a:13+r()*8,b:30+r()*20,rot:-p.d});}}
 // terrain
 const amp=T.amp;const fall=(r()-.5)*.03;
 function baseH(x,z){return amp*(N(x/90,z/90)*.75+N2(x/35,z/35)*.25)+fall*z;}
 const teeH=baseH(0,0)+.6;
 const greenH=baseH(green.x,green.z)+.3;
 function height(x,z){let h=baseH(x,z);
  // tee pad
  const td=Math.max(Math.abs(x)-5,Math.abs(z)-7);if(td<6){const k=td<=0?1:1-td/6,kk=k*k*(3-2*k);h=h*(1-kk)+teeH*kk;}
  // green: replace with a tilted plane + breaks, blended out over 8 m
  const ge=inEll(green,x,z,0);if(ge<2.2){const gp=greenH+tilt.x*(x-green.x)+tilt.z*(z-green.z)+breaks.reduce((s,b)=>s+b.h*Math.exp(-((x-b.x)**2+(z-b.z)**2)/(b.s*b.s)),0);
   const k=ge<=1?1:Math.max(0,1-(Math.sqrt(ge)-1)/(Math.sqrt(2.2)-1));const kk=k*k*(3-2*k);h=h*(1-kk)+gp*kk;}
  for(const b of bunkers){const e=inEll(b,x,z);if(e<1.4){const k=e<1?1:1-(e-1)/.4;h-=.7*k*k*(1-e*.4);}}
  for(const l of lakes){const e=inEll(l,x,z,4);if(e<1){const wl=lakeLevel(l)-.4;h=Math.min(h,wl+(1-(1-e))*1.5);}}
  return h;}
 const lvl=new Map();function lakeLevel(l){if(!lvl.has(l))lvl.set(l,baseH(l.x,l.z)-1.2);return lvl.get(l);}
 function normal(x,z){const e=.35,hx=(height(x+e,z)-height(x-e,z))/(2*e),hz=(height(x,z+e)-height(x,z-e))/(2*e),n=Math.hypot(hx,1,hz);return [-hx/n,1/n,-hz/n];}
 const half=95;
 function lie(x,z){const ge=inEll(green,x,z);if(ge<=1)return 'green';if(inEll(green,x,z,2.2)<=1)return 'fringe';
  for(const l of lakes)if(inEll(l,x,z)<=1)return 'water';
  for(const b of bunkers)if(inEll(b,x,z)<=1)return 'sand';
  if(Math.abs(x)<=5.5&&z>=-7.5&&z<=7.5)return 'tee';
  const [d,t]=polyDist(pts,x,z);if(d>half||z<-30)return 'ob';
  if(t>=fwStart&&d<=fwW(t))return 'fair';
  if(d<=fwW(t)+(t>=fwStart?7:12)&&t>fwStart-25)return T.rough==='waste'&&d>fwW(t)+3?'waste':'rough';
  if(T.rough==='waste')return 'waste';
  return d<fwW(t)+26?'rough':'deep';}
 // trees: groups in the rough, kept off the fairway, greens, tee, water and the line from tee to green
 const trees=[];const kinds=T.trees;const tries=Math.round((par*30)*T.treeK);
 for(let i=0;i<tries;i++){const t=r()*L,side=r()<.5?-1:1,off=fwW(t)+16+r()*60,p=at(t,side*off);const ln=lie(p.x,p.z);
  if(ln==='water'||ln==='green'||ln==='fringe'||ln==='sand'||ln==='tee'||ln==='fair'||ln==='ob')continue;if(Math.hypot(p.x-green.x,p.z-green.z)<Math.max(green.a,green.b)+8)continue;
  const kind=kinds[Math.floor(r()*kinds.length)],big=.75+r()*.6,cac=kind.startsWith('cactus');
  const h=cac?(3+r()*3)*big:kind==='joshua'?6*big:(9+r()*8)*big;
  trees.push({x:p.x,z:p.z,kind,r:cac?.35:.45*big,h:cac?h:h*.45,cr:cac?.9*big:kind==='pine'||kind==='pine2'?2.4*big:3.6*big,ch:cac?h*.6:h*.68,sh:h,y:height(p.x,p.z)});}
 // a few trees guarding the dogleg corner (in play)
 if(par>3&&bends.length){for(let i=0;i<3;i++){const p=at(bends[0]*L+(r()-.5)*20,(r()<.5?-1:1)*(fwW(bends[0]*L)+5+r()*4));const ln=lie(p.x,p.z);if(ln!=='rough'&&ln!=='waste'&&ln!=='deep')continue;const kind=kinds[Math.floor(r()*kinds.length)];const h=10+r()*5;trees.push({x:p.x,z:p.z,kind,r:.5,h:h*.45,cr:3.4,ch:h*.68,sh:h,y:height(p.x,p.z)});}}
 const len=Math.round(polyLen(pts)/YD);
 const bx=pts.map(p=>p.x),bz=pts.map(p=>p.z);
 return {course:courseId,n,par,theme,yards:len,pts,green,cup,tee:{x:0,z:0},bunkers,lakes,trees,height,normal,lie,
  out:(x,z)=>lie(x,z)==='ob',bounds:{x0:Math.min(...bx)-half-10,x1:Math.max(...bx)+half+10,z0:-40,z1:Math.max(...bz)+40},fwStart,fwW,tilt};}
function polyLen(p){let s=0;for(let i=0;i+1<p.length;i++)s+=Math.hypot(p[i+1].x-p[i].x,p[i+1].z-p[i].z);return s;}
const cache=new Map();
function getCourse(id){if(cache.has(id))return cache.get(id);const c=COURSES.find(q=>q.id===id)||COURSES[0],T=THEMES[c.theme];
 const holes=c.pars.map((par,i)=>buildHole(c.id,i+1,par,c.theme));const out={id:c.id,theme:c.theme,...T,holes,par:c.pars.reduce((a,b)=>a+b,0)};cache.set(id,out);return out;}
// wind for a hole on a given seed (both phones agree)
function windFor(theme,seed,n){const T=THEMES[theme],r=rng(seed+':wind:'+n),mph=T.wind[0]+r()*(T.wind[1]-T.wind[0]),a=r()*Math.PI*2,ms=mph*.447;return {x:Math.sin(a)*ms,z:Math.cos(a)*ms,mph:Math.round(mph),a};}
Object.assign(exports,{YD,THEMES,COURSES,getCourse,buildHole,windFor,polyDist,inEll,rng});
