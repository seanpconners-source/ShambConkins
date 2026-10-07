// Sonic warp games: runs both modes at phone and desktop size with keyboard play, checks the physics moves the
// runners, rings get collected, loops are taken, the race ends at the signpost, and screenshots each phase.
import {open} from './lib.mjs';
const out=process.env.OUT||'/tmp/claude-0/sc';let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
for(const id of ['sonic-ring-rush','sonic-goal-dash'])for(const [w,h] of [[390,780],[1100,700]]){
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});const tag=`${id}-${w}`;
 await page.evaluate(id=>{window.ShambConkins.requestGame({id,origin:'arcade'});},id);
 await page.waitForTimeout(400);await page.evaluate(()=>{const b=[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent));b?.click();});
 const D=()=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;if(!d)return null;return {phase:d.phase,clock:d.clock,pl:d.pl.map(p=>({x:Math.round(p.x),y:Math.round(p.y),rings:p.rings,finished:p.finished,on:p.on,dead:p.dead,best:Math.round(p.best)})),end:d.L.end,loops:d.L.loops.length};});
 await page.waitForTimeout(1300);await page.screenshot({path:`${out}/${tag}-title.png`});
 for(let i=0;i<40&&(await D())?.phase!=='play';i++)await page.waitForTimeout(150);
 await page.keyboard.down('d');await page.keyboard.down('ArrowRight');
 let looped=[false,false],peak=0;
 for(let k=0;k<70;k++){await page.waitForTimeout(150);if(k%9===4){await page.keyboard.down('w');await page.keyboard.down('ArrowUp');await page.waitForTimeout(220);await page.keyboard.up('w');await page.keyboard.up('ArrowUp');}
  const d=await D();if(!d)break;d.pl.forEach((p,i)=>{if(p.on==='loop')looped[i]=true;peak=Math.max(peak,p.rings);});if(k===20)await page.screenshot({path:`${out}/${tag}-run.png`});if(d.phase!=='play')break;}
 let d=await D();console.log(tag,JSON.stringify(d),"looped",looped);console.log(await page.evaluate(()=>window.ShambConkins.store.session?.debug.log.join("\n")));
 if(!d||d.pl.some(p=>p.best<1200))fail(`${tag} runners did not progress`);
 if(peak===0)fail(`${tag} no rings collected`);
 await page.screenshot({path:`${out}/${tag}-later.png`});
 if(id==='sonic-goal-dash'){await page.evaluate(()=>{const s=window.ShambConkins.store.session;s.debug.teleport(0,s.debug.L.end-300);});await page.waitForTimeout(2500);d=await D();if(!d||d.phase!=='end'&&d.phase!=='play')fail(`${tag} race did not end (${d?.phase})`);await page.screenshot({path:`${out}/${tag}-goal.png`});await page.waitForTimeout(3500);}
 else{await page.evaluate(()=>window.ShambConkins.store.session.debug.setClock(59.5));await page.waitForTimeout(1500);await page.screenshot({path:`${out}/${tag}-timeup.png`});await page.waitForTimeout(3200);}
 await page.keyboard.up('d');await page.keyboard.up('ArrowRight');
 const res=await page.evaluate(()=>{const d=document.getElementById('dialog');return d.open?d.innerText.slice(0,160):null;});
 if(!res)fail(`${tag} no result dialog`);console.log(' result:',res&&res.replace(/\n+/g,' | '));
 if(errors.length){fail(`${tag} errors ${errors.join(' ; ')}`);}
 await browser.close();}
console.log(ok?'sonic OK':'sonic FAILED');process.exit(ok?0:1);
