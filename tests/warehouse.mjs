// Warehouse Shift (Rush Hour in the Dunder Mifflin warehouse): drags a real piece, auto-solves orders via the
// in-engine solver, checks scoring + fire drill + hand-off, screenshots at phone and desktop size.
import {open} from './lib.mjs';
const out=process.env.OUT||'/tmp/claude-0/sc';let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
for(const [w,h] of [[390,780],[1100,700]]){
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});
 await page.evaluate(()=>{window.ShambConkins.requestGame({id:'warehouse-shift',origin:'arcade'});});
 const D=()=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;return d?{phase:d.phase,actor:d.actor,idx:d.idx,moves:d.moves,par:d.par,scores:d.scores,pos:d.pos,pieces:d.pieces,L:d.layout}:null;});
 const go=()=>page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open){const b=[...d.querySelectorAll('button')].find(b=>/start|ready|play|go|clock/i.test(b.textContent))||d.querySelector('button');b?.click();return;}const p=[...document.querySelectorAll('button')].find(b=>/ready|start|clock in/i.test(b.textContent)&&b.offsetParent);p?.click();});
 for(let i=0;i<20&&(await D())?.phase!=='play';i++){await go();await page.waitForTimeout(500);}
 await page.waitForTimeout(1800);const tag=`warehouse-${w}`;await page.screenshot({path:`${out}/${tag}-start.png`});
 // Drag a piece that has room to move.
 let d=await D();const box=await page.evaluate(()=>{const r=document.querySelector('.game-canvas').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};});
 const sx=box.w/d.L.W,sy=box.h/d.L.H;let dragged=false;
 for(let i=1;i<d.pieces.length&&!dragged;i++){const P=d.pieces[i],v=d.pos[i];
  for(const dir of [1,-1]){const col=P.h?v+(dir>0?P.len-1:0):P.line,row=P.h?P.line:v+(dir>0?P.len-1:0),nc=P.h?col+dir:col,nr=P.h?row:row+dir;
   if(nc<0||nr<0||nc>5||nr>5)continue;const occ=d.pieces.some((Q,j)=>{for(let k=0;k<Q.len;k++){const qc=Q.h?d.pos[j]+k:Q.line,qr=Q.h?Q.line:d.pos[j]+k;if(qc===nc&&qr===nr)return true;}return false;});if(occ)continue;
   const px=box.x+(d.L.ox+(col+.5)*d.L.cell)*sx,py=box.y+(d.L.oy+(row+.5)*d.L.cell)*sy;
   await page.mouse.move(px,py);await page.mouse.down();await page.mouse.move(px+(P.h?dir*d.L.cell*sx*.5:0),py+(P.h?0:dir*d.L.cell*sy*.5),{steps:4});
   await page.screenshot({path:`${out}/${tag}-drag.png`});await page.mouse.move(px+(P.h?dir*d.L.cell*sx*1.1:0),py+(P.h?0:dir*d.L.cell*sy*1.1),{steps:4});await page.mouse.up();dragged=true;break;}}
 await page.waitForTimeout(300);d=await D();if(d.moves!==1)fail(`${tag} drag did not count a move (${d.moves})`);
 // Solve the first orders with the in-engine solver.
 for(let k=0;k<3;k++){for(let i=0;i<40;i++){const r=await page.evaluate(()=>window.ShambConkins.store.session.debug.solveStep());if(!r)break;await page.waitForTimeout(60);}
  if(k===0){await page.waitForTimeout(250);await page.screenshot({path:`${out}/${tag}-shipped.png`});}await page.waitForTimeout(1100);}
 d=await D();if(d.idx<3||d.scores[0]<300)fail(`${tag} solver run: idx ${d.idx} score ${d.scores[0]}`);
 await page.evaluate(()=>window.ShambConkins.store.session.debug.setClock(62));await page.waitForTimeout(1200);await page.screenshot({path:`${out}/${tag}-drill.png`});
 await page.evaluate(()=>window.ShambConkins.store.session.debug.setClock(75));await page.waitForTimeout(1500);d=await D();
 if(d.phase!=='handoff')fail(`${tag} shift did not end (${d.phase})`);await page.screenshot({path:`${out}/${tag}-handoff.png`});
 console.log(tag,JSON.stringify({idx:d.idx,scores:d.scores}),'errors',errors);if(errors.length)ok=false;await browser.close();}
console.log(ok?'warehouse OK':'warehouse FAILED');process.exit(ok?0:1);
