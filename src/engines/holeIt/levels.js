// Hole.it levels: deterministic per level number (both players and every replay of
// "Level N" get the same tray). Layouts follow the real game: neat rows, rings,
// spirals, snake lines, piles and stacked towers of one prop each, with bigger
// centrepieces further up the tray. Pure data, so Node tests can load it.
const {seededRandom}=require("src/utils.js");
const {KINDS,THEMES}=require("src/engines/holeIt/meshes.js");
const TIME=120;
// Size N hole radius and the xp needed to go from size N to N+1.
const holeRadius=size=>.5*Math.pow(1.17,size-1);
const sizeNeed=size=>Math.round(9*Math.pow(1.45,size-1));
// xp for swallowing one prop: grows with its footprint area.
const propXp=r=>Math.max(1,Math.round(Math.pow(r/.3,2)*1.2));
// Smallest size whose hole swallows a prop of footprint r.
const sizeFor=r=>{let s=1;while(holeRadius(s)*.96<r&&s<40)s++;return s;};
const THEME_ORDER=['toys','fruit','kitchen','sushi','toys','kitchen','fruit','sushi'];
const CAMEO_KINDS=['rum-ham','fight-milk','head'];
function levelTheme(level){return level===1?'toys':THEME_ORDER[(level-1)%THEME_ORDER.length];}

// ---- formations (positions relative to a cell centre, cell w x d) ----
function fGrid(k,w,d,rnd){const r=KINDS[k].r,sp=r*2.25,cols=Math.max(1,Math.floor(w/sp)),rows=Math.max(1,Math.floor(d/sp)),out=[];const y0=rnd()*TAU;
 for(let i=0;i<cols;i++)for(let j=0;j<rows;j++)out.push({x:(i-(cols-1)/2)*sp,z:(j-(rows-1)/2)*sp,yaw:y0});return out;}
function fRings(k,w,d,rnd,center){const r=KINDS[k].r,sp=r*2.3,R=Math.min(w,d)/2-r,out=[];const start=center?KINDS[center].r+r*1.4:sp*.6;
 for(let rr=start;rr<=R;rr+=sp){const n=Math.max(1,Math.floor(TAU*rr/sp));for(let i=0;i<n;i++){const a=i/n*TAU;out.push({x:Math.cos(a)*rr,z:Math.sin(a)*rr,yaw:-a+Math.PI/2});}}
 if(center)out.push({x:0,z:0,yaw:0,k:center});return out;}
function fSpiral(k,w,d,rnd){const r=KINDS[k].r,sp=r*2.3,R=Math.min(w,d)/2-r,out=[];let a=0,rr=sp;const b=sp*1.05/TAU;
 while(rr<R){out.push({x:Math.cos(a)*rr,z:Math.sin(a)*rr,yaw:-a});a+=sp/rr;rr=sp+b*a;}return out;}
function fSnake(k,w,d,rnd){const r=KINDS[k].r,sp=r*2.2,out=[],lanes=Math.max(1,Math.floor(w/(sp*2.4)));
 for(let l=0;l<lanes;l++){const x0=(l-(lanes-1)/2)*sp*2.4,ph=rnd()*TAU;for(let z=-d/2+r;z<=d/2-r;z+=sp*.92)out.push({x:x0+Math.sin(z*.55+ph)*sp*.55,z,yaw:Math.sin(z*.55+ph)});}return out;}
function fFlower(k,w,d,rnd){const r=KINDS[k].r,R=Math.min(w,d)/2-r,out=[];for(let ring=0;ring<3;ring++){const rr=R*(.45+ring*.27);if(rr<r*2)continue;const n=Math.floor(TAU*rr/(r*2.2));for(let i=0;i<n;i++){const a=i/n*TAU+ring*.3;out.push({x:Math.cos(a)*rr,z:Math.sin(a)*rr,yaw:-a-Math.PI/2});}}return out;}
function fPile(k,w,d,rnd){const kd=KINDS[k],r=kd.r,sp=r*2.05,R=Math.min(w,d)/2-r,out=[];let layer=0,rad=R;
 while(rad>=r*.8&&layer<5){const base=out.length;for(let x=-rad;x<=rad;x+=sp)for(let z=-rad;z<=rad;z+=sp*.87){const zz=z,xx=x+(Math.round((z+rad)/(sp*.87))%2?sp/2:0);if(Math.hypot(xx,zz)>rad)continue;out.push({x:xx+layer*.13,z:zz+layer*.13,yaw:rnd()*TAU,y:layer*kd.h*.62,layer});}
  if(out.length===base)break;layer++;rad-=sp*.9;}
 // support: nearest item one layer down
 for(const it of out)if(it.layer>0){let best=-1,bd=1e9;out.forEach((o,i)=>{if(o.layer===it.layer-1){const dd=Math.hypot(o.x-it.x,o.z-it.z);if(dd<bd){bd=dd;best=i;}}});it.on=best;}
 return out;}
