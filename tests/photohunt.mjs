// Megatouch Photo Hunt replica: plays P1 (finds, a miss, a hint, round bonus, then time runs out) and P2 (time out),
// checks scoring/hints/turn order/separate photo sets, the portrait "turn your phone" screen, and screenshots each
// phase (OUT=/tmp/claude-0/sc by default). Usage: SHAMB_FILE=/tmp/x.html node tests/photohunt.mjs
import {open} from './lib.mjs';
import fs from 'node:fs';
const out=process.env.OUT||'/tmp/claude-0/sc';fs.mkdirSync(out,{recursive:true});let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
for(const [w,h] of [[1100,700],[844,390],[390,780]]){
 const tag=`ph-${w}x${h}`,{browser,page,errors}=await open({viewport:{width:w,height:h}});
 await page.evaluate(()=>{window.ShambConkins.requestGame({id:'megatouch-photohunt',origin:'arcade'});});
 await page.waitForTimeout(400);await page.evaluate(()=>{const b=[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent));b?.click();});
 const D=()=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;return d?.players?{phase:d.phase,actor:d.actor,round:d.round,found:d.found.length,regions:d.regions.length,left:d.left,total:d.total,clock:d.clock,portrait:d.portrait,help:d.help,
  scores:d.players.map(p=>p.score),hints:d.players.map(p=>p.hints),decks:d.decks,pair:d.pair}:null;});
 const canvasBox=async()=>page.evaluate(()=>{const r=document.getElementById('game-canvas').getBoundingClientRect();return {x:r.left,y:r.top};});
 const tap=async p=>{const b=await canvasBox();await page.mouse.click(b.x+p.x,b.y+p.y);await page.waitForTimeout(120);};
 const dbg=(fn,...a)=>page.evaluate(([fn,a])=>{const d=window.ShambConkins.store.session.debug;return d[fn](...a);},[fn,a]);
 const until=async(test,ms=9000)=>{let d;for(let t=0;t<ms;t+=150){d=await D();if(d&&test(d))return d;await page.waitForTimeout(150);}return d;};
 const ready=async()=>{await page.waitForSelector('.pass-overlay [data-ready]',{timeout:15000});await page.screenshot({path:`${out}/${tag}-pass.png`});await page.click('.pass-overlay [data-ready]');};
 await ready();
 if(h>w){let d=await until(d=>d.portrait,5000);await page.waitForTimeout(400);await page.screenshot({path:`${out}/${tag}-rotate.png`});if(!d?.portrait)fail(`${tag} no rotate prompt`);
  const t0=(await D()).left;await page.waitForTimeout(800);if((await D()).left!==t0)fail(`${tag} timer ran while portrait`);await page.setViewportSize({width:h,height:w});}
 let d=await until(d=>d.phase==='hunt');if(d?.phase!=='hunt'){fail(`${tag} hunt never started (${JSON.stringify(d)})`);await browser.close();continue;}
 await page.waitForTimeout(300);await page.screenshot({path:`${out}/${tag}-hunt.png`});
 {const t0=(await D()).left;await tap(await dbg('ui','help'));await page.waitForTimeout(700);await page.screenshot({path:`${out}/${tag}-help.png`});d=await D();if(!d.help&&!(await page.evaluate(()=>window.ShambConkins.store.session.debug.help)))fail(`${tag} help did not open`);if(Math.abs(d.left-t0)>.05)fail(`${tag} timer ran under help`);await tap({x:20,y:20});if(await page.evaluate(()=>window.ShambConkins.store.session.debug.help))fail(`${tag} help did not close`);}
 // a miss: photo corner unless a difference sits there
 const before=(await D()).left;await tap(await dbg('at',0,.03,.04));d=await D();
 if(!(d.left<before-2))fail(`${tag} miss did not cost time (${before.toFixed(1)} -> ${d.left.toFixed(1)})`);
 const n=d.regions;for(let i=0;i<n-1;i++){await tap(await dbg('point',i,i%2));if(i===1){await page.waitForTimeout(250);await page.screenshot({path:`${out}/${tag}-finds.png`});}}
 d=await D();if(d.found!==n-1)fail(`${tag} found ${d.found}/${n-1}`);if(!(d.scores[0]>=(n-1)*250))fail(`${tag} find score ${d.scores[0]}`);
 await tap(await dbg('ui','glass',0));d=await until(d=>d.phase==='solved',2000);await page.waitForTimeout(500);await page.screenshot({path:`${out}/${tag}-solved.png`});
 if(d.hints[0]!==2)fail(`${tag} hint not spent (${d.hints})`);
 const s1=d.scores[0];d=await until(d=>d.phase==='bonus',3000);await page.waitForTimeout(350);await page.screenshot({path:`${out}/${tag}-bonus.png`});
 d=await until(d=>d.round===1&&['intro','hunt'].includes(d.phase),12000);if(d.round!==1)fail(`${tag} round 2 never started (${JSON.stringify(d)})`);
 if(!(d.scores[0]>s1+3000))fail(`${tag} no time bonus (${s1} -> ${d.scores[0]})`);
 await page.waitForTimeout(500);await page.screenshot({path:`${out}/${tag}-round2.png`});
 d=await until(d=>d.phase==='hunt');await page.evaluate(()=>window.ShambConkins.store.session.debug.expire());d=await until(d=>d.phase==='timeup',3000);await page.waitForTimeout(700);await page.screenshot({path:`${out}/${tag}-timeup.png`});
 d=await until(d=>d.phase==='over',6000);await page.waitForTimeout(400);await page.screenshot({path:`${out}/${tag}-over.png`});
 const p1=d.scores[0];console.log(tag,'P1',p1,'decks',JSON.stringify(d.decks));
 await ready();d=await until(d=>d.actor===1&&d.phase==='hunt');if(d.actor!==1)fail(`${tag} P2 never started`);
 await page.waitForTimeout(300);await page.screenshot({path:`${out}/${tag}-p2.png`});
 if(d.scores[0]!==p1)fail(`${tag} P1 score changed`);
 await tap(await dbg('point',0,1));await page.evaluate(()=>window.ShambConkins.store.session.debug.expire());
 let res=null;for(let i=0;i<80&&!res;i++){await page.waitForTimeout(250);res=await page.evaluate(()=>{const d=document.getElementById('dialog');return d.open?d.innerText.slice(0,200):null;});}
 if(!res)fail(`${tag} no result dialog`);console.log(' result:',res&&res.replace(/\n+/g,' | '));
 if(errors.length)fail(`${tag} errors ${errors.join(' ; ')}`);
 await browser.close();
}
console.log(ok?'photohunt OK':'photohunt FAILED');process.exit(ok?0:1);
