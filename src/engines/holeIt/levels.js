// Hole.it levels: deterministic per level number (both players and every replay of "Level N" get the same tray).
// Levels from the owner's videos are hand-built (handLevels.js); the rest are generated the way the real game
// lays them out: one wide walled tray, small props everywhere, bigger and giant props (scaled-up versions too)
// mixed in from the start so they only fit once you have grown, grass islands to steer around, and goal cards
// that ask for every copy of a prop. Pure data, so Node tests can load it.
const {seededRandom}=require("src/utils.js");
const {KINDS,THEMES}=require("src/engines/holeIt/meshes.js");
const {makeBuilder,removeItems,insideRect,topUp,TAU}=require("src/engines/holeIt/layout.js");
const {HAND}=require("src/engines/holeIt/handLevels.js");
const TIME=120;
// Measured from the gameplay video: the hole's radius grows ~15% per Size.
const holeRadius=size=>.5*Math.pow(1.15,size-1);
// xp to go from size N to N+1 = base·1.45^(N-1); base is tuned per level (def.growBase).
const sizeNeed=(size,base=16)=>Math.max(1,Math.round(base*Math.pow(1.45,size-1)));
// Points for one prop (the +1/+2/+4/+10/+15 popups in the video): ~footprint^1.6.
const propXp=r=>Math.max(1,Math.round(Math.pow(r/.3,1.6)));
// Smallest size whose hole swallows a prop of footprint r.
const sizeFor=r=>{let s=1;while(holeRadius(s)*.96<r&&s<40)s++;return s;};
const kindR=k=>KINDS[k].r,kindH=k=>KINDS[k].h;
const THEME_ORDER=['toys','fruit','kitchen','treats','sushi','fruit','toys','kitchen','treats','sushi'];
// Every 5th level from 4 (4, 9, 14, 19...) is a points level: one star card, reach the target by eating anything.
const isScoreLevel=level=>HAND[level]?HAND[level].mode==='score':level>=4&&level%5===4;
const CAMEO_KINDS=['rum-ham','fight-milk','head'];
function levelTheme(level){return HAND[level]?.theme||(level===1?'toys':THEME_ORDER[(level-1)%THEME_ORDER.length]);}
const SHAPED={'popsicle-yellow':['spiral','rings'],'popsicle-lime':['spiral','rings'],'popsicle-orange':['spiral','snake','rings'],'popsicle-blue':['rings','spiral'],'popsicle-pink':['spiral','rings'],'popsicle-rainbow':['rings','spiral'],
 kiwi:['grid','snake','rings'],tomato:['pile','snake','rings'],'melon-slice':['flower','rings'],'cup-red':['towers','grid'],'cup-green':['towers','grid'],strawberry:['pile','rings','spiral'],
 'apple-red':['spiral','rings','pile'],'apple-green':['spiral','rings','pile'],cherry:['snake','rings','pile'],egg:['pile','grid'],'egg-brown':['pile','grid'],orange:['pile','grid','rings'],
 blueberry:['rings','snake','diag'],star:['diag','grid','spiral'],duck:['diag','spiral','snake'],octopus:['rings','grid'],latte:['pile','grid'],matcha:['towers','grid'],lollipop:['grid'],pawn:['spiral'],dice:['rings','grid']};
// Fill a cell (centre cx,cz, size w x d) with one formation of kind k at scale sc.
function fillCell(B,form,k,cx,cz,w,d,sc,o={}){const r=KINDS[k].r*sc,sp=r*2.25,R=Math.min(w,d)/2-r;if(R<=0){B.add(k,cx,cz,{sc,...o,rand:true});return;}
 const fit=n=>Math.max(1,Math.floor(n));
 switch(form){
  case 'grid':B.grid(k,cx,cz,fit(w/sp),fit(d/sp),{sc,...o});break;
  case 'rings':B.rings(k,cx,cz,sp*.7,R,{sc,...o});break;
  case 'spiral':B.spiral(k,cx,cz,sp,R,{sc,...o});break;
  case 'snake':B.snake(k,cx,cz,d-r*2,Math.max(1,Math.floor(w/(sp*2.6))),{sc,...o});break;
  case 'flower':B.ring(k,cx,cz,R*.55,fit(TAU*R*.55/(r*2.2)),{sc,face:'out',...o});B.ring(k,cx,cz,R,fit(TAU*R/(r*2.2)),{sc,face:'out',...o});break;
  case 'pile':B.pile(k,cx,cz,R,{sc,...o});break;
  case 'diag':B.diag([k],cx,cz,w-r,d-r,{sc,sp,rsp:sp,angle:B.rnd()<.5?TAU/8:-TAU/8,...o});break;
  case 'towers':{const cols=fit(w/(sp*1.15)),rows=fit(d/(sp*1.15));for(let i=0;i<cols;i++)for(let j=0;j<rows;j++)B.tower(k,cx+(i-(cols-1)/2)*sp*1.15,cz+(j-(rows-1)/2)*sp*1.15,2+Math.floor(B.rnd()*5),{sc,dy:KINDS[k].h*sc*.3,...o});break;}
  case 'cluster':B.scatter(k,cx,cz,R+r*.5,fit(Math.PI*R*R/(Math.PI*r*r*2.6)),{sc,...o});break;
  default:B.grid(k,cx,cz,fit(w/sp),fit(d/sp),{sc,...o});}}