function fTowers(k,w,d,rnd){const kd=KINDS[k],r=kd.r,sp=r*2.5,out=[];const cols=Math.max(1,Math.floor(w/sp)),rows=Math.max(1,Math.floor(d/sp));
 for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const n=2+Math.floor(rnd()*5);let prev=-1;for(let s=0;s<n;s++){out.push({x:(i-(cols-1)/2)*sp,z:(j-(rows-1)/2)*sp,y:s*kd.h*.3,yaw:0,on:prev});prev=out.length-1;}}return out;}
function fPillars(k,w,d,rnd){const p=KINDS.pillar,sp=p.r*2.8,out=[],cols=Math.max(1,Math.floor(w/sp)),rows=Math.max(1,Math.floor(d/sp));
 for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const x=(i-(cols-1)/2)*sp,z=(j-(rows-1)/2)*sp;out.push({x,z,yaw:0,k:'pillar'});out.push({x,z,y:p.h,yaw:rnd()*TAU,on:out.length-1});}return out;}
function fCluster(k,w,d,rnd){const r=KINDS[k].r,out=[],R=Math.min(w,d)/2-r;for(let t=0;t<400&&out.length<60;t++){const a=rnd()*TAU,rr=Math.sqrt(rnd())*R,x=Math.cos(a)*rr,z=Math.sin(a)*rr;if(out.every(o=>Math.hypot(o.x-x,o.z-z)>r*2.05))out.push({x,z,yaw:rnd()*TAU});}return out;}
const TAU=Math.PI*2;
const FORMS={grid:fGrid,rings:fRings,spiral:fSpiral,snake:fSnake,flower:fFlower,pile:fPile,towers:fTowers,pillars:fPillars,cluster:fCluster};
const SHAPED={'melon-slice':['flower','rings','spiral'],'cup-red':['towers','grid'],'cup-green':['towers','grid'],strawberry:['pile','rings','spiral'],'apple-red':['spiral','rings','pile'],'apple-green':['spiral','rings','pile'],cherry:['snake','rings','pile'],egg:['pile','cluster','grid'],'egg-brown':['pile','cluster'],orange:['pile','grid','rings'],cupcake:['pillars','grid'],pan:['flower','cluster'],crate:['grid','cluster'],pumpkin:['cluster','grid']};
function pickForm(k,rnd,big){const opts=SHAPED[k]||(big?['cluster','grid']:['grid','rings','spiral','snake','grid','cluster']);return opts[Math.floor(rnd()*opts.length)];}

