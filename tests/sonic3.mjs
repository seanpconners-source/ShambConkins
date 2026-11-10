// SONIC 3 TEST ZONE (src/engines/sonic3.js + src/engines/s3/*): opens the game in the browser, plays with a simple bot
// (hold right, jump when stuck, spin dash now and then), checks the runner gets through the act with the camera following
// and the terrain chunks drawn, the tally, the hand-over to P2 and the result; screenshots at phone / landscape / desktop
// sizes (SHAMB_SHOTS_DIR, s3-*.png). SHAMB_URL = a served --pwa build.
import {open} from './lib.mjs';
const SHOTS=process.env.SHAMB_SHOTS_DIR||'/tmp';
let bad=0;const check=(ok,msg)=>{console.log((ok?'ok   ':'FAIL ')+msg);if(!ok)bad++;};
const ready=page=>page.evaluate(()=>{for(const b of document.querySelectorAll('#dialog[open] button, .pass-overlay button, .pass-card button'))if(/ready|start|play/i.test(b.textContent)){b.click();return true;}return false;});
async function launch(page,solo){
 await page.evaluate(solo=>{void window.ShambConkins.requestGame({id:'sonic3-test',origin:'arcade',...(solo?{solo:true}:{}),quick:true});},solo);
 for(let k=0;k<40;k++){await page.waitForTimeout(300);await ready(page);if(await page.evaluate(()=>window.ShambConkins.store.session?.debug?.state?.phase==='card'))return true;}
 return false;}
// bot: run right; jump when stuck; spin dash when standing still after being stuck twice
const BOT=`(p,f)=>{const b=window.__bot||(window.__bot={stuck:0,last:0,mode:0,t:0});const o={l:false,r:true,u:false,d:false,jump:false,press:false};
 if(Math.abs(p.x-b.last)<.5)b.stuck++;else b.stuck=0;b.last=p.x;
 if(b.mode>0){b.mode--;o.r=false;o.d=true;if(b.mode%6===0&&b.mode>8)o.press=true;if(b.mode===0)o.d=false;return o;}
 if(b.stuck>40&&p.ground){b.mode=40;b.stuck=0;return o;}
 if(b.stuck>12&&p.ground){o.press=true;o.jump=true;}
 if(!p.ground&&p.ysp<0)o.jump=true;return o;}`;
for(const [w,h,tag] of [[390,780,'phone'],[844,390,'land'],[1100,700,'desktop']]){
 const {browser,page,errors}=await open({viewport:{width:w,height:h}});
 check(await launch(page,false),`${tag}: the game opens on the title card`);
 await page.waitForTimeout(700);await page.screenshot({path:`${SHOTS}/s3-${tag}-card.png`});
 await page.evaluate(b=>{const d=window.ShambConkins.store.session.debug;d.skipCard();d.bot=eval(b);},BOT);
 await page.waitForTimeout(2500);await page.screenshot({path:`${SHOTS}/s3-${tag}-start.png`});
 // jump to the loop and the upper route for screenshots
 await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;d.teleport(2300,1170);});await page.waitForTimeout(1600);await page.screenshot({path:`${SHOTS}/s3-${tag}-loop.png`});
 await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;d.teleport(3400,980);});await page.waitForTimeout(900);await page.screenshot({path:`${SHOTS}/s3-${tag}-ledge.png`});
 await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;d.teleport(5000,1100);});await page.waitForTimeout(700);await page.screenshot({path:`${SHOTS}/s3-${tag}-pit.png`});
 const st=await page.evaluate(()=>{const s=window.ShambConkins.store.session.debug.state;return {x:s.p.x,camx:s.cam.x,k:s.cam.k,phase:s.phase,chunks:window.ShambConkins.store.session.debug.chunks()};});
 check(st.camx>3000&&Math.abs(st.x-st.camx-st.k*0)<2000,`${tag}: camera follows the runner (x ${Math.round(st.x)}, cam ${Math.round(st.camx)}, k ${st.k.toFixed(2)})`);
 check(st.chunks>4,`${tag}: terrain chunks drawn (${st.chunks})`);
 if(tag==='phone'){
  // run the last part to the sign and wait for the tally + hand-over to P2
  await page.evaluate(()=>{const d=window.ShambConkins.store.session.debug;d.teleport(6200,1150);});
  let got=false;for(let k=0;k<40&&!got;k++){await page.waitForTimeout(500);got=await page.evaluate(()=>!!window.ShambConkins.store.session?.debug.state.tally);}
  check(got,'phone: reaching the sign starts the tally');await page.waitForTimeout(1500);await page.screenshot({path:`${SHOTS}/s3-${tag}-tally.png`});
  let p2=false;for(let k=0;k<30&&!p2;k++){await page.waitForTimeout(400);await ready(page);p2=await page.evaluate(()=>window.ShambConkins.store.session?.debug.state.turn===1);}
  const sc=await page.evaluate(()=>window.ShambConkins.store.session.debug.state.score);
  check(p2&&sc[0]>0,`phone: P2's turn after P1's tally (P1 ${sc[0]})`);
  await page.evaluate(b=>{const d=window.ShambConkins.store.session.debug;d.skipCard();d.bot=eval(b);d.teleport(7000,1330);},BOT);
  await page.waitForTimeout(1200);await page.screenshot({path:`${SHOTS}/s3-${tag}-p2.png`});
  await page.waitForFunction(()=>!window.ShambConkins.store.session,null,{timeout:30000}).catch(()=>{});
  await page.waitForTimeout(800);const card=await page.evaluate(()=>document.querySelector('#dialog[open]')?.innerText||'');
  check(/Test Zone|win|points/i.test(card),`phone: result card "${card.replace(/\s+/g,' ').slice(0,100)}"`);}
 const errs=errors.filter(x=>!/favicon|net::|Failed to load resource|Failed to fetch/.test(x));check(!errs.length,`${tag}: no page errors `+errs.slice(0,3).join(' | '));
 await browser.close();}
// a whole run by the bot from the start (1P): measures how far it gets and that it ends
{const {browser,page,errors}=await open({viewport:{width:844,height:390}});
 check(await launch(page,true),'1P: opens');await page.evaluate(b=>{const d=window.ShambConkins.store.session.debug;d.skipCard();d.bot=eval(b);},BOT);
 let best=0,last=null;for(let k=0;k<90;k++){await page.waitForTimeout(1000);last=await page.evaluate(()=>{const s=window.ShambConkins.store.session;if(!s)return null;const st=s.debug.state;return {x:st.p.x,y:st.p.y,ring:st.p.rings,tally:!!st.tally,dead:st.p.dead,lives:st.p.lives,clock:st.clock};});if(!last)break;best=Math.max(best,last.x);if(last.tally)break;}
 console.log('1P bot run',JSON.stringify(last),'best x',Math.round(best));
 check(best>2800,`1P: the bot gets round the loop and on (best x ${Math.round(best)})`);
 const errs=errors.filter(x=>!/favicon|net::|Failed to load resource|Failed to fetch/.test(x));check(!errs.length,'1P: no page errors '+errs.slice(0,3).join(' | '));
 await browser.close();}
console.log(bad?`${bad} problem(s)`:'SONIC3 OK');process.exit(bad?1:0);
