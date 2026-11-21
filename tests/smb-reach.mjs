// Super Mario Bros. dead ends (Node, no browser; owner, Nov 21: "got stuck here... check for other spots like this").
// For every stage this walks Mario's real jump arcs (the game's NES jump table: walk / run / full run, short and full hops,
// walk-offs) from every spot he can stand on, follows pipes, side pipes, beanstalks, cloud-area drops, lifts and springs,
// and lists the spots he can reach but can't get out of: no way to the flagpole / axe / a warp pipe from there.
// HARD = not even a pit to jump into (only the clock can end it). SOFT = only a pit or the clock (a life lost).
// Usage: node tests/smb-reach.mjs [stage name regex] [--soft]   (exits 1 on any HARD dead end)
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../src/engines/smb/smbLevels.js',import.meta.url),'utf8');const m={exports:{}};new Function('exports','require','module',src)(m.exports,()=>({}),m);
const L=m.exports,T=16,ROWS=15,HW=5,BODY=15;
const only=process.argv[2]&&!process.argv[2].startsWith('--')?new RegExp(process.argv[2]):null,showSoft=process.argv.includes('--soft');
const JUMP=[[1,-4,.125,.4375],[2.3125,-4,.1171875,.375],[Infinity,-5,.15625,.5625]];
let hardTotal=0;
for(let k=0;k<L.STAGE_COUNT;k++){
 const st=L.buildStage(k);if(only&&!only.test(st.name))continue;
 const A=st.areas,names=Object.keys(A);
 // ---- per-area grids: solid tiles + one-way platforms (every place a lift or rail can be)
 const G={};
 for(const an of names){const a=A[an],W=a.W,plat=new Uint8Array(W*ROWS);
  for(const l of a.lifts||[]){const w=Math.max(1,Math.round((l.w||48)/T));
   const xs=l.kind==='h'||l.kind==='bal'?[l.x0??l.x,l.x1??l.x]:[l.x,l.x],ys=l.kind==='v'?[l.y0??l.y,l.y1??l.y]:l.kind==='loop'?[0,ROWS*T]:l.kind==='bal'?[l.y,l.ymax??l.y]:[l.y,l.y];
   const c0=Math.floor((Math.min(...xs)-(l.kind==='rail'?(l.w||48)/2:0))/T),c1=Math.floor((Math.max(...xs)+(l.kind==='rail'?(l.w||48)/2:l.w||48))/T);
   for(let r=Math.max(0,Math.floor(Math.min(...ys)/T));r<=Math.min(ROWS-1,Math.floor(Math.max(...ys)/T));r++)for(let c=Math.max(0,c0);c<=Math.min(W-1,c1);c++)plat[r*W+c]=1;}
  for(const sp of a.springs||[])if(sp.r<ROWS)plat[sp.r*W+sp.c]=1;
  G[an]={a,W,plat,solid:(c,r)=>c<0||c>=W?true:r<0||r>=ROWS?false:L.SOLID[a.tiles[r*W+c]]===1,
   platAt:(c,r)=>c>=0&&c<W&&r>=0&&r<ROWS&&plat[r*W+c]===1,
   brick:(c,r)=>c>=0&&c<W&&r>=0&&r<ROWS&&a.tiles[r*W+c]===L.TILE.BRICK&&!a.content.has(r*W+c),
   spring:(c,r)=>(a.springs||[]).some(sp=>sp.c===c&&sp.r===r)};}
 // ---- goals and doors
 const goalAt=(an,x,y)=>{const a=A[an];if(a.flag&&x>=a.flag.col*T-4)return true;if(a.axe&&Math.abs(x-a.axe.x)<20&&y<=a.axe.y+24&&y>=a.axe.y-40)return true;return false;};
 const spotOf=(to)=>{if(!to||!A[to.area])return null;if(to.pipe!=null){const p=A[to.area].pipes.find(q=>q.c===to.pipe);if(!p)return null;return {an:to.area,x:p.c*T+T,y:p.top*T};}
  return {an:to.area,x:to.x,y:to.y};};
 // nodes are "an:c:r" standing spots (feet on top of row r+1, body in row r)
 const key=(an,c,r)=>an+':'+c+':'+r;
 // drop from a point to where it lands (or null = falls out)
 function settle(an,x,y){const g=G[an];let r=Math.max(-3,Math.floor((y-1)/T));const c=Math.floor(x/T);
  while(r<ROWS){if(g.solid(c,r+1)||g.platAt(c,r+1))return {an,c,r};r++;}
  return null;}
 // one flight: returns {land:node|null, out:'pit'|'fall:dest'|null, goal, door}
 function fly(an,x0,y0,vx,vy0,holdFrames){const g=G[an],j=JUMP.find(q=>Math.abs(vx)<q[0]);let x=x0,y=y0,vy=vy0,f=0;const loops=g.a.loops||[];
  for(;f<260;f++){
   const hold=f<holdFrames&&vy<0;vy=Math.min(4.5,vy+(hold?j[2]:j[3]));
   // horizontal
   let nx=x+vx;const ec=Math.floor((nx+Math.sign(vx)*HW)/T),r1=Math.floor((y-1)/T),r2=Math.floor((y-BODY+1)/T);
   if(vx&&(g.solid(ec,r1)||g.solid(ec,r2)))nx=x;
   for(const lp of loops)if(x<lp.x&&nx>=lp.x){const fr=Math.floor((y-1)/T);if(fr<lp.r0||fr>lp.r1)nx-=lp.back;}
   x=nx;if(goalAt(an,x,y))return {goal:true};
   let ny=y+vy;const cl=Math.floor((x-HW)/T),cr=Math.floor((x+HW-1)/T);
   if(vy<0){const hr=Math.floor((ny-BODY)/T),hit=c=>g.solid(c,hr)&&!g.brick(c,hr);// Big Mario punches through plain bricks
    if(hit(cl)||hit(cr)){vy=0;ny=y;}}
   else{const fr=Math.floor(ny/T),pr=Math.floor((y)/T);
    if(fr>pr||y%T===0&&f===0){for(const c of [Math.floor(x/T),cl,cr]){if(fr<ROWS&&fr>=0&&(g.solid(c,fr)||g.platAt(c,fr))&&(y<=fr*T||f===0&&y<=fr*T)){
      const lc=Math.floor(x/T);const rr=fr-1;// stand on top of row fr
      if(g.spring(c,fr)&&vy>1)return {land:{an,c:lc,r:rr},spring:true};
      return {land:{an,c:g.solid(lc,fr)||g.platAt(lc,fr)?lc:c,r:rr}};}}}}
   y=ny;if(goalAt(an,x,y))return {goal:true};
   if(y-BODY>ROWS*T+4){if(g.a.fallTo)return {door:g.a.fallTo};return {out:'pit'};}
  }
  return {};}
 // ---- graph search
 const edges=new Map(),nodes=new Map(),q=[];let canGoal=new Set(),deathFrom=new Set();
 const add=(n)=>{if(!n||n.c<0||n.c>=G[n.an].W||n.r<-3||G[n.an].solid(n.c,n.r))return null;const kk=key(n.an,n.c,n.r);if(!nodes.has(kk)){nodes.set(kk,n);q.push(kk);}return kk;};
 const dest=(to)=>{const s=spotOf(to);if(!s)return null;const n=settle(s.an,s.x,s.y);return n?add(n):null;};
 const start=st.start;const s0=add(settle(start.area,start.x,start.y));
 if(st.startPlay)add(settle(st.startPlay.area,st.startPlay.x,st.startPlay.y));
 const GOAL='GOAL',PIT='PIT';
let iters=0; while(q.length){if(++iters%2000===0&&process.env.DBG)console.log("nodes",nodes.size,"q",q.length);const kk=q.shift(),n=nodes.get(kk),g=G[n.an],a=g.a,out=new Set();edges.set(kk,out);
  const x0=n.c*T+8,y0=(n.r+1)*T;
  // doors here
  for(const d of a.doors){
   if(d.kind==='down'&&n.r+1===d.top&&(n.c===d.c||n.c===d.c+1)){if(d.warp)out.add(GOAL);else{const t=dest(d.to);if(t)out.add(t);}}
   if(d.kind==='side'&&n.r===d.r&&n.c>=d.c-1&&n.c<=d.c){const t=dest(d.to);if(t)out.add(t);}}
  // beanstalk blocks within reach above: the vine leads up to the cloud area
  for(const [kc,what] of a.content)if(what==='vine'){const vc=kc%a.W,vr=Math.floor(kc/a.W);if(Math.abs(vc-n.c)<=1&&n.r>vr&&n.r-vr<=5&&a.vineTo){const t=dest(a.vineTo);if(t)out.add(t);}}
  if(goalAt(n.an,x0,y0))out.add(GOAL);
  // jumps: speeds x hops
  const onSpring=g.spring(n.c,n.r+1);
  for(const vx of [-2.56,-1.9,-1.2,-.6,0,.6,1.2,1.9,2.56])for(const [vy,hf] of onSpring?[[-6.3,99],[-5.3,0]]:[[0,0],[-4,4],[-4,12],[-4,99],[-5,8],[-5,99]]){
   if(vy===-5&&Math.abs(vx)<2.3)continue;const startX=vy===0?x0+Math.sign(vx)*(T*.5+HW):x0;
   const r=fly(n.an,startX,y0,vx,vy,hf);
   if(r.goal)out.add(GOAL);else if(r.out==='pit')out.add(PIT);else if(r.door){const t=dest(r.door);if(t)out.add(t);}
   else if(r.land){const t=add(r.land);if(t&&t!==kk)out.add(t);}}
 }
 // ---- who can reach the goal (reverse), who can reach a pit
 const rev=new Map();for(const [a,outs] of edges)for(const b of outs){if(!rev.has(b))rev.set(b,[]);rev.get(b).push(a);}
 const back=(target)=>{const seen=new Set([target]),qq=[target];while(qq.length){const b=qq.pop();for(const a of rev.get(b)||[])if(!seen.has(a)){seen.add(a);qq.push(a);}}return seen;};
 canGoal=back(GOAL);deathFrom=back(PIT);
 if(process.argv.includes('--v'))console.log(st.name,'nodes',nodes.size,'start',s0,'goal',s0&&canGoal.has(s0));
 if(!s0)console.log(`${st.name}: no start spot`);
 if(s0&&!canGoal.has(s0))console.log(`${st.name}: the START can't reach the goal (checker or level problem)`);
 // group the stuck spots by area + column runs
 const stuck=[...nodes.keys()].filter(kk=>!canGoal.has(kk));
 const groups=new Map();for(const kk of stuck){const n=nodes.get(kk),hard=!deathFrom.has(kk),gk=n.an+(hard?' HARD':' soft');if(!groups.has(gk))groups.set(gk,[]);groups.get(gk).push(n);}
 for(const [gk,list] of groups){const hard=gk.endsWith('HARD');if(!hard&&!showSoft)continue;if(hard)hardTotal+=list.length;
  list.sort((p,q2)=>p.c-q2.c||p.r-q2.r);const runs=[];for(const n of list){const last=runs[runs.length-1];if(last&&n.c-last.c1<=2){last.c1=n.c;last.rows.add(n.r);}else runs.push({c0:n.c,c1:n.c,rows:new Set([n.r])});}
  console.log(`${st.name} ${gk}: `+runs.map(r=>`cols ${r.c0}-${r.c1} rows ${[...r.rows].sort((x,y)=>x-y).join(',')}`).join(' | '));}
}
console.log(hardTotal?`HARD dead ends: ${hardTotal} spots`:'smb reach OK: no hard dead ends');
process.exit(hardTotal?1:0);