function pickForm(k,rnd){const opts=SHAPED[k]||['grid','rings','spiral','snake','grid','cluster'];return opts[Math.floor(rnd()*opts.length)];}

function level1(B){const rows=[['robot',2.6],['octopus',.4],['duck',-1.8]];
 for(const [k,z] of rows)for(let i=0;i<5;i++)for(let j=0;j<2;j++)B.add(k,(i-2)*.68,z-j*.66);
 return {W:9,D:18,start:{x:0,z:6.8},islands:[],goals:rows.map(([k])=>[k,10])};}

function generate(level,B){
 const rnd=B.rnd,pick=a=>a[Math.floor(rnd()*a.length)],L=Math.min(level,40),T=THEMES[levelTheme(level)];
 const W=Math.min(16,12+L*.15),D=Math.min(40,24+L*.6),start={x:0,z:D/2-2.4};
 // grass islands (walled, the hole steers around them)
 const islands=[];
 for(let n=0,want=L>=6?1+(L>=14)+(L>=24):0,t=0;n<want&&t<60;t++){const w=2.4+rnd()*1.4,d=2.4+rnd()*1.4,x=(rnd()-.5)*Math.max(0,W-w-7.6),z=-D/2+4+d/2+rnd()*Math.max(0,D-d-12.5);const r=[x-w/2,z-d/2,x+w/2,z+d/2];
  if(islands.every(o=>!(r[0]<o[2]+4.4&&r[2]>o[0]-4.4&&r[1]<o[3]+4.4&&r[3]>o[1]-4.4))){islands.push(r);n++;}}
 const smalls=[...T.small].sort(()=>rnd()-.5).slice(0,Math.min(T.small.length,4+Math.floor(L/5))),mids=[...T.mid],bigs=[...T.big];
 const cols=W>=13?3:2,cw=W/cols,cd=3.4;
 const cameoRow=level>=2&&(level%3===2||rnd()<.25)?2+Math.floor(rnd()*3):-1;
 let row=0;
 for(let z=D/2-cd/2-.2;z>-D/2+cd/2-.4;z-=cd,row++){const t=row/Math.max(1,(D-6)/cd);
  for(let c=0;c<cols;c++){const cx=-W/2+cw*(c+.5);if(islands.some(r=>insideRect(cx,z,r,1.0)))continue;
   if(row===cameoRow&&c===0){const k=pick(CAMEO_KINDS);fillCell(B,'grid',k,cx,z,cw-.5,cd-.5,1);continue;}
   const nearStart=Math.abs(z-start.z)<cd*1.2,roll=nearStart?0:rnd(),pSmall=.7-.2*t,pMed=pSmall+.2,pLarge=pMed+.08+.06*t,giantMax=Math.min(5,2.2+L*.1),largeMax=Math.min(3.3,1.9+L*.06);
   if(roll<pSmall||L<2){const k=pick(smalls);fillCell(B,pickForm(k,rnd),k,cx,z,cw-.4,cd-.4,.9+rnd()*.25,{yaw:undefined});}
   else if(roll<pMed){const fromMid=mids.length&&rnd()<.45,k=fromMid?pick(mids):pick(smalls),sc=fromMid?1+rnd()*.3:1.6+rnd()*.6;fillCell(B,rnd()<.5?'grid':'cluster',k,cx,z,cw-.4,cd-.4,sc,{gk:sc>=1.5&&!fromMid?k+'+':undefined,rand:true});}
   else if(roll<pLarge){const k=rnd()<.5&&bigs.length&&L>=5?pick(bigs):pick(mids.length?mids:smalls),sc=KINDS[k].r>=.6?1+rnd()*.25:Math.min(largeMax,2.2+rnd()*.8);B.scatter(k,cx,z,Math.min(cw,cd)/2-.2,2+Math.floor(rnd()*3),{sc,gk:sc>=1.5?k+'+':undefined});}
   else{const k=pick(smalls),sc=Math.max(2,giantMax-rnd()*1.2);B.add(k,cx,z,{sc,gk:k+'+',rand:true});}}}
 if(L>=3&&(T===THEMES.toys||T===THEMES.treats))legoTowers(B,0,-D/2+2.4,Math.min(W-1,5),1.6);
 fillGaps(B,smalls,{W,D,islands,start,rnd,enough:()=>B.items.length>=Math.min(900,260+L*18)});
 return {W,D,start,islands,goals:null};}
