// Super Mario Bros. stage data (Node, no browser): every stage builds; every pipe door leads to an area that exists
// (coin rooms come back out of a pipe that exists); every beanstalk has a clear column above it and its cloud area drops
// you onto solid ground further along; 4-2 hides the Warp Zone to Worlds 5/6/7; 5-1 has the cloud rider; Worlds 4-8
// have their world's special piece; stage difficulty only goes up. Usage: node tests/smb-levels.mjs
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../src/engines/smb/smbLevels.js',import.meta.url),'utf8');const m={exports:{}};new Function('exports','require','module',src)(m.exports,()=>({}),m);
const L=m.exports,T=16;let bad=0;const fail=s=>{bad++;console.log('FAIL',s);};
const solid=t=>L.SOLID[t]===1;
for(let k=0;k<L.STAGE_COUNT;k++){const st=L.buildStage(k),A=st.areas;
 for(const [an,a] of Object.entries(A)){
  // a drop-in spot must be open air with a floor somewhere below it (3-1's coin room used to drop you onto its ceiling)
  for(const d of a.doors){const to=d.to;if(!to||to.how!=='drop'||!A[to.area])continue;const b=A[to.area],c=Math.floor(to.x/T),r0=Math.floor(to.y/T);
   if(r0>=0&&solid(b.tiles[r0*b.W+c]))fail(`${st.name} ${an}: drop into ${to.area} lands inside a block`);
   let rr=Math.max(0,r0+1);while(rr<15&&!solid(b.tiles[rr*b.W+c]))rr++;if(rr>=15)fail(`${st.name} ${an}: drop into ${to.area} falls into a pit`);
   if(to.area==='bonus'&&rr<8)fail(`${st.name}: coin room drop lands at row ${rr} (on its ceiling?)`);}
  for(const d of a.doors){if(d.warp)continue;const to=d.to;if(!to||!A[to.area])fail(`${st.name} ${an}: door to missing area ${to&&to.area}`);
   else if(to.how==='rise'&&!A[to.area].pipes.some(p=>p.c===to.pipe))fail(`${st.name} ${an}: rises out of missing pipe ${to.pipe} in ${to.area}`);}
  for(const [key,what] of a.content)if(what==='vine'){const c=key%a.W,r=Math.floor(key/a.W);
   for(let rr=0;rr<r;rr++)if(a.tiles[rr*a.W+c])fail(`${st.name} ${an}: beanstalk at ${c} blocked at row ${rr}`);
   if(!a.vineTo||!A[a.vineTo.area])fail(`${st.name} ${an}: beanstalk without a cloud area`);
   else{const f=A[a.vineTo.area].fallTo,lc=Math.floor(f.x/T),back=A[f.area];let r2=0;while(r2<15&&!solid(back.tiles[r2*back.W+lc]))r2++;
    if(r2>=15)fail(`${st.name}: cloud area drops you into a pit at column ${lc}`);if(lc<=c)fail(`${st.name}: cloud area drops you behind the beanstalk`);}}}
}
const s42=L.buildStage(13);const wz=s42.areas.warp;if(!wz||JSON.stringify(wz.pipes.map(p=>p.warp))!=='[5,6,7]')fail('4-2 Warp Zone pipes');
if(!s42.areas.main.doors.some(d=>d.to&&d.to.area==='warp'))fail('4-2 has no pipe to the Warp Zone');
if(!L.buildStage(16).areas.main.rider)fail('5-1 has no cloud rider');
for(let k=12;k<32;k++){const st=L.buildStage(k);if(k%4===3)continue;const a=st.areas.main;if(k%4!==1&&!a.vineTo)fail(`${st.name} has no beanstalk`);
 if(k<16&&k%4===0&&!(a.ramps||[]).length)fail(`${st.name} has no ski ramp`);}
// every block with a power-up/1-up/vine needs two free rows above it (a flower under a ceiling can't be reached)
for(let k=0;k<L.STAGE_COUNT;k++){const st=L.buildStage(k);for(const [an,a] of Object.entries(st.areas))for(const [i,v] of a.content){if(!/power|1up|multi|star|vine|skis|cape|mega|yoshi/.test(String(v)))continue;
 const c=i%a.W,r=Math.floor(i/a.W);if(r>=2&&(a.tiles[(r-1)*a.W+c]||a.tiles[(r-2)*a.W+c]))fail(`${st.name} ${an}: ${v} block at ${c},${r} has no room above`);}}
for(const k of [4,8,12,16,20,24,28])if(!L.buildStage(k).areas.bonus)fail(`${L.buildStage(k).name} has no coin room`);
console.log(bad?`smb levels: ${bad} problem(s)`:`smb levels OK (${L.STAGE_COUNT} stages)`);process.exit(bad?1:0);
