// The Legend of Zelda · Hyrule Field, one shared top-down screen in the style of the 1986 overworld.
// Both Links (your head on a green / red tunic) roam the same seeded screen with Octoroks and Tektites.
//  'rupees': Rupee Rush. Cut bushes, beat monsters and grab rupees (green 1, blue 5, red 20). Slashing your rival
//            knocks rupees out of their wallet. Most rupees after 60 seconds wins.
//  'duel':   Sword Duel. Three hearts each; a sword hit costs a heart, monsters cost half. Hearts hide in bushes.
//            Last Link standing, or the most hearts after 60 seconds.
// Online: see the notes above netEnemy below.
const {clamp,seededRandom}=require("src/utils.js");
const {Fx,arenaKeys,arenaTouch,snd,noise,jingle,outlined,rr,FONT,PCOL,settle,Countdown,heart}=require("src/engines/arenaKit.js");
const {isCpu,cpuSkill}=require("src/engines/cpuKit.js");
const {netField,roundOutcome}=require("src/engines/netField.js");

const FLOOR='#fcd8a8',TREE='#00a844',TREE_D='#005a24',ROCK='#c84c0c',ROCK_D='#7a2a00',BUSH='#58d854',WATER='#2a6af0';
const TIME=60,DIRS={u:[0,-1],d:[0,1],l:[-1,0],r:[1,0]};

function buildMap(rand,cols,rows){
 for(let attempt=0;attempt<40;attempt++){
  const g=Array.from({length:rows},(_,y)=>Array.from({length:cols},(_,x)=>x===0||y===0||x===cols-1||y===rows-1?'tree':'floor'));
  const sp=[[2,Math.floor(rows/2)],[cols-3,Math.floor(rows/2)]];if(rows>cols){sp[0]=[Math.floor(cols/2),2];sp[1]=[Math.floor(cols/2),rows-3];}
  const near=(x,y)=>sp.some(([a,b])=>Math.abs(a-x)<=1&&Math.abs(b-y)<=1);
  // clusters of rocks/trees, mirrored for fairness
  for(let k=0;k<7;k++){const x0=1+Math.floor(rand()*(cols-2)),y0=1+Math.floor(rand()*(rows-2)),kind=rand()<.5?'rock':'tree',w=1+Math.floor(rand()*2),h=1+Math.floor(rand()*2);
   for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){const mx=cols-1-x,my=rows-1-y;for(const [a,b] of [[x,y],[mx,my]])if(a>0&&b>0&&a<cols-1&&b<rows-1&&!near(a,b))g[b][a]=kind;}}
  // a pond in the middle
  const cx=Math.floor(cols/2),cy=Math.floor(rows/2);if(rand()<.7)for(const [a,b] of [[cx,cy],[cx-1,cy],[cx,cy-1],[cx-1,cy-1]])if(!near(a,b))g[b][a]='water';
  // bushes
  let n=0;for(let k=0;k<200&&n<22;k++){const x=1+Math.floor(rand()*(cols-2)),y=1+Math.floor(rand()*(rows-2));if(g[y][x]==='floor'&&!near(x,y)){g[y][x]='bush';const mx=cols-1-x,my=rows-1-y;if(g[my][mx]==='floor'&&!near(mx,my))g[my][mx]='bush';n+=2;}}
  // every floor tile reachable from spawn 0 (bushes count as passable: they can be cut)
  const seen=new Set([sp[0].join()]),q=[sp[0]];while(q.length){const [x,y]=q.pop();for(const [dx,dy] of Object.values(DIRS)){const a=x+dx,b=y+dy;if(seen.has(a+','+b)||!['floor','bush'].includes(g[b]?.[a]))continue;seen.add(a+','+b);q.push([a,b]);}}
  let ok=true;for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(['floor','bush'].includes(g[y][x])&&!seen.has(x+','+y))ok=false;
  if(ok)return {g,sp};
 }
 const g=Array.from({length:rows},(_,y)=>Array.from({length:cols},(_,x)=>x===0||y===0||x===cols-1||y===rows-1?'tree':'floor'));return {g,sp:[[2,Math.floor(rows/2)],[cols-3,Math.floor(rows/2)]]};
}