// Fill empty patches of floor with small formations of the given kinds until `enough()` says stop.
function fillGaps(B,kinds,{W,D,islands,start,enough,rnd}){const items=B.items;if(!kinds.length)return;let n=0;
 const spots=[];for(let z=-D/2+1.6;z<=D/2-1.6;z+=1.1)for(let x=-W/2+1.6;x<=W/2-1.6;x+=1.1)spots.push([x,z]);
 for(const [x,z] of spots.sort(()=>rnd()-.5)){if(enough())break;
  if(islands.some(o=>insideRect(x,z,o,1.7))||Math.hypot(x-start.x,z-start.z)<2.4||items.some(it=>Math.hypot(it.x-x,it.z-z)<1.45+KINDS[it.k].r*(it.sc||1)))continue;
  const k=kinds[n++%kinds.length],sc=.95+rnd()*.15;fillCell(B,['grid','rings','cluster'][n%3],k,x,z,2.6,2.6,sc);}}
function legoTowers(B,cx,cz,w,d){const colors=['lego-blue','lego-purple','lego-yellow','lego-pink','lego-teal'],sp=.62;const cols=Math.max(1,Math.floor(w/sp)),rows=Math.max(1,Math.floor(d/.36));
 for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const n=3+Math.floor(B.rnd()*5);let prev=-1;for(let s=0;s<n;s++)prev=B.add(colors[(i+j+s)%colors.length],cx+(i-(cols-1)/2)*sp,cz+(j-(rows-1)/2)*.36,{y:s*.2,on:prev});}}

