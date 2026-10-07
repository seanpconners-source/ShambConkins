// Super Mario Bros. warp games: runs both modes at phone and desktop size with keyboard play (hold run, jump on a
// rhythm), checks the runners progress, coins get collected, the warp pipe reaches the coin room and comes back out,
// the race ends at the flagpole, and screenshots each phase.
import {open} from './lib.mjs';
const out=process.env.OUT||'/tmp/claude-0/sc';let ok=true;const fail=m=>{ok=false;console.log('FAIL',m);};
for(const id of ['smb-coin-rush','smb-castle-dash'])for(const [w,h] of [[390,780],[1100,700]]){
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});const tag=`${id}-${w}`;
 await page.evaluate(id=>{window.ShambConkins.requestGame({id,origin:'arcade'});},id);
 await page.waitForTimeout(400);await page.evaluate(()=>{const b=[...document.querySelectorAll('#dialog button')].find(b=>/start/i.test(b.textContent));b?.click();});
 const D=()=>page.evaluate(()=>{const d=window.ShambConkins.store.session?.debug;if(!d)return null;return {phase:d.phase,clock:d.clock,pl:d.pl.map(p=>({x:Math.round(p.x),y:Math.round(p.y),coins:p.coins,big:p.big,area:p.area,finished:p.finished,dead:p.dead,deaths:p.deaths,best:Math.round(p.best),lap:p.lap})),end:d.L.end};});
 await page.waitForTimeout(1300);await page.screenshot({path:`${out}/${tag}-title.png`});
 for(let i=0;i<40&&(await D())?.phase!=='play';i++)await page.waitForTimeout(150);
 for(const k of ['d','ArrowRight',' ','Enter'])await page.keyboard.down(k);
 let peak=0;
 for(let k=0;k<60;k++){await page.waitForTimeout(150);if(k%5===2){await page.keyboard.down('w');await page.keyboard.down('ArrowUp');await page.waitForTimeout(520);await page.keyboard.up('w');await page.keyboard.up('ArrowUp');}
  const d=await D();if(!d)break;d.pl.forEach(p=>{peak=Math.max(peak,p.coins);});if(k===14)await page.screenshot({path:`${out}/${tag}-run.png`});if(d.phase!=='play')break;}
 let d=await D();console.log(tag,JSON.stringify(d));console.log(await page.evaluate(()=>window.ShambConkins.store.session?.debug.log.join("\n")));
 if(!d||d.pl.some(p=>p.best<500))fail(`${tag} runners did not progress`);
 if(peak===0&&id==='smb-coin-rush')fail(`${tag} no coins collected`);
 await page.screenshot({path:`${out}/${tag}-later.png`});
 for(const k of ['d','ArrowRight',' ','Enter'])await page.keyboard.up(k);
 // warp pipe: stand on it, hold down, land in the coin room, walk out the side pipe
 if(d?.phase==='play'){
  await page.evaluate(()=>window.ShambConkins.store.session.debug.toWarp(0));await page.keyboard.down('s');await page.waitForTimeout(1400);await page.keyboard.up('s');
  let a=await D();if(a.pl[0].area!=='room')fail(`${tag} warp pipe did not reach the coin room (${a.pl[0].area})`);
  await page.waitForTimeout(500);await page.screenshot({path:`${out}/${tag}-room.png`});
  await page.keyboard.down('d');for(let k=0;k<24&&(await D()).pl[0].area==='room';k++){await page.waitForTimeout(200);if((await D()).pl[0].x<64){await page.keyboard.down('w');await page.waitForTimeout(400);await page.keyboard.up('w');}}
  await page.keyboard.up('d');await page.waitForTimeout(1200);a=await D();if(a.pl[0].area!=='main')fail(`${tag} did not leave the coin room`);
  await page.screenshot({path:`${out}/${tag}-exit.png`});console.log(' after warp',JSON.stringify(a.pl[0]));
 }
 if(id==='smb-castle-dash'){await page.evaluate(()=>{const s=window.ShambConkins.store.session;s.debug.teleport(0,s.debug.L.end-90);});await page.keyboard.down('d');await page.waitForTimeout(1500);await page.screenshot({path:`${out}/${tag}-flag.png`});await page.waitForTimeout(1500);await page.keyboard.up('d');d=await D();if(!d||!d.pl[0].finished)fail(`${tag} flagpole did not finish the race (${JSON.stringify(d?.pl[0])})`);await page.screenshot({path:`${out}/${tag}-goal.png`});await page.waitForTimeout(3500);}
 else{await page.evaluate(()=>{const s=window.ShambConkins.store.session;s.debug.teleport(1,s.debug.L.end-90);});await page.keyboard.down('ArrowRight');await page.waitForTimeout(7000);await page.keyboard.up('ArrowRight');d=await D();if(d.pl[1].lap<1)fail(`${tag} castle did not start a new lap (${JSON.stringify(d.pl[1])})`);
  await page.evaluate(()=>window.ShambConkins.store.session.debug.setClock(59.5));await page.waitForTimeout(1500);await page.screenshot({path:`${out}/${tag}-timeup.png`});await page.waitForTimeout(3200);}
 const res=await page.evaluate(()=>{const d=document.getElementById('dialog');return d.open?d.innerText.slice(0,160):null;});
 if(!res)fail(`${tag} no result dialog`);console.log(' result:',res&&res.replace(/\n+/g,' | '));
 if(errors.length){fail(`${tag} errors ${errors.join(' ; ')}`);}
 await browser.close();}
console.log(ok?'mario OK':'mario FAILED');process.exit(ok?0:1);