async function hyrule(s){
 const mode=s.game.hyruleMode==='duel'?'duel':'rupees';
 const on=s.online||null,me=on?on.me:0,them=1-me,flip=!!on&&me===0,OPP={u:'d',d:'u',l:'r',r:'l'},VX=v=>flip?cols-v:v,VY=v=>flip?rows-v:v,VD=d=>flip?OPP[d]:d;
 const [c,x]=s.canvas(900,620,{fill:true});s.body.classList.add('drag-arena-body');s.shared=true;s.updateScores();
 if(!await settle(s))return;
 const portrait=on?true:s.H>s.W*1.05,cols=portrait?11:16,rows=portrait?16:11;
 const {g,sp}=buildMap(s.random,cols,rows),bushT=new Map(),drops=[],shots=[],fx=new Fx();let dropSeq=0;
 const solid=(tx,ty)=>{const v=g[ty]?.[tx];return v===undefined||v==='tree'||v==='rock'||v==='water'||v==='bush';};
 const L=[0,1].map(i=>({i,x:sp[i][0]+.5,y:sp[i][1]+.5,dir:i?(portrait?'u':'l'):(portrait?'d':'r'),slash:0,cd:0,hearts:6,rupees:0,inv:0,kx:0,ky:0,walk:0,down:0}));
 const enemies=[];const spawnEnemy=(kind)=>{for(let k=0;k<50;k++){const tx=1+Math.floor(s.random()*(cols-2)),ty=1+Math.floor(s.random()*(rows-2));if(g[ty][tx]!=='floor'||L.some(l=>Math.hypot(l.x-tx-.5,l.y-ty-.5)<4))continue;enemies.push({kind,x:tx+.5,y:ty+.5,dir:['u','d','l','r'][Math.floor(s.random()*4)],t:0,fire:1.5+s.random()*2,hp:1,hop:0,vx:0,vy:0,dead:0});return;}};
 const g0=g.map(r=>r.slice()),solidE=(tx,ty)=>{const v=g0[ty]?.[tx];return v===undefined||v!=='floor';};
 if(!on){for(let k=0;k<(mode==='duel'?2:3);k++)spawnEnemy('octorok');for(let k=0;k<(mode==='duel'?1:2);k++)spawnEnemy('tektite');}
 const kb=arenaKeys(s),sticks=[null,null],cd=new Countdown(3);let phase='count',t=0,clock=0,endT=0,endText='',respawnQ=[];
 const zoneOf=p=>portrait?(p.y<s.H/2?0:1):(p.x<s.W/2?0:1);
 const slash=i=>{const l=L[i];if(phase!=='play'||l.cd>0||l.down>0)return;if(on&&(i!==me||net.outc?.R.frozen))return;l.slash=.24;l.cd=.36;if(on)nf.event({sl:[nowMs(),l.dir]});snd(900,.06,{type:'sawtooth',vol:.03,to:300});noise(.06,{vol:.03,freq:3000});};
 arenaTouch(s,{owner:zoneOf,maxFingers:2,onDown:f=>{if(!sticks[f.owner])sticks[f.owner]=f;else slash(f.owner);},onUp:f=>{if(sticks[f.owner]===f){sticks[f.owner]=null;if(f.moved<12&&f.held<220)slash(f.owner);}}});
 kb.onDown((i,k)=>{if(k==='fire')slash(i);});
 s.hint(mode==='rupees'?'Rupee Rush: drag on your half to walk (P1 top or left, P2 bottom or right); tap to swing your sword (a second finger works too). Cut bushes, beat Octoroks and Tektites, grab rupees: green 1, blue 5, red 20. Slash your rival to knock rupees out of their wallet. Face a rock to block it with your shield. Most rupees after 60 seconds. P1 WASD + Space, P2 arrows + Enter.':'Sword Duel: drag on your half to walk, tap to swing. Three hearts each: a sword hit costs a full heart, monsters half. Cut bushes for hearts. Face incoming rocks to block them with your shield. Last Link standing, or the most hearts after 60 seconds. P1 WASD + Space, P2 arrows + Enter.');
 const tile=()=>{const T=Math.floor(Math.min(s.W/cols,(s.H*.9)/rows));return {T,ox:(s.W-T*cols)/2,oy:s.H*.1+(s.H*.9-T*rows)/2};};
 const drop=(px,py,from='bush')=>{const r=((dropSeq++*0.6180339)%1+Math.sin(dropSeq*12.9898)*.5+.5)%1;let kind=null;
  if(mode==='duel'){kind=r<.32?'heart':null;}else kind=r<.04?'red':r<.22?'blue':r<.78?'green':r<.86?'heart':null;
  if(kind)drops.push({kind,x:px,y:py,t:0});};
 const hurt=(l,amt,fromX,fromY,byRival=false)=>{if(l.inv>0||l.down>0)return;l.hearts=Math.max(0,l.hearts-amt);l.inv=1;const d=Math.hypot(l.x-fromX,l.y-fromY)||1;l.kx=(l.x-fromX)/d*9;l.ky=(l.y-fromY)/d*9;snd(200,.2,{type:'square',vol:.04,to:80});s.react(l.i,'sad');
  if(mode==='rupees'&&byRival&&l.rupees>0){const n=Math.min(l.rupees,5);l.rupees-=n;for(let k=0;k<n;k++)drops.push({kind:'green',x:l.x+(Math.random()-.5)*1.4,y:l.y+(Math.random()-.5)*1.4,t:0});}
  if(l.hearts<=0){if(mode==='duel'){phase='end';endT=0;endText=`${s.players[1-l.i].name.toUpperCase()} WINS THE DUEL!`;jingle([523,659,784,1047,1319],{step:.1,type:'square',vol:.04});}
   else{l.down=2;const lost=Math.floor(l.rupees/4);l.rupees-=lost;for(let k=0;k<Math.min(lost,8);k++)drops.push({kind:'green',x:l.x+(Math.random()-.5)*2,y:l.y+(Math.random()-.5)*2,t:0});}}};
 const move=(o,dx,dy,r=.34,sol=solid)=>{const nx=o.x+dx;if(!sol(Math.floor(nx-r),Math.floor(o.y-r))&&!sol(Math.floor(nx+r),Math.floor(o.y-r))&&!sol(Math.floor(nx-r),Math.floor(o.y+r))&&!sol(Math.floor(nx+r),Math.floor(o.y+r)))o.x=nx;
  const ny=o.y+dy;if(!solid(Math.floor(o.x-r),Math.floor(ny-r))&&!solid(Math.floor(o.x+r),Math.floor(ny-r))&&!solid(Math.floor(o.x-r),Math.floor(ny+r))&&!solid(Math.floor(o.x+r),Math.floor(ny+r)))o.y=ny;};
 const swordBox=l=>{const [dx,dy]=DIRS[l.dir];return {x:l.x+dx*.85,y:l.y+dy*.85,r:.5};};
 s.debug={L,enemies,drops,g,get phase(){return phase;},slash,setClock(v){clock=v;}};
 // vs CPU: Link 2 picks a goal (rupees/hearts, a bush, a monster, or you in a duel), walks a breadth-first path to it and swings when it's next to it
 const cpu=isCpu(s);let cpuT=0,cpuStep=null,cpuGoal=null;
 function cpuPath(sx,sy,goals){const key=(x,y)=>y*cols+x,prev=new Map([[key(sx,sy),-1]]),q=[[sx,sy]];while(q.length){const [x0,y0]=q.shift();if(goals.has(key(x0,y0))){const path=[];let k=key(x0,y0);while(k!==-1){path.unshift({x:k%cols,y:Math.floor(k/cols)});k=prev.get(k);}return path;}
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x0+dx,ny=y0+dy;if(nx<0||ny<0||nx>=cols||ny>=rows||prev.has(key(nx,ny))||solid(nx,ny)&&g[ny][nx]!=='bush')continue;prev.set(key(nx,ny),key(x0,y0));q.push([nx,ny]);}}return null;}
 function cpuLink(dt,i=1){const l=L[i],o=L[1-i],sk=cpuSkill(s),press=(k,v)=>on?(botKeys[k]=v?1:0):kb.cpu(k,v);for(const k of ['l','r','u','d'])press(k,false);if(l.down>0)return;const tx=Math.floor(l.x),ty=Math.floor(l.y);
  cpuT-=dt;if(cpuT<=0){cpuT=.25+(1-sk)*.3;const goals=new Set(),add=(x,y,near)=>{x=Math.floor(x);y=Math.floor(y);for(const [dx,dy] of near?[[0,0],[1,0],[-1,0],[0,1],[0,-1]]:[[0,0]])if(!solid(x+dx,y+dy))goals.add((y+dy)*cols+x+dx);};
   cpuGoal=null;if(mode==='duel'&&o.down<=0&&!(l.hearts<=2&&drops.some(d=>d.kind==='heart'))){cpuGoal={x:o.x,y:o.y,hit:true};}else{let best=null,bv=0;for(const d of drops){const v=(d.kind==='heart'?(l.hearts<4?30:2):d.kind==='red'?20:d.kind==='blue'?5:1)/(1+Math.hypot(d.x-l.x,d.y-l.y));if(v>bv){bv=v;best={x:d.x,y:d.y};}}
    if(!best){for(const e of enemies)if(!e.dead){const v=2/(1+Math.hypot(e.x-l.x,e.y-l.y));if(v>bv){bv=v;best={x:e.x,y:e.y,hit:true};}}for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(g[y][x]==='bush'){const v=1.5/(1+Math.hypot(x+.5-l.x,y+.5-l.y));if(v>bv){bv=v;best={x:x+.5,y:y+.5,hit:true,bush:true};}}}
    if(mode==='rupees'&&o.down<=0&&o.rupees>5&&Math.hypot(o.x-l.x,o.y-l.y)<3)best={x:o.x,y:o.y,hit:true};cpuGoal=best;}
   if(cpuGoal){add(cpuGoal.x,cpuGoal.y,cpuGoal.hit);cpuStep=cpuPath(tx,ty,goals);}else cpuStep=null;}
  if(!cpuGoal)return;const gx=cpuGoal.x,gy=cpuGoal.y,near=Math.hypot(gx-l.x,gy-l.y)<(cpuGoal.bush?1.3:1.05);
  if(near&&cpuGoal.hit){const dx=gx-l.x,dy=gy-l.y,dir=Math.abs(dx)>Math.abs(dy)?(dx<0?'l':'r'):(dy<0?'u':'d');if(l.dir!==dir)press(dir,true);else if(l.cd<=0&&Math.random()<.4+sk*.6)slash(i);return;}
  const path=cpuStep;let here=path?path.findIndex(q=>q.x===tx&&q.y===ty):-1;const step=path&&here>=0&&here<path.length-1?path[here+1]:null;
  if(step&&g[step.y]?.[step.x]==='bush'){const cx0=tx+.5-l.x,cy0=ty+.5-l.y;if(Math.abs(cx0)>.12){press(cx0<0?'l':'r',true);return;}if(Math.abs(cy0)>.12){press(cy0<0?'u':'d',true);return;}const ddx=step.x-tx,ddy=step.y-ty,dir=ddx<0?'l':ddx>0?'r':ddy<0?'u':'d';if(l.dir!==dir)press(dir,true);else if(l.cd<=0)slash(i);return;}
  if(path&&here<0)cpuT=0;const nx=step?step.x+.5:gx,ny=step?step.y+.5:gy,dx=nx-l.x,dy=ny-l.y;
  if(step){const cx=tx+.5-l.x,cy=ty+.5-l.y;if(step.y===ty&&Math.abs(cy)>.1){press(cy<0?'u':'d',true);return;}if(step.x===tx&&Math.abs(cx)>.1){press(cx<0?'l':'r',true);return;}}
  if(Math.abs(dx)>.1)press(dx<0?'l':'r',true);else if(Math.abs(dy)>.1)press(dy<0?'u':'d',true);}
 let curT=tile().T;
 // ---------------- online (s.online). Fixed 11x16 field; player 1's phone shows it turned round so your Link starts at the
 // bottom (the map is point-symmetric). Monsters are seeded per slot and generation and stepped at 30 Hz on the shared
 // clock; they and their rocks treat every bush tile as solid, so both phones move them alike. Each phone judges only its
 // own Link: rocks, monster touches and the other Link's sword ({sl:[ms,dir]} starts a slash there). Kills {ek:[slot,gen,ms,x,y]},
 // cut bushes {bc:[tx,ty,gen,ms]} and pickups {pk:[id,ms]} are time-stamped claims: the earlier one counts (tie: player 1).
 // Drops are named by what made them, so both phones deal the same kind. Rupees lost {lo:[ms,n,[[id,kind,x,y]..]]} are
 // the victim's call. Rupee Rush ends with {tu:ms} from both and both wallets rebuilt from the logs; Sword Duel through roundOutcome.
 const STEP=1/30,net={t0:0,clock:-3,slots:[],drops:new Map(),claims:new Map(),loss:[[],[]],bush:new Map(),tu:[null,null],seen:null,outc:null,spill:0,hidden:new Set(),hit:new Set(),started:false},botKeys={l:0,r:0,u:0,d:0};
 const nShots=new Map(),nOct=mode==='duel'?2:3,nSlots=mode==='duel'?3:5;
 const nowMs=()=>Math.round(net.clock*1000),VAL={green:1,blue:5,red:20};
 function netEnemy(slot,gen,S){const rnd=seededRandom(`${s.seed}:hy:${slot}:${gen}`),kind=gen===0?(slot<nOct?'octorok':'tektite'):(rnd()<.6?'octorok':'tektite');let tx=Math.floor(cols/2),ty=Math.floor(rows/2);
  for(let k=0;k<80;k++){const a=1+Math.floor(rnd()*(cols-2)),b=1+Math.floor(rnd()*(rows-2));if(g0[b][a]==='floor'&&sp.every(([p,q])=>Math.hypot(p-a,q-b)>=4)){tx=a;ty=b;break;}}
  return {slot,gen,kind,S,x:tx+.5,y:ty+.5,dir:['u','d','l','r'][Math.floor(rnd()*4)],t:0,fire:1.5+rnd()*2,hp:1,hop:0,vx:0,vy:0,air:0,dead:0,rnd,simT:S,killT:null,fires:0};}
 function stepE(e,dt){e.t+=dt;
  if(e.kind==='octorok'){const [dx,dy]=DIRS[e.dir],ox=e.x,oy=e.y;move(e,dx*1.8*dt,dy*1.8*dt,.38,solidE);if((ox===e.x&&oy===e.y)||e.rnd()<dt*.5)e.dir=['u','d','l','r'][Math.floor(e.rnd()*4)];
   e.fire-=dt;if(e.fire<=0){e.fire=2+e.rnd()*2;const id=`${e.slot}:${e.gen}:${e.fires++}`;nShots.set(id,{id,x0:e.x+dx*.5,y0:e.y+dy*.5,dx,dy,born:e.simT+dt,x:0,y:0,gone:false});}}
  else{e.hop-=dt;if(e.hop<=0){e.hop=.9+e.rnd()*.8;const a=e.rnd()*Math.PI*2;e.vx=Math.cos(a)*3.2;e.vy=Math.sin(a)*3.2;e.air=.45;}if(e.air>0){e.air-=dt;move(e,e.vx*dt,e.vy*dt,.3,solidE);}}}
 const dropKind=id=>{const r=seededRandom(`${s.seed}:hyd:${id}`)();return mode==='duel'?(r<.32?'heart':null):r<.04?'red':r<.22?'blue':r<.78?'green':r<.86?'heart':null;};
 function netDrop(id,x,y,c,kind){const d=net.drops.get(id);if(d){if(c<d.c){d.c=c;d.x=x;d.y=y;}return;}kind=kind===undefined?dropKind(id):kind;if(kind)net.drops.set(id,{id,kind,x,y,c});}
 const bushOf=(tx,ty)=>{const k=tx+','+ty;let b=net.bush.get(k);if(!b){b={tx,ty,gen:0,cutT:null,pending:false};net.bush.set(k,b);}return b;};
 function cutBush(b,c,mine){g[b.ty][b.tx]='cut';b.cutT=c;b.pending=false;fx.burst(VX(b.tx+.5)*curT,VY(b.ty+.5)*curT,{n:10,color:BUSH,speed:3*curT,life:.4,size:.12*curT,drag:3});if(mine)noise(.1,{vol:.04,freq:2400});netDrop(`b:${b.tx},${b.ty}:${b.gen}`,b.tx+.5,b.ty+.5,c);}
 function killEnemy(e,c,x,y,mine){if(e.killT===null||c<e.killT){e.killT=c;for(const [id,sh] of nShots)if(id.startsWith(`${e.slot}:${e.gen}:`)&&sh.born>c)nShots.delete(id);}
  if(mine){snd(300,.15,{type:'square',vol:.04,to:900});fx.burst(VX(e.x)*curT,VY(e.y)*curT,{n:12,colors:['#fff','#ffd21c','#ff7a2a'],speed:4*curT,life:.35,size:.1*curT,drag:3});}
  netDrop(`e:${e.slot}:${e.gen}`,x,y,c);}
 const wallet=i=>{const lim=net.tu[0]!==null&&net.tu[1]!==null?Math.min(net.tu[0],net.tu[1]):Infinity;let v=0;for(const [id,c] of net.claims)if(c.by===i&&c.t<=lim){const d=net.drops.get(id);v+=VAL[d?.kind]||0;}for(const l of net.loss[i])if(l.t<=lim)v-=l.n;return Math.max(0,v);};
 // this phone's Link takes a hit (it alone decides; rupees it loses spill as drops named after it)
 function hurtNet(amt,fromX,fromY,byRival){const l=L[me];if(l.inv>0||l.down>0||net.outc?.R.frozen)return;l.hearts=Math.max(0,l.hearts-amt);l.inv=1;const d=Math.hypot(l.x-fromX,l.y-fromY)||1;l.kx=(l.x-fromX)/d*9;l.ky=(l.y-fromY)/d*9;snd(200,.2,{type:'square',vol:.04,to:80});s.react(me,'sad');
  if(byRival)nf.event({ht:[nowMs()]});
  const spill=(n,shown,spread)=>{if(n<=0)return;const ms=nowMs(),list=[];for(let k=0;k<shown;k++){const id=`l${me}:${net.spill++}`,x=clamp(l.x+(Math.random()-.5)*spread,1.2,cols-1.2),y=clamp(l.y+(Math.random()-.5)*spread,1.2,rows-1.2);list.push([id,'green',+x.toFixed(2),+y.toFixed(2)]);netDrop(id,x,y,ms/1000,'green');}net.loss[me].push({t:ms,n});nf.event({lo:[ms,n,list]});};
  if(mode==='rupees'&&byRival){const n=Math.min(wallet(me),5);spill(n,n,1.4);}
  if(l.hearts<=0){if(mode==='duel'){net.outc?.die(net.clock,0);}else{l.down=2;const lost=Math.floor(wallet(me)/4);spill(lost,Math.min(lost,8),2);}}
  nf.push();}
 const nf=netField(s,{hz:20,pack:()=>{const l=L[me];return {x:+l.x.toFixed(2),y:+l.y.toFixed(2),d:l.dir,h:l.hearts,dn:l.down>0?1:0,iv:+l.inv.toFixed(2),w:+(l.walk%62.8).toFixed(1)};},
  unpack:(i,d)=>{if(!d||!Number.isFinite(d.x))return;const o=L[them];net.seen={x:clamp(d.x,0,cols),y:clamp(d.y,0,rows),at:performance.now()};if(DIRS[d.d]&&o.slash<=0)o.dir=d.d;if(Number.isFinite(d.h))o.hearts=clamp(d.h,0,6);
   if(d.dn&&o.down<=0)o.down=2;else if(!d.dn&&o.down>0){o.down=0;o.x=net.seen.x;o.y=net.seen.y;}o.inv=+d.iv||0;if(Number.isFinite(d.w))o.walk=d.w;},
  onEvent:e=>{const k=Object.keys(e||{})[0],a=e?.[k];if(!Array.isArray(a))return;
   if(k==='sl'){const o=L[them];if(DIRS[a[1]])o.dir=a[1];o.slash=.24;snd(900,.06,{type:'sawtooth',vol:.02,to:300});}
   else if(k==='ek'){const [slot,gen,ms,x,y]=a,e=net.slots[slot];if(!e)return;const c=ms/1000;
    if(e.gen===gen)killEnemy(e,c,+x||e.x,+y||e.y,false);
    else if(e.gen===gen+1&&e.S>c+4+1e-6){net.slots[slot]=netEnemy(slot,gen+1,c+4);for(const id of [...nShots.keys()])if(id.startsWith(`${slot}:${gen+1}:`))nShots.delete(id);netDrop(`e:${slot}:${gen}`,+x,+y,c);}
    else if(e.gen>gen)netDrop(`e:${slot}:${gen}`,+x,+y,c);}
   else if(k==='bc'){const [tx,ty,gen,ms]=a,b=g0[ty]?.[tx]==='bush'?bushOf(tx,ty):null;if(!b)return;const c=ms/1000;
    if(b.gen===gen){if(b.cutT===null)cutBush(b,c,false);else if(c<b.cutT){b.cutT=c;netDrop(`b:${tx},${ty}:${gen}`,tx+.5,ty+.5,c);}}
    else if(b.gen<gen){b.gen=gen;cutBush(b,c,false);}}
   else if(k==='pk'){const [id,ms]=a,c=net.claims.get(id);if(!c||c.by===me&&(ms<c.t||ms===c.t&&them===0))net.claims.set(id,{by:them,t:ms});}
   else if(k==='lo'){const [ms,n,list]=a;net.loss[them].push({t:ms|0,n:n|0});if(Array.isArray(list))for(const [id,kind,x,y] of list)netDrop(id,+x,+y,ms/1000,kind);}
   else if(k==='ht'){const o=L[them];fx.burst(VX(o.x)*curT,VY(o.y)*curT,{n:10,color:'#fff',speed:4*curT,life:.3,size:.1*curT,drag:3});}
   else if(k==='sh'){nShots.delete(a[0]);}
   else if(k==='tu'){net.tu[them]=a[0]|0;}
   else if(k==='o')net.outc?.feed(a);}});
 // the shared world up to the shared clock: monsters (respawning 4 s after a kill), rocks, bushes regrowing 12 s after a cut
 function netWorld(){const c=net.clock;
  for(let k=0;k<net.slots.length;k++){let e=net.slots[k];if(e.killT!==null&&c>=e.killT+4)e=net.slots[k]=netEnemy(k,e.gen+1,e.killT+4);
   const end=Math.min(c,e.killT??Infinity);while(e.simT+STEP<=end){stepE(e,STEP);e.simT+=STEP;}e.dead=e.killT===null?0:Math.max(0,.4-(c-e.killT));}
  enemies.length=0;for(const e of net.slots)if(c>=e.S&&(e.killT===null||e.dead>0))enemies.push(e);
  shots.length=0;for(const sh of nShots.values()){const age=c-sh.born;if(age<0)continue;sh.x=sh.x0+sh.dx*7*age;sh.y=sh.y0+sh.dy*7*age;if(sh.gone||age>3||solidE(Math.floor(sh.x),Math.floor(sh.y))){sh.gone=true;continue;}if(!net.hidden.has(sh.id)&&!net.hit.has(sh.id))shots.push(sh);}
  for(const b of net.bush.values()){if(b.cutT!==null&&c>=b.cutT+12){b.gen++;b.cutT=null;b.pending=true;}if(b.pending&&!L.some(l=>Math.floor(l.x)===b.tx&&Math.floor(l.y)===b.ty)){g[b.ty][b.tx]='bush';b.pending=false;}}
  drops.length=0;for(const d of net.drops.values()){const age=c-d.c;if(age<0||age>9||net.claims.has(d.id))continue;drops.push({id:d.id,kind:d.kind,x:d.x,y:d.y,t:age});}}
 function netStep(dt){
  if(phase==='sync')return true;
  net.clock=(performance.now()-net.t0)/1000-3;
  if(phase==='count'){cd.update(dt);if(net.clock>=0){phase='play';if(mode==='duel')net.outc=roundOutcome(nf,0);}return true;}
  if(phase==='end'){endT+=dt;if(endT>2.8){s.finish(net.final,mode==='rupees'?`Rupee Rush: ${s.players[0].name} ${net.final[0]} rupees, ${s.players[1].name} ${net.final[1]}.`:`Sword Duel: ${s.players[0].name} ${net.final[0]} hearts left, ${s.players[1].name} ${net.final[1]}.`);return false;}return true;}
  clock=Math.min(net.clock,TIME);netWorld();nf.tick(dt);
  const l=L[me],o=L[them],frozen=phase!=='play'||net.outc?.R.frozen;
  if(phase==='play'&&net.bot)cpuLink(dt,me);
  // the other Link eases toward its last report; its slash lands (or not) on this phone's Link here
  if(net.seen&&o.down<=0){const kk=Math.min(1,dt*16);o.x+=(net.seen.x-o.x)*kk;o.y+=(net.seen.y-o.y)*kk;}
  o.inv=Math.max(0,o.inv-dt);if(o.down>0)o.down=Math.max(.01,o.down-dt);
  if(o.slash>0){o.slash-=dt;const sb=swordBox(o);if(!frozen&&l.down<=0&&l.inv<=0&&Math.hypot(l.x-sb.x,l.y-sb.y)<.8)hurtNet(mode==='duel'?2:1,o.x,o.y,true);}
  for(const sh of shots)if(Math.hypot(o.x-sh.x,o.y-sh.y)<.5)net.hidden.add(sh.id);
  // this phone's Link
  l.cd=Math.max(0,l.cd-dt);l.inv=Math.max(0,l.inv-dt);
  if(l.down>0){l.down-=dt;if(l.down<=0){l.down=0;l.hearts=6;l.x=sp[me][0]+.5;l.y=sp[me][1]+.5;l.inv=1.5;nf.push();}}
  else if(!frozen){
   if(Math.abs(l.kx)+Math.abs(l.ky)>.1){move(l,l.kx*dt,l.ky*dt);l.kx*=Math.pow(.002,dt);l.ky*=Math.pow(.002,dt);}
   let mx=0,my=0;const k=kb.state[me],st=sticks[me],sg=flip?-1:1;if(k.l)mx-=sg;if(k.r)mx+=sg;if(k.u)my-=sg;if(k.d)my+=sg;if(botKeys.l)mx--;if(botKeys.r)mx++;if(botKeys.u)my--;if(botKeys.d)my++;mx=Math.sign(mx);my=Math.sign(my);
   if(st){const dx=(st.x-st.sx)*sg,dy=(st.y-st.sy)*sg;if(Math.hypot(dx,dy)>10){if(Math.abs(dx)>Math.abs(dy))mx=Math.sign(dx);else my=Math.sign(dy);}}
   if(mx&&my){if(Math.abs(mx)>=Math.abs(my))my=0;else mx=0;}
   if((mx||my)&&l.slash<=0){l.dir=mx<0?'l':mx>0?'r':my<0?'u':'d';move(l,mx*4.6*dt,my*4.6*dt);l.walk+=dt*8;}
   if(l.slash>0){l.slash-=dt;const sb=swordBox(l),tx=Math.floor(sb.x),ty=Math.floor(sb.y);
    if(g[ty]?.[tx]==='bush'){const b=bushOf(tx,ty);if(b.cutT===null&&!b.pending){cutBush(b,net.clock,true);nf.event({bc:[tx,ty,b.gen,nowMs()]});}}
    for(const e of net.slots)if(e.killT===null&&net.clock>=e.S&&Math.hypot(e.x-sb.x,e.y-sb.y)<.75){const x0=+e.x.toFixed(2),y0=+e.y.toFixed(2);killEnemy(e,net.clock,x0,y0,true);nf.event({ek:[e.slot,e.gen,nowMs(),x0,y0]});}}
   for(const e of enemies)if(!e.dead&&Math.hypot(l.x-e.x,l.y-e.y)<.7)hurtNet(1,e.x,e.y,false);
   for(const sh of shots)if(!net.hit.has(sh.id)&&l.down<=0&&Math.hypot(l.x-sh.x,l.y-sh.y)<.5){net.hit.add(sh.id);nf.event({sh:[sh.id]});const [fx0,fy0]=DIRS[l.dir];
    if(fx0===-sh.dx&&fy0===-sh.dy&&l.slash<=0){snd(1400,.05,{type:'square',vol:.03});fx.burst(VX(sh.x)*curT,VY(sh.y)*curT,{n:6,color:'#fff',speed:3*curT,life:.2,size:.08*curT,drag:3});}else hurtNet(1,sh.x-sh.dx,sh.y-sh.dy,false);}
   for(const d of drops)if(l.down<=0&&d.t>.3&&Math.hypot(l.x-d.x,l.y-d.y)<.6&&!net.claims.has(d.id)){const ms=nowMs();net.claims.set(d.id,{by:me,t:ms});nf.event({pk:[d.id,ms]});
    if(d.kind==='heart'){l.hearts=Math.min(6,l.hearts+2);jingle([1047,1319],{step:.05,type:'square',vol:.03});nf.push();}else{const v=VAL[d.kind];snd(v>1?1568:1319,.06,{type:'square',vol:.03});snd(v>1?2093:1760,.1,{type:'square',vol:.03,delay:.05});fx.pop(VX(d.x)*curT,(VY(d.y)-.4)*curT,`+${v}`,{color:'#fff',stroke:'#000',size:Math.max(12,.45*curT),rise:.8*curT});}}}
  for(const i of [0,1])L[i].rupees=wallet(i);
  // the end: Rupee Rush when both clocks are in, Sword Duel when roundOutcome has both outs
  if(mode==='rupees'){if(phase==='play'&&net.clock>=TIME){phase='wait';net.tu[me]=TIME*1000;nf.event({tu:[TIME*1000]});nf.push();}
   if(phase==='wait'&&net.tu[them]!==null){net.final=[wallet(0),wallet(1)];L[0].rupees=net.final[0];L[1].rupees=net.final[1];const [a,b]=net.final;endText=a===b?'A TIE IN RUPEES':`${s.players[a>b?0:1].name.toUpperCase()} IS RICHEST IN HYRULE`;phase='end';endT=0;jingle([523,659,784,1047,1319],{step:.1,type:'square',vol:.04});}}
  else if(net.outc){const R=net.outc.R;if(!R.frozen&&net.clock>=TIME)net.outc.timeUp(l.hearts);
   const res=net.outc.tick(net.clock,()=>l.hearts);
   if(res!==null&&phase!=='end'){const sc=[0,0];sc[me]=R.out>=0?0:Math.ceil((R.extra|0)/2);sc[them]=R.theirOut>=0?0:Math.ceil((R.theirExtra|0)/2);net.final=sc;
    endText=res==='none'&&sc[0]===sc[1]?'THE DUEL IS A DRAW':`${s.players[res==='me'?me:res==='them'?them:sc[0]>sc[1]?0:1].name.toUpperCase()} WINS THE DUEL!`;phase='end';endT=0;jingle([523,659,784,1047,1319],{step:.1,type:'square',vol:.04});}
   else if(R.frozen&&phase==='play')phase='wait';}
  return true;}
 if(on){phase='sync';for(let k=0;k<nSlots;k++)net.slots.push(netEnemy(k,0,0));s.debug.bot=()=>{if(net.bot)return '';net.bot=true;return 'drive';};
  // test summary (NETSTAT=1): claims and losses per player, monsters at the last whole second
  const probe={};Object.defineProperty(s.debug,'net',{get:()=>{const cl=[0,0];for(const c of net.claims.values())cl[c.by]++;const sec=Math.floor(net.clock);if(probe.sec!==sec){probe.sec=sec;probe.mon=net.slots.map(e=>`${e.slot}.${e.gen}@${e.x.toFixed(1)},${e.y.toFixed(1)}`).join(' ');}
   return {clock:+net.clock.toFixed(1),wallet:[wallet(0),wallet(1)],claims:cl,loss:net.loss.map(l=>l.reduce((t,q)=>t+q.n,0)),hearts:L.map(l=>l.hearts),drops:net.drops.size,mon:probe.mon,sec};}});
  void (async()=>{await nf.start('go');if(!s.alive)return;net.t0=performance.now();phase='count';})();}
 s.frame(dt=>{t+=dt;fx.update(dt);dt=Math.min(dt,.04);curT=tile().T;
  if(on){if(!netStep(dt))return;}
  else if(phase==='count'){if(!cd.update(dt))phase='play';}
  else if(phase==='play'){clock+=dt;if(cpu)cpuLink(dt);
   for(const l of L){l.cd=Math.max(0,l.cd-dt);l.inv=Math.max(0,l.inv-dt);if(l.down>0){l.down-=dt;if(l.down<=0){l.hearts=6;l.x=sp[l.i][0]+.5;l.y=sp[l.i][1]+.5;l.inv=1.5;}continue;}
    if(Math.abs(l.kx)+Math.abs(l.ky)>.1){move(l,l.kx*dt,l.ky*dt);l.kx*=Math.pow(.002,dt);l.ky*=Math.pow(.002,dt);}
    let mx=0,my=0;const k=kb.state[l.i],st=sticks[l.i];if(k.l)mx--;if(k.r)mx++;if(k.u)my--;if(k.d)my++;
    if(st){const dx=st.x-st.sx,dy=st.y-st.sy;if(Math.hypot(dx,dy)>10){if(Math.abs(dx)>Math.abs(dy))mx=Math.sign(dx);else my=Math.sign(dy);}}
    if(mx&&my){if(Math.abs(mx)>=Math.abs(my))my=0;else mx=0;}
    if((mx||my)&&l.slash<=0){l.dir=mx<0?'l':mx>0?'r':my<0?'u':'d';move(l,mx*4.6*dt,my*4.6*dt);l.walk+=dt*8;}
    if(l.slash>0){l.slash-=dt;const sb=swordBox(l);
     const tx=Math.floor(sb.x),ty=Math.floor(sb.y);if(g[ty]?.[tx]==='bush'){g[ty][tx]='cut';bushT.set(tx+','+ty,12);fx.burst(VX(tx+.5)*curT,VY(ty+.5)*curT,{n:10,color:BUSH,speed:3*curT,life:.4,size:.12*curT,drag:3});noise(.1,{vol:.04,freq:2400});drop(tx+.5,ty+.5);}
     for(const e of enemies)if(!e.dead&&Math.hypot(e.x-sb.x,e.y-sb.y)<.75){e.dead=.4;snd(300,.15,{type:'square',vol:.04,to:900});fx.burst(VX(e.x)*curT,VY(e.y)*curT,{n:12,colors:['#fff','#ffd21c','#ff7a2a'],speed:4*curT,life:.35,size:.1*curT,drag:3});drop(e.x,e.y,'enemy');respawnQ.push(4);}
     const o=L[1-l.i];if(o.down<=0&&Math.hypot(o.x-sb.x,o.y-sb.y)<.8&&o.inv<=0){hurt(o,mode==='duel'?2:1,l.x,l.y,true);fx.burst(VX(o.x)*curT,VY(o.y)*curT,{n:10,color:'#fff',speed:4*curT,life:.3,size:.1*curT,drag:3});}}}
   // bushes regrow
   for(const [key,v] of bushT){const nv=v-dt;if(nv<=0){const [tx,ty]=key.split(',').map(Number);if(!L.some(l=>Math.floor(l.x)===tx&&Math.floor(l.y)===ty)){g[ty][tx]='bush';bushT.delete(key);}}else bushT.set(key,nv);}
   for(let k=respawnQ.length-1;k>=0;k--){respawnQ[k]-=dt;if(respawnQ[k]<=0){respawnQ.splice(k,1);spawnEnemy(s.random()<.6?'octorok':'tektite');}}
   // enemies
   for(let k=enemies.length-1;k>=0;k--){const e=enemies[k];if(e.dead){e.dead-=dt;if(e.dead<=0)enemies.splice(k,1);continue;}e.t+=dt;
    if(e.kind==='octorok'){const [dx,dy]=DIRS[e.dir],ox=e.x,oy=e.y;move(e,dx*1.8*dt,dy*1.8*dt,.38);if((ox===e.x&&oy===e.y)||s.random()<dt*.5)e.dir=['u','d','l','r'][Math.floor(s.random()*4)];
     e.fire-=dt;if(e.fire<=0){e.fire=2+s.random()*2;shots.push({x:e.x+dx*.5,y:e.y+dy*.5,dx,dy,t:0});snd(500,.06,{type:'square',vol:.025});}}
    else{e.hop-=dt;if(e.hop<=0){e.hop=.9+s.random()*.8;const a=s.random()*Math.PI*2;e.vx=Math.cos(a)*3.2;e.vy=Math.sin(a)*3.2;e.air=.45;}if(e.air>0){e.air-=dt;move(e,e.vx*dt,e.vy*dt,.3);}}
    for(const l of L)if(l.down<=0&&Math.hypot(l.x-e.x,l.y-e.y)<.7)hurt(l,1,e.x,e.y);}
   for(let k=shots.length-1;k>=0;k--){const sh=shots[k];sh.t+=dt;sh.x+=sh.dx*7*dt;sh.y+=sh.dy*7*dt;let gone=solid(Math.floor(sh.x),Math.floor(sh.y))||sh.t>3;
    for(const l of L)if(!gone&&l.down<=0&&Math.hypot(l.x-sh.x,l.y-sh.y)<.5){const [fx0,fy0]=DIRS[l.dir];if(fx0===-sh.dx&&fy0===-sh.dy&&l.slash<=0){snd(1400,.05,{type:'square',vol:.03});fx.burst(VX(sh.x)*curT,VY(sh.y)*curT,{n:6,color:'#fff',speed:3*curT,life:.2,size:.08*curT,drag:3});}else hurt(l,1,sh.x-sh.dx,sh.y-sh.dy);gone=true;}
    if(gone)shots.splice(k,1);}
   // pickups
   for(let k=drops.length-1;k>=0;k--){const d=drops[k];d.t+=dt;if(d.t>9){drops.splice(k,1);continue;}for(const l of L)if(l.down<=0&&d.t>.3&&Math.hypot(l.x-d.x,l.y-d.y)<.6){drops.splice(k,1);
     if(d.kind==='heart'){l.hearts=Math.min(6,l.hearts+2);jingle([1047,1319],{step:.05,type:'square',vol:.03});}else{const v=d.kind==='red'?20:d.kind==='blue'?5:1;l.rupees+=v;snd(v>1?1568:1319,.06,{type:'square',vol:.03});snd(v>1?2093:1760,.1,{type:'square',vol:.03,delay:.05});fx.pop(VX(d.x)*curT,(VY(d.y)-.4)*curT,`+${v}`,{color:'#fff',stroke:'#000',size:Math.max(12,.45*curT),rise:.8*curT});}break;}}
   if(phase==='play'&&clock>=TIME){phase='end';endT=0;if(mode==='rupees'){const [a,b]=L.map(l=>l.rupees);endText=a===b?'A TIE IN RUPEES':`${s.players[a>b?0:1].name.toUpperCase()} IS RICHEST IN HYRULE`;}else{const [a,b]=L.map(l=>l.hearts);endText=a===b?'THE DUEL IS A DRAW':`${s.players[a>b?0:1].name.toUpperCase()} WINS THE DUEL!`;}jingle([523,659,784,1047,1319],{step:.1,type:'square',vol:.04});}}
  else{endT+=dt;if(endT>2.8){const sc=mode==='rupees'?L.map(l=>l.rupees):L.map(l=>Math.ceil(l.hearts/2));s.finish(sc,mode==='rupees'?`Rupee Rush: ${s.players[0].name} ${sc[0]} rupees, ${s.players[1].name} ${sc[1]}.`:`Sword Duel: ${s.players[0].name} ${L[0].hearts/2} hearts left, ${s.players[1].name} ${L[1].hearts/2}.`);return;}}
  s.setScores(mode==='rupees'?L.map(l=>l.rupees):L.map(l=>Math.ceil(l.hearts/2)));
  // ------------- draw
  const {T,ox,oy}=tile();x.fillStyle='#000';x.fillRect(0,0,s.W,s.H);x.save();fx.begin(x);x.translate(ox,oy);
  x.fillStyle=FLOOR;x.fillRect(0,0,T*cols,T*rows);x.fillStyle='rgba(200,120,60,.18)';for(let y=0;y<rows;y++)for(let xx=0;xx<cols;xx++)if((xx*7+y*13)%5===0)x.fillRect(xx*T+T*.3,y*T+T*.6,T*.1,T*.1);
  for(let y=0;y<rows;y++)for(let xx=0;xx<cols;xx++){const v=flip?g[rows-1-y][cols-1-xx]:g[y][xx],px=xx*T,py=y*T;
   if(v==='tree'){x.fillStyle=TREE_D;rr(x,px+1,py+1,T-2,T-2,T*.35);x.fill();x.fillStyle=TREE;x.beginPath();x.arc(px+T*.5,py+T*.42,T*.4,0,7);x.fill();x.fillStyle=TREE_D;x.fillRect(px+T*.3,py+T*.55,T*.4,T*.3);x.fillStyle='#000';x.fillRect(px+T*.36,py+T*.62,T*.08,T*.08);x.fillRect(px+T*.56,py+T*.62,T*.08,T*.08);}
   else if(v==='rock'){x.fillStyle=ROCK;rr(x,px+1,py+2,T-2,T-3,T*.3);x.fill();x.fillStyle=ROCK_D;x.fillRect(px+T*.2,py+T*.55,T*.6,T*.1);x.fillStyle='#ffb070';x.fillRect(px+T*.25,py+T*.2,T*.25,T*.1);}
   else if(v==='water'){x.fillStyle=WATER;x.fillRect(px,py,T,T);x.strokeStyle='rgba(255,255,255,.6)';x.lineWidth=2;x.beginPath();const w=Math.sin(t*3+xx+y)*T*.06;x.moveTo(px+T*.2,py+T*.4+w);x.lineTo(px+T*.45,py+T*.35+w);x.moveTo(px+T*.5,py+T*.7-w);x.lineTo(px+T*.78,py+T*.65-w);x.stroke();}
   else if(v==='bush'){x.fillStyle='#0a7a2a';x.beginPath();x.arc(px+T*.5,py+T*.55,T*.42,0,7);x.fill();x.fillStyle=BUSH;x.beginPath();x.arc(px+T*.38,py+T*.45,T*.24,0,7);x.arc(px+T*.62,py+T*.45,T*.24,0,7);x.arc(px+T*.5,py+T*.62,T*.26,0,7);x.fill();}
   else if(v==='cut'){x.fillStyle='rgba(10,122,42,.35)';x.fillRect(px+T*.3,py+T*.6,T*.4,T*.15);}}
  for(const d of drops){if(d.t>7&&Math.floor(d.t*10)%2)continue;const px=VX(d.x)*T,py=VY(d.y)*T-Math.abs(Math.sin(d.t*6))*T*.08;if(d.kind==='heart')heart(x,px,py,T*.55,'#e8282c','#fff');else{x.fillStyle=d.kind==='red'?'#e8282c':d.kind==='blue'?'#2a6af0':'#2fbf3a';x.beginPath();x.moveTo(px,py-T*.3);x.lineTo(px+T*.16,py-T*.12);x.lineTo(px+T*.16,py+T*.12);x.lineTo(px,py+T*.3);x.lineTo(px-T*.16,py+T*.12);x.lineTo(px-T*.16,py-T*.12);x.closePath();x.fill();x.strokeStyle='#fff';x.lineWidth=1.5;x.stroke();}}
  for(const e of enemies){const px=VX(e.x)*T,py=VY(e.y)*T;x.save();x.globalAlpha=e.dead?Math.max(0,e.dead/.4):1;
   if(e.kind==='octorok'){x.fillStyle='#e8282c';x.beginPath();x.arc(px,py,T*.36,0,7);x.fill();const [dx,dy]=DIRS[VD(e.dir)];x.fillStyle='#ffb070';x.beginPath();x.arc(px+dx*T*.32,py+dy*T*.32,T*.13,0,7);x.fill();x.fillStyle='#fff';x.beginPath();x.arc(px-T*.12+dx*T*.12,py-T*.08+dy*T*.12,T*.08,0,7);x.arc(px+T*.12+dx*T*.12,py-T*.08+dy*T*.12,T*.08,0,7);x.fill();x.strokeStyle='#a01010';x.lineWidth=T*.07;for(let k=0;k<4;k++){const a=k*Math.PI/2+Math.PI/4+Math.sin(t*10+k)*.2;x.beginPath();x.moveTo(px+Math.cos(a)*T*.3,py+Math.sin(a)*T*.3);x.lineTo(px+Math.cos(a)*T*.48,py+Math.sin(a)*T*.48);x.stroke();}}
   else{const lift=e.air>0?Math.sin((1-e.air/.45)*Math.PI)*T*.35:0;x.fillStyle='rgba(0,0,0,.2)';x.beginPath();x.ellipse(px,py+T*.25,T*.28,T*.08,0,0,7);x.fill();x.fillStyle='#2a6af0';x.beginPath();x.arc(px,py-lift,T*.28,0,7);x.fill();x.strokeStyle='#123a9a';x.lineWidth=T*.06;for(const sd of [-1,1]){x.beginPath();x.moveTo(px+sd*T*.2,py-lift);x.lineTo(px+sd*T*.42,py-lift+T*.25);x.stroke();}x.fillStyle='#fff';x.beginPath();x.arc(px,py-lift-T*.04,T*.1,0,7);x.fill();x.fillStyle='#000';x.beginPath();x.arc(px,py-lift-T*.04,T*.05,0,7);x.fill();}
   x.restore();}
  for(const sh of shots){x.fillStyle='#8a5a2a';x.beginPath();x.arc(VX(sh.x)*T,VY(sh.y)*T,T*.14,0,7);x.fill();x.fillStyle='#c89a6a';x.beginPath();x.arc(VX(sh.x)*T-T*.04,VY(sh.y)*T-T*.04,T*.05,0,7);x.fill();}
  for(const l of [...L].sort((a,b)=>VY(a.y)-VY(b.y)))drawLink(l,T);
  fx.draw(x);fx.end(x);x.restore();
  // HUD
  const hy=Math.max(8,oy-Math.min(T,s.H*.09));for(let i=0;i<2;i++){const l=L[i],hx=i?s.W-10:10,al=i?'right':'left',sz=Math.min(T*.55,22);
   outlined(x,s.players[i].name.toUpperCase(),hx,hy+sz*.5,{size:sz*.8,fill:PCOL[i],stroke:'#000',align:al});
   for(let k=0;k<3;k++){const v=clamp(l.hearts-k*2,0,2),cx=i?hx-sz*.6-k*sz*1.05:hx+sz*.6+k*sz*1.05;heart(x,cx,hy+sz*1.6,sz*.9,v===2?'#e8282c':v===1?'#f08080':'#333','#fff');}
   if(mode==='rupees'){const rx=i?hx-sz*4:hx+sz*4;x.fillStyle='#2fbf3a';x.beginPath();x.moveTo(rx,hy+sz*1.1);x.lineTo(rx+sz*.25,hy+sz*1.4);x.lineTo(rx+sz*.25,hy+sz*1.8);x.lineTo(rx,hy+sz*2.1);x.lineTo(rx-sz*.25,hy+sz*1.8);x.lineTo(rx-sz*.25,hy+sz*1.4);x.closePath();x.fill();outlined(x,`×${l.rupees}`,i?rx-sz*.4:rx+sz*.4,hy+sz*1.6,{size:sz*.85,fill:'#fff',stroke:'#000',align:al});}}
  outlined(x,`${Math.ceil(Math.max(0,TIME-clock))}`,s.W/2,hy+Math.min(T*.55,22)*.9,{size:Math.min(T*.7,26),fill:'#fff',stroke:'#000'});
  if(!on&&clock<6&&phase!=='end'){x.save();x.globalAlpha=clamp(1-(clock-3)/3,0,1)*.8;const sz=Math.min(T*.45,16);outlined(x,portrait?'P1: drag the top half · tap to slash':'P1: drag the left half · tap to slash',s.W*(portrait?.5:.25),portrait?oy+T*rows*.25:s.H-12,{size:sz,fill:'#fff',stroke:'#000'});outlined(x,portrait?'P2: drag the bottom half · tap to slash':'P2: drag the right half · tap to slash',s.W*(portrait?.5:.75),portrait?oy+T*rows*.75:s.H-12,{size:sz,fill:'#fff',stroke:'#000'});x.restore();}
  if(phase==='count')cd.draw(x,s.W,s.H);
  if(phase==='wait'||phase==='sync'){const size=Math.min(s.W*.045,26);outlined(x,phase==='sync'?'GET READY…':'WAITING FOR THE OTHER LINK…',s.W/2,s.H/2,{size,fill:'#fff',stroke:'#000'});}
  if(phase==='end'){const size=Math.min(s.W*.055,s.H*.06,40);x.fillStyle='rgba(0,0,0,.7)';x.fillRect(0,s.H/2-size,s.W,size*2);outlined(x,endText,s.W/2,s.H/2,{size,fill:'#ffd21c',stroke:'#000'});}
 });
 function drawLink(l,T){const ld=VD(l.dir),px=VX(l.x)*T,py=VY(l.y)*T,tunic=l.i?'#d83a2a':'#2fbf3a',dark=l.i?'#8a1a10':'#146a1a';
  if(l.down>0){x.save();x.globalAlpha=.6;x.translate(px,py);x.rotate(Math.PI/2);s.sprite(x,l.i,0,0,T*1.1,{exact:true,mood:'sad'});x.restore();return;}
  x.save();if(l.inv>0&&Math.floor(l.inv*14)%2)x.globalAlpha=.4;
  x.fillStyle='rgba(0,0,0,.2)';x.beginPath();x.ellipse(px,py+T*.42,T*.32,T*.1,0,0,7);x.fill();
  const step=Math.sin(l.walk)*T*.07;x.fillStyle='#8a5a2a';x.fillRect(px-T*.22,py+T*.2+step,T*.16,T*.2);x.fillRect(px+T*.06,py+T*.2-step,T*.16,T*.2);
  x.fillStyle=tunic;rr(x,px-T*.28,py-T*.12,T*.56,T*.42,T*.12);x.fill();x.fillStyle=dark;x.fillRect(px-T*.28,py+T*.08,T*.56,T*.07);x.fillStyle='#ffd21c';x.fillRect(px-T*.05,py+T*.07,T*.1,T*.09);
  const [dx,dy]=DIRS[ld];
  // shield
  x.fillStyle='#8a5a2a';const shx=px+(ld==='l'?-T*.3:ld==='r'?T*.3:dy>0?-T*.32:T*.32),shy=py+(dy>0?T*.05:0);rr(x,shx-T*.1,shy-T*.16,T*.2,T*.3,T*.05);x.fill();x.fillStyle='#c8c8d8';x.fillRect(shx-T*.04,shy-T*.1,T*.08,T*.18);
  // sword
  if(l.slash>0){const k=1-l.slash/.24,reach=T*(.5+Math.min(1,k*3)*.55);x.save();x.translate(px+dx*T*.2,py+dy*T*.2);x.rotate(Math.atan2(dy,dx));x.fillStyle='#8a5a2a';x.fillRect(T*.05,-T*.08,T*.12,T*.16);x.fillStyle='#e8e8f8';x.fillRect(T*.17,-T*.05,reach,T*.1);x.fillStyle='#fff';x.beginPath();x.moveTo(T*.17+reach,-T*.05);x.lineTo(T*.17+reach+T*.12,0);x.lineTo(T*.17+reach,T*.05);x.fill();x.restore();}
  s.sprite(x,l.i,px,py-T*.58,T*1.3,{exact:true,mood:l.inv>0?'sad':l.slash>0?'angry':undefined});
  // green cap peeking over the head
  x.fillStyle=tunic;x.beginPath();x.moveTo(px-T*.36,py-T*1.06);x.quadraticCurveTo(px,py-T*1.48,px+T*.36,py-T*1.06);x.lineTo(px+T*(ld==='l'?-.66:.66),py-T*.8);x.closePath();x.fill();
  x.restore();}
}
Object.assign(exports,{hyrule,buildMap});