// ---- level builder ----
function buildLevel(level){
 level=Math.max(1,Math.floor(level)||1);const rnd=seededRandom(0x51ce+level*7919),B=makeBuilder(rnd),hand=HAND[level];
 const theme=levelTheme(level),T=THEMES[theme],L=Math.min(level,40);
 let spec;if(hand){spec={...hand};hand.build(B);}else if(level===1)spec=level1(B);else spec=generate(level,B);
 const {W,D,start}=spec,islands=spec.islands||[],items=B.items;
 // keep props inside the tray, off the islands and out of the starting spot
 removeItems(items,it=>{const r=KINDS[it.k].r*(it.sc||1);return !(Math.abs(it.x)<=W/2-r*.6&&Math.abs(it.z)<=D/2-r*.6)||islands.some(o=>insideRect(it.x,it.z,o,r*.7))||(level>1&&Math.hypot(it.x-start.x,it.z-start.z)<.9+r);});
 // a small prop under a much bigger one would be hidden inside it: drop the small one
 {const big=items.map((it,i)=>({i,r:KINDS[it.k].r*(it.sc||1),it})).filter(o=>o.r>=.7&&o.it.on<0);
  if(big.length)removeItems(items,(it,i)=>{if(it.on>=0)return false;const r=KINDS[it.k].r*(it.sc||1);return big.some(o=>o.i!==i&&o.r>r*1.6&&Math.hypot(o.it.x-it.x,o.it.z-it.z)<(o.r+r)*.85);});}
 const key=it=>it.gk||it.k;
 const tally=()=>{const t={};for(const it of items)t[key(it)]=(t[key(it)]||0)+1;return t;};
 let mode='items',goals=[];
 if(spec.goals){ // hand-built: trim each goal prop to exactly the video's count (the overflow formations go first)
  for(const [k,need] of spec.goals){const extra=(tally()[k]||0)-need;if(extra>0){const idx=items.map((it,i)=>key(it)===k?i:-1).filter(i=>i>=0).slice(-extra);const kill=new Set(idx);removeItems(items,(it,i)=>kill.has(i));}}
  // short of the video's count? top up the rest in free spots (same size as that prop's copies on the board)
  for(const [k,need] of spec.goals){const have=tally()[k]||0;if(have<need){const like=items.filter(it=>key(it)===k),sc=like.length?like[Math.floor(like.length/2)].sc||1:1;topUp(B,like[0]?.k||k,need-have,{sc,gk:like[0]?.gk,W,D,islands,start});}}
  const t=tally();goals=spec.goals.map(([k])=>({k,need:t[k]||0})).filter(g=>g.need>0);}
 else if(spec.mode==='score'||isScoreLevel(level)){mode='score';}
 else{
  const t=tally(),goalCount=Math.min(4,2+Math.floor(L/6)),cap=Math.min(160,24+L*6);
  // a key whose base prop also appears in another size would make an ambiguous card: skip those
  const base=k=>k.replace(/\+$/,''),bases={};for(const k of Object.keys(t))bases[base(k)]=(bases[base(k)]||0)+1;
  const cands=Object.keys(t).filter(k=>!['head','pillar','crate','bomb'].includes(base(k))&&!base(k).startsWith('lego')&&t[k]>=3);
  const sz=k=>KINDS[base(k)].r*(k.endsWith('+')?2.5:1);
  const smallC=cands.filter(k=>sz(k)<.45),bigC=cands.filter(k=>sz(k)>=.45);
  const chosen=[];const wantBig=bigC.length&&L>=4?1:0;
  const take=list=>{while(list.length){const k=list.splice(Math.floor(rnd()*list.length),1)[0];if(!chosen.some(c=>base(c)===base(k)))return k;}return null;}; // never the normal and BIG card of one prop together
  while(chosen.length<goalCount-wantBig&&smallC.length){const k=take(smallC);if(k)chosen.push(k);}
  if(wantBig){const k=take(bigC);if(k)chosen.push(k);}
  for(const k of chosen){const extra=(tally()[k]||0)-cap;if(extra>0){const idx=items.map((it,i)=>key(it)===k?i:-1).filter(i=>i>=0).slice(-extra);const kill=new Set(idx);removeItems(items,(it,i)=>kill.has(i));}}
  const t2=tally();goals=chosen.map(k=>({k,need:t2[k]||0})).filter(g=>g.need>0);}
 // bombs (swallow one and the turn is over): in the video's Level 34, and from Level 8 on in generated levels
 {const n=spec.bombs??(hand?0:L>=8?1+(L>=15)+(L>=25):0);if(n)topUp(B,'bomb',n,{sc:1,W,D,islands,start:{x:start.x,z:start.z-1.2},pad:1.4,yaw:0});} // open floor around them, so every prop can be reached from a safe side
 const value=it=>it.k==='bomb'?0:propXp(KINDS[it.k].r*(it.sc||1)),total=items.reduce((a,it)=>a+value(it),0);
 if(mode==='score'&&spec.score){ // video target: make sure the board holds ~45% more points than that
  // fill empty patches of floor with small formations of the level's own props (grids and rings, like the rest)
  const kinds=[...new Set(items.filter(it=>it.k!=='bomb'&&!it.gk&&(it.sc||1)<2&&KINDS[it.k].r*(it.sc||1)<.5).map(it=>it.k))];
  fillGaps(B,kinds,{W,D,islands,start,rnd,enough:()=>items.reduce((a,it)=>a+value(it),0)>=spec.score*1.45});}
 const total2=items.reduce((a,it)=>a+value(it),0);
 if(mode==='score')goals=[{k:'score',need:spec.score||Math.max(40,Math.round(total2*Math.min(.7,.45+L*.008)/10)*10)}];
 // growth curve: at every size the player must be able to reach the next one by eating ~65% of what already fits,
 // so the biggest prop on the board (Size 10 toy blocks in Level 30) becomes edible near the end, as in the video
 const props=items.filter(it=>it.k!=='bomb').map(it=>({r:KINDS[it.k].r*(it.sc||1),xp:value(it)})),maxR=props.reduce((m,p)=>Math.max(m,p.r),0),Sx=Math.max(3,sizeFor(maxR));
 let growBase=Infinity;for(let sz=1;sz<Sx;sz++){const edible=props.reduce((a,p)=>a+(p.r<=holeRadius(sz)*.96?p.xp:0),0),cum=(Math.pow(1.45,sz)-1)/.45;growBase=Math.min(growBase,.65*edible/cum);}
 growBase=Math.max(1,Math.min(60,growBase));
 return {level,theme,themeName:T.name,floor:spec.floor||T.floor,W,D,start,islands,items,goals,mode,time:spec.time||TIME,growBase,hand:!!hand,goalKinds:new Set(goals.map(g=>g.k))};
}
Object.assign(exports,{isScoreLevel,removeItems,buildLevel,holeRadius,sizeNeed,propXp,sizeFor,kindR,kindH,levelTheme,TIME,HAND});
