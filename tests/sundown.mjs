// SUNDOWN SHOWDOWN (src/engines/sundown.js): 2P to the result card with the autopilot, a boss win recruits the WANTED
// character, 1P stage after stage, screenshots at phone / landscape / desktop sizes (SHAMB_SHOTS_DIR, sundown-*.png).
// SHAMB_URL = a served --pwa build.
import {open} from './lib.mjs';
const SHOTS=process.env.SHAMB_SHOTS_DIR||'/tmp';
let bad=0;const check=(ok,msg)=>{console.log((ok?'ok   ':'FAIL ')+msg);if(!ok)bad++;};
async function launch(page,{solo=false}={}){
 await page.evaluate(solo=>{const S=window.ShambConkins;void S.requestGame({id:'sundown-showdown',origin:'arcade',...(solo?{solo:true}:{}),quick:true});},solo);
 for(let k=0;k<30&&!(await page.evaluate(()=>!!window.ShambConkins.store.session?.debug?.state));k++){await page.waitForTimeout(300);await page.evaluate(()=>{const d=document.querySelector('#dialog[open]');if(d)[...d.querySelectorAll('button')].find(b=>/start|play/i.test(b.textContent))?.click();});}
}
for(const [w,h,tag] of [[390,780,'phone'],[844,390,'land'],[1100,700,'desktop']]){
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});
 await launch(page);
 await page.waitForTimeout(1500);await page.screenshot({path:`${SHOTS}/sundown-${tag}-intro.png`});
 await page.evaluate(()=>{const s=window.ShambConkins.store.session;s.debug.start();s.debug.bot=true;s.debug.immortal=true;});
 await page.waitForTimeout(9000);await page.screenshot({path:`${SHOTS}/sundown-${tag}-play.png`});
 const st=await page.evaluate(()=>window.ShambConkins.store.session.debug.state());
 check(st.phase==='play'&&st.cam>100,`${tag}: the stage scrolls with the autopilot (cam ${Math.round(st.cam)})`);
 check(st.players.some(p=>p.score>0),`${tag}: bandits shot (${st.players.map(p=>p.score).join(' / ')})`);
 if(tag==='phone'){
  await page.evaluate(()=>window.ShambConkins.store.session.debug.boss());await page.waitForTimeout(4500);await page.screenshot({path:`${SHOTS}/sundown-${tag}-boss.png`});
  const b=await page.evaluate(()=>window.ShambConkins.store.session.debug.state());check(b.phase==='boss'&&b.boss&&!b.boss.dead,`boss arena with a WANTED boss (${b.bossId}, hp ${b.boss?.hp})`);
  await page.evaluate(()=>window.ShambConkins.store.session.debug.win());await page.waitForTimeout(800);
  const r=await page.evaluate(()=>window.ShambConkins.store.session.debug.state());check(r.boss?.dead&&(r.recruits[0].length+r.recruits[1].length===(r.bossId?1:0)),`beating the boss recruits ${r.bossId}`);
  await page.waitForFunction(()=>!window.ShambConkins.store.session,null,{timeout:15000}).catch(()=>{});
  await page.waitForTimeout(600);const card=await page.evaluate(()=>document.querySelector('#dialog[open]')?.innerText||'');
  check(/Sundown Showdown/i.test(card)||/win|takes|tie/i.test(card),`2P ends on a result card: "${card.replace(/\s+/g,' ').slice(0,90)}"`);
 }
 const errs=errors.filter(x=>!/favicon|net::|Failed to load resource|Failed to fetch/.test(x));check(!errs.length,`${tag}: no page errors `+errs.slice(0,3).join(' | '));
 await browser.close();
}
// 1P: clear a stage, the next one starts harder; losing every life ends the run
{const {browser,page,errors}=await open({viewport:{width:844,height:390}});
 await launch(page,{solo:true});
 await page.evaluate(()=>{const s=window.ShambConkins.store.session;s.debug.start();s.debug.bot=true;s.debug.immortal=true;s.debug.boss();});
 await page.waitForTimeout(3500);await page.evaluate(()=>window.ShambConkins.store.session.debug.win());await page.waitForTimeout(9000);
 const st=await page.evaluate(()=>window.ShambConkins.store.session?.debug.state());
 check(st&&st.stage===1,`1P: after the boss the next stage starts (stage ${st?.stage})`);
 await page.evaluate(()=>{const s=window.ShambConkins.store.session;s.debug.start();});await page.waitForTimeout(2500);await page.screenshot({path:`${SHOTS}/sundown-solo-stage2.png`});
 await page.evaluate(()=>{const s=window.ShambConkins.store.session;s.debug.immortal=false;s.debug.bot=false;});
 await page.keyboard.down('d');
 await page.waitForFunction(()=>!window.ShambConkins.store.session,null,{timeout:120000}).catch(()=>{});
 await page.waitForTimeout(800);const card=await page.evaluate(()=>document.querySelector('#dialog[open]')?.innerText||'');
 check(/stage/i.test(card),`1P: running in without shooting loses every life and banks the run: "${card.replace(/\s+/g,' ').slice(0,100)}"`);
 const errs=errors.filter(x=>!/favicon|net::|Failed to load resource|Failed to fetch/.test(x));check(!errs.length,'1P: no page errors '+errs.slice(0,3).join(' | '));
 await browser.close();}
console.log(bad?`${bad} problem(s)`:'SUNDOWN OK');process.exit(bad?1:0);