// ---- level builder ----
function buildLevel(level){
 level=Math.max(1,Math.floor(level)||1);const rnd=seededRandom(0x51ce+level*7919),pick=a=>a[Math.floor(rnd()*a.length)];
 const theme=levelTheme(level),T=THEMES[theme],L=Math.min(level,40);
 const W=level===1?9:Math.min(15,9.5+L*.22),D=level===1?18:Math.min(56,20+L*1.5);
 const items=[];const place=(form,k,cx,cz,cw,cd,extra={})=>{const pts=FORMS[form](k,cw,cd,rnd,extra.center);for(const p of pts){const kk=p.k||k;const it={k:kk,x:cx+p.x,z:cz+p.z,y:p.y||0,yaw:p.yaw||0,on:p.on>=0?items.length-pts.length+0:-1};items.push(it);}
  // re-index supports relative to this batch
  const base=items.length-pts.length;pts.forEach((p,i)=>{items[base+i].on=p.on>=0?base+p.on:-1;});return pts.length;};
 const start={x:0,z:D/2-2.2};
 let goals=[];
 if(level===1){
  const rows=[['robot',D/2-6.2],['octopus',D/2-8.4],['duck',D/2-10.6]];
  for(const [k,z] of rows)for(let i=0;i<5;i++)for(let j=0;j<2;j++)items.push({k,x:(i-2)*.68,z:z-j*.66,y:0,yaw:0,on:-1});
  goals=rows.map(([k])=>({k,need:10}));
 }else{
  // Kinds: smalls first, then mids/bigs as the hole will have grown.
  const smalls=[...T.small].sort(()=>rnd()-.5).slice(0,Math.min(T.small.length,3+Math.floor(L/4)));
  const mids=L>=3?[...T.mid].sort(()=>rnd()-.5).slice(0,Math.min(T.mid.length,1+Math.floor(L/8))):[];
  const bigs=L>=5?[pick(T.big)]:[];
  // Cells laid in rows from the start toward the far end.
  const cameo=level>=2&&(level%3===2||rnd()<.25)?pick(CAMEO_KINDS):null;
  const cell=Math.min(W/2-.3,3.6+L*.03),cols=W>=12?2:1,cw=W/cols-.4;let z=start.z-2.6-cell/2;
  const counts={};const queue=[...smalls.map(k=>({k,tier:0})),...smalls.map(k=>({k,tier:0})),...mids.map(k=>({k,tier:1})),...bigs.map(k=>({k,tier:2}))];
  // extra small cells for longer levels
  while(queue.length<Math.floor((D-6)/cell)*cols)queue.splice(Math.floor(rnd()*queue.length*.7),0,{k:pick(smalls),tier:0});
  queue.sort((a,b)=>a.tier-b.tier);
  if(cameo)queue.splice(Math.min(queue.length,2+Math.floor(rnd()*3)),0,{k:cameo,tier:0});
  let qi=0;
  while(z>-D/2+cell/2&&qi<queue.length){for(let c=0;c<cols&&qi<queue.length;c++){const {k,tier}=queue[qi++];const cx=cols===1?0:(c-.5)*(cw+.4);
    if(tier===2){const n=place('cluster',k,cx,z,cw,cell*1.15);counts[k]=(counts[k]||0)+n;continue;}
    let form=pickForm(k,rnd,tier>0);if(k==='head')form='grid';
    const centerKind=form==='rings'&&tier===0&&T.mid.length&&rnd()<.4?pick(T.mid.filter(m=>KINDS[m].r<cell/3)):null;
    const n=place(form,k,cx,z,cw,cell,{center:centerKind||undefined});counts[k]=(counts[k]||0)+n;if(centerKind)counts[k]--,counts[centerKind]=(counts[centerKind]||0)+1;}
   z-=cell+.5;}
  for(const it of items)counts[it.k]=(counts[it.k]||0);
  const tally={};for(const it of items)tally[it.k]=(tally[it.k]||0)+1;
  const goalCount=Math.min(4,2+Math.floor(L/6)),cands=Object.keys(tally).filter(k=>k!=='head'&&k!=='pillar'&&tally[k]>=3);
  const ordered=cands.sort((a,b)=>KINDS[a].r-KINDS[b].r||tally[b]-tally[a]);
  // Mostly smalls, the last goal may be a bigger prop on later levels.
  const chosen=[];const smallC=ordered.filter(k=>KINDS[k].r<.45),bigC=ordered.filter(k=>KINDS[k].r>=.45);
  while(chosen.length<goalCount-(bigC.length&&L>=4?1:0)&&smallC.length)chosen.push(smallC.splice(Math.floor(rnd()*smallC.length),1)[0]);
  if(bigC.length&&L>=4)chosen.push(bigC[Math.floor(rnd()*bigC.length)]);
  while(chosen.length<goalCount&&smallC.length)chosen.push(smallC.shift());
  const frac=Math.min(.95,.7+L*.01),cap=Math.min(150,14+L*5);goals=chosen.map(k=>({k,need:Math.max(1,Math.min(cap,Math.round(tally[k]*frac)))}));
 }
 // keep items inside the tray
 const out=items.filter(it=>Math.abs(it.x)<=W/2-kindR(it.k)*.6&&it.z>-D/2+.3&&it.z<D/2-.3);
 // fix supports after filtering
 const keep=new Map();items.forEach((it,i)=>{const j=out.indexOf(it);if(j>=0)keep.set(i,j);});
 for(const it of out)it.on=keep.has(it.on)?keep.get(it.on):-1;
 const goalSet=new Set(goals.map(g=>g.k));
 for(const g of goals)g.need=Math.min(g.need,out.filter(it=>it.k===g.k).length);
 return {level,theme,themeName:T.name,floor:T.floor,W,D,start,items:out,goals:goals.filter(g=>g.need>0),time:TIME,goalKinds:goalSet};
}
function kindR(k){return KINDS[k].r;}
function kindH(k){return KINDS[k].h;}
Object.assign(exports,{buildLevel,holeRadius,sizeNeed,propXp,sizeFor,kindR,kindH,levelTheme,TIME,FORMS});
