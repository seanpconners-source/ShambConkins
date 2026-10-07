// Wild encounter intro on the board, Gen 1 style: music, three flashes and a wipe over the board,
// then the ShamBoy opens and both sides slide in as silhouettes. Screenshots each stage to
// /tmp/claude-0/sc/enc-*.png. Also checks the fullscreen toggle on the shell. Exits 1 on failure.
import {open} from './lib.mjs';
const kind=process.argv[2]||'';
const {browser,page,errors}=await open({viewport:{width:390,height:780}});
const fails=[];const check=(ok,msg)=>{if(!ok){fails.push(msg);console.log('FAIL',msg);}};
await page.click('text=NEW GAME').catch(()=>{});await page.click('[data-action=start-run]').catch(()=>{});
const click=async()=>page.evaluate(()=>{const d=document.getElementById('dialog');if(d.open){d.querySelector('button.primary,button')?.click();return 1;}const c=document.querySelector('.level-card,.gentlemen-card,.smash-card');if(c){c.click();return 2;}return 0;});
for(let i=0;i<30;i++){await page.waitForTimeout(300);await click();const ready=await page.evaluate(()=>!window.ShambConkins.store.busy&&!document.querySelector('.level-card,.gentlemen-card')&&!document.getElementById('dialog').open);if(ready&&i>8)break;}
await page.evaluate(()=>{const S=window.ShambConkins,run=S.store.run,p=run.players[run.current];window.__res=null;S.pkmn.run.wildEncounter(run,p).then(r=>window.__res=r.outcome);});
const seen={layer:0,gbDuringWipe:false};
const t0=Date.now();let shot=0;
while(Date.now()-t0<6000){
 const st=await page.evaluate(()=>({layer:!!document.querySelector('.gb-encounter'),gb:!!document.querySelector('.gb-overlay')}));
 if(st.layer&&!st.gb)seen.layer++;
 if([150,700,1500,1900,2400,3200,4200].some(t=>Date.now()-t0>=t&&shot<=[150,700,1500,1900,2400,3200,4200].indexOf(t))){await page.screenshot({path:`/tmp/claude-0/sc/enc-${shot}.png`});shot++;}
 await page.waitForTimeout(40);
}
check(seen.layer>5,'board transition layer never showed before the Game Boy opened');
check(await page.evaluate(()=>!document.querySelector('.gb-encounter')),'transition layer left behind');
check(await page.evaluate(()=>!!document.querySelector('.gb-overlay .gb-fs')),'no fullscreen toggle on the ShamBoy');
await page.screenshot({path:'/tmp/claude-0/sc/enc-battle.png'});
await page.setViewportSize({width:1100,height:700});await page.waitForTimeout(400);
await page.screenshot({path:'/tmp/claude-0/sc/enc-desktop.png'});
console.log('layer samples',seen.layer,'errors',errors.length?errors:'none');
check(!errors.length,'page errors');
await browser.close();
console.log(fails.length?'FAILED':'OK');process.exit(fails.length?1:0);
